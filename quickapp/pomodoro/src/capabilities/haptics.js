import vibrator from '@system.vibrator'

// Capability boundary for @system.vibrator.
// mode values follow the project-verified vela_band usage ('short' / 'long').
// When there is no vibrator the call is skipped and reported, never faked:
// callers must not claim feedback that did not happen.

function available() {
  return !!(vibrator && typeof vibrator.vibrate === 'function')
}

function pulse(mode) {
  if (!available()) return { ok: false, reason: 'unavailable' }
  var resolved = mode || 'short'
  try {
    vibrator.vibrate({ mode: resolved })
    return { ok: true, mode: resolved }
  } catch (error) {
    return { ok: false, reason: 'exception' }
  }
}

function stop() {
  if (!vibrator || typeof vibrator.stop !== 'function') return { ok: false, reason: 'unavailable' }
  try {
    vibrator.stop()
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: 'exception' }
  }
}

export default {
  available: available,
  pulse: pulse,
  tap: function () {
    return pulse('short')
  },
  phaseEnd: function () {
    return pulse('long')
  },
  stop: stop
}
