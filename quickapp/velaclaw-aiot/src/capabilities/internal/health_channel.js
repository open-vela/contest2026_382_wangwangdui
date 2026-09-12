import health from '@service.health'

function safeNumber(value, fallback) {
  var number = Number(value)
  return isFinite(number) ? Math.round(number) : fallback
}

function safeTimestamp(value) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? Math.round(number) : Date.now()
}

function clone(snapshot) {
  return {
    value: snapshot.value,
    live: snapshot.live,
    updatedAt: snapshot.updatedAt,
    errorCode: snapshot.errorCode,
    available: snapshot.available,
    source: snapshot.source
  }
}

export default function createHealthChannel(options) {
  var config = options || {}
  var listeners = []
  var subscribed = false
  var fallbackTimer = null
  var fallbackTick = 0
  var state = {
    value: safeNumber(config.initialValue, 0),
    live: false,
    updatedAt: 0,
    errorCode: 0,
    available: false,
    source: 'fallback'
  }

  function dataType() {
    if (!health || !health.DATA_TYPES) return config.fallbackDataType
    var value = health.DATA_TYPES[config.dataTypeName]
    return value === undefined || value === null ? config.fallbackDataType : value
  }

  function serviceAvailable() {
    return !!(health && health.getRecentSamples && health.subscribeSample && health.unsubscribeSample)
  }

  function emit() {
    var snapshot = clone(state)
    var current = listeners.slice()
    for (var i = 0; i < current.length; i++) current[i](snapshot)
  }

  function stopFallback() {
    clearInterval(fallbackTimer)
    fallbackTimer = null
  }

  function fallbackValue() {
    fallbackTick++
    if (typeof config.fallbackValue === 'function') return safeNumber(config.fallbackValue(fallbackTick, state.value), state.value)
    return state.value
  }

  function startFallback() {
    if (fallbackTimer || state.live || listeners.length === 0) return
    var interval = Math.max(1000, safeNumber(config.fallbackInterval, 1000))
    state.available = serviceAvailable()
    state.source = 'fallback'
    state.updatedAt = Date.now()
    emit()
    fallbackTimer = setInterval(function () {
      if (listeners.length === 0 || state.live) {
        stopFallback()
        return
      }
      state.value = fallbackValue()
      state.updatedAt = Date.now()
      state.source = 'fallback'
      emit()
    }, interval)
  }

  function applySample(sample) {
    if (!sample || sample.value === undefined || sample.value === null) return
    state.value = safeNumber(sample.value, state.value)
    state.live = true
    state.available = true
    state.errorCode = 0
    state.updatedAt = safeTimestamp(sample.timeStamp)
    state.source = 'live'
    stopFallback()
    emit()
  }

  function loadRecent() {
    if (!serviceAvailable()) return
    try {
      health.getRecentSamples({
        dataTypes: [dataType()],
        success: function (list) {
          if (!Array.isArray(list) || !list.length) return
          for (var i = list.length - 1; i >= 0; i--) {
            if (list[i] && list[i].data) {
              applySample(list[i].data)
              return
            }
          }
        },
        fail: function (data, code) {
          state.errorCode = safeNumber(code, 200)
          if (!state.live) startFallback()
        }
      })
    } catch (error) {
      if (!state.live) startFallback()
    }
  }

  function startNative() {
    if (subscribed || listeners.length === 0) return
    state.available = serviceAvailable()
    if (!state.available) {
      startFallback()
      return
    }
    try {
      subscribed = true
      health.subscribeSample({
        dataType: dataType(),
        callback: applySample,
        fail: function (data, code) {
          subscribed = false
          state.live = false
          state.errorCode = safeNumber(code, 200)
          state.source = 'fallback'
          emit()
          startFallback()
        }
      })
      loadRecent()
      startFallback()
    } catch (error) {
      subscribed = false
      state.live = false
      startFallback()
    }
  }

  function stopNative() {
    stopFallback()
    if (subscribed && health && health.unsubscribeSample) {
      try {
        health.unsubscribeSample({ dataType: dataType() })
      } catch (error) {}
    }
    subscribed = false
    state.live = false
  }

  function subscribe(listener) {
    if (typeof listener !== 'function' || listeners.indexOf(listener) >= 0) return
    listeners.push(listener)
    listener(clone(state))
    if (listeners.length === 1) startNative()
  }

  function unsubscribe(listener) {
    var next = []
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i] !== listener) next.push(listeners[i])
    }
    listeners = next
    if (listeners.length === 0) stopNative()
  }

  return {
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    getLatest: function () { return state.value },
    getSnapshot: function () { return clone(state) },
    isActive: function () { return listeners.length > 0 },
    consumerCount: function () { return listeners.length },
    isAvailable: serviceAvailable
  }
}
