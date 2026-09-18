var VISUALS = {
  sport: { background: '#050505', accent: '#0A84FF' },
  simple: { background: '#040810', accent: '#00E5FF' },
  dashboard: { background: '#071007', accent: '#32D74B' },
  mechanical: { background: '#060708', accent: '#D6B878' },
  alpine: { background: '#020713', accent: '#FF9F4A' }
}

function get(id) {
  var value = VISUALS[id] || VISUALS.sport
  return { background: value.background, accent: value.accent }
}

module.exports = { get: get }
