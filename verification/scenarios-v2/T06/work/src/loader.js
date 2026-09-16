const fs = require('node:fs');
const path = require('node:path');

// 注意：MODE 在模块加载时就被定下来了
const MODE = process.env.APP_MODE || 'dev';

function configPath() {
  return path.join(__dirname, '..', 'config', MODE + '.json');
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch (e) {
    return { retries: 1 };
  }
}

module.exports = { load, configPath };
