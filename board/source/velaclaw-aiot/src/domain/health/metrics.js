function toNumber(value, fallback) {
  var number = Number(value)
  return isFinite(number) ? number : fallback
}

function classifyHeartRate(value) {
  var bpm = toNumber(value, 0)
  if (bpm < 60) return 'rest'
  if (bpm < 100) return 'normal'
  if (bpm < 140) return 'elevated'
  return 'peak'
}

function classifyStress(value) {
  var stress = toNumber(value, 0)
  if (stress < 30) return 'relaxed'
  if (stress < 60) return 'normal'
  if (stress < 80) return 'elevated'
  return 'high'
}

function pushWindow(values, value, maxLength) {
  var source = Array.isArray(values) ? values : []
  var next = source.concat([Math.round(toNumber(value, 0))])
  return next.length > maxLength ? next.slice(next.length - maxLength) : next
}

function stats(values) {
  if (!values || !values.length) return { min: 0, avg: 0, max: 0 }
  var min = toNumber(values[0], 0)
  var max = min
  var sum = 0
  for (var i = 0; i < values.length; i++) {
    var value = toNumber(values[i], 0)
    if (value < min) min = value
    if (value > max) max = value
    sum += value
  }
  return { min: min, avg: Math.round(sum / values.length), max: max }
}

module.exports = {
  classifyHeartRate: classifyHeartRate,
  classifyStress: classifyStress,
  pushWindow: pushWindow,
  stats: stats
}
