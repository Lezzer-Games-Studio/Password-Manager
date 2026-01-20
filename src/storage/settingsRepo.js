let settings = {
  plan: 'FREE',
};

function get(key) {
  return settings[key];
}

function set(key, value) {
  settings[key] = value;
  
}

module.exports = { get, set };
