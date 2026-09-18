var catalog = require('../../workout_catalog')
var workoutView = require('./view')

function pad2(value) { return value < 10 ? '0' + value : '' + value }
function formatNumber(value) { return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') }
function formatDateTime(timestamp) {
  var date = new Date(Number(timestamp) || 0)
  return pad2(date.getMonth() + 1) + '/' + pad2(date.getDate()) + ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes())
}

function project(model) {
  var source = model || { records: [], totalSteps: 0 }
  var records = []
  var input = Array.isArray(source.records) ? source.records : []
  for (var i = 0; i < input.length; i++) {
    var record = input[i]
    var mode = catalog.get(record.type)
    records.push({
      id: record.id,
      typeName: mode.name,
      startText: formatDateTime(record.startTime),
      durationText: workoutView.formatDurationMs((Number(record.durationSec) || 0) * 1000),
      stepsText: formatNumber(record.steps),
      caloriesText: formatNumber(record.calories),
      distanceText: workoutView.formatDistance(record.distanceMeters),
      heartText: record.avgHeartRate ? record.avgHeartRate + ' bpm' : '--',
      syncText: record.synced ? '已同步' : '待同步',
      distanceSourceText: record.distanceSource === 'gps' ? 'GPS 距离' : '步幅估算'
    })
  }
  return {
    totalCount: String(records.length),
    totalSteps: formatNumber(source.totalSteps),
    empty: records.length === 0,
    records: records
  }
}

module.exports = { project: project }
