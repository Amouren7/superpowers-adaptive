const config = require('../config/permissions.json');

function can(role, action) {
  const r = config.roles[role];
  return !!(r && r[action]);
}

module.exports = { can };
