var WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function formatNumber(value) {
  return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDay(text) {
  return String(text || '').slice(5).replace('-', '/')
}

function weekdayLabel(text) {
  var parts = String(text || '').split('-')
  if (parts.length >= 3) {
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    if (!isNaN(date.getTime())) return WEEKDAY_LABELS[date.getDay()]
  }
  return formatDay(text)
}

function compactLabel(text, isToday) {
  if (isToday) return '今'
  var label = weekdayLabel(text)
  return label.indexOf('周') === 0 ? label.slice(1) : label.slice(0, 1)
}

function project(model, plan) {
  var source = model || {}
  var records = Array.isArray(source.records) ? source.records : []
  var chartHeight = Math.max(10, Math.round(Number(plan && plan.chartHeight) || 30))
  var minRowWidth = Math.max(8, Math.round(Number(plan && plan.pillTrendMinWidth) || 14))
  var maxRowWidth = Math.max(minRowWidth, Math.round(Number(plan && plan.pillTrendMaxWidth) || 70))
  var rowMode = plan && plan.trendMode === 'comparative-row'
  var maxSteps = 1
  var bars = []
  var i

  for (i = 0; i < records.length; i++) {
    if ((Number(records[i].steps) || 0) > maxSteps) maxSteps = Number(records[i].steps) || 0
  }

  for (i = 0; i < records.length; i++) {
    var item = records[i]
    var steps = Math.max(0, Number(item.steps) || 0)
    var ratio = Math.max(0, Math.min(1, steps / maxSteps))
    var isToday = i === records.length - 1
    var rowLabel = isToday ? '今天' : weekdayLabel(item.date)
    var compact = compactLabel(item.date, isToday)
    var comparativeWidth = Math.round(minRowWidth + ratio * (maxRowWidth - minRowWidth))
    bars.push({
      date: String(item.date || i),
      label: formatDay(item.date),
      displayLabel: rowMode ? rowLabel : compact,
      stepsText: formatNumber(steps),
      height: Math.max(5, Math.round(ratio * chartHeight)),
      rowWidth: comparativeWidth,
      pillWidth: comparativeWidth,
      pillLabel: rowLabel,
      color: isToday ? '#FFD60A' : '#4C7CF3',
      isToday: isToday
    })
  }

  return {
    todayStepsText: formatNumber(source.todaySteps),
    avgStepsText: formatNumber(source.avgSteps),
    bestStepsText: formatNumber(source.bestSteps),
    bestDayText: source.bestDate ? formatDay(source.bestDate) : '--',
    avgHeartText: source.avgHeartRate ? Math.round(source.avgHeartRate) + ' bpm' : '--',
    goalText: (Number(source.goalPercent) || 0) + '%',
    bars: bars
  }
}

module.exports = { project: project }
