let timer = null;

function startAutoLock(timeout, onLock) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    onLock();
  }, timeout);
}

function resetAutoLock(timeout, onLock) {
  startAutoLock(timeout, onLock);
}

module.exports = { startAutoLock, resetAutoLock };
