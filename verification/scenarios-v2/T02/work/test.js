const test = require('node:test');
const assert = require('node:assert');
const { addItem, listItems } = require('./src/store');

test('add and list', () => {
  const before = listItems().length;
  addItem('x');
  assert.strictEqual(listItems().length, before + 1);
});
