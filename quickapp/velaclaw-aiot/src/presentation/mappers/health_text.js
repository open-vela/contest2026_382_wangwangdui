function toNumber(value, fallback) {
  var number = Number(value)
  return isFinite(number) ? number : fallback
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
  formatValue: formatValue,
  codeMessage: codeMessage
}
