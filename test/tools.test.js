const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execute } = require('../tools');

test('sample tools return deterministic results and reject invalid calls', () => {
  assert.equal(execute({ function: { name: 'add_numbers', arguments: { a: 173, b: 289 } } }), '462');
  assert.equal(execute({ function: { name: 'lookup_temperature', arguments: { city: 'Stockholm' } } }), '8°C');
  assert.match(execute({ function: { name: 'add_numbers', arguments: { a: '1', b: 2 } } }), /^Error/);
  assert.match(execute({ function: { name: 'unknown', arguments: {} } }), /^Error/);
});
