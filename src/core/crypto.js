const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const SALT = 'password-manager-salt';

function deriveKey(masterPassword) {
  return crypto.pbkdf2Sync(masterPassword, SALT, 100000, 32, 'sha256');
}

function encrypt(text, masterPassword) {
  const iv = crypto.randomBytes(12);
  const key = deriveKey(masterPassword);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    content: encrypted,
    tag: tag.toString('hex'),
  };
}

function decrypt(encrypted, masterPassword) {
  const key = deriveKey(masterPassword);
  const decipher = crypto.createDecipheriv(
    ALGO,
    key,
    Buffer.from(encrypted.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));

  let decrypted = decipher.update(encrypted.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encrypt, decrypt };
