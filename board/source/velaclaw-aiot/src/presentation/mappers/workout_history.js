function mapWorkoutHistory(records) {
  var source = records || []
  var result = []
  var totalSteps = 0

  for (var i = 0; i < source.length; i++) {
    var record = source[i]
    totalSteps += Number(record.steps) || 0
    result.push({
      id: record.id,
      typeName: record.typeName,
      startText: record.startText,
      durationText: record.durationText,
      steps: record.steps,
      distanceText: record.distanceText,
      calories: record.calories,
      syncText: record.synced ? '已同步' : '待同步',
      distanceSourceText: record.distanceSource === 'gps' ? 'GPS 距离' : '步幅估算'
    })
  }

  return {
    records: result,
    totalCount: result.length.toString(),
    totalSteps: Math.round(totalSteps).toString(),
    emptyVisible: result.length === 0
  }
}

module.exports = {
  mapWorkoutHistory: mapWorkoutHistory
}
