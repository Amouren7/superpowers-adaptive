const test = require('node:test');
const assert = require('node:assert');
const { getSetting } = require('./src/settings');

test('getSetting falls back', () => assert.strictEqual(getSetting('NOPE_UNSET', 'x'), 'x'));
