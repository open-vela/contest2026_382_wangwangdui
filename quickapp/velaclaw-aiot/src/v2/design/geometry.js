var DESIGN_WIDTH = 192
var PILL_GESTURE_BAR = 36
var COMFORT_PADDING = 2
var CIRCLE_EDGE_MARGIN = 8

function positive(value, fallback) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? number : (fallback || 0)
}

function logicalHeight(screenWidth, screenHeight) {
  var width = positive(screenWidth, DESIGN_WIDTH)
  var height = positive(screenHeight, DESIGN_WIDTH)
  return Math.round(height * DESIGN_WIDTH / width)
}

function chordHalfWidth(radius, offset) {
  var r = positive(radius, 0)
  var d = Math.abs(Number(offset) || 0)
  if (!r || d >= r) return 0
  return Math.sqrt(r * r - d * d)
}

function circleBand(contentWidth) {
  var radius = DESIGN_WIDTH / 2
  var half = positive(contentWidth, 136) / 2
  var reach = chordHalfWidth(radius, half)
  if (!reach) return { top: radius, bottom: radius, height: 0 }
  var top = Math.ceil(radius - reach)
  var bottom = Math.floor(radius + reach)
  return { top: top, bottom: bottom, height: bottom - top }
}

function capsuleInset(contentWidth) {
  var radius = DESIGN_WIDTH / 2
  var half = positive(contentWidth, 168) / 2
  var reach = chordHalfWidth(radius, half)
  return reach ? Math.max(0, Math.ceil(radius - reach)) : Math.round(radius)
}

function safe(profile, contentWidth, padding) {
  var shape = profile && profile.formFactor ? profile.formFactor : 'rect'
  var height = positive(profile && profile.logicalHeight, DESIGN_WIDTH)
  var comfort = padding === undefined || padding === null ? COMFORT_PADDING : Math.max(0, Number(padding) || 0)

  if (shape === 'circle') {
    var circleWidth = positive(contentWidth, 136)
    // A circular watch is not an inscribed rectangle. Keep the scroll/design
    // viewport almost full height and let the physical round mask trim only the
    // extreme corners. Individual compositions still control horizontal width.
    // This avoids the large artificial black bands produced by circleBand().
    var edge = CIRCLE_EDGE_MARGIN + comfort
    var top = Math.min(DESIGN_WIDTH / 2, edge)
    var bottom = Math.max(top, DESIGN_WIDTH - edge)
    return { shape: shape, contentWidth: circleWidth, left: Math.round((DESIGN_WIDTH - circleWidth) / 2), top: top, bottom: bottom, height: bottom - top, gestureBar: 0 }
  }

  if (shape === 'pill') {
    var pillWidth = positive(contentWidth, 168)
    var inset = capsuleInset(pillWidth) + comfort
    var bottomInset = Math.max(inset, PILL_GESTURE_BAR)
    var pillBottom = Math.max(inset, height - bottomInset)
    return { shape: shape, contentWidth: pillWidth, left: Math.round((DESIGN_WIDTH - pillWidth) / 2), top: inset, bottom: pillBottom, height: Math.max(0, pillBottom - inset), gestureBar: PILL_GESTURE_BAR }
  }

  var rectWidth = Math.min(DESIGN_WIDTH, positive(contentWidth, DESIGN_WIDTH))
  return { shape: 'rect', contentWidth: rectWidth, left: Math.round((DESIGN_WIDTH - rectWidth) / 2), top: comfort, bottom: Math.max(comfort, height - comfort), height: Math.max(0, height - comfort * 2), gestureBar: 0 }
}

module.exports = {
  DESIGN_WIDTH: DESIGN_WIDTH,
  PILL_GESTURE_BAR: PILL_GESTURE_BAR,
  COMFORT_PADDING: COMFORT_PADDING,
  CIRCLE_EDGE_MARGIN: CIRCLE_EDGE_MARGIN,
  logicalHeight: logicalHeight,
  circleBand: circleBand,
  capsuleInset: capsuleInset,
  safe: safe
}
