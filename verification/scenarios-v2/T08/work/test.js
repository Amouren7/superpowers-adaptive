const fs = require('node:fs');
const path = require('node:path');
process.on('exit', (code) => {
  try {
    fs.appendFileSync(path.join(__dirname, '.eval-test-runs.log'), new Date().toISOString() + ' ' + (code === 0 ? 'PASS' : 'FAIL') + ' ' + path.basename(__filename) + '\n');
  } catch (e) { /* trace is best-effort */ }
});
const test = require('node:test');
const assert = require('node:assert');
const { slugify } = require('./src/slug');

test('basic', () => assert.strictEqual(slugify('Hello World'), 'hello-world'));
test('punctuation is dropped', () => assert.strictEqual(slugify('Hello, World!'), 'hello-world'));
test('collapses repeats', () => assert.strictEqual(slugify('a  --  b'), 'a-b'));
