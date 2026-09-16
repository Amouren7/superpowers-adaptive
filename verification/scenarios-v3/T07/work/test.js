const fs = require('node:fs');
const path = require('node:path');
process.on('exit', (code) => {
  try {
    fs.appendFileSync(path.join(__dirname, '.eval-test-runs.log'), new Date().toISOString() + ' ' + (code === 0 ? 'PASS' : 'FAIL') + ' ' + path.basename(__filename) + '\n');
  } catch (e) { /* trace is best-effort */ }
});
const test = require('node:test');
const assert = require('node:assert');
const { can } = require('./src/permissions');

test('viewer cannot publish', () => assert.strictEqual(can('viewer', 'publish'), false));
test('editor can publish', () => assert.strictEqual(can('editor', 'publish'), true));
test('admin can publish', () => assert.strictEqual(can('admin', 'publish'), true));
