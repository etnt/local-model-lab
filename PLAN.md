# Local Model Lab plan

## Goal
Build a browser interface for comparing responses from locally served Ollama models using the same prompt.

## Approach
1. Provide a small dependency-free Node.js server that serves the interface and proxies requests to Ollama. Keep the Ollama address configurable, defaulting to `http://127.0.0.1:11434`.
2. Fetch installed models from Ollama, allow multiple selections, and offer a small set of predefined prompts plus an editable prompt.
3. Run each selected model concurrently and show its response, elapsed time, and any individual error in side-by-side cards. Keep the interface usable while requests are running.
4. Create a responsive dark interface with clear selection, loading, empty, and connection states.
5. Document startup and Ollama requirements; verify the server and comparison flow with a mock Ollama endpoint.
