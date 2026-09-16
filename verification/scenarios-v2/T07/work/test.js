const test = require('node:test');
const assert = require('node:assert');
const { can } = require('./src/permissions');

test('viewer cannot publish', () => assert.strictEqual(can('viewer', 'publish'), false));
test('editor can publish', () => assert.strictEqual(can('editor', 'publish'), true));
test('admin can publish', () => assert.strictEqual(can('admin', 'publish'), true));
