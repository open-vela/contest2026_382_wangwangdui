import getNativeFeature from './native_feature'

var cachedPercent = 75
var battery = null

function api() {
  if (!battery) battery = getNativeFeature('@system.battery')
  return battery
}

function normalizeLevel(level) {
  var value = Number(level)
  if (!isFinite(value)) return cachedPercent
  if (value <= 1) value = value * 100
  value = Math.round(value)
  if (value < 0) value = 0
  if (value > 100) value = 100
  return value
}

export default {
  get: function (callback) {
    try {
      var native = api()
      if (native && native.getStatus) {
        native.getStatus({
          success: function (data) {
            cachedPercent = normalizeLevel(data && data.level)
            if (callback) callback(cachedPercent)
          },
          fail: function () {
            if (callback) callback(cachedPercent)
          }
        })
        return
      }
    } catch (error) {}
    if (callback) callback(cachedPercent)
  },
  getCached: function () { return cachedPercent },
  isAvailable: function () { var native = api(); return !!(native && native.getStatus) }
}
