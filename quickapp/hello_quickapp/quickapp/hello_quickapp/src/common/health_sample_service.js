import health from '@service.health'
import { formatTimeHM } from './utils'

var HEART_RATE = 0
var SPO2 = 6
var STRESS = 9
var listeners = []
var fallbackTimer = null
var subscriptionsActive = false
var mockTick = 0
var values = {
  heartRate: 88,
  spo2: 97,
  stress: 28
}
var live = {
  heartRate: false,
  spo2: false,
  stress: false
}
var errorCodes = {
  heartRate: 0,
  spo2: 0,
  stress: 0
}
var updatedAt = 0
var metricUpdatedAt = {
  heartRate: 0,
  spo2: 0,
  stress: 0
}

function resolveDataTypes() {
  if (!health || !health.DATA_TYPES) return
  HEART_RATE = health.DATA_TYPES.HEART_RATE
  SPO2 = health.DATA_TYPES.SPO2
  STRESS = health.DATA_TYPES.STRESS
}

function isServiceAvailable() {
  return !!(health && health.getRecentSamples && health.subscribeSample && health.unsubscribeSample)
}

function snapshot() {
  var anyLive = live.heartRate || live.spo2 || live.stress
  return {
    heartRate: values.heartRate,
    spo2: values.spo2,
    stress: values.stress,
    heartRateLive: live.heartRate,
    spo2Live: live.spo2,
    stressLive: live.stress,
    heartRateErrorCode: errorCodes.heartRate,
    spo2ErrorCode: errorCodes.spo2,
    stressErrorCode: errorCodes.stress,
    anyLive: anyLive,
    serviceAvailable: isServiceAvailable(),
    sourceText: anyLive ? '系统实时数据' : '兼容演示数据',
    heartRateUpdatedAt: metricUpdatedAt.heartRate,
    spo2UpdatedAt: metricUpdatedAt.spo2,
    stressUpdatedAt: metricUpdatedAt.stress,
    updatedAt: updatedAt,
    updatedAtText: formatTimeHM(updatedAt)
  }
}

function emit() {
  var data = snapshot()
  for (var i = 0; i < listeners.length; i++) {
    listeners[i](data)
  }
}

function safeNumber(value, fallback) {
  var number = Number(value)
  return isFinite(number) ? Math.round(number) : fallback
}

function applySample(name, sample) {
  if (!sample || sample.value === undefined || sample.value === null) return
  values[name] = safeNumber(sample.value, values[name])
  live[name] = true
  errorCodes[name] = 0
  metricUpdatedAt[name] = safeNumber(sample.timeStamp, Date.now())
  updatedAt = metricUpdatedAt[name]
  emit()
}

function nameByType(dataType) {
  if (dataType === HEART_RATE) return 'heartRate'
  if (dataType === SPO2) return 'spo2'
  if (dataType === STRESS) return 'stress'
  return ''
}

function loadRecentSamples() {
  if (!isServiceAvailable()) return
  try {
    health.getRecentSamples({
      dataTypes: [HEART_RATE, SPO2, STRESS],
      success: function (list) {
        if (!Array.isArray(list)) return
        for (var i = 0; i < list.length; i++) {
          var name = nameByType(list[i].dataType)
          if (name) applySample(name, list[i].data)
        }
      },
      fail: function (data, code) {
        console.log('health recent samples unavailable, code=' + code)
      }
    })
  } catch (error) {
    console.log('health recent samples unavailable')
  }
}

function subscribeOne(dataType, name) {
  health.subscribeSample({
    dataType: dataType,
    callback: function (sample) {
      applySample(name, sample)
    },
    fail: function (data, code) {
      live[name] = false
      errorCodes[name] = safeNumber(code, 200)
      emit()
      console.log('health ' + name + ' subscription unavailable, code=' + code)
    }
  })
}

function subscribeLiveSamples() {
  if (!isServiceAvailable() || subscriptionsActive) return
  try {
    subscriptionsActive = true
    subscribeOne(HEART_RATE, 'heartRate')
    subscribeOne(SPO2, 'spo2')
    subscribeOne(STRESS, 'stress')
  } catch (error) {
    subscriptionsActive = false
    console.log('health subscriptions unavailable, use demo values')
  }
}

function updateFallbackValues() {
  mockTick++
  var now = Date.now()
  if (!live.heartRate) {
    values.heartRate = 78 + ((mockTick * 7) % 19)
    metricUpdatedAt.heartRate = now
  }
  if (!live.spo2) {
    values.spo2 = 96 + (mockTick % 4)
    metricUpdatedAt.spo2 = now
  }
  if (!live.stress) {
    values.stress = 18 + ((mockTick * 5) % 28)
    metricUpdatedAt.stress = now
  }
  if (!live.heartRate || !live.spo2 || !live.stress) {
    updatedAt = now
    emit()
  }
}

function startFallbackTimer() {
  clearInterval(fallbackTimer)
  fallbackTimer = setInterval(updateFallbackValues, 1000)
}

function stopSubscriptions() {
  clearInterval(fallbackTimer)
  fallbackTimer = null
  if (subscriptionsActive && health && health.unsubscribeSample) {
    try {
      health.unsubscribeSample({ dataType: HEART_RATE })
      health.unsubscribeSample({ dataType: SPO2 })
      health.unsubscribeSample({ dataType: STRESS })
    } catch (error) {
      console.log('health unsubscribe unavailable')
    }
  }
  subscriptionsActive = false
  live.heartRate = false
  live.spo2 = false
  live.stress = false
}

export default {
  start: function (listener) {
    if (typeof listener !== 'function') return
    if (listeners.indexOf(listener) < 0) listeners.push(listener)
    resolveDataTypes()
    updatedAt = Date.now()
    emit()
    loadRecentSamples()
    subscribeLiveSamples()
    startFallbackTimer()
  },

  stop: function (listener) {
    var next = []
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i] !== listener) next.push(listeners[i])
    }
    listeners = next
    if (listeners.length === 0) stopSubscriptions()
  },

  getSnapshot: function () {
    return snapshot()
  }
}
