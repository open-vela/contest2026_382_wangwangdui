import getNativeFeature from './native_feature'

var vibrator = null

function api() {
  if (!vibrator) vibrator = getNativeFeature('@system.vibrator')
  return vibrator
}

export default {
  vibrate: function (mode) {
    try {
      var native = api()
      if (native && native.vibrate) {
        native.vibrate({ mode: mode })
        return true
      }
    } catch (error) {}
    return false
  },
  stop: function (id) {
    try {
      var native = api()
      if (native && native.stop && id !== undefined && id !== null) {
        native.stop(id)
        return true
      }
    } catch (error) {}
    return false
  },
  getSystemMode: function () {
    try {
      var native = api()
      if (native && native.getSystemDefaultMode) return native.getSystemDefaultMode()
    } catch (error) {}
    return -1
  },
  available: function () {
    var native = api()
    return !!(native && native.vibrate)
  }
}
