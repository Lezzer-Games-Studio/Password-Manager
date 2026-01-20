const { clipboard } = require('electron');

function copyWithTimeout(text, timeout = 30000) {
  clipboard.writeText(text);

  setTimeout(() => {
    if (clipboard.readText() === text) {
      clipboard.clear();
    }
  }, timeout);
}

module.exports = { copyWithTimeout };
