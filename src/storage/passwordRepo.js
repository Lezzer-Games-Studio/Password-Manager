const db = require('./db');
const subscription = require('../subscription/subscriptionService');

async function save(data) {
  const plan = subscription.getPlan();
  const count = await countPasswords();

  if (count >= plan.maxPasswords) {
    throw new Error('FREE_LIMIT_REACHED');
  }

  // save encrypted password
}

function save(data) {
  const encrypted = JSON.stringify(data.password);

  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO passwords (title, login, password) VALUES (?, ?, ?)',
      [data.title, data.login, encrypted],
      function (err) {
        if (err) reject(err);
        resolve(this.lastID);
      }
    );
  });
}

function getAll() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM passwords', [], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
}

module.exports = { save, getAll };
