import activityStore from '../../../domain/activity/store'

function semanticMetrics(snapshot) {
  var source = snapshot || {}
  return [
    { id: 'steps', current: Number(source.steps) || 0, goal: Number(source.stepsGoal) || 0 },
    { id: 'calories', current: Number(source.calories) || 0, goal: Number(source.caloriesGoal) || 0 },
    { id: 'stand', current: Number(source.standHours) || 0, goal: Number(source.standGoal) || 0 }
  ]
}

export function createActivityController(onChange) {
  var active = false
  var lifecycleEpoch = 0

  function emit(snapshot) {
    var value = semanticMetrics(snapshot || activityStore.getSnapshot())
    if (typeof onChange === 'function') onChange(value)
    return value
  }

  return {
    start: function () {
      if (active) return emit(activityStore.getSnapshot())
      active = true
      lifecycleEpoch++
      var epoch = lifecycleEpoch
      emit(activityStore.getSnapshot())
      activityStore.hydrate(function (snapshot) {
        if (!active || epoch !== lifecycleEpoch) return
        emit(snapshot)
      })
    },
    stop: function () {
      if (!active) return
      active = false
      lifecycleEpoch++
    },
    refresh: function () { if (active) return emit(activityStore.getSnapshot()); return semanticMetrics(activityStore.getSnapshot()) },
    getSnapshot: function () { return semanticMetrics(activityStore.getSnapshot()) }
  }
}
