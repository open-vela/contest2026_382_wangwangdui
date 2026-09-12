var MODE_PRESENTATION = {
  walk: {
    name: '步行',
    desc: '轻量有氧与日常健走',
    color: '#30D158'
  },
  run: {
    name: '跑步',
    desc: '更高步频与热量消耗',
    color: '#FF9F0A'
  }
}

function pad2(value) {
  return value < 10 ? '0' + value : '' + value
}

function formatDuration(seconds) {
  var safe = Math.max(0, Math.floor(seconds || 0))
  var hours = Math.floor(safe / 3600)
  var minutes = Math.floor((safe % 3600) / 60)
  var secs = safe % 60
  if (hours > 0) return pad2(hours) + ':' + pad2(minutes) + ':' + pad2(secs)
  return pad2(minutes) + ':' + pad2(secs)
}

function formatDateTime(timestamp) {
  var date = new Date(timestamp)
  return pad2(date.getMonth() + 1) + '/' + pad2(date.getDate()) + ' ' +
    pad2(date.getHours()) + ':' + pad2(date.getMinutes())
}

function formatDistance(meters) {
  var value = Math.max(0, Math.round(Number(meters) || 0))
  return value >= 1000 ? (value / 1000).toFixed(2) + ' km' : value + ' m'
}

function mode(type) {
  return MODE_PRESENTATION[type] || MODE_PRESENTATION.walk
}

function gpsStatusText(status) {
  if (status === 'active') return 'GPS 已定位'
  if (status === 'paused') return 'GPS 已暂停'
  if (status === 'fallback') return 'GPS 不可用'
  return '正在定位'
}

export function mapSession(session) {
  if (!session) return null
  var appearance = mode(session.type)
  return {
    id: session.id,
    type: session.type,
    typeName: appearance.name,
    color: appearance.color,
    status: session.status,
    statusText: session.status === 'running' ? '运动中' : '已暂停',
    durationSec: Math.floor(session.durationMs / 1000),
    durationText: formatDuration(session.durationMs / 1000),
    steps: session.steps,
    stepsText: session.steps.toString(),
    calories: session.calories,
    caloriesText: session.calories.toString(),
    distanceMeters: session.distanceMeters,
    distanceText: formatDistance(session.distanceMeters),
    distanceSource: session.gpsDistanceMeters > 0 ? 'gps' : 'steps',
    gpsDistanceMeters: session.gpsDistanceMeters || 0,
    gpsStatus: gpsStatusText(session.gpsStatus),
    gpsPoint: session.gpsPoint,
    currentHeartRate: session.currentHeartRate,
    startText: formatDateTime(session.startedAt)
  }
}

export function mapRecord(record) {
  if (!record) return null
  var appearance = mode(record.type)
  var result = {}
  for (var key in record) result[key] = record[key]
  result.typeName = appearance.name
  result.startText = formatDateTime(record.startTime)
  result.durationText = formatDuration(record.durationSec)
  result.distanceText = formatDistance(record.distanceMeters)
  return result
}

export function getModes() {
  return [
    { type: 'walk', name: MODE_PRESENTATION.walk.name, desc: MODE_PRESENTATION.walk.desc, color: MODE_PRESENTATION.walk.color },
    { type: 'run', name: MODE_PRESENTATION.run.name, desc: MODE_PRESENTATION.run.desc, color: MODE_PRESENTATION.run.color }
  ]
}

export { formatDuration }
