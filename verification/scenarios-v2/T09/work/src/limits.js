const limits = require('../config/limits.json');

function assertWithinLimit(cents) {
  if (cents > limits.maxTransferCents) throw new Error('TRANSFER_LIMIT_EXCEEDED');
  return true;
}

module.exports = { assertWithinLimit, limits };
