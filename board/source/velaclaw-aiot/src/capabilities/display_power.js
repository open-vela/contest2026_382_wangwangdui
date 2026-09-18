import getNativeFeature from './native_feature'

var brightness = null

function api() {
  if (!brightness) brightness = getNativeFeature('@system.brightness')
  return brightness
}

function call(api, params) {
  try {
    if (api) {
      api(params || {})
      return true
    }
  } catch (error) {}
  return false
}

export default {
  setBrightness: function (value) {
    var level = Math.max(0, Math.min(255, Math.round(Number(value) || 0)))
    var native = api()
    return call(native && native.setValue, { value: level })
  },
  setMode: function (automatic) {
    var native = api()
    return call(native && native.setMode, { mode: automatic ? 1 : 0 })
  },
  setKeepScreenOn: function (keepScreenOn) {
    var native = api()
    return call(native && native.setKeepScreenOn, { keepScreenOn: !!keepScreenOn })
  },
  isAvailable: function () { var native = api(); return !!(native && native.setValue) }
}
