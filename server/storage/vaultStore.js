const store = {};

function save(userId, encryptedVault) {
  store[userId] = encryptedVault;
}

function load(userId) {
  return store[userId] || null;
}

module.exports = { save, load };
