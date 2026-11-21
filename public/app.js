const presets = [
  { name: 'Explain simply', prompt: 'Explain how a neural network learns, using an analogy a 12-year-old would understand.' },
  { name: 'Creative writing', prompt: 'Write a short story about a robot discovering a garden for the first time.' },
  { name: 'Problem solving', prompt: 'How would you prioritize a busy week with competing deadlines? Give a practical step-by-step approach.' },
  { name: 'Write code', prompt: 'Write a JavaScript function that groups an array of objects by a given property. Explain your approach.' }
];
const $ = id => document.getElementById(id);
let selected = new Set(), running = false;
const promptInput = $('prompt');
presets.forEach((preset, index) => { const button = document.createElement('button'); button.className = 'preset'; button.textContent = preset.name; button.onclick = () => { promptInput.value = preset.prompt; document.querySelectorAll('.preset').forEach(b => b.classList.remove('active')); button.classList.add('active'); }; $('presets').append(button); if (!index) button.click(); });
promptInput.addEventListener('input', () => document.querySelectorAll('.preset').forEach(b => b.classList.remove('active')));
async function loadModels() {
  $('refresh').disabled = true; $('models').textContent = 'Connecting to Ollama…';
  try {
    const response = await fetch('/api/models'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load models');
    const models = data.models || []; selected = new Set([...selected].filter(name => models.some(m => m.name === name)));
    $('models').replaceChildren();
    if (!models.length) $('models').textContent = 'No models found. Pull a model with Ollama, then refresh.';
    models.forEach(model => { const label = document.createElement('label'); label.className = 'model'; const input = document.createElement('input'); input.type = 'checkbox'; input.checked = selected.has(model.name); input.disabled = running; input.onchange = () => { input.checked ? selected.add(model.name) : selected.delete(model.name); }; const name = document.createElement('span'); name.textContent = model.name; label.append(input, name); $('models').append(label); });
  } catch (error) { $('models').textContent = `Unable to connect. Make sure Ollama is running, then refresh. ${error.message}`; } finally { $('refresh').disabled = false; }
}
$('refresh').onclick = loadModels;
$('run').onclick = async () => {
  if (!selected.size) { alert('Select at least one model.'); return; }
  if (!promptInput.value.trim()) { promptInput.focus(); return; }
  running = true; $('run').disabled = true; $('run').firstChild.textContent = 'Running comparison '; document.querySelectorAll('.model input').forEach(i => i.disabled = true);
  const prompt = promptInput.value, models = [...selected]; $('count').textContent = `${models.length} ${models.length === 1 ? 'MODEL' : 'MODELS'}`; $('results').replaceChildren();
  await Promise.all(models.map(async (model, index) => {
    const card = document.createElement('article'); card.className = 'card';
    const head = document.createElement('div'); head.className = 'card-head'; const title = document.createElement('div'); const number = document.createElement('span'); number.className = 'card-number'; number.textContent = `MODEL ${String(index + 1).padStart(2, '0')}`; const name = document.createElement('h3'); name.textContent = model; title.append(number, name); const time = document.createElement('span'); time.className = 'time'; time.textContent = '●  RUNNING'; head.append(title, time); const output = document.createElement('div'); output.className = 'output loading'; output.textContent = 'Thinking…'; const reasoning = document.createElement('details'); reasoning.className = 'reasoning'; reasoning.open = true; reasoning.hidden = true; const summary = document.createElement('summary'); summary.textContent = 'Thinking'; const reasoningText = document.createElement('div'); reasoningText.className = 'reasoning-text'; reasoning.append(summary, reasoningText); card.append(head, reasoning, output); $('results').append(card);
    const start = performance.now();
    try {
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Generation failed'); }
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let buffer = '', answer = '', thinking = '', done = false;
      const handleLine = line => {
        if (!line.trim()) return;
        const data = JSON.parse(line);
        if (data.error) throw new Error(data.error);
        if (data.thinking) { const follow = reasoningText.scrollHeight - reasoningText.scrollTop - reasoningText.clientHeight < 30; thinking += data.thinking; reasoning.hidden = false; reasoningText.textContent = thinking; if (follow) reasoningText.scrollTop = reasoningText.scrollHeight; }
        if (data.response) { if (!answer && thinking) reasoning.open = false; answer += data.response; output.classList.remove('loading'); }
        output.textContent = answer || (thinking ? 'Thinking…' : 'Waiting for response…');
        if (data.done) { done = true; summary.textContent = 'Thinking complete'; }
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
      time.textContent = `${((performance.now() - start) / 1000).toFixed(2)} s`;
    } catch (error) { output.textContent = (output.textContent && !['Thinking…', 'Waiting for response…'].includes(output.textContent) ? output.textContent + '\n\n' : '') + `Error: ${error.message}`; output.classList.add('error'); time.textContent = 'FAILED'; } finally { output.classList.remove('loading'); }
  }));
  running = false; $('run').disabled = false; $('run').firstChild.textContent = 'Run comparison '; document.querySelectorAll('.model input').forEach(i => i.disabled = false);
};
loadModels();
