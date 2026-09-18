function formatNumber(value) {
  return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDay(dateText) {
  return dateText.slice(5).replace('-', '/')
}

function formatCompactDay(dateText) {
  return dateText.slice(8)
}

function formatCompactSteps(value) {
  var steps = Math.max(0, Number(value) || 0)
  if (steps < 1000) return Math.round(steps).toString()
  var compact = (steps / 1000).toFixed(1)
  if (compact.slice(-2) === '.0') compact = compact.slice(0, -2)
  return compact + 'k'
}

function buildBars(history, options) {
  var config = options || {}
  var maxSteps = 1
  var maxHeight = Math.max(20, Number(config.chartMaxHeight) || 84)
  var compactLabels = !!config.compactLabels
  for (var i = 0; i < history.length; i++) {
    if (history[i].steps > maxSteps) maxSteps = history[i].steps
  }
  var bars = []
  for (var j = 0; j < history.length; j++) {
    var item = history[j]
    var height = Math.max(6, Math.round((item.steps / maxSteps) * maxHeight))
    bars.push({
      label: compactLabels ? formatCompactDay(item.date) : formatDay(item.date),
      height: height,
      color: j === history.length - 1 ? '#FFD60A' : '#3A7DFF',
      stepsText: formatNumber(item.steps),
      shortSteps: formatCompactSteps(item.steps)
    })
  }
  return bars
}

export function mapHistory(history, options) {
  if (!history || !history.length) {
    return {
      todayStepsText: '0',
      avgStepsText: '0',
      bestStepsText: '0',
      bestDayText: '--',
      avgHeartText: '--',
      totalCaloriesText: '0',
      goalText: '0%',
      stepBars: [],
      records: []
    }
  }

  var totalSteps = 0
  var totalHeart = 0
  var totalCalories = 0
  var best = history[0]
  var records = []
  for (var i = 0; i < history.length; i++) {
    var item = history[i]
    totalSteps += item.steps
    totalHeart += item.avgHeartRate
    totalCalories += item.calories
    if (item.steps > best.steps) best = item
    records.unshift({
      date: formatDay(item.date),
      stepsText: formatNumber(item.steps),
      caloriesText: formatNumber(item.calories),
      heartText: item.avgHeartRate + ' bpm',
      goalText: item.goalPercent + '%'
    })
  }

  var today = history[history.length - 1]
  return {
    todayStepsText: formatNumber(today.steps),
    avgStepsText: formatNumber(Math.round(totalSteps / history.length)),
    bestStepsText: formatNumber(best.steps),
    bestDayText: formatDay(best.date),
    avgHeartText: Math.round(totalHeart / history.length) + ' bpm',
    totalCaloriesText: formatNumber(totalCalories),
    goalText: today.goalPercent + '%',
    stepBars: buildBars(history, options),
    records: records
  }
}

export { formatCompactSteps }
