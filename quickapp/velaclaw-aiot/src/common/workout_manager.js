import storageAdapter from './storage_adapter'
import { parseStorageValue, pad2, formatDateTime } from './utils'
import watchData from './watch_data'

var ACTIVE_KEY = 'active_workout_v1'
var RECORDS_KEY = 'workout_records_v1'
var MAX_RECORDS = 30
var activeSession = null

var MODE_CONFIG = {
  walk: {
    name: '步行',
    stepsPerSecond: 1.5,
    strideMeters: 0.7,
    caloriesPerStep: 0.04,
    color: '#30D158'
  },
  run: {
    name: '跑步',
    stepsPerSecond: 2.5,
    strideMeters: 0.9,
    caloriesPerStep: 0.06,
    color: '#FF9F0A'
  }
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value
}

function safeSet(key, value, callback) {
  storageAdapter.set(key, value, function (result) {
    if (callback) callback(result)
  })
}

function safeGet(key, success, fail) {
  storageAdapter.get(key, function (raw) {
    if (raw !== undefined && raw !== '') {
      success({ value: raw })
    } else if (fail) {
      fail()
    } else {
      success({ value: '' })
    }
  })
}

function safeDelete(key) {
  storageAdapter.delete(key)
}

function parseJson(data, fallback) {
  var raw = parseStorageValue(data)
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch (e) {
    return fallback
  }
}

function getConfig(type) {
  return MODE_CONFIG[type] || MODE_CONFIG.walk
}

function formatDuration(seconds) {
  var safe = Math.max(0, Math.floor(seconds || 0))
  var hours = Math.floor(safe / 3600)
  var minutes = Math.floor((safe % 3600) / 60)
  var secs = safe % 60
  if (hours > 0) {
    return pad2(hours) + ':' + pad2(minutes) + ':' + pad2(secs)
  }
  return pad2(minutes) + ':' + pad2(secs)
}

function updateRunningSession(session, now) {
  if (!session || session.status !== 'running') {
    return session
  }
  var current = now || Date.now()
  var elapsedMs = Math.max(0, current - session.lastUpdateAt)
  if (elapsedMs < 500) {
    return session
  }

  var config = getConfig(session.type)
  var elapsedSeconds = elapsedMs / 1000
  session.durationMs += elapsedMs
  session.stepCarry += elapsedSeconds * config.stepsPerSecond
  var newSteps = Math.floor(session.stepCarry)
  session.stepCarry -= newSteps
  session.steps += newSteps
  session.estimatedDistanceMeters = Math.round(session.steps * config.strideMeters)
  session.distanceMeters = session.gpsDistanceMeters > 0 ? session.gpsDistanceMeters : session.estimatedDistanceMeters
  session.calories = Math.round(session.steps * config.caloriesPerStep)
  session.currentHeartRate = session.type === 'run' ? 118 + (session.steps % 12) : 86 + (session.steps % 10)
  session.heartTotal += session.currentHeartRate
  session.heartSamples += 1
  session.lastUpdateAt = current
  return session
}

function saveActive() {
  if (!activeSession) {
    safeDelete(ACTIVE_KEY)
    return
  }
  safeSet(ACTIVE_KEY, JSON.stringify(activeSession))
}

function toView(session) {
  if (!session) return null
  var config = getConfig(session.type)
  return {
    id: session.id,
    type: session.type,
    typeName: config.name,
    color: config.color,
    status: session.status,
    statusText: session.status === 'running' ? '运动中' : '已暂停',
    durationSec: Math.floor(session.durationMs / 1000),
    durationText: formatDuration(session.durationMs / 1000),
    steps: session.steps,
    stepsText: session.steps.toString(),
    calories: session.calories,
    caloriesText: session.calories.toString(),
    distanceMeters: session.distanceMeters,
    distanceText: session.distanceMeters >= 1000 ? (session.distanceMeters / 1000).toFixed(2) + ' km' : session.distanceMeters + ' m',
    distanceSource: session.gpsDistanceMeters > 0 ? 'gps' : 'steps',
    gpsDistanceMeters: session.gpsDistanceMeters || 0,
    gpsStatus: session.gpsStatus || '未定位',
    gpsPoint: clone(session.gpsPoint),
    currentHeartRate: session.currentHeartRate,
    startText: formatDateTime(session.startedAt)
  }
}

function loadRecords(callback) {
  safeGet(
    RECORDS_KEY,
    function (data) {
      var records = parseJson(data, [])
      callback(Array.isArray(records) ? records : [])
    },
    function () {
      callback([])
    }
  )
}

function saveRecord(record, callback) {
  storageAdapter.updateJSON(RECORDS_KEY, [], function (records) {
    records = Array.isArray(records) ? records : []
    records.unshift(record)
    if (records.length > MAX_RECORDS) {
      records = records.slice(0, MAX_RECORDS)
    }
    return records
  }, function (records, result) {
    if (callback) callback(clone(record), result)
  })
}

