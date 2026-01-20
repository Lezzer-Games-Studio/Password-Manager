const API = 'http://localhost:3000/sync';

async function uploadVault(encryptedVault, userId) {
  await fetch(`${API}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, vault: encryptedVault }),
  });
}

async function downloadVault(userId) {
  const res = await fetch(`${API}/download?userId=${userId}`);
  const data = await res.json();
  return data.vault;
}

module.exports = { uploadVault, downloadVault };
