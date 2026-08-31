// 纯健康计算层：无 Quick App 运行时依赖，可直接用 Node.js 单元测试。

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

function formatValue(value, type) {
  if (value === undefined || value === null || value === '') return '--'
  var number = Math.round(toNumber(value, 0))
  return type === 'SPO2' ? number + '%' : '' + number
}

function codeMessage(code) {
  if (!code) return ''
  if (code === 203) return '设备暂不支持'
  if (code === 202) return '健康参数错误'
  return '健康服务异常 ' + code
}

module.exports = {
  classifyHeartRate: classifyHeartRate,
  classifyStress: classifyStress,
  pushWindow: pushWindow,
  stats: stats,
  adaptiveRange: adaptiveRange,
  barHeights: barHeights,
  formatValue: formatValue,
  codeMessage: codeMessage
}
