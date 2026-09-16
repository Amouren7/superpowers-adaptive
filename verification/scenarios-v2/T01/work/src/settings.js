function getSetting(name, fallback) {
  return process.env[name] || fallback;
}

module.exports = { getSetting };
