import historyRepository from '../../../domain/history/repository'

function summarize(history) {
  var source = Array.isArray(history) ? history : []
  if (!source.length) {
    return { todaySteps: 0, avgSteps: 0, bestSteps: 0, bestDate: '', avgHeartRate: 0, goalPercent: 0, records: [] }
  }

  var totalSteps = 0
  var totalHeart = 0
  var best = source[0]
  for (var i = 0; i < source.length; i++) {
    var item = source[i]
    totalSteps += Number(item.steps) || 0
    totalHeart += Number(item.avgHeartRate) || 0
    if ((Number(item.steps) || 0) > (Number(best.steps) || 0)) best = item
  }

  var today = source[source.length - 1]
  return {
    todaySteps: Number(today.steps) || 0,
    avgSteps: Math.round(totalSteps / source.length),
    bestSteps: Number(best.steps) || 0,
    bestDate: best.date || '',
    avgHeartRate: Math.round(totalHeart / source.length),
    goalPercent: Number(today.goalPercent) || 0,
    records: source.slice()
  }
}

export function createHistoryController(onChange) {
  function emit(history) {
    var model = summarize(history)
    if (typeof onChange === 'function') onChange(model)
    return model
  }

  return {
    load: function () { historyRepository.getHistory(emit) },
    summarize: summarize
  }
}
