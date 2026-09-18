function numericValues(values) {
  var source = Array.isArray(values) ? values : []
  var result = []
  for (var i = 0; i < source.length; i++) {
    var value = Number(source[i])
    if (isFinite(value)) result.push(value)
  }
  return result
}

function stats(values) {
  var source = numericValues(values)
  if (!source.length) return { min: 0, avg: 0, max: 0 }
  var min = source[0], max = source[0], sum = 0
  for (var i = 0; i < source.length; i++) { if (source[i] < min) min = source[i]; if (source[i] > max) max = source[i]; sum += source[i] }
  return { min: Math.round(min), avg: Math.round(sum / source.length), max: Math.round(max) }
}

function relativeBars(values, height, minHeight, minimumSpread, inactive, active) {
  var source = numericValues(values)
  if (!source.length) return []
  var range = stats(source)
  var chartHeight = Math.max(6, Math.round(Number(height) || 24))
  var floor = Math.max(3, Math.min(chartHeight, Math.round(Number(minHeight) || 7)))
  var spread = Math.max(Number(minimumSpread) || 1, range.max - range.min)
  var center = (range.min + range.max) / 2
  var visualMin = center - spread / 2
  var result = []
  for (var i = 0; i < source.length; i++) {
    var ratio = Math.max(0, Math.min(1, (source[i] - visualMin) / spread))
    result.push({ height: floor + Math.round(ratio * (chartHeight - floor)), color: i === source.length - 1 ? active : inactive, index: i })
  }
  return result
}

function sourceText(source) {
  var value = source || {}
  if (value.live && value.mode === 'live') return '系统'
  if (value.errorCode === 203) return '不支持'
  if (value.errorCode) return '异常'
  return '等待'
}

function heartStatus(zone, value) {
  if (!(Number(value) > 0)) return { text: '等待', color: '#8E8E93' }
  if (zone === 'rest') return { text: '偏低', color: '#5AC8FA' }
  if (zone === 'elevated') return { text: '偏高', color: '#FF9F0A' }
  if (zone === 'peak') return { text: '峰值', color: '#FF453A' }
  return { text: '正常', color: '#30D158' }
}

function stressStatus(zone, value) {
  if (value === null || value === undefined || !isFinite(Number(value))) return { text: '等待', color: '#8E8E93' }
  if (zone === 'relaxed') return { text: '放松', color: '#30D158' }
  if (zone === 'normal') return { text: '正常', color: '#64D2FF' }
  if (zone === 'elevated') return { text: '偏高', color: '#FFD60A' }
  return { text: '较高', color: '#FF453A' }
}

function formatTime(timestamp) {
  if (!timestamp) return '--:--'
  var date = new Date(timestamp)
  var hours = date.getHours() < 10 ? '0' + date.getHours() : '' + date.getHours()
  var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : '' + date.getMinutes()
  return hours + ':' + minutes
}

function trendText(values) { var count = numericValues(values).length; return count > 1 ? '近' + count + '次' : (count ? '当前' : '等待') }
function rangeText(values, unit) { var source = numericValues(values); var range = stats(source); if (!source.length) return '等待数据'; if (range.min === range.max) return '当前 ' + range.max + unit; return '本次 ' + range.min + '–' + range.max + unit }

function summaryState(source) {
  if (!source || !source.anyLive) return { text: source && source.serviceAvailable ? '等待系统数据' : '等待健康服务', color: '#8E8E93' }
  var attention = source.heartZone === 'elevated' || source.heartZone === 'peak' || source.spo2Zone === 'attention' || source.stressZone === 'elevated' || source.stressZone === 'high'
  return attention ? { text: '有指标需关注', color: '#FF9F0A' } : { text: '状态平稳', color: '#30D158' }
}

function project(model, plan) {
  var source = model || {}
  var chartHeight = Math.max(18, Math.round(Number(plan && plan.chartHeight) || 24))
  var trendMinHeight = Math.max(4, Math.round(Number(plan && plan.trendMinHeight) || 7))
  var heartValue = Number(source.heartRate) || 0
  var spo2Value = Number(source.spo2) || 0
  var stressValue = source.stress === null || source.stress === undefined ? null : Number(source.stress)
  var heart = heartStatus(source.heartZone, heartValue)
  var stress = stressStatus(source.stressZone, stressValue)
  var spo2Attention = spo2Value > 0 && source.spo2Zone === 'attention'
  var summary = summaryState(source)
  var heartValues = numericValues(source.heartValues)
  var spo2Values = numericValues(source.spo2Values)
  var stressValues = numericValues(source.stressValues)
  var stressRange = stats(stressValues)
  return {
    heartRate: heartValue > 0 ? heartValue : '--',
    spo2: spo2Value > 0 ? spo2Value : '--',
    stress: stressValue !== null && isFinite(stressValue) ? stressValue : '--',
    heartStatus: heart.text, heartStatusColor: heart.color,
    spo2Status: spo2Value <= 0 ? '等待' : (spo2Attention ? '请关注' : '良好'),
    spo2StatusColor: spo2Value <= 0 ? '#8E8E93' : (spo2Attention ? '#FF9F0A' : '#30D158'),
    stressStatus: stress.text, stressStatusColor: stress.color,
    summaryText: summary.text, summaryColor: summary.color,
    dailyMin: Number(source.dailyMin) || (heartValues.length ? stats(heartValues).min : 0),
    dailyMax: Number(source.dailyMax) || (heartValues.length ? stats(heartValues).max : 0),
    stressMin: Number(source.stressMin) || stressRange.min,
    stressAvg: Number(source.stressAvg) || stressRange.avg,
    stressMax: Number(source.stressMax) || stressRange.max,
    heartSource: sourceText(source.heartSource), spo2Source: sourceText(source.spo2Source), stressSource: sourceText(source.stressSource),
    sourceText: source.anyLive ? '系统健康数据' : (source.serviceAvailable ? '等待系统数据' : '等待健康服务'),
    updatedAtText: source.anyLive ? formatTime(source.updatedAt) : '--:--',
    heartTrendText: trendText(heartValues), spo2TrendText: trendText(spo2Values), stressTrendText: trendText(stressValues),
    heartRangeText: rangeText(heartValues, ' bpm'), spo2RangeText: rangeText(spo2Values, '%'),
    stressRangeText: stressValues.length ? '本次 ' + stressRange.min + '–' + stressRange.max + ' · 均 ' + stressRange.avg : '等待数据',
    heartBars: relativeBars(heartValues, chartHeight, trendMinHeight, 20, '#7A2436', '#FF375F'),
    spo2Bars: relativeBars(spo2Values, chartHeight, trendMinHeight, 4, '#245566', '#5AC8FA'),
    stressBars: relativeBars(stressValues, chartHeight, trendMinHeight, 20, '#542966', '#BF5AF2')
  }
}

module.exports = { project: project }
