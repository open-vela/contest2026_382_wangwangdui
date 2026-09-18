import { mapActivity } from './activity'

var LABELS = ['0', '3', '6', '9', '12', '15', '18', '21']
var RATIOS = [0.05, 0.11, 0.18, 0.26, 0.22, 0.14, 0.09, 0.04]

function trendValues(total) {
  var value = Math.max(0, Number(total) || 0)
  var result = []
  for (var i = 0; i < RATIOS.length; i++) {
    result.push(Math.max(1, Math.round(value * RATIOS[i])))
  }
  return result
}

function bars(values, color, chartHeight) {
  var source = values || []
  var height = Math.max(24, Math.round(Number(chartHeight) || 60))
  var maxValue = source.length ? source[0] : 1
  for (var i = 1; i < source.length; i++) {
    if (source[i] > maxValue) maxValue = source[i]
  }
  if (maxValue <= 0) maxValue = 1

  var result = []
  for (var index = 0; index < LABELS.length; index++) {
    var current = Number(source[index]) || 0
    var barHeight = Math.round((current / maxValue) * height)
    if (barHeight < 3) barHeight = 3
    result.push({
      t: LABELS[index],
      h: barHeight,
      color: color
    })
  }
  return result
}

export function mapStepsMetrics(snapshot, chartHeight) {
  var source = snapshot || {}
  var view = mapActivity(source)
  return [
    {
      name: '步数',
      current: view.stepsText,
      goal: view.stepsGoalText,
      unit: '步',
      color: '#FFD60A',
      bars: bars(trendValues(source.steps), '#FFD60A', chartHeight)
    },
    {
      name: '卡路里',
      current: view.caloriesText,
      goal: view.caloriesGoalText,
      unit: 'kcal',
      color: '#FF9F0A',
      bars: bars(trendValues(source.calories), '#FF9F0A', chartHeight)
    },
    {
      name: '站立',
      current: view.standText,
      goal: view.standGoalText,
      unit: 'h',
      color: '#0A84FF',
      bars: bars(trendValues(source.standHours), '#0A84FF', chartHeight)
    }
  ]
}
