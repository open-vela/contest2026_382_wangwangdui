var catalog = require('../../workout_catalog')

function pad2(value) { return value < 10 ? '0' + value : '' + value }

function formatDurationMs(durationMs) {
  var safe = Math.max(0, Math.floor((Number(durationMs) || 0) / 1000))
  var hours = Math.floor(safe / 3600)
  var minutes = Math.floor((safe % 3600) / 60)
  var seconds = safe % 60
  return hours > 0 ? pad2(hours) + ':' + pad2(minutes) + ':' + pad2(seconds) : pad2(minutes) + ':' + pad2(seconds)
}

function formatDistance(meters) {
  var value = Math.max(0, Math.round(Number(meters) || 0))
  return value >= 1000 ? (value / 1000).toFixed(2) + ' km' : value + ' m'
}

function gpsView(session) {
  var source = session || {}
  if ((Number(source.gpsDistanceMeters) || 0) > 0) return { text: 'GPS 距离', color: '#30D158' }
  if (source.gpsStatus === 'fallback') return { text: 'GPS 不可用 · 步幅估算', color: '#FF9F0A' }
  if (source.gpsStatus === 'paused') return { text: 'GPS 已暂停', color: '#8E8E93' }
  if (source.gpsStatus === 'active') return { text: 'GPS 已定位', color: '#64D2FF' }
  return { text: '正在定位', color: '#8E8E93' }
}

function stateView(session) {
  var paused = session && session.status === 'paused'
  return paused ? {
    statusText: '已暂停',
    statusColor: '#FFD60A',
    statusSurface: '#2B230D',
    heroBackground: '#19170F',
    metricOpacity: 0.68,
    pauseButtonText: '继续',
    pauseButtonBackground: '#30D158',
    pauseButtonColor: '#061008',
    durationLabelText: '已记录时长'
  } : {
    statusText: '运动中',
    statusColor: '#30D158',
    statusSurface: '#102018',
    heroBackground: '#10151A',
    metricOpacity: 1,
    pauseButtonText: '暂停',
    pauseButtonBackground: '#2C2C2E',
    pauseButtonColor: '#FFFFFF',
    durationLabelText: '运动时长'
  }
}

function project(session) {
  if (!session) return null
  var mode = catalog.get(session.type)
  var gps = gpsView(session)
  var state = stateView(session)
  var heartRate = Number(session.currentHeartRate)
  var hasHeartRate = isFinite(heartRate) && heartRate > 0
  return {
    modeName: mode.name,
    accentColor: mode.color,
    statusText: state.statusText,
    statusColor: state.statusColor,
    statusSurface: state.statusSurface,
    heroBackground: state.heroBackground,
    metricOpacity: state.metricOpacity,
    durationText: formatDurationMs(session.durationMs),
    durationLabelText: state.durationLabelText,
    stepsText: String(Number(session.steps) || 0),
    caloriesText: String(Number(session.calories) || 0),
    distanceText: formatDistance(session.distanceMeters),
    heartRateText: hasHeartRate ? String(Math.round(heartRate)) : '--',
    heartRateLabel: hasHeartRate ? '心率 bpm' : '等待心率',
    gpsText: gps.text,
    gpsColor: gps.color,
    pauseButtonText: state.pauseButtonText,
    pauseButtonBackground: state.pauseButtonBackground,
    pauseButtonColor: state.pauseButtonColor
  }
}

module.exports = { project: project, formatDistance: formatDistance, formatDurationMs: formatDurationMs }
