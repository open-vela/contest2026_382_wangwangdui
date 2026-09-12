import device from '@system.device'

var cached = null
var loading = false
var callbacks = []

function flush(value) {
  var current = callbacks
  callbacks = []
  for (var i = 0; i < current.length; i++) current[i](value)
}

function read(callback, forceRefresh) {
  if (cached && !forceRefresh) {
    if (callback) callback(cached)
    return
  }
  if (callback) callbacks.push(callback)
  if (loading) return
  loading = true
  try {
    if (device && device.getInfo) {
      device.getInfo({
        success: function (info) {
          loading = false
          cached = info || {}
          flush(cached)
        },
        fail: function () {
          loading = false
          cached = cached || {}
          flush(cached)
        }
      })
      return
    }
  } catch (error) {}
  loading = false
  cached = cached || {}
  flush(cached)
}

var gateway = {
  get: read,
  getInfo: function (success) { read(success) },
  getCached: function () { return cached || {} },
  refresh: function (callback) { read(callback, true) },
  clearCache: function () { cached = null }
}

export default gateway
