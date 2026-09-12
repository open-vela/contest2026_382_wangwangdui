import location from '../capabilities/location'

var fallbackTimer = null
var tracking = false
var locationHandler = null
var statusHandler = null
var lastPoint = null
var totalDistanceMeters = 0

function radians(value) {
  return value * Math.PI / 180
}

function distanceBetween(first, second) {
  var earthRadius = 6371000
  var latDelta = radians(second.latitude - first.latitude)
  var lonDelta = radians(second.longitude - first.longitude)
  var firstLat = radians(first.latitude)
  var secondLat = radians(second.latitude)
  var a = Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(firstLat) * Math.cos(secondLat) *
    Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2)
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function reportStatus(status, text) {
  if (statusHandler) statusHandler(status, text)
}

function handleLocation(point) {
  if (!tracking || !point) return
  clearTimeout(fallbackTimer)
  fallbackTimer = null
  if (lastPoint) {
    var segment = distanceBetween(lastPoint, point)
    if (segment >= 2 && segment <= 200) totalDistanceMeters += segment
  }
  lastPoint = point
  reportStatus('active', 'GPS 已定位')
  if (locationHandler) {
    locationHandler({
      point: point,
      distanceMeters: Math.round(totalDistanceMeters)
    })
  }
}

function handleFailure() {
  if (tracking) reportStatus('unavailable', 'GPS 不可用 · 步幅估算')
}

function subscribeLocation() {
  var active = location.subscribe(handleLocation)
  if (!active) handleFailure()
  fallbackTimer = setTimeout(function () {
    if (tracking && !lastPoint) handleFailure()
  }, 6000)
}

export default {
  start: function (options) {
    this.stop()
    tracking = true
    locationHandler = options && options.location
    statusHandler = options && options.status
    totalDistanceMeters = options && options.initialDistance ? options.initialDistance : 0
    lastPoint = options && options.lastPoint ? options.lastPoint : null
    reportStatus('searching', '正在定位')
    subscribeLocation()
  },

  stop: function () {
    tracking = false
    clearTimeout(fallbackTimer)
    fallbackTimer = null
    location.unsubscribe(handleLocation)
    locationHandler = null
    statusHandler = null
    lastPoint = null
    totalDistanceMeters = 0
  }
}
