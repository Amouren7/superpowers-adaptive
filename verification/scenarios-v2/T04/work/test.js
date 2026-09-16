const test = require('node:test');
const assert = require('node:assert');
const { truncate } = require('./src/util');

test('short text unchanged', () => assert.strictEqual(truncate('abc', 5), 'abc'));
test('long text truncated', () => assert.strictEqual(truncate('abcdefgh', 3), 'abc…'));
