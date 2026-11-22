// Deliberately small, deterministic tools: no network, filesystem, or code execution.
const definitions = [
  { type: 'function', function: { name: 'add_numbers', description: 'Add two numbers.', parameters: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } } },
  { type: 'function', function: { name: 'lookup_temperature', description: 'Look up a city temperature in a fixed sample dataset, not live weather.', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } } }
];
function execute(call) {
  const { name, arguments: args } = call.function || {};
  if (!args || typeof args !== 'object' || Array.isArray(args)) return 'Error: invalid arguments';
  if (name === 'add_numbers') {
    if (typeof args.a !== 'number' || !Number.isFinite(args.a) || typeof args.b !== 'number' || !Number.isFinite(args.b) || !Number.isFinite(args.a + args.b)) return 'Error: a and b must be finite numbers';
    return String(args.a + args.b);
  }
  if (name === 'lookup_temperature') {
    if (typeof args.city !== 'string') return 'Error: city must be a string';
    const temperatures = { stockholm: '8°C', london: '15°C', tokyo: '18°C' };
    return temperatures[args.city.trim().toLowerCase()] || 'No sample temperature available';
  }
  return 'Error: unknown tool';
}
module.exports = { definitions, execute };
