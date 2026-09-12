import geolocation from '@system.geolocation'

var listeners = []
var active = false
var latest = null

function toNumber(value) {
  var number = Number(value)
  return isNaN(number) ? null : number
}

function normalize(data) {
  if (!data) return null
  var latitude = toNumber(data.latitude)
  var longitude = toNumber(data.longitude)
  if (latitude === null || longitude === null) return null
  return {
    latitude: latitude,
    longitude: longitude,
    altitude: toNumber(data.altitude),
    accuracy: toNumber(data.accuracy),
    speed: toNumber(data.speed),
    timestamp: Date.now()
  }
}

function emit(point) {
  latest = point
  var current = listeners.slice()
  for (var i = 0; i < current.length; i++) current[i](point)
}

function startNative() {
  if (active || listeners.length === 0) return
  try {
    if (!geolocation || !geolocation.subscribe) return
    active = true
    geolocation.subscribe({
      interval: 'normal',
      callback: function (data) {
        var point = normalize(data)
        if (point) emit(point)
      },
      fail: function () { active = false }
    })
  } catch (error) {
    active = false
  }
}

function stopNative() {
  if (!active) return
  try {
    if (geolocation && geolocation.unsubscribe) geolocation.unsubscribe()
  } catch (error) {}
  active = false
}

export default {
  subscribe: function (listener) {
    if (typeof listener !== 'function' || listeners.indexOf(listener) >= 0) return false
    listeners.push(listener)
    if (latest) listener(latest)
    if (listeners.length === 1) startNative()
    return active
  },
  unsubscribe: function (listener) {
    var next = []
    for (var i = 0; i < listeners.length; i++) if (listeners[i] !== listener) next.push(listeners[i])
    listeners = next
    if (listeners.length === 0) stopNative()
  },
  getSnapshot: function () { return latest },
  consumerCount: function () { return listeners.length },
  isActive: function () { return active }
}
