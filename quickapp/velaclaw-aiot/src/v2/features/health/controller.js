import healthStore from '../../../domain/health/store'
var healthMetrics = require('../../../domain/health/metrics')

export function createHealthController(onChange) {
  var heartValues = []
  var spo2Values = []
  var stressValues = []
  var latest = null
  var started = false
  var lifecycleGeneration = 0
  var activeGeneration = 0

  function official(data, prefix) {
    return !!(data && data[prefix + 'Live'] && data[prefix + 'Source'] === 'live')
  }

  function updateWindow(values, changed, value, allowed) {
    var number = Number(value)
    if (!changed || !allowed || !isFinite(number)) return values
    return healthMetrics.pushWindow(values, Math.round(number), 10)
  }

  function seedCurrent(data) {
    if (!data) return
    if (!heartValues.length && official(data, 'heartRate') && Number(data.heartRate) > 0) heartValues = [Math.round(Number(data.heartRate))]
    if (!spo2Values.length && official(data, 'spo2') && Number(data.spo2) > 0) spo2Values = [Math.round(Number(data.spo2))]
    if (!stressValues.length && official(data, 'stress') && isFinite(Number(data.stress)) && Number(data.stress) >= 0) stressValues = [Math.round(Number(data.stress))]
  }

  function emit() {
    var data = latest || healthStore.getSnapshot()
    var heartAvailable = official(data, 'heartRate')
    var spo2Available = official(data, 'spo2')
    var stressAvailable = official(data, 'stress')
    var heart = heartAvailable ? (Number(data.heartRate) || 0) : 0
    var spo2 = spo2Available ? (Number(data.spo2) || 0) : 0
    var stress = stressAvailable && isFinite(Number(data.stress)) ? Number(data.stress) : null
    var heartStats = healthMetrics.stats(heartValues)
    var stressStats = healthMetrics.stats(stressValues)
    var model = {
      heartRate: heart,
      spo2: spo2,
      stress: stress,
      heartZone: heartAvailable ? healthMetrics.classifyHeartRate(heart) : 'waiting',
      spo2Zone: spo2Available ? (spo2 < 95 ? 'attention' : 'good') : 'waiting',
      stressZone: stressAvailable ? healthMetrics.classifyStress(stress) : 'waiting',
      dailyMin: heartStats.min,
      dailyMax: heartStats.max,
      stressMin: stressStats.min,
      stressAvg: stressStats.avg,
      stressMax: stressStats.max,
      heartSource: { live: heartAvailable, errorCode: Number(data.heartRateErrorCode) || 0, mode: data.heartRateSource || 'fallback' },
      spo2Source: { live: spo2Available, errorCode: Number(data.spo2ErrorCode) || 0, mode: data.spo2Source || 'fallback' },
      stressSource: { live: stressAvailable, errorCode: Number(data.stressErrorCode) || 0, mode: data.stressSource || 'fallback' },
      anyLive: heartAvailable || spo2Available || stressAvailable,
      serviceAvailable: !!data.serviceAvailable,
      updatedAt: Number(data.updatedAt) || 0,
      heartValues: heartValues.slice(),
      spo2Values: spo2Values.slice(),
      stressValues: stressValues.slice()
    }
    if (typeof onChange === 'function') onChange(model)
    return model
  }

  function onHealth(data) {
    var generation = activeGeneration
    if (!started || generation !== lifecycleGeneration) return
    latest = data
    seedCurrent(data)
    heartValues = updateWindow(heartValues, data.heartRateChanged, data.heartRate, official(data, 'heartRate'))
    spo2Values = updateWindow(spo2Values, data.spo2Changed, data.spo2, official(data, 'spo2'))
    stressValues = updateWindow(stressValues, data.stressChanged, data.stress, official(data, 'stress'))
    emit()
  }

  return {
    start: function () {
      if (started) { emit(); return }
      started = true
      activeGeneration = ++lifecycleGeneration
      healthStore.subscribeAll(onHealth)
    },
    stop: function () {
      if (!started) return
      started = false
      lifecycleGeneration++
      healthStore.unsubscribe(onHealth)
    },
    refresh: emit
  }
}
