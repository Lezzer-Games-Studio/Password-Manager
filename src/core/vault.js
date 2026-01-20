const cryptoService = require('./crypto');

function encryptPassword(password, masterPassword) {
  return cryptoService.encrypt(password, masterPassword);
}

function decryptPassword(encrypted, masterPassword) {
  return cryptoService.decrypt(encrypted, masterPassword);
}

module.exports = { encryptPassword, decryptPassword };
