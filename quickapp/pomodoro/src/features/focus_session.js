import timerMachine from '../domain/timer_state_machine'
import haptics from '../capabilities/haptics'

// Feature layer: the single lifecycle owner of the countdown interval.
// Nothing else in the app creates a timer. The session lives at module scope so
// navigating to settings/stats does not restart the clock, and the entry page
// drives its lifecycle explicitly:
//   onShow    -> getOrCreate(settings) + bind(onChange)
//   onHide    -> suspend()   (interval released, remaining time kept)
//   onDestroy -> release()   (full teardown)

var INTERVAL_MS = 1000

function create(config) {
  var options = config || {}
  var settings = options.settings
  var state = timerMachine.createState(settings)
  var timerId = null
  var disposed = false
  var suspended = false
  var lastFeedback = { ok: false, reason: 'none' }

  function publish() {
    if (options.onChange) options.onChange(state, lastFeedback)
  }

  function clearTimer() {
    if (timerId !== null) {
      clearInterval(timerId)
      timerId = null
    }
  }

  function ensureTimer() {
    if (disposed || suspended || timerId !== null) return
    timerId = setInterval(onTick, INTERVAL_MS)
  }

  function onTick() {
    if (disposed) {
      clearTimer()
      return
    }
    if (state.status !== timerMachine.STATUS_RUNNING) return
    var result = timerMachine.tick(state, settings, 1)
    state = result.state
    if (result.phaseCompleted) {
      lastFeedback = haptics.phaseEnd()
      if (options.onPhaseComplete) options.onPhaseComplete(result)
      if (!settings.autoStart) {
        state = timerMachine.pause(state)
        clearTimer()
      }
    }
    publish()
  }

  function start() {
    if (disposed) return state
    state = timerMachine.start(state)
    if (state.status === timerMachine.STATUS_RUNNING) {
      lastFeedback = haptics.tap()
      ensureTimer()
    }
    publish()
    return state
  }

  function pause() {
    state = timerMachine.pause(state)
    clearTimer()
    publish()
    return state
  }

  function toggle() {
    if (state.status === timerMachine.STATUS_RUNNING) return pause()
    return start()
  }

  function reset() {
    state = timerMachine.reset(state, settings)
    clearTimer()
    lastFeedback = haptics.tap()
    publish()
    return state
  }

  function applySettings(next) {
    settings = next
    state = timerMachine.applySettings(state, settings)
    publish()
    return state
  }

  function suspend() {
    clearTimer()
    suspended = true
  }

  function resume() {
    suspended = false
    if (state.status === timerMachine.STATUS_RUNNING) ensureTimer()
  }

  function dispose() {
    disposed = true
    clearTimer()
    haptics.stop()
  }

  return {
    snapshot: function () { return state },
    isDisposed: function () { return disposed },
    isSuspended: function () { return suspended },
    isRunning: function () { return timerId !== null },
    start: start,
    pause: pause,
    toggle: toggle,
    reset: reset,
    applySettings: applySettings,
    bind: function (handler, phaseHandler) {
      options.onChange = handler
      options.onPhaseComplete = phaseHandler
    },
    unbind: function () {
      options.onChange = null
      options.onPhaseComplete = null
    },
    suspend: suspend,
    resume: resume,
    dispose: dispose
  }
}

var current = null
var currentSignature = ''

function signature(settings) {
  var source = settings || {}
  return [source.focusMinutes, source.breakMinutes, source.autoStart === true].join('|')
}

function getOrCreate(settings) {
  var mark = signature(settings)
  if (current && current.isDisposed()) current = null
  if (!current) {
    current = create({ settings: settings })
    currentSignature = mark
    return current
  }
  if (mark !== currentSignature) {
    current.applySettings(settings)
    currentSignature = mark
  }
  return current
}

function peek() {
  return current
}

function release() {
  if (current) {
    current.dispose()
    current = null
    currentSignature = ''
  }
}

export default {
  INTERVAL_MS: INTERVAL_MS,
  create: create,
  getOrCreate: getOrCreate,
  peek: peek,
  release: release
}
