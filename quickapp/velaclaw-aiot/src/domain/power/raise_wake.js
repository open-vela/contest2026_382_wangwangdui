var SAMPLE_THROTTLE_MS = 100
var WAKE_COOLDOWN_MS = 3000
var DELTA_THRESHOLD = 5

function create(options) {
  var config = options || {}
  var threshold = Number(config.deltaThreshold)
  if (!isFinite(threshold)) threshold = DELTA_THRESHOLD
  var throttleMs = Number(config.sampleThrottleMs)
  if (!isFinite(throttleMs) || throttleMs < 0) throttleMs = SAMPLE_THROTTLE_MS
  var cooldownMs = Number(config.wakeCooldownMs)
  if (!isFinite(cooldownMs) || cooldownMs < 0) cooldownMs = WAKE_COOLDOWN_MS

  var lastAcceleration = null
  var lastWakeAt = 0
  var lastHandleAt = 0

  function reset() {
    lastAcceleration = null
    lastWakeAt = 0
    lastHandleAt = 0
  }

  function push(sample, now) {
    if (!sample) return false
    var time = Number(now)
    if (!isFinite(time)) time = Date.now()
    if (lastHandleAt && time - lastHandleAt < throttleMs) return false
    lastHandleAt = time

    var current = {
      x: Number(sample.x) || 0,
      y: Number(sample.y) || 0,
      z: Number(sample.z) || 0
    }
    var wake = false
    if (lastAcceleration) {
      var delta = Math.abs(current.x - lastAcceleration.x) +
        Math.abs(current.y - lastAcceleration.y) +
        Math.abs(current.z - lastAcceleration.z)
      if (delta > threshold && time - lastWakeAt > cooldownMs) {
        lastWakeAt = time
        wake = true
      }
    }
    lastAcceleration = current
    return wake
  }

  return {
    push: push,
    reset: reset
  }
}

module.exports = {
  SAMPLE_THROTTLE_MS: SAMPLE_THROTTLE_MS,
  WAKE_COOLDOWN_MS: WAKE_COOLDOWN_MS,
  DELTA_THRESHOLD: DELTA_THRESHOLD,
  create: create
}
