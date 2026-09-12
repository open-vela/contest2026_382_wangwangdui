function toNumber(value, fallback) {
  var number = Number(value)
  return isFinite(number) ? number : fallback
}

function range(values, minSpan) {
  if (!values || !values.length) return { min: 0, max: Math.max(1, minSpan || 1) }
  var min = toNumber(values[0], 0)
  var max = min
  for (var i = 1; i < values.length; i++) {
    var value = toNumber(values[i], min)
    if (value < min) min = value
    if (value > max) max = value
  }
  var span = Math.max(1, toNumber(minSpan, 1))
  if (max - min < span) {
    var middle = (min + max) / 2
    min = middle - span / 2
    max = middle + span / 2
  }
  return { min: min, max: max }
}

function sampleBarHeight(samples, index, minHeight, maxHeight, minSpan) {
  var low = Math.max(1, Math.round(toNumber(minHeight, 1)))
  var high = Math.max(low, Math.round(toNumber(maxHeight, low)))
  if (!samples || !samples.length || index < 0 || index >= samples.length) return low
  var values = []
  for (var i = 0; i < samples.length; i++) {
    var sample = samples[i]
    values.push(sample && typeof sample === 'object' ? sample.value : sample)
  }
  var bounds = range(values, minSpan)
  var span = Math.max(1, bounds.max - bounds.min)
  var current = Math.max(bounds.min, Math.min(bounds.max, toNumber(values[index], bounds.min)))
  return Math.round(low + ((current - bounds.min) / span) * (high - low))
}

module.exports = {
  sampleBarHeight: sampleBarHeight
}
