import location from '../../../capabilities/location'
import heartRate from '../../../capabilities/heart_rate'
import workoutState from '../../../domain/workout/state_machine'
import workoutRepository from '../../../domain/workout/repository'
import activityStore from '../../../domain/activity/store'
import historyRepository from '../../../domain/history/repository'
var distance = require('../../../domain/workout/distance')

function emitValue(onChange, session) {
  if (typeof onChange === 'function') onChange(session)
  return session
}

export function createWorkoutController(onChange) {
  var timer = null
  var fallbackTimer = null
  var lastPoint = null
  var gpsDistance = 0
  var persistTicks = 0
  var runtimeActive = false
  var heartRateSubscribed = false
  var lifecycleGeneration = 0

  function emit(session) { return emitValue(onChange, session) }
  function persist() { var active = workoutState.getActive(); if (active) workoutRepository.saveActive(active) }
  function isCurrent(generation) { return generation === lifecycleGeneration }

  function stopLocation() {
    clearTimeout(fallbackTimer)
    fallbackTimer = null
    location.unsubscribe(onLocation)
    lastPoint = null
  }

  function onLocation(point) {
    if (!runtimeActive) return
    var active = workoutState.getActive()
    if (!active || active.status !== 'running') return
    clearTimeout(fallbackTimer)
    fallbackTimer = null
    if (!point) return
    if (lastPoint) gpsDistance += distance.acceptedSegment(lastPoint, point)
    lastPoint = point
    emit(workoutState.updateGps({ status: 'active', point: point, distanceMeters: Math.round(gpsDistance) }))
  }

  function startLocation() {
    stopLocation()
    var active = workoutState.getActive()
    if (!active || active.status !== 'running') return
    gpsDistance = active.gpsDistanceMeters || 0
    var subscribed = location.subscribe(onLocation)
    if (!subscribed) {
      emit(workoutState.updateGps({ status: 'fallback' }))
      return
    }
    fallbackTimer = setTimeout(function () {
      if (!runtimeActive) return
      var current = workoutState.getActive()
      if (current && current.status === 'running' && !lastPoint) emit(workoutState.updateGps({ status: 'fallback' }))
    }, 6000)
  }

  function stopHeartRate() {
    if (!heartRateSubscribed) return
    heartRate.unsubscribe(onHeartRate)
    heartRateSubscribed = false
  }

  function onHeartRate(snapshot) {
    if (!runtimeActive || !snapshot || !snapshot.live || snapshot.source !== 'live') return
    var active = workoutState.getActive()
    if (!active || active.status !== 'running') return
    var value = Number(snapshot.value)
    if (!isFinite(value) || value <= 0) return
    emit(workoutState.updateHeartRate(value))
  }

  function startHeartRate() {
    stopHeartRate()
    var active = workoutState.getActive()
    if (!active || active.status !== 'running') return
    heartRateSubscribed = true
    heartRate.subscribe(onHeartRate)
  }

  function stopTimer() {
    clearInterval(timer)
    timer = null
  }

  function ensureTimer() {
    if (timer) return
    timer = setInterval(function () {
      if (!runtimeActive) return
      var session = workoutState.tick()
      if (!session) { stopTimer(); return }
      if (session.status !== 'running') { stopTimer(); return }
      emit(session)
      persistTicks++
      if (persistTicks >= 10) { persistTicks = 0; persist() }
    }, 1000)
  }

  function startRuntime() {
    if (runtimeActive) return
    runtimeActive = true
    var active = workoutState.getActive()
    if (active && active.status === 'running') {
      ensureTimer()
      startLocation()
      startHeartRate()
    }
  }

  function stopRuntime(shouldPersist) {
    var wasActive = runtimeActive
    runtimeActive = false
    lifecycleGeneration++
    stopTimer()
    stopLocation()
    stopHeartRate()
    if (wasActive && shouldPersist !== false) persist()
  }

  return {
    start: function (type, callback) {
      var generation = ++lifecycleGeneration
      var session = workoutState.start(type)
      workoutRepository.saveActive(session, function () {
        if (!isCurrent(generation)) return
        startRuntime()
        emit(session)
        if (callback) callback(session)
      })
    },
    loadActive: function (callback) {
      var generation = ++lifecycleGeneration
      var current = workoutState.getActive()
      if (current) {
        current = workoutState.tick()
        if (!isCurrent(generation)) return
        startRuntime()
        emit(current)
        if (callback) callback(current)
        return
      }
      workoutRepository.loadActive(function (stored) {
        if (!isCurrent(generation)) return
        if (!stored) { if (callback) callback(null); return }
        var restored = workoutState.restore(stored)
        startRuntime()
        persist()
        emit(restored)
        if (callback) callback(restored)
      })
    },
    pause: function () {
      var session = workoutState.pause()
      stopTimer()
      stopLocation()
      stopHeartRate()
      persist()
      return emit(session)
    },
    resume: function () {
      var session = workoutState.resume()
      if (!session) return emit(session)
      if (!runtimeActive) startRuntime()
      else {
        ensureTimer()
        startLocation()
        startHeartRate()
      }
      persist()
      return emit(session)
    },
    finish: function (callback) {
      stopRuntime(false)
      var record = workoutState.finish()
      workoutRepository.clearActive()
      if (!record) { if (callback) callback(null); return }
      activityStore.addAndPersist(record.steps, record.calories, function (activitySnapshot) {
        var pending = 2
        var savedRecord = record
        function done() { pending--; if (pending === 0 && callback) callback(savedRecord) }
        historyRepository.saveToday(activitySnapshot, done)
        workoutRepository.saveRecord(record, function (saved) { savedRecord = saved || record; done() })
      })
    },
    cancel: function () { stopRuntime(false); workoutState.cancel(); workoutRepository.clearActive() },
    stop: function () { stopRuntime(true) },
    refresh: function () { var active = workoutState.getActive(); if (active) emit(workoutState.tick()) },
    getRecords: function (callback) { workoutRepository.getRecords(function (records) { if (callback) callback(Array.isArray(records) ? records : []) }) },
    markAllSynced: function (callback) { workoutRepository.markAllSynced(function (records, result) { if (callback) callback(Array.isArray(records) ? records : [], result) }) }
  }
}
