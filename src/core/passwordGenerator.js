const crypto = require('crypto');

function generate({ length = 16 }) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

module.exports = { generate };
