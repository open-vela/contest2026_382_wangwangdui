import vibrator from '@system.vibrator'
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
  try {
    if (activeId !== -1 && vibrator && vibrator.stop) vibrator.stop(activeId)
  } catch (error) {
    console.log('custom vibration stop unavailable')
  }
  activeId = -1
  return stopped
}

function vibrateOnce(mode) {
  try {
    if (vibrator && vibrator.vibrate) {
      vibrator.vibrate({ mode: mode })
      return true
    }
  } catch (error) {
    console.log('basic vibration unavailable')
  }
  return false
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
  // Vela beta exposes `start/stop` on some images but silently treats the
  // duration/interval/count object as the legacy alert preset.  That makes
  // every pattern feel identical.  Use the documented one-shot vibrator as
  // the primary path and schedule each beat ourselves; this preserves the
  // pattern on both beta and release images.
  return fallback(pattern, callback)
  /* istanbul ignore next -- retained for future runtimes with real patterns
  try {
    if (vibrator && vibrator.start) {
      vibrator.start({
        duration: pattern.duration,
        interval: pattern.interval,
        count: pattern.count,
        success: function (data) {
          activeId = data && data.id !== undefined ? data.id : -1
          if (callback) callback({ ok: true, custom: true, label: pattern.label })
        },
        fail: function () {
          fallback(pattern, callback)
        }
      })
      return true
    }
  } catch (error) {
    console.log('custom vibration unavailable, use basic mode')
  }
  return fallback(pattern, callback)
  */
}

function getSystemMode() {
  try {
    if (vibrator && vibrator.getSystemDefaultMode) {
      return vibrator.getSystemDefaultMode()
    }
  } catch (error) {
    console.log('system vibration mode unavailable')
  }
  return -1
}

export default {
  play: play,
  stop: stop,
  getSystemMode: getSystemMode,
  supportsCustom: function () {
    // A scheduled sequence built from the documented one-shot API is the
    // portable custom implementation used by this app.
    return !!(vibrator && vibrator.vibrate)
  }
}
