const PLANS = {
  FREE: {
    maxPasswords: 20,
    sync: false,
    backup: false,
  },
  PRO: {
    maxPasswords: Infinity,
    sync: true,
    backup: true,
  },
};

module.exports = PLANS;
