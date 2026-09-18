function formatNumber(value) {
  return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function mapActivity(snapshot) {
  var source = snapshot || {}
  var goalPercent = Math.max(0, Math.min(100, Number(source.goalPercent) || 0))
  return {
    stepsText: formatNumber(source.steps),
    stepsGoalText: formatNumber(source.stepsGoal),
    caloriesText: formatNumber(source.calories),
    caloriesGoalText: formatNumber(source.caloriesGoal),
    standText: formatNumber(source.standHours),
    standGoalText: formatNumber(source.standGoal),
    goalPercent: goalPercent,
    goalWidth: goalPercent + '%'
  }
}

export { formatNumber }
