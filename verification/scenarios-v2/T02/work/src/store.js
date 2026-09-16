const fs = require('node:fs');
const path = require('node:path');
const FILE = path.join(__dirname, '..', 'data.json');

function load() {
  if (!fs.existsSync(FILE)) return { items: [] };
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}
function save(state) { fs.writeFileSync(FILE, JSON.stringify(state)); }
function addItem(name) { const s = load(); s.items.push({ name }); save(s); return s.items.length; }
function listItems() { return load().items; }

module.exports = { addItem, listItems, load, save };
