const presets = [
  { name: 'Tool: add', prompt: 'Use the add_numbers tool to calculate 173 plus 289.' , tools: true },
  { name: 'Tool: lookup', prompt: 'Use the lookup_temperature tool to find the sample temperature in Stockholm.' , tools: true },
  { name: 'Explain simply', prompt: 'Explain how a neural network learns, using an analogy a 12-year-old would understand.' },
  { name: 'Creative writing', prompt: 'Write a short story about a robot discovering a garden for the first time.' },
  { name: 'Problem solving', prompt: 'How would you prioritize a busy week with competing deadlines? Give a practical step-by-step approach.' },
  { name: 'Write code', prompt: 'Write a JavaScript function that groups an array of objects by a given property. Explain your approach.' }
];
const $ = id => document.getElementById(id);
let selected = new Set(), running = false;
const promptInput = $('prompt');
presets.forEach((preset, index) => { const button = document.createElement('button'); button.className = 'preset'; button.textContent = preset.name; button.onclick = () => { promptInput.value = preset.prompt; $('enable-tools').checked = !!preset.tools; document.querySelectorAll('.preset').forEach(b => b.classList.remove('active')); button.classList.add('active'); }; $('presets').append(button); if (index === 2) button.click(); });
promptInput.addEventListener('input', () => document.querySelectorAll('.preset').forEach(b => b.classList.remove('active')));
function formatBytes(bytes) { return typeof bytes === 'number' && Number.isFinite(bytes) && bytes >= 0 ? `${(bytes / 1e9).toFixed(1)} GB` : 'Unavailable'; }
async function loadModels() {
  $('refresh').disabled = true; $('models').textContent = 'Connecting to Ollama…';
  try {
    const response = await fetch('/api/models'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load models');
    let runningModels = null;
    try { const status = await fetch('/api/running'); if (status.ok) { const payload = await status.json(); if (Array.isArray(payload.models)) runningModels = payload.models; } } catch (_) { /* Model listing still works if runtime status is unavailable. */ }
    const models = data.models || []; selected = new Set([...selected].filter(name => models.some(m => m.name === name)));
    $('models').replaceChildren();
    if (!models.length) $('models').textContent = 'No models found. Pull a model with Ollama, then refresh.';
    models.forEach(model => {
      const label = document.createElement('label'); label.className = 'model';
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = selected.has(model.name); input.disabled = running;
      input.onchange = () => { input.checked ? selected.add(model.name) : selected.delete(model.name); };
      const info = document.createElement('span'); info.className = 'model-info';
      const name = document.createElement('span'); name.className = 'model-name'; name.textContent = model.name;
      const meta = document.createElement('span'); meta.className = 'model-meta';
      const details = model.details || {};
      meta.textContent = [`Disk ${formatBytes(model.size)}`, details.parameter_size && `${details.parameter_size} parameters`, details.quantization_level].filter(Boolean).join(' · ');
      const runtime = document.createElement('span'); runtime.className = 'model-runtime';
      const loaded = runningModels?.find(item => item.name === model.name || item.model === model.name);
      runtime.textContent = runningModels === null ? 'Runtime status unavailable' : loaded ? `Loaded: ${formatBytes(loaded.size)} · GPU: ${formatBytes(loaded.size_vram)}${loaded.context_length ? ` · Context: ${loaded.context_length.toLocaleString()}` : ''}` : 'Not currently loaded';
      info.append(name, meta, runtime); label.append(input, info); $('models').append(label);
    });
  } catch (error) { $('models').textContent = `Unable to connect. Make sure Ollama is running, then refresh. ${error.message}`; } finally { $('refresh').disabled = false; }
}
$('refresh').onclick = loadModels;
$('run').onclick = async () => {
  if (!selected.size) { alert('Select at least one model.'); return; }
  if (!promptInput.value.trim()) { promptInput.focus(); return; }
  running = true; $('run').disabled = true; $('run').firstChild.textContent = 'Running comparison '; document.querySelectorAll('.model input').forEach(i => i.disabled = true);
  const prompt = promptInput.value, models = [...selected], disableThinking = $('disable-thinking').checked, useTools = $('enable-tools').checked; $('count').textContent = `${models.length} ${models.length === 1 ? 'MODEL' : 'MODELS'}`; $('results').replaceChildren();
  await Promise.all(models.map(async (model, index) => {
    const card = document.createElement('article'); card.className = 'card';
    const head = document.createElement('div'); head.className = 'card-head'; const title = document.createElement('div'); const number = document.createElement('span'); number.className = 'card-number'; number.textContent = `MODEL ${String(index + 1).padStart(2, '0')}`; const name = document.createElement('h3'); name.textContent = model; title.append(number, name); const time = document.createElement('span'); time.className = 'time'; time.textContent = '●  LOADING'; head.append(title, time); const output = document.createElement('div'); output.className = 'output loading'; output.textContent = 'Loading model…'; const reasoning = document.createElement('details'); reasoning.className = 'reasoning'; reasoning.open = true; reasoning.hidden = true; const summary = document.createElement('summary'); summary.textContent = 'Thinking'; const reasoningText = document.createElement('div'); reasoningText.className = 'reasoning-text'; reasoning.append(summary, reasoningText); const toolLog = document.createElement('div'); toolLog.className = 'tool-log'; toolLog.hidden = !useTools; if (useTools) toolLog.textContent = 'Waiting for tool calls…'; card.append(head, toolLog, reasoning, output); $('results').append(card);
    let timer;
    try {
      const loadStart = performance.now();
      const loadResponse = await fetch('/api/load', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }) });
      if (!loadResponse.ok) { const data = await loadResponse.json(); throw new Error(`Loading failed: ${data.error || 'Could not load model'}`); }
      await loadResponse.json();
      const loadSeconds = ((performance.now() - loadStart) / 1000).toFixed(2);
      const loadInfo = document.createElement('div'); loadInfo.className = 'load-time'; loadInfo.textContent = `Load: ${loadSeconds} s`; title.append(loadInfo);
      const start = performance.now();
      const updateTime = () => { time.textContent = `● RUNNING ${((performance.now() - start) / 1000).toFixed(1)} s`; };
      updateTime(); timer = setInterval(updateTime, 250);
      output.textContent = 'Waiting for response…';
      const response = await fetch(useTools ? '/api/tool-test' : '/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, ...(disableThinking ? { think: false } : {}) }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Generation failed'); }
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let buffer = '', answer = '', thinking = '', done = false, toolCalls = 0;
      const handleLine = line => {
        if (!line.trim()) return;
        const data = JSON.parse(line);
        if (data.error) throw new Error(data.error);
        if (data.tool_call) { if (!toolCalls++) toolLog.textContent = ''; const line = document.createElement('div'); line.textContent = `${data.tool_call.name}(${JSON.stringify(data.tool_call.arguments)}) → ${data.tool_call.result}`; toolLog.append(line); }
        if (data.thinking) { const follow = reasoningText.scrollHeight - reasoningText.scrollTop - reasoningText.clientHeight < 30; thinking += data.thinking; reasoning.hidden = false; reasoningText.textContent = thinking; if (follow) reasoningText.scrollTop = reasoningText.scrollHeight; }
        if (data.response) { if (!answer && thinking) reasoning.open = false; answer += data.response; output.classList.remove('loading'); }
        output.textContent = answer || (thinking ? 'Thinking…' : 'Waiting for response…');
        if (data.done) { done = true; summary.textContent = 'Thinking complete'; if (useTools && !toolCalls) toolLog.textContent = 'No tool calls made'; }
      };
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
        const lines = buffer.split('\n'); buffer = lines.pop(); lines.forEach(handleLine);
        if (chunk.done) break;
      }
      if (buffer.trim()) handleLine(buffer);
      if (!done) throw new Error('Ollama ended the response before generation completed.');
      output.textContent = answer || '(Empty response)';
      clearInterval(timer); time.textContent = `RUN ${((performance.now() - start) / 1000).toFixed(2)} s`;
    } catch (error) { output.textContent = (output.textContent && !['Loading model…', 'Thinking…', 'Waiting for response…'].includes(output.textContent) ? output.textContent + '\n\n' : '') + `Error: ${error.message}`; output.classList.add('error'); time.textContent = 'FAILED'; } finally { clearInterval(timer); output.classList.remove('loading'); }
  }));
  running = false; $('run').disabled = false; $('run').firstChild.textContent = 'Run comparison '; document.querySelectorAll('.model input').forEach(i => i.disabled = false);
  await loadModels();
};
loadModels();
