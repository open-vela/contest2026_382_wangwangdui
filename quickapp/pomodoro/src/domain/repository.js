import storage from '../capabilities/storage'
import settingsModel from './settings_model'
import statsModel from './stats_model'

// Repository: the single owner of persisted pomodoro facts.
// Pages never touch @system.storage directly - they go through here.

var SETTINGS_KEY = 'pomodoro.settings.v1'
var STATS_KEY = 'pomodoro.stats.v1'

function loadSettings() {
  return storage.read(SETTINGS_KEY).then(function (result) {
    var decoded = settingsModel.decode(result.value)
    return {
      settings: decoded.settings,
      persisted: result.ok && decoded.ok,
      reason: result.ok ? decoded.reason : result.reason
    }
  })
}

function saveSettings(settings) {
  return storage.write(SETTINGS_KEY, settingsModel.encode(settings))
}

function loadStats() {
  return storage.read(STATS_KEY).then(function (result) {
    var decoded = statsModel.decode(result.value)
    return { store: decoded.store, persisted: result.ok && decoded.ok }
  })
}

function saveStats(store) {
  return storage.write(STATS_KEY, statsModel.encode(store))
}

export default {
  SETTINGS_KEY: SETTINGS_KEY,
  STATS_KEY: STATS_KEY,
  loadSettings: loadSettings,
  saveSettings: saveSettings,
  loadStats: loadStats,
  saveStats: saveStats
}
