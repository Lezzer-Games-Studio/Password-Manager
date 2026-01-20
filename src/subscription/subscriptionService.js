const PLANS = require('./plan');
const settingsRepo = require('../storage/settingsRepo');

function getPlan() {
  const plan = settingsRepo.get('plan') || 'FREE';
  return PLANS[plan];
}

function isPro() {
  return settingsRepo.get('plan') === 'PRO';
}

function setPro() {
  settingsRepo.set('plan', 'PRO');
}

function canSync() {
  return isPro();
}


module.exports = { getPlan, isPro, setPro, canSync };
