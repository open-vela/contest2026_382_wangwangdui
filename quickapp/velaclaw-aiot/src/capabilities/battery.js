import battery from '@system.battery'

var cachedPercent = 75

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
      if (battery && battery.getStatus) {
        battery.getStatus({
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
  isAvailable: function () { return !!(battery && battery.getStatus) }
}
