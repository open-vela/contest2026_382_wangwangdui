import vibration from '../capabilities/vibration'
import hapticPatterns from './haptic_patterns'

var activeId = -1
var fallbackTimers = []

function clearFallbackTimers() {
  for (var index = 0; index < fallbackTimers.length; index++) clearTimeout(fallbackTimers[index])
  fallbackTimers = []
}

function stop() {
  var stopped = activeId !== -1 || fallbackTimers.length > 0
  clearFallbackTimers()
  if (activeId !== -1) vibration.stop(activeId)
  activeId = -1
  return stopped
}

function vibrateOnce(mode) {
  return vibration.vibrate(mode)
}

function fallback(pattern, callback) {
  var ok = vibrateOnce(pattern.fallback)
  for (var index = 1; index < pattern.count; index++) {
    var delay = index * (pattern.duration + pattern.interval)
    fallbackTimers.push(setTimeout(function () {
      vibrateOnce(pattern.fallback)
    }, delay))
  }
  if (callback) callback({ ok: ok, custom: false, label: pattern.label })
  return ok
}

function play(name, callback, level) {
  var pattern = hapticPatterns.get(name, level)
  stop()
  return fallback(pattern, callback)
}

export default {
  play: play,
  stop: stop,
  getSystemMode: function () { return vibration.getSystemMode() },
  supportsCustom: function () { return vibration.available() }
}
