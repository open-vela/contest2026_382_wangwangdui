function radians(value) { return Number(value || 0) * Math.PI / 180 }

function between(first, second) {
  if (!first || !second) return 0
  var lat1 = Number(first.latitude)
  var lon1 = Number(first.longitude)
  var lat2 = Number(second.latitude)
  var lon2 = Number(second.longitude)
  if (![lat1, lon1, lat2, lon2].every(isFinite)) return 0
  var earthRadius = 6371000
  var latDelta = radians(lat2 - lat1)
  var lonDelta = radians(lon2 - lon1)
  var firstLat = radians(lat1)
  var secondLat = radians(lat2)
  var a = Math.sin(latDelta / 2) * Math.sin(latDelta / 2) + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2)
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function acceptedSegment(first, second) {
  var meters = between(first, second)
  return meters >= 2 && meters <= 200 ? meters : 0
}

module.exports = { between: between, acceptedSegment: acceptedSegment }
