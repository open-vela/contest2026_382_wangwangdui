import workoutState from '../domain/workout/state_machine'
import workoutRepository from '../domain/workout/repository'
import activityStore from '../domain/activity/store'
import historyRepository from '../domain/history/repository'
import { mapSession, mapRecord, getModes, formatDuration } from '../presentation/mappers/workout'

// Legacy orchestration entry. Pages keep this API while state, persistence and display
// mapping live in their owning layers. New code should import those modules directly.
function persistCurrent(callback) {
  workoutRepository.saveActive(workoutState.getActive(), callback)
}

function gpsStatusFromLegacyText(text) {
  if (!text) return ''
  if (text.indexOf('暂停') >= 0) return 'paused'
  if (text.indexOf('定位') >= 0 && text.indexOf('正在') < 0) return 'active'
  if (text.indexOf('不可用') >= 0 || text.indexOf('估算') >= 0) return 'fallback'
  return 'locating'
}

function afterBoth(first, second, done) {
  var pending = 2
  var firstResult = null
  var secondResult = null
  first(function (value) {
    firstResult = value
    pending--
    if (pending === 0) done(firstResult, secondResult)
  })
  second(function (value) {
    secondResult = value
    pending--
    if (pending === 0) done(firstResult, secondResult)
  })
}

export default {
  getModes: getModes,

  start: function (type, callback) {
    var session = workoutState.start(type)
    workoutRepository.saveActive(session, function () {
      if (callback) callback(mapSession(session))
    })
  },

  loadActive: function (callback) {
    var current = workoutState.getActive()
    if (current) {
      current = workoutState.tick()
      if (callback) callback(mapSession(current))
      return
    }
    workoutRepository.loadActive(function (stored) {
      if (!stored) {
        if (callback) callback(null)
        return
      }
      var restored = workoutState.restore(stored)
      persistCurrent()
      if (callback) callback(mapSession(restored))
    })
  },

  tick: function () {
    return mapSession(workoutState.tick())
  },

  persistActive: function () {
    if (!workoutState.getActive()) return
    workoutState.tick()
    persistCurrent()
  },

  updateGps: function (data) {
    var payload = data || {}
    var session = workoutState.updateGps({
      status: payload.status || gpsStatusFromLegacyText(payload.statusText),
      point: payload.point,
      distanceMeters: payload.distanceMeters
    })
    return mapSession(session)
  },

  pause: function () {
    var session = workoutState.pause()
    persistCurrent()
    return mapSession(session)
  },

  resume: function () {
    var session = workoutState.resume()
    persistCurrent()
    return mapSession(session)
  },

  finish: function (callback) {
    var record = workoutState.finish()
    if (!record) {
      if (callback) callback(null)
      return
    }

    workoutRepository.clearActive()

    // Persist Activity first. Pages may run in separate JS contexts, so an in-memory
    // mutation alone is not a valid cross-page contract on Vela. The committed snapshot
    // becomes the single source used by Today and 7-day history.
    activityStore.addAndPersist(record.steps, record.calories, function (activitySnapshot) {
      afterBoth(
        function (done) {
          historyRepository.saveToday(activitySnapshot, function (history) {
            done(history)
          })
        },
        function (done) {
          workoutRepository.saveRecord(record, function (saved) {
            done(saved)
          })
        },
        function (history, saved) {
          if (callback) callback(mapRecord(saved || record), { activity: activitySnapshot, history: history })
        }
      )
    })
  },

  cancel: function () {
    workoutState.cancel()
    workoutRepository.clearActive()
  },

  getRecords: function (callback) {
    workoutRepository.getRecords(function (records) {
      var result = []
      for (var i = 0; i < records.length; i++) result.push(mapRecord(records[i]))
      if (callback) callback(result)
    })
  },

  markAllSynced: function (callback) {
    workoutRepository.markAllSynced(function (records, result) {
      var mapped = []
      for (var i = 0; i < records.length; i++) mapped.push(mapRecord(records[i]))
      if (callback) callback(mapped, result)
    })
  },

  formatDuration: formatDuration
}
