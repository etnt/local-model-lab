const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const toolset = require('./tools');

const ollama = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const port = Number(process.env.PORT || 3000);
const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && files[url.pathname]) {
    const [file, type] = files[url.pathname];
    res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(path.join(__dirname, 'public', file)).pipe(res); return;
  }
  if ((req.method === 'GET' && url.pathname === '/api/models') || (req.method === 'POST' && (url.pathname === '/api/generate' || url.pathname === '/api/tool-test'))) {
    try {
      let body, data;
      if (req.method === 'POST') {
        let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 100000) throw new Error('Request too large'); }
        data = JSON.parse(raw);
        if (typeof data.model !== 'string' || !data.model || typeof data.prompt !== 'string' || !data.prompt.trim()) throw new Error('Model and prompt are required');
        if (data.think !== undefined && typeof data.think !== 'boolean') throw new Error('Think must be a boolean');
        body = JSON.stringify({ model: data.model, prompt: data.prompt, stream: true, ...(data.think !== undefined ? { think: data.think } : {}) });
      }
      if (url.pathname === '/api/tool-test') {
        await runToolTest(res, data);
        return;
      }
      const response = await fetch(new URL(req.method === 'GET' ? '/api/tags' : '/api/generate', ollama), { method: req.method, headers: body ? { 'Content-Type': 'application/json' } : {}, body });
      res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-cache' });
      if (response.body) {
        for await (const chunk of response.body) { if (res.destroyed) break; res.write(chunk); }
      }
      res.end();
    } catch (error) {
      if (res.headersSent) { res.destroy(error); return; }
      res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: `Ollama request failed: ${error.cause?.message || error.message}` }));
    }
    return;
  }
  res.writeHead(404); res.end('Not found');
}).listen(port, '127.0.0.1', () => console.log(`Local Model Lab: http://127.0.0.1:${port}`));

async function runToolTest(res, data) {
  const messages = [{ role: 'user', content: data.prompt }];
  const settings = { model: data.model, tools: toolset.definitions, stream: false, ...(data.think !== undefined ? { think: data.think } : {}) };
  // Bound the number of model/tool rounds to keep misbehaving models from looping.
  for (let round = 0; round < 4; round++) {
    const response = await fetch(new URL('/api/chat', ollama), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, messages }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Ollama chat request failed');
    const message = result.message;
    if (!message || typeof message !== 'object') throw new Error('Ollama returned an invalid chat response');
    if (!res.headersSent) res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' });
    const emit = item => res.write(JSON.stringify(item) + '\n');
    if (message.thinking) emit({ thinking: message.thinking });
    const calls = message.tool_calls || [];
    if (!Array.isArray(calls)) throw new Error('Ollama returned invalid tool calls');
    if (!calls.length) { emit({ response: message.content || '', done: true }); res.end(); return; }
    if (calls.length > 10) throw new Error('Too many tool calls');
    messages.push(message);
    for (const call of calls) {
      const output = toolset.execute(call);
      const name = call.function?.name || 'unknown';
      emit({ tool_call: { name, arguments: call.function?.arguments, result: output } });
      messages.push({ role: 'tool', tool_name: name, content: output });
    }
  }
  res.write(JSON.stringify({ error: 'Tool-call limit reached before a final answer.' }) + '\n');
  res.end();
}
