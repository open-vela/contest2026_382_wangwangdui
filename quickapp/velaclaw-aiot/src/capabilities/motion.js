import sensor from '@system.sensor'

var consumers = []
var active = false
var activeInterval = ''
var latest = null

function clone(sample) {
  if (!sample) return null
  return { x: sample.x, y: sample.y, z: sample.z, timestamp: sample.timestamp }
}

function intervalRank(interval) {
  if (interval === 'game') return 3
  if (interval === 'ui') return 2
  return 1
}

function desiredInterval() {
  var selected = 'normal'
  for (var i = 0; i < consumers.length; i++) {
    if (intervalRank(consumers[i].interval) > intervalRank(selected)) selected = consumers[i].interval
  }
  return selected
}

function emitError(code) {
  for (var i = 0; i < consumers.length; i++) {
    if (typeof consumers[i].fail === 'function') consumers[i].fail(code)
  }
}

function handle(data) {
  latest = {
    x: Number(data && data.x) || 0,
    y: Number(data && data.y) || 0,
    z: Number(data && data.z) || 0,
    timestamp: Date.now()
  }
  var current = consumers.slice()
  for (var i = 0; i < current.length; i++) current[i].listener(clone(latest))
}

function stopNative() {
  if (!active) return
  try {
    if (sensor && sensor.unsubscribeAccelerometer) sensor.unsubscribeAccelerometer()
  } catch (error) {}
  active = false
  activeInterval = ''
}

function startNative(interval) {
  if (consumers.length === 0) return false
  try {
    if (!sensor || !sensor.subscribeAccelerometer) {
      emitError('unavailable')
      return false
    }
    active = true
    activeInterval = interval || 'normal'
    sensor.subscribeAccelerometer({
      interval: activeInterval,
      callback: handle,
      fail: function (data, code) {
        active = false
        activeInterval = ''
        emitError(code || 'failed')
      }
    })
    return true
  } catch (error) {
    active = false
    activeInterval = ''
    emitError('exception')
    return false
  }
}

function reconcile() {
  if (consumers.length === 0) {
    stopNative()
    return false
  }
  var interval = desiredInterval()
  if (active && activeInterval === interval) return true
  if (active) stopNative()
  return startNative(interval)
}

export default {
  subscribe: function (listener, options) {
    if (typeof listener !== 'function') return false
    for (var i = 0; i < consumers.length; i++) {
      if (consumers[i].listener === listener) {
        consumers[i].interval = options && options.interval ? options.interval : consumers[i].interval
        consumers[i].fail = options && options.fail ? options.fail : consumers[i].fail
        return reconcile()
      }
    }
    consumers.push({
      listener: listener,
      interval: options && options.interval ? options.interval : 'normal',
      fail: options && options.fail
    })
    if (latest) listener(clone(latest))
    return reconcile()
  },
  unsubscribe: function (listener) {
    var next = []
    for (var i = 0; i < consumers.length; i++) {
      if (consumers[i].listener !== listener) next.push(consumers[i])
    }
    consumers = next
    reconcile()
  },
  getSnapshot: function () { return clone(latest) },
  consumerCount: function () { return consumers.length },
  isActive: function () { return active },
  getInterval: function () { return activeInterval },
  isAvailable: function () { return !!(sensor && sensor.subscribeAccelerometer) }
}
