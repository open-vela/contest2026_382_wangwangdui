var activeSession = null

var MODE_RULES = {
  walk: {
    stepsPerSecond: 1.5,
    strideMeters: 0.7,
    caloriesPerStep: 0.04
  },
  run: {
    stepsPerSecond: 2.5,
    strideMeters: 0.9,
    caloriesPerStep: 0.06
  }
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value
}

function ruleFor(type) {
  return MODE_RULES[type] || MODE_RULES.walk
}

function normalizeType(type) {
  return MODE_RULES[type] ? type : 'walk'
}

function updateRunning(session, now) {
  if (!session || session.status !== 'running') return session
  var current = now || Date.now()
  var elapsedMs = Math.max(0, current - session.lastUpdateAt)
  if (elapsedMs < 500) return session

  var rule = ruleFor(session.type)
  var elapsedSeconds = elapsedMs / 1000
  session.durationMs += elapsedMs
  session.stepCarry += elapsedSeconds * rule.stepsPerSecond
  var newSteps = Math.floor(session.stepCarry)
  session.stepCarry -= newSteps
  session.steps += newSteps
  session.estimatedDistanceMeters = Math.round(session.steps * rule.strideMeters)
  session.distanceMeters = session.gpsDistanceMeters > 0 ? session.gpsDistanceMeters : session.estimatedDistanceMeters
  session.calories = Math.round(session.steps * rule.caloriesPerStep)
  session.lastUpdateAt = current
  return session
}

function rawRecord(session, endTime) {
  return {
    id: session.id,
    type: session.type,
    startTime: session.startedAt,
    endTime: endTime || Date.now(),
    durationSec: Math.floor(session.durationMs / 1000),
    steps: session.steps,
    calories: session.calories,
    distanceMeters: session.distanceMeters,
    distanceSource: session.gpsDistanceMeters > 0 ? 'gps' : 'steps',
    gpsDistanceMeters: session.gpsDistanceMeters || 0,
    gpsPoint: clone(session.gpsPoint),
    avgHeartRate: session.heartSamples > 0
      ? Math.round(session.heartTotal / session.heartSamples)
      : null,
    heartSource: session.heartSamples > 0 && session.heartSource === 'official' ? 'official' : 'none',
    synced: false
  }
}

export default {
  getActive: function () {
    return clone(activeSession)
  },

  restore: function (session) {
    activeSession = session && session.id ? clone(session) : null
    if (activeSession) {
      if (activeSession.heartSource === 'official') {
        if (activeSession.currentHeartRate === undefined) activeSession.currentHeartRate = null
        activeSession.heartTotal = Number(activeSession.heartTotal) || 0
        activeSession.heartSamples = Number(activeSession.heartSamples) || 0
      } else {
        activeSession.currentHeartRate = null
        activeSession.heartTotal = 0
        activeSession.heartSamples = 0
        activeSession.heartSource = null
      }
      updateRunning(activeSession)
    }
    return clone(activeSession)
  },

  start: function (type, now) {
    var startedAt = now || Date.now()
    var normalized = normalizeType(type)
    activeSession = {
      id: 'workout_' + startedAt,
      type: normalized,
      status: 'running',
      startedAt: startedAt,
      lastUpdateAt: startedAt,
      durationMs: 0,
      steps: 0,
      stepCarry: 0,
      calories: 0,
      distanceMeters: 0,
      estimatedDistanceMeters: 0,
      gpsDistanceMeters: 0,
      gpsStatus: 'locating',
      gpsPoint: null,
      currentHeartRate: null,
      heartTotal: 0,
      heartSamples: 0,
      heartSource: null
    }
    return clone(activeSession)
  },

  tick: function (now) {
    if (!activeSession) return null
    updateRunning(activeSession, now)
    return clone(activeSession)
  },

  pause: function (now) {
    if (!activeSession) return null
    if (activeSession.status === 'running') {
      updateRunning(activeSession, now)
      activeSession.status = 'paused'
      activeSession.gpsStatus = 'paused'
    }
    return clone(activeSession)
  },

  resume: function (now) {
    if (!activeSession) return null
    if (activeSession.status === 'paused') {
      activeSession.status = 'running'
      activeSession.gpsStatus = 'locating'
      activeSession.lastUpdateAt = now || Date.now()
    }
    return clone(activeSession)
  },

  updateGps: function (data) {
    if (!activeSession || !data) return this.tick()
    if (data.status) activeSession.gpsStatus = data.status
    if (data.point) activeSession.gpsPoint = clone(data.point)
    if (typeof data.distanceMeters === 'number' && data.distanceMeters >= 0) {
      activeSession.gpsDistanceMeters = Math.round(data.distanceMeters)
      if (activeSession.gpsDistanceMeters > 0) activeSession.distanceMeters = activeSession.gpsDistanceMeters
    }
    return clone(activeSession)
  },

  updateHeartRate: function (value) {
    if (!activeSession) return null
    var number = Number(value)
    if (!isFinite(number) || number <= 0) return clone(activeSession)
    var heartRate = Math.round(number)
    activeSession.currentHeartRate = heartRate
    activeSession.heartTotal += heartRate
    activeSession.heartSamples += 1
    activeSession.heartSource = 'official'
    return clone(activeSession)
  },

  finish: function (now) {
    if (!activeSession) return null
    updateRunning(activeSession, now)
    var record = rawRecord(activeSession, now)
    activeSession = null
    return record
  },

  cancel: function () {
    activeSession = null
  }
}
