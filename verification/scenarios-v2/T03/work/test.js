const test = require('node:test');
const assert = require('node:assert');
const { toCents } = require('./src/money');

test('toCents', () => assert.strictEqual(toCents('12.34'), 1234));
