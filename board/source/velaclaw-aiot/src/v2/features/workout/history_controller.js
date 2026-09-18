import workoutRepository from '../../../domain/workout/repository'

function summarize(records) {
  var source = Array.isArray(records) ? records : []
  var totalSteps = 0
  for (var i = 0; i < source.length; i++) totalSteps += Number(source[i].steps) || 0
  return { totalSteps: totalSteps, records: source.slice() }
}

export function createWorkoutHistoryController(onChange) {
  function emit(records) {
    var model = summarize(records)
    if (typeof onChange === 'function') onChange(model)
    return model
  }
  return {
    refresh: function () { workoutRepository.getRecords(emit) },
    markAllSynced: function () { workoutRepository.markAllSynced(function (records) { emit(records) }) },
    summarize: summarize
  }
}
