import storage from '../../capabilities/storage'
import activityStore from '../activity/store'
import recentHealth from '../health/recent'

var HEALTH_HISTORY_KEY = 'health_history_7d'
var HOURLY_HEART_RATE_KEY = 'hourly_heart_rate_24h'
var HISTORY_DAYS = 7
var hourlyHeartRate = []

function pad2(value) {
  return value < 10 ? '0' + value : '' + value
}

function dateKey(date) {
  var d = date || new Date()
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value
}

function sortHistory(history) {
  history.sort(function (a, b) { return a.date > b.date ? 1 : -1 })
}

function todayRecord(activitySnapshot) {
  var activity = activitySnapshot || activityStore.getSnapshot()
  var heart = recentHealth.getStats()
  return {
    date: dateKey(new Date()),
    steps: activity.steps,
    calories: activity.calories,
    standHours: activity.standHours,
    avgHeartRate: heart.avg,
    minHeartRate: heart.min,
    maxHeartRate: heart.max,
    goalPercent: activity.goalPercent
  }
}

function normalizeHistory(stored) {
  return Array.isArray(stored) ? stored : []
}

function upsertToday(history, activitySnapshot, restorePersistedTotals) {
  var key = dateKey(new Date())
  if (restorePersistedTotals) {
    for (var i = 0; i < history.length; i++) {
      if (history[i].date === key) {
        activityStore.restoreTotals(history[i])
        break
      }
    }
  }

  var merged = []
  for (var j = 0; j < history.length; j++) {
    if (history[j].date !== key) merged.push(history[j])
  }
  merged.push(todayRecord(activitySnapshot))
  sortHistory(merged)
  while (merged.length > HISTORY_DAYS) merged.shift()
  return merged
}

function loadHistory(callback) {
  storage.getJSON(HEALTH_HISTORY_KEY, function (stored) {
    var history = upsertToday(normalizeHistory(stored), null, true)
    storage.set(HEALTH_HISTORY_KEY, history, function () {
      if (callback) callback(clone(history))
    })
  }, [])
}

function saveToday(activitySnapshot, callback) {
  var snapshot = activitySnapshot || activityStore.getSnapshot()
  storage.getJSON(HEALTH_HISTORY_KEY, function (stored) {
    var history = upsertToday(normalizeHistory(stored), snapshot, false)
    storage.set(HEALTH_HISTORY_KEY, history, function (result) {
      if (callback) callback(clone(history), result)
    })
  }, [])
}

export default {
  ensure: function () { loadHistory(function () {}) },
  saveToday: saveToday,
  getHistory: loadHistory,

  getHourlyHeartRate: function () {
    return clone(hourlyHeartRate)
  },

  loadHourlyHeartRate: function (callback) {
    if (hourlyHeartRate.length) {
      if (callback) callback(clone(hourlyHeartRate))
      return
    }
    storage.getJSON(HOURLY_HEART_RATE_KEY, function (stored) {
      hourlyHeartRate = Array.isArray(stored) ? stored : []
      if (callback) callback(clone(hourlyHeartRate))
    }, [])
  },

  saveHourlyHeartRate: function () {
    storage.set(HOURLY_HEART_RATE_KEY, hourlyHeartRate)
  }
}
