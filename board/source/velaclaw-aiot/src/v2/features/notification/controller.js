import systemEvent from '../../../capabilities/system_event'
import interconnect from '../../../capabilities/interconnect'
import settingsStore from '../../../domain/settings/store'
import haptics from '../../system/haptics'
var notificationFactory = require('../../../domain/notification/factory')

var EVENT_NAME = 'band.demo.notification'
var AUTO_DISMISS_MS = 10000
var HANGUP_DELAY_MS = 400
var HAPTIC_OWNER = 'notification'

function normalizeExternal(value) {
  var source = value
  if (value && value.params) source = value.params
  else if (value && value.options && value.options.params) source = value.options.params
  else if (value && value.data !== undefined) source = value.data
  if (typeof source === 'string') {
    try { source = JSON.parse(source) } catch (error) { source = { content: source } }
  }
  return notificationFactory.normalize(source || {})
}

export function createNotificationController(onChange) {
  var state = { visible: false, type: '', appName: '', appIcon: '', content: '', contact: '', phone: '', hangUp: false }
  var started = false
  var dismissTimer = null
  var hangTimer = null

  function snapshot() {
    var copy = {}
    for (var key in state) copy[key] = state[key]
    return copy
  }

  function emit() {
    if (typeof onChange === 'function') onChange(snapshot())
  }

  function clearTimers() {
    clearTimeout(dismissTimer)
    clearTimeout(hangTimer)
    dismissTimer = null
    hangTimer = null
  }

  function vibrate() {
    var settings = settingsStore.getSnapshot()
    if (!settings.vibrationEnabled) return false
    return haptics.play(settings.vibrationPattern, settings.vibrationLevel, HAPTIC_OWNER)
  }

  function dismiss() {
    clearTimers()
    haptics.stop(HAPTIC_OWNER)
    state.visible = false
    state.hangUp = false
    emit()
  }

  function show(payload) {
    var next = notificationFactory.normalize(payload)
    clearTimers()
    state = next
    state.visible = true
    vibrate()
    emit()
    dismissTimer = setTimeout(dismiss, AUTO_DISMISS_MS)
  }

  function onExternal(value) { show(normalizeExternal(value)) }

  return {
    start: function () {
      if (started) return
      started = true
      settingsStore.load(function () {})
      systemEvent.subscribe(EVENT_NAME, onExternal)
      interconnect.subscribe(onExternal)
    },
    stop: function () {
      if (!started) return
      started = false
      systemEvent.unsubscribe(EVENT_NAME, onExternal)
      interconnect.unsubscribe(onExternal)
      dismiss()
    },
    show: show,
    showDemo: function (type) { show(notificationFactory.demo(type)) },
    dismiss: dismiss,
    hangUp: function () {
      if (!state.visible || state.type !== 'call') return
      clearTimeout(dismissTimer)
      clearTimeout(hangTimer)
      state.hangUp = true
      emit()
      hangTimer = setTimeout(dismiss, HANGUP_DELAY_MS)
    },
    getSnapshot: snapshot
  }
}
