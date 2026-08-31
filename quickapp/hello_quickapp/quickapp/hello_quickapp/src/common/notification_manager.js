import event from '@system.event'
import interconnect from '@system.interconnect'
import deviceSettings from './device_settings'
import hapticFeedback from './haptic_feedback'
import watchData from './watch_data'

var NOTIFICATION_EVENT_NAME = 'band.demo.notification'
var AUTO_DISMISS_SAFETY_MS = 10000
var HANGUP_GRAY_MS = 400

var state = {
  visible: false,
  type: '',
  appName: '',
  appIcon: '',
  content: '',
  contact: '',
  phone: '',
  hangUp: false
}

var changeCallback = null
var autoDismissTimer = null
var hangUpTimer = null
var eventListenerReady = false
var eventSubscriptionId = null
var interconnectReady = false
var initCount = 0

function notifyChange() {
  if (typeof changeCallback === 'function') {
    changeCallback(state)
  }
}

function clearAutoDismiss() {
  clearTimeout(autoDismissTimer)
  autoDismissTimer = null
}

function scheduleAutoDismiss(manager) {
  clearAutoDismiss()
  autoDismissTimer = setTimeout(function () {
    manager.dismiss()
  }, AUTO_DISMISS_SAFETY_MS)
}

function tryVibrate() {
  var settings = deviceSettings.getCached()
  if (!settings.vibrationEnabled) return
  hapticFeedback.play(settings.vibrationPattern, null, settings.vibrationLevel)
}

function normalizeInterconnectMessage(msg) {
  if (!msg) {
    return null
  }
  var payload = msg
  if (typeof msg.data === 'string') {
    try {
      payload = JSON.parse(msg.data)
    } catch (e) {
      payload = { type: msg.data }
    }
  } else if (msg.data) {
    payload = msg.data
  }
  if (!payload || typeof payload !== 'object') {
    return null
  }
  return payload
}

function applyPayload(payload) {
  state.type = payload.type || 'app'
  state.appName = payload.appName || payload.title || '通知'
  state.appIcon = payload.appIcon || '/common/logo.png'
  state.content = payload.content || ''
  state.contact = payload.contact || payload.title || ''
  state.phone = payload.phone || ''
  state.hangUp = false
}

var notificationManager = {
  getState() {
    return state
  },

  onChange(callback) {
    changeCallback = callback
  },

  show(payload) {
    if (!payload) {
      return
    }
    clearTimeout(hangUpTimer)
    hangUpTimer = null
    clearAutoDismiss()
    applyPayload(payload)
    state.visible = true
    tryVibrate()
    notifyChange()
    scheduleAutoDismiss(this)
  },

  dismiss() {
    clearTimeout(hangUpTimer)
    hangUpTimer = null
    clearAutoDismiss()
    state.visible = false
    state.hangUp = false
    hapticFeedback.stop()
    notifyChange()
  },

  hangUp() {
    clearAutoDismiss()
    clearTimeout(hangUpTimer)
    state.hangUp = true
    notifyChange()
    var self = this
    hangUpTimer = setTimeout(function () {
      self.dismiss()
    }, HANGUP_GRAY_MS)
  },

  // Show a queued demo notification using watchData factory.
  showDemo(type) {
    var item = watchData.getNotificationByType(type)
    if (item) {
      this.show(item)
    }
  },

  // External console events (simulator / devtools).
  handleConsoleEvent(res) {
    var params = res
    if (res && res.params) {
      params = res.params
    } else if (res && res.options && res.options.params) {
      params = res.options.params
    }
    if (typeof params === 'string') {
      try {
        params = JSON.parse(params)
      } catch (e) {
        params = { type: params }
      }
    }
    params = params || {}
    var item = watchData.getNotificationByType(params.type, params)
    if (item) {
      this.show(item)
    } else {
      console.log('unknown notification event type: ' + params.type)
    }
  },

  // Real phone-app messages via interconnect.
  handleInterconnectMessage(msg) {
    var payload = normalizeInterconnectMessage(msg)
    if (!payload) {
      console.log('interconnect message empty')
      return
    }
    console.log('interconnect notification received: ' + JSON.stringify(payload))
    var item = watchData.getNotificationByType(payload.type, payload)
    if (item) {
      this.show(item)
    } else {
      // Unknown type: still try to display as a generic app notification.
      this.show({
        type: 'app',
        appName: payload.appName || '通知',
        appIcon: payload.appIcon || '/common/logo.png',
        content: payload.content || JSON.stringify(payload)
      })
    }
  },

  setupEventListener() {
    if (eventListenerReady) {
      return
    }
    var self = this
    try {
      if (event && event.subscribe) {
        var subscriptionId = event.subscribe({
          eventName: NOTIFICATION_EVENT_NAME,
          callback: function (res) {
            self.handleConsoleEvent(res)
          }
        })
        if (subscriptionId !== undefined) {
          eventSubscriptionId = subscriptionId
          eventListenerReady = true
          console.log('notification console event ready: ' + NOTIFICATION_EVENT_NAME)
        }
      }
    } catch (e) {
      console.log('notification event subscribe unavailable')
    }
  },

  teardownEventListener() {
    if (!eventListenerReady) {
      return
    }
    try {
      if (event && event.unsubscribe && eventSubscriptionId !== null) {
        event.unsubscribe({ id: eventSubscriptionId })
      }
    } catch (e) {
      console.log('notification event unsubscribe unavailable')
    }
    eventListenerReady = false
    eventSubscriptionId = null
  },

  setupInterconnect() {
    if (interconnectReady) {
      return
    }
    var self = this
    try {
      var connect = interconnect.instance()
      connect.onmessage = function (msg) {
        self.handleInterconnectMessage(msg)
      }
      interconnectReady = true
      console.log('interconnect notification listener ready')
    } catch (e) {
      console.log('interconnect unavailable')
    }
  },

  // Refcounted: each init() pairs with a destroy(), so a page re-show can
  // safely re-init without tearing down listeners owned by other holders.
  init() {
    initCount++
    this.setupEventListener()
    this.setupInterconnect()
  },

  destroy() {
    if (initCount === 0) {
      return
    }
    initCount--
    if (initCount > 0) {
      return
    }
    clearAutoDismiss()
    clearTimeout(hangUpTimer)
    hangUpTimer = null
    this.teardownEventListener()
    try {
      if (interconnectReady) {
        var connect = interconnect.instance()
        connect.onmessage = null
      }
    } catch (e) {}
    interconnectReady = false
    changeCallback = null
  }
}

export default notificationManager
