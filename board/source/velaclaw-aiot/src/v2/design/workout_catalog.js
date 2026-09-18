var MODES = {
  walk: { name: '步行', desc: '轻量有氧与日常健走', color: '#30D158' },
  run: { name: '跑步', desc: '更高步频与热量消耗', color: '#FF9F0A' }
}

function get(type) {
  var value = MODES[type] || MODES.walk
  return { type: MODES[type] ? type : 'walk', name: value.name, desc: value.desc, color: value.color }
}

function list(types) {
  var source = Array.isArray(types) && types.length ? types : ['walk', 'run']
  var result = []
  for (var i = 0; i < source.length; i++) result.push(get(source[i]))
  return result
}

module.exports = { get: get, list: list }
