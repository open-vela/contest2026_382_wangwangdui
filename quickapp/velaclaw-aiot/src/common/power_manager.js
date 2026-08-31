import brightness from '@system.brightness'
import sensor from '@system.sensor'

// Three power modes are enough for a watch demo and keep timer management simple.
var MODE_ACTIVE = 'ACTIVE'
var MODE_DIM = 'DIM'
var MODE_SLEEP = 'SLEEP'

var MODE_CONFIG = {
  ACTIVE: {
    label: '亮屏',
    hint: '1秒刷新',
    color: '#30D158',
    brightness: 210,
    keepScreenOn: true,
    timeInterval: 1000,
    heartInterval: 3000,
    batteryInterval: 60000
  },
  DIM: {
    label: '暗屏',
    hint: '5秒刷新',
    color: '#FFD60A',
    brightness: 60,
    keepScreenOn: true,
    timeInterval: 5000,
    heartInterval: 30000,
    batteryInterval: 120000
  },
  SLEEP: {
    label: '息屏',
    hint: '低频保活',
    color: '#8E8E93',
    brightness: 8,
    keepScreenOn: false,
    timeInterval: 60000,
    heartInterval: 0,
    batteryInterval: 0
  }
}

var DIM_AFTER_MS = 8000
var SLEEP_AFTER_MS = 15000
var raiseWakeCallback = null
var lastAcceleration = null
var lastWakeAt = 0
var subscriptionActive = false
var lastHandleTime = 0

function getConfig(mode) {
  return MODE_CONFIG[mode] || MODE_CONFIG.ACTIVE
}

function callApi(api, params, name) {
  // System APIs may be unavailable in the simulator; failure should not break UI demo.
  try {
    if (api) {
      api(params)
    }
  } catch (e) {
    console.log(name + ' unavailable, use UI simulation')
  }
}

function handleAcceleration(data) {
  // A simple movement delta works as a raise-wake simulation on devices with an accelerometer.
  if (!raiseWakeCallback || !data) {
    return
  }

  var now = Date.now()
  if (now - lastHandleTime < 100) return
  lastHandleTime = now

  var current = {
    x: data.x || 0,
    y: data.y || 0,
    z: data.z || 0
  }

  if (lastAcceleration) {
    var delta = Math.abs(current.x - lastAcceleration.x) + Math.abs(current.y - lastAcceleration.y) + Math.abs(current.z - lastAcceleration.z)
    if (delta > 5 && now - lastWakeAt > 3000) {
      lastWakeAt = now
      raiseWakeCallback()
    }
  }

  lastAcceleration = current
}

export default {
  MODE_ACTIVE: MODE_ACTIVE,
  MODE_DIM: MODE_DIM,
  MODE_SLEEP: MODE_SLEEP,

  getModeByIdle(idleMs) {
    if (idleMs >= SLEEP_AFTER_MS) {
      return MODE_SLEEP
    }
    if (idleMs >= DIM_AFTER_MS) {
      return MODE_DIM
    }
    return MODE_ACTIVE
  },

  getRefreshConfig(mode) {
    return getConfig(mode)
  },

  getUiState(mode) {
    var config = getConfig(mode)
    return {
      label: config.label,
      hint: config.hint,
      color: config.color,
      sleepVisible: mode === MODE_SLEEP,
      dimVisible: mode === MODE_DIM
    }
  },

  applyMode(mode, activeBrightnessValue) {
    var config = getConfig(mode)
    var brightnessValue = config.brightness
    if (mode === MODE_ACTIVE && typeof activeBrightnessValue === 'number') {
      brightnessValue = activeBrightnessValue
    }

    callApi(brightness && brightness.setValue, {
      value: brightnessValue,
      fail: function () {
        console.log('brightness setValue failed, keep UI simulation')
      }
    }, 'brightness.setValue')

    callApi(brightness && brightness.setKeepScreenOn, {
      keepScreenOn: config.keepScreenOn,
      fail: function () {
        console.log('brightness setKeepScreenOn failed, keep UI simulation')
      }
    }, 'brightness.setKeepScreenOn')
  },

  startRaiseWake(callback) {
    if (subscriptionActive) {
      raiseWakeCallback = callback
      return true
    }
    // Real raise-to-wake uses accelerometer when available; tap-to-wake remains the simulator fallback.
    raiseWakeCallback = callback
    lastAcceleration = null
    if (!sensor || !sensor.subscribeAccelerometer) {
      console.log('accelerometer unavailable, use tap to wake simulation')
      return false
    }

    try {
      subscriptionActive = true
      sensor.subscribeAccelerometer({
        interval: 'normal',
        callback: handleAcceleration,
        fail: function () {
          subscriptionActive = false
          console.log('accelerometer subscribe failed, use tap to wake simulation')
        }
      })
      return true
    } catch (e) {
      subscriptionActive = false
      console.log('accelerometer subscribe unavailable, use tap to wake simulation')
      return false
    }
  },

  stopRaiseWake() {
    raiseWakeCallback = null
    lastAcceleration = null
    if (!subscriptionActive) {
      return false
    }
    subscriptionActive = false
    try {
      if (sensor && sensor.unsubscribeAccelerometer) {
        sensor.unsubscribeAccelerometer()
      }
    } catch (e) {
      console.log('accelerometer unsubscribe unavailable')
    }
    return true
  }
}
