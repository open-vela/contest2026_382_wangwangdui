import activityStore from '../../../domain/activity/store'
import healthStore from '../../../domain/health/store'
import historyRepository from '../../../domain/history/repository'
import workoutRepository from '../../../domain/workout/repository'
import settingsStore from '../../../domain/settings/store'
import transportFactory from './mock_transport'
var protocol = require('./protocol')

export function createSyncController(onChange) {
  var capability = transportFactory.capability()
  var transport = transportFactory.create()
  var active = false
  var lifecycleEpoch = 0
  var state = {
    connected: false,
    syncing: false,
    progress: 0,
    phase: 'idle',
    lastSyncAt: 0,
    transportMode: capability.mode,
    realBleAvailable: !!capability.realBleAvailable,
    packetCount: 0,
    payloadChars: 0,
    ackSent: 0,
    ackTotal: 0,
    todaySteps: null,
    historyCount: 0,
    workoutCount: 0
  }

  function snapshot() {
    var value = {}
    for (var key in state) value[key] = state[key]
    return value
  }

  function emit() {
    var value = snapshot()
    if (typeof onChange === 'function') onChange(value)
    return value
  }

  function isLive(epoch) {
    return active && epoch === lifecycleEpoch
  }

  function collect(callback, epoch) {
    var expectedEpoch = epoch === undefined ? lifecycleEpoch : epoch
    var activity = activityStore.getSnapshot()
    var health = healthStore.getSnapshot()
    var history = []
    var workouts = []
    var pending = 2
    function done() {
      pending--
      if (pending > 0 || !isLive(expectedEpoch)) return
      state.todaySteps = Number(activity.steps) || 0
      state.historyCount = history.length
      state.workoutCount = workouts.length
      var payload = {
        version: protocol.VERSION,
        deviceId: 'vela-band-demo',
        syncedAt: Date.now(),
        health: { steps: activity.steps, calories: activity.calories, standHours: activity.standHours, heartRate: health.heartRate },
        history: history,
        workouts: workouts
      }
      emit()
      if (callback) callback(payload)
    }
    historyRepository.getHistory(function (value) {
      if (!isLive(expectedEpoch)) return
      history = Array.isArray(value) ? value : []
      done()
    })
    workoutRepository.getRecords(function (value) {
      if (!isLive(expectedEpoch)) return
      workouts = Array.isArray(value) ? value : []
      done()
    })
  }

  function loadSettings() {
    if (active) return emit()
    active = true
    lifecycleEpoch++
    var epoch = lifecycleEpoch
    settingsStore.load(function (settings) {
      if (!isLive(epoch)) return
      state.lastSyncAt = Number(settings.lastSyncAt) || 0
      state.connected = false
      state.syncing = false
      state.progress = 0
      state.phase = 'idle'
      state.packetCount = 0
      state.payloadChars = 0
      state.ackSent = 0
      state.ackTotal = 0
      emit()
      collect(null, epoch)
    })
    return emit()
  }

  function toggleConnection() {
    if (!active) return emit()
    if (state.syncing) { state.phase = 'disconnect-blocked'; return emit() }
    if (state.phase === 'connecting') {
      transport.disconnect()
      state.connected = false
      state.phase = 'disconnected'
      return emit()
    }
    if (state.connected) {
      transport.disconnect()
      state.connected = false
      state.progress = 0
      state.phase = 'disconnected'
      state.packetCount = 0
      state.payloadChars = 0
      state.ackSent = 0
      state.ackTotal = 0
      return emit()
    }
    var epoch = lifecycleEpoch
    state.phase = 'connecting'
    emit()
    transport.connect({
      success: function () {
        if (!isLive(epoch) || state.phase !== 'connecting') return
        state.connected = true
        state.phase = 'connected'
        emit()
      },
      fail: function () {
        if (!isLive(epoch) || state.phase !== 'connecting') return
        state.connected = false
        state.phase = 'connect-failed'
        emit()
      }
    })
    return emit()
  }

  function sync() {
    if (!active) return emit()
    if (!state.connected) { state.phase = 'connect-required'; return emit() }
    if (state.syncing) return emit()
    var epoch = lifecycleEpoch
    state.syncing = true
    state.progress = 0
    state.packetCount = 0
    state.payloadChars = 0
    state.ackSent = 0
    state.ackTotal = 0
    state.phase = 'collecting'
    emit()
    collect(function (payload) {
      if (!isLive(epoch) || !state.syncing) return
      var transfer = protocol.encode(payload, 96)
      state.packetCount = transfer.packets.length
      state.payloadChars = Number(transfer.bytesText) || 0
      state.ackTotal = transfer.packets.length
      state.phase = 'waiting-ack'
      emit()
      transport.send(transfer.packets, {
        progress: function (progressState) {
          if (!isLive(epoch) || !state.syncing) return
          state.progress = progressState.percent
          state.ackSent = progressState.sent
          state.ackTotal = progressState.total
          state.phase = 'sending'
          emit()
        },
        success: function () {
          if (!isLive(epoch) || !state.syncing) return
          state.syncing = false
          state.progress = 100
          state.phase = 'completed'
          state.lastSyncAt = Date.now()
          settingsStore.update('lastSyncAt', state.lastSyncAt)
          workoutRepository.markAllSynced(function () {
            if (isLive(epoch)) collect(null, epoch)
          })
          emit()
        },
        fail: function () {
          if (!isLive(epoch) || !state.syncing) return
          state.syncing = false
          state.phase = 'failed'
          emit()
        }
      })
    }, epoch)
    return emit()
  }

  function stop() {
    if (!active) return
    active = false
    lifecycleEpoch++
    transport.disconnect()
    state.connected = false
    state.syncing = false
    state.progress = 0
    state.phase = 'idle'
    state.ackSent = 0
    state.ackTotal = 0
  }

  return {
    load: loadSettings,
    refreshPreview: function () { if (active) collect(null, lifecycleEpoch) },
    toggleConnection: toggleConnection,
    sync: sync,
    stop: stop,
    refresh: emit
  }
}
