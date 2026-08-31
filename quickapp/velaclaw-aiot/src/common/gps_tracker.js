import geolocation from '@system.geolocation'

var fallbackTimer = null
var tracking = false
var subscriptionActive = false
var locationHandler = null
var statusHandler = null
var lastPoint = null
var totalDistanceMeters = 0

function toNumber(value) {
  var result = Number(value)
  return isNaN(result) ? null : result
}

function normalizeLocation(data) {
  if (!data) return null
  var latitude = toNumber(data.latitude)
  var longitude = toNumber(data.longitude)
  if (latitude === null || longitude === null) return null
  return {
    latitude: latitude,
    longitude: longitude,
    altitude: toNumber(data.altitude),
    accuracy: toNumber(data.accuracy),
    speed: toNumber(data.speed),
    timestamp: Date.now()
  }
}

function radians(value) {
  return value * Math.PI / 180
}

// Haversine distance is sufficient for adjacent GPS points in a workout.
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

function handleLocation(data) {
  if (!tracking) return
  var point = normalizeLocation(data)
  if (!point) {
    reportStatus('searching', '等待定位')
    return
  }
  clearTimeout(fallbackTimer)
  fallbackTimer = null
  if (lastPoint) {
    var segment = distanceBetween(lastPoint, point)
    if (segment >= 2 && segment <= 200) {
      totalDistanceMeters += segment
    }
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
  if (tracking) {
    reportStatus('unavailable', 'GPS 不可用 · 步幅估算')
  }
}

function subscribeLocation() {
  if (!geolocation || !geolocation.subscribe) {
    handleFailure()
    return
  }
  try {
    subscriptionActive = true
    geolocation.subscribe({
      interval: 'normal',
      callback: handleLocation,
      fail: handleFailure
    })
    fallbackTimer = setTimeout(function () {
      if (tracking && !lastPoint) {
        reportStatus('unavailable', 'GPS 不可用 · 步幅估算')
      }
    }, 6000)
  } catch (error) {
    subscriptionActive = false
    handleFailure()
  }
}

export default {
  start(options) {
    this.stop()
    tracking = true
    locationHandler = options && options.location
    statusHandler = options && options.status
    totalDistanceMeters = options && options.initialDistance ? options.initialDistance : 0
    lastPoint = options && options.lastPoint ? options.lastPoint : null
    reportStatus('searching', '正在定位')
    subscribeLocation()
  },

  stop() {
    tracking = false
    clearTimeout(fallbackTimer)
    fallbackTimer = null
    if (subscriptionActive) {
      try {
        if (geolocation && geolocation.unsubscribe) {
          geolocation.unsubscribe()
        }
      } catch (error) {}
    }
    subscriptionActive = false
    locationHandler = null
    statusHandler = null
    lastPoint = null
    totalDistanceMeters = 0
  }
}
