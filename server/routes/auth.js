const router = require('express').Router();

router.post('/login', (req, res) => {
  // тимчасово fake login
  res.json({ token: 'demo-token' });
});

module.exports = router;
