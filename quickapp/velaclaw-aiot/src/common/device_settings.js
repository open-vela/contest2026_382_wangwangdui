import storageAdapter from './storage_adapter'
import hapticPatterns from './haptic_patterns'
import { formatTimeHM } from './utils'

var SETTINGS_KEY = 'device_settings_v1'

// Defaults keep the simulator usable even before any settings page is opened.
var cachedSettings = {
  bluetoothConnected: false,
  lastSyncText: '未同步',
  vibrationEnabled: true,
  vibrationLevel: 'medium',
  vibrationPattern: 'goal',
  brightnessLevel: 'medium',
  brightnessValue: 140,
  autoBrightness: false,
  raiseWakeEnabled: true,
  lowPowerEnabled: true
}
// Updates made while the first asynchronous storage read is in flight must
// win over the stale value returned by that read (for example, selecting a
// vibration pattern immediately after opening the settings page).
var pendingUpdates = {}
var settingsLoadInFlight = false

function cloneSettings(source) {
  // Migrate the old low/medium/high setting to the real 0-255 brightness value.
  var brightnessValue = Number(source.brightnessValue)
  if (isNaN(brightnessValue)) {
    brightnessValue = getLegacyBrightnessValue(source.brightnessLevel)
  }
  brightnessValue = Math.max(0, Math.min(255, Math.round(brightnessValue)))

  return {
    bluetoothConnected: !!source.bluetoothConnected,
    lastSyncText: source.lastSyncText || '未同步',
    vibrationEnabled: source.vibrationEnabled !== false,
    vibrationLevel: source.vibrationLevel || 'medium',
    vibrationPattern: hapticPatterns.normalize(source.vibrationPattern),
    brightnessLevel: source.brightnessLevel || 'medium',
    brightnessValue: brightnessValue,
    autoBrightness: !!source.autoBrightness,
    raiseWakeEnabled: source.raiseWakeEnabled !== false,
    lowPowerEnabled: source.lowPowerEnabled !== false
  }
}

function getLegacyBrightnessValue(level) {
  if (level === 'low') {
    return 55
  }
  if (level === 'high') {
    return 230
  }
  return 140
}

// Stored JSON is merged with defaults so future fields do not break old data.
function mergeSettings(raw) {
  var next = cloneSettings(cachedSettings)
  if (!raw) {
    return next
  }
  try {
    var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    for (var key in next) {
      if (parsed[key] !== undefined) {
        next[key] = parsed[key]
      }
    }
  } catch (e) {
    console.log('device settings parse failed, use defaults')
  }
  return cloneSettings(next)
}

// Save through storageAdapter (memory + persistent storage with fallback).
function save(settings, callback) {
  cachedSettings = cloneSettings(settings)
  storageAdapter.set(SETTINGS_KEY, JSON.stringify(cachedSettings))
  if (callback) {
    callback(cloneSettings(cachedSettings))
  }
}

export default {
  // Loading is callback-based because the openvela storage API is asynchronous.
  load(callback) {
    settingsLoadInFlight = true
    storageAdapter.get(SETTINGS_KEY, function (value) {
      cachedSettings = mergeSettings(value)
      for (var key in pendingUpdates) {
        if (pendingUpdates[key] !== undefined) cachedSettings[key] = pendingUpdates[key]
      }
      cachedSettings = cloneSettings(cachedSettings)
      pendingUpdates = {}
      settingsLoadInFlight = false
      if (callback) {
        callback(cloneSettings(cachedSettings))
      }
    })
  },

  save: save,

  update(key, value, callback) {
    var next = cloneSettings(cachedSettings)
    next[key] = value
    if (settingsLoadInFlight) pendingUpdates[key] = value
    save(next, callback)
  },

  getCached() {
    return cloneSettings(cachedSettings)
  },

  getBrightnessValue(value) {
    if (typeof value === 'number' && !isNaN(value)) {
      return Math.max(0, Math.min(255, Math.round(value)))
    }
    return getLegacyBrightnessValue(value)
  },

  getVibrationText(level) {
    if (level === 'light') {
      return '轻'
    }
    if (level === 'strong') {
      return '强'
    }
    return '中'
  },

  getVibrationPatternText(pattern) {
    return hapticPatterns.label(pattern)
  },

  formatSyncTime() {
    return formatTimeHM(Date.now())
  }
}
