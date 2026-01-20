const router = require('express').Router();
const vaultStore = require('../storage/vaultStore');

router.post('/upload', (req, res) => {
  const { userId, vault } = req.body;
  vaultStore.save(userId, vault);
  res.json({ ok: true });
});

router.get('/download', (req, res) => {
  const userId = req.query.userId;
  const vault = vaultStore.load(userId);
  res.json({ vault });
});

module.exports = router;
