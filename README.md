# Local Model Lab

Compare locally installed Ollama models with the same prompt in a browser. Responses are requested concurrently and streamed into each card. For reasoning models, the card streams thinking in a separate section, which collapses when the answer begins. Each card first loads the model, then shows a separate wall-clock run time from task request to completed response, including communication overhead and any queuing. The load time is also shown and may include queueing or be short for an already loaded model. If Ollama unloads a model between loading and its task (for example under memory pressure), the run time can still include a reload. Concurrent runs share your machine's resources, so timings depend on load and are not isolated benchmarks.

## Getting started

1. Install and start [Ollama](https://ollama.com/) and pull at least one model, for example `ollama pull llama3.2`.
2. Install Node.js 18 or newer, then run `npm start`.
3. Open http://127.0.0.1:3000, select models, choose or edit a prompt, and run the comparison.

Use the refresh button after installing additional models. The optional **Turn off thinking** setting requests that Ollama disable thinking for all models in the run. Models that cannot disable it may still think, potentially at a lower level; leaving the option unchecked uses each model’s default. The server listens only on localhost. Set `PORT` to change the UI port or `OLLAMA_URL` to point to another Ollama server (default `http://127.0.0.1:11434`). No npm dependencies are required.

## Tool-calling comparisons

Select a Tool preset or enable **sample tools** with a custom prompt. Models can call a local addition tool and a temperature lookup using fixed sample data (not live weather). Each card shows calls, arguments, and results, including when no call was made. The tool mode uses Ollama chat and displays each completed model turn; ordinary responses continue to stream token by token. Some models do not support tool calling. Runs are limited to four model turns and ten calls per turn.

The model list shows Ollama’s installed size on disk, parameter count and quantization when available. For loaded models, it also shows Ollama’s reported loaded size, GPU allocation and active context length. Runtime figures are snapshots refreshed with the model list and after a comparison; unloaded models have no runtime figures. Disk size is not the same as memory usage, and reported allocations are not a complete measure of process or system memory.
