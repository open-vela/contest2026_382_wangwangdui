var PATTERNS = {
  tap: { key: 'tap', label: '轻触', duration: 80, interval: 0, count: 1, fallback: 'short' },
  goal: { key: 'goal', label: '达标', duration: 120, interval: 100, count: 2, fallback: 'short' },
  countdown: { key: 'countdown', label: '倒计时', duration: 100, interval: 250, count: 3, fallback: 'short' },
  alert: { key: 'alert', label: '警报', duration: 450, interval: 160, count: 2, fallback: 'long' }
}

function normalize(name) {
  return PATTERNS[name] ? name : 'goal'
}

function get(name, level) {
  var source = PATTERNS[normalize(name)]
  var scale = level === 'light' ? 0.72 : level === 'strong' ? 1.3 : 1
  return {
    key: source.key,
    label: source.label,
    duration: Math.max(50, Math.round(source.duration * scale)),
    interval: source.interval,
    count: source.count,
    fallback: source.fallback
  }
}

function label(name) {
  return PATTERNS[normalize(name)].label
}

function fallbackOffsets(name, level) {
  var pattern = get(name, level)
  var offsets = []
  var step = pattern.duration + pattern.interval
  for (var index = 0; index < pattern.count; index++) offsets.push(index * step)
  return offsets
}

module.exports = {
  normalize: normalize,
  get: get,
  label: label,
  fallbackOffsets: fallbackOffsets
}
