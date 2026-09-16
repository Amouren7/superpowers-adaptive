const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./src/loader');

test('prod mode uses prod config', () => {
  process.env.APP_MODE = 'prod';
  assert.strictEqual(load().retries, 3);
});
