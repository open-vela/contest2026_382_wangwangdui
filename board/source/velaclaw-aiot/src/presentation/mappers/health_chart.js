function toNumber(value, fallback) {
  var number = Number(value)
  return isFinite(number) ? number : fallback
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

function adaptiveRange(values, minSpan) {
  var summary = stats(values)
  var min = summary.min
  var max = summary.max
  var safeSpan = Math.max(1, toNumber(minSpan, 1))
  if (max - min < safeSpan) {
    var middle = (min + max) / 2
    min = middle - safeSpan / 2
    max = middle + safeSpan / 2
  }
  return { min: min, max: max }
}

function barHeights(values, minHeight, maxHeight, minSpan) {
  if (!values || !values.length) return []
  var low = Math.max(1, Math.round(toNumber(minHeight, 1)))
  var high = Math.max(low, Math.round(toNumber(maxHeight, low)))
  var range = adaptiveRange(values, minSpan)
  var span = Math.max(1, range.max - range.min)
  var result = []
  for (var i = 0; i < values.length; i++) {
    var value = Math.max(range.min, Math.min(range.max, toNumber(values[i], range.min)))
    var ratio = (value - range.min) / span
    result.push(Math.round(low + ratio * (high - low)))
  }
  return result
}

function sampleBarHeight(samples, index, minHeight, maxHeight, minSpan) {
  if (!samples || !samples.length || index < 0 || index >= samples.length) {
    return Math.max(1, Math.round(toNumber(minHeight, 1)))
  }
  var values = []
  for (var i = 0; i < samples.length; i++) {
    var sample = samples[i]
    values.push(sample && typeof sample === 'object' ? sample.value : sample)
  }
  return barHeights(values, minHeight, maxHeight, minSpan)[index]
}

module.exports = {
  adaptiveRange: adaptiveRange,
  barHeights: barHeights,
  sampleBarHeight: sampleBarHeight
}