function makeRecord(session) {
  var config = getConfig(session.type)
  return {
    id: session.id,
    type: session.type,
    typeName: config.name,
    startTime: session.startedAt,
    endTime: Date.now(),
    startText: formatDateTime(session.startedAt),
    durationSec: Math.floor(session.durationMs / 1000),
    durationText: formatDuration(session.durationMs / 1000),
    steps: session.steps,
    calories: session.calories,
    distanceMeters: session.distanceMeters,
    distanceText: session.distanceMeters >= 1000 ? (session.distanceMeters / 1000).toFixed(2) + ' km' : session.distanceMeters + ' m',
    distanceSource: session.gpsDistanceMeters > 0 ? 'gps' : 'steps',
    gpsDistanceMeters: session.gpsDistanceMeters || 0,
    gpsPoint: clone(session.gpsPoint),
    avgHeartRate: session.heartSamples > 0 ? Math.round(session.heartTotal / session.heartSamples) : session.currentHeartRate,
    synced: false
  }
}

export default {
  getModes() {
    return [
      { type: 'walk', name: '步行', desc: '轻量有氧与日常健走', color: '#30D158' },
      { type: 'run', name: '跑步', desc: '更高步频与热量消耗', color: '#FF9F0A' }
    ]
  },

  start(type, callback) {
    var now = Date.now()
    var config = getConfig(type)
    activeSession = {
      id: 'workout_' + now,
      type: MODE_CONFIG[type] ? type : 'walk',
      status: 'running',
      startedAt: now,
      lastUpdateAt: now,
      durationMs: 0,
      steps: 0,
      stepCarry: 0,
      calories: 0,
      distanceMeters: 0,
      estimatedDistanceMeters: 0,
      gpsDistanceMeters: 0,
      gpsStatus: '正在定位',
      gpsPoint: null,
      currentHeartRate: type === 'run' ? 118 : 86,
      heartTotal: type === 'run' ? 118 : 86,
      heartSamples: 1,
      modeName: config.name
    }
    saveActive()
    if (callback) callback(toView(activeSession))
  },

  loadActive(callback) {
    if (activeSession) {
      updateRunningSession(activeSession)
      callback(toView(activeSession))
      return
    }
    safeGet(
      ACTIVE_KEY,
      function (data) {
        var parsed = parseJson(data, null)
        if (parsed && parsed.id) {
          activeSession = parsed
          updateRunningSession(activeSession)
          saveActive()
          callback(toView(activeSession))
        } else {
          callback(null)
        }
      },
      function () {
        callback(null)
      }
    )
  },

  tick() {
    if (!activeSession) return null
    updateRunningSession(activeSession)
    return toView(activeSession)
  },

  persistActive() {
    if (!activeSession) return
    updateRunningSession(activeSession)
    saveActive()
  },

  updateGps(data) {
    if (!activeSession || !data) return this.tick()
    if (data.statusText) {
      activeSession.gpsStatus = data.statusText
    }
    if (data.point) {
      activeSession.gpsPoint = clone(data.point)
    }
    if (typeof data.distanceMeters === 'number' && data.distanceMeters >= 0) {
      activeSession.gpsDistanceMeters = Math.round(data.distanceMeters)
      if (activeSession.gpsDistanceMeters > 0) {
        activeSession.distanceMeters = activeSession.gpsDistanceMeters
      }
    }
    return toView(activeSession)
  },

  pause() {
    if (!activeSession || activeSession.status !== 'running') return this.tick()
    updateRunningSession(activeSession)
    activeSession.status = 'paused'
    saveActive()
    return toView(activeSession)
  },

  resume() {
    if (!activeSession || activeSession.status !== 'paused') return this.tick()
    activeSession.status = 'running'
    activeSession.lastUpdateAt = Date.now()
    saveActive()
    return toView(activeSession)
  },

  finish(callback) {
    if (!activeSession) {
      if (callback) callback(null)
      return
    }
    updateRunningSession(activeSession)
    var record = makeRecord(activeSession)
    activeSession = null
    safeDelete(ACTIVE_KEY)
    watchData.addActivityData(record.steps, record.calories)
    watchData.saveTodayHealth()
    saveRecord(record, callback)
  },

  cancel() {
    activeSession = null
    safeDelete(ACTIVE_KEY)
  },

  getRecords(callback) {
    loadRecords(function (records) {
      callback(clone(records))
    })
  },

  markAllSynced(callback) {
    storageAdapter.updateJSON(RECORDS_KEY, [], function (records) {
      records = Array.isArray(records) ? records : []
      for (var i = 0; i < records.length; i++) {
        records[i].synced = true
      }
      return records
    }, function (records, result) {
      if (callback) callback(clone(records), result)
    })
  },

  formatDuration: formatDuration
}
