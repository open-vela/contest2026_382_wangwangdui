var KEY = 'device_settings_v1'

var DEFAULTS = {
  lastSyncAt: 0,
  vibrationEnabled: true,
  vibrationLevel: 'medium',
  vibrationPattern: 'goal',
  brightnessValue: 140,
  autoBrightness: false,
  raiseWakeEnabled: true,
  lowPowerEnabled: true
}

function clampBrightness(value) {
  var number = Number(value)
  if (!isFinite(number)) number = 140
  return Math.max(0, Math.min(255, Math.round(number)))
}

function pattern(value) {
  return value === 'tap' || value === 'goal' || value === 'countdown' || value === 'alert' ? value : 'goal'
}

function syncTimestamp(value) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? Math.round(number) : 0
}

function normalize(source) {
  var value = source || {}
  return {
    lastSyncAt: syncTimestamp(value.lastSyncAt),
    vibrationEnabled: value.vibrationEnabled !== false,
    vibrationLevel: value.vibrationLevel === 'light' || value.vibrationLevel === 'strong' ? value.vibrationLevel : 'medium',
    vibrationPattern: pattern(value.vibrationPattern),
    brightnessValue: clampBrightness(value.brightnessValue),
    autoBrightness: !!value.autoBrightness,
    raiseWakeEnabled: value.raiseWakeEnabled !== false,
    lowPowerEnabled: value.lowPowerEnabled !== false
  }
}

function createStore(storage) {
  var cached = normalize(DEFAULTS)
  var loaded = false
  var loading = false
  var pending = {}
  var loadWaiters = []
  var writeInFlight = false
  var writeQueued = false
  var persistWaiters = []

  function clone() { return normalize(cached) }

  function merge(stored) {
    var next = clone()
    var source = stored || {}
    for (var key in next) if (source[key] !== undefined) next[key] = source[key]
    return normalize(next)
  }

  function flushPersist() {
    if (!loaded || loading || writeInFlight || !writeQueued) return
    writeQueued = false
    writeInFlight = true
    var snapshot = clone()
    storage.set(KEY, snapshot, function (result) {
      writeInFlight = false
      if (writeQueued) {
        flushPersist()
        return
      }
      var waiters = persistWaiters
      persistWaiters = []
      var value = clone()
      for (var i = 0; i < waiters.length; i++) waiters[i](value, result)
    })
  }

  function finishLoad(stored) {
    cached = merge(stored)
    for (var key in pending) cached[key] = pending[key]
    cached = normalize(cached)
    pending = {}
    loaded = true
    loading = false

    var waiters = loadWaiters
    loadWaiters = []
    var value = clone()
    for (var i = 0; i < waiters.length; i++) waiters[i](value)
    flushPersist()
  }

  function startLoad() {
    if (loading || loaded) return
    loading = true
    storage.getJSON(KEY, finishLoad, null)
  }

  function persist(callback) {
    if (typeof callback === 'function') persistWaiters.push(callback)
    writeQueued = true
    if (!loaded) startLoad()
    flushPersist()
  }

  function rememberPending(key, value) {
    if (!loaded) pending[key] = value
  }

  return {
    load: function (callback) {
      if (loaded && !loading) {
        if (callback) callback(clone())
        return
      }
      if (callback) loadWaiters.push(callback)
      startLoad()
    },
    getSnapshot: clone,
    update: function (key, value, callback) {
      var next = clone()
      next[key] = value
      cached = normalize(next)
      rememberPending(key, cached[key])
      persist(callback)
      return clone()
    },
    updateMany: function (patch, callback) {
      var next = clone()
      var source = patch || {}
      for (var key in source) next[key] = source[key]
      cached = normalize(next)
      if (!loaded) {
        for (var pendingKey in source) {
          if (Object.prototype.hasOwnProperty.call(cached, pendingKey)) pending[pendingKey] = cached[pendingKey]
        }
      }
      persist(callback)
      return clone()
    },
    brightness: clampBrightness
  }
}

module.exports = {
  KEY: KEY,
  DEFAULTS: DEFAULTS,
  normalize: normalize,
  createStore: createStore
}
