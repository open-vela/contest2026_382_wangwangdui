function formatNumber(value) {
  return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function mapWatchSnapshot(activity, health) {
  var recent = []
  var values = health && health.recentHeartRates ? health.recentHeartRates : []
  for (var i = 0; i < values.length; i++) recent.push({ value: values[i] })
  var goalPercent = activity.goalPercent || 0
  var stepsPercent = activity.stepsPercent || 0
  return {
    steps: activity.steps,
    stepsText: formatNumber(activity.steps),
    stepsGoal: activity.stepsGoal,
    stepsGoalText: formatNumber(activity.stepsGoal),
    calories: activity.calories,
    caloriesGoal: activity.caloriesGoal,
    standHours: activity.standHours,
    standGoal: activity.standGoal,
    currentHeartRate: health.currentHeartRate,
    heartRateData: recent,
    goalPercent: goalPercent,
    goalProgressWidth: goalPercent + '%',
    stepsProgressWidth: stepsPercent + '%'
  }
}
