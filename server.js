const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ollama = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const port = Number(process.env.PORT || 3000);
const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && files[url.pathname]) {
    const [file, type] = files[url.pathname];
    res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(path.join(__dirname, 'public', file)).pipe(res); return;
  }
  if ((req.method === 'GET' && url.pathname === '/api/models') || (req.method === 'POST' && url.pathname === '/api/generate')) {
    try {
      let body;
      if (req.method === 'POST') {
        let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 100000) throw new Error('Request too large'); }
        const data = JSON.parse(raw);
        if (typeof data.model !== 'string' || !data.model || typeof data.prompt !== 'string' || !data.prompt.trim()) throw new Error('Model and prompt are required');
        body = JSON.stringify({ model: data.model, prompt: data.prompt, stream: false });
      }
      const response = await fetch(new URL(req.method === 'GET' ? '/api/tags' : '/api/generate', ollama), { method: req.method, headers: body ? { 'Content-Type': 'application/json' } : {}, body });
      const data = await response.text();
      res.writeHead(response.status, { 'Content-Type': 'application/json' }); res.end(data);
    } catch (error) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: `Could not reach Ollama: ${error.message}` })); }
    return;
  }
  res.writeHead(404); res.end('Not found');
}).listen(port, '127.0.0.1', () => console.log(`Local Model Lab: http://127.0.0.1:${port}`));
