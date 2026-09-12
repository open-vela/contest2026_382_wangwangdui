import vibrator from '@system.vibrator'

export default {
  vibrate: function (mode) {
    try {
      if (vibrator && vibrator.vibrate) {
        vibrator.vibrate({ mode: mode })
        return true
      }
    } catch (error) {}
    return false
  },
  stop: function (id) {
    try {
      if (vibrator && vibrator.stop && id !== undefined && id !== null) {
        vibrator.stop(id)
        return true
      }
    } catch (error) {}
    return false
  },
  getSystemMode: function () {
    try {
      if (vibrator && vibrator.getSystemDefaultMode) return vibrator.getSystemDefaultMode()
    } catch (error) {}
    return -1
  },
  available: function () {
    return !!(vibrator && vibrator.vibrate)
  }
}
