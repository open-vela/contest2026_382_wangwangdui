/** Pure safe-area geometry for circle / rect / pill screens. */
var DESIGN_WIDTH = 192
var PILL_GESTURE_BAR = 36
var COMFORT_PADDING = 2

function toPositiveNumber(value, fallback) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? number : fallback
}

function chordHalfWidth(radius, offset) {
  var r = toPositiveNumber(radius, 0)
  var distance = Math.abs(Number(offset) || 0)
  if (distance >= r) return 0
  return Math.sqrt(r * r - distance * distance)
}

function circleWidthAt(diameter, y) {
  var radius = toPositiveNumber(diameter, DESIGN_WIDTH) / 2
  return Math.floor(chordHalfWidth(radius, y - radius) * 2)
}

function circleBandForWidth(diameter, contentWidth) {
  var size = toPositiveNumber(diameter, DESIGN_WIDTH)
  var radius = size / 2
  var half = toPositiveNumber(contentWidth, 0) / 2
  var reach = chordHalfWidth(radius, half)
  if (reach <= 0) return { top: Math.round(radius), bottom: Math.round(radius), height: 0 }
  var top = Math.ceil(radius - reach)
  var bottom = Math.floor(radius + reach)
  return { top: top, bottom: bottom, height: bottom - top }
}

function capsuleCapInset(screenWidth, contentWidth) {
  var width = toPositiveNumber(screenWidth, DESIGN_WIDTH)
  var radius = width / 2
  var half = toPositiveNumber(contentWidth, 0) / 2
  var reach = chordHalfWidth(radius, half)
  if (reach <= 0) return Math.round(radius)
  return Math.max(0, Math.ceil(radius - reach))
}

function inscribedSquare(diameter) {
  return Math.floor(toPositiveNumber(diameter, DESIGN_WIDTH) / Math.SQRT2)
}

function fitsInCircle(diameter, left, top, width, height) {
  var radius = toPositiveNumber(diameter, DESIGN_WIDTH) / 2
  var corners = [
    [left, top],
    [left + width, top],
    [left, top + height],
    [left + width, top + height]
  ]
  for (var i = 0; i < corners.length; i++) {
    var dx = corners[i][0] - radius
    var dy = corners[i][1] - radius
    if (Math.sqrt(dx * dx + dy * dy) > radius) return false
  }
  return true
}

function resolve(profile, contentWidth, padding) {
  var shape = (profile && profile.formFactor) || 'rect'
  var canvasWidth = DESIGN_WIDTH
  var canvasHeight = toPositiveNumber(profile && profile.logicalHeight, DESIGN_WIDTH)
  var comfort = padding === undefined || padding === null ? COMFORT_PADDING : Math.max(0, Number(padding) || 0)

  if (shape === 'circle') {
    var width = toPositiveNumber(contentWidth, 136)
    var band = circleBandForWidth(canvasWidth, width)
    var circleHeight = Math.max(0, band.height - comfort * 2)
    return {
      shape: shape,
      contentWidth: width,
      left: Math.round((canvasWidth - width) / 2),
      top: band.top + comfort,
      bottom: band.top + comfort + circleHeight,
      height: circleHeight,
      gestureBar: 0
    }
  }

  if (shape === 'pill') {
    var pillWidth = toPositiveNumber(contentWidth, 168)
    var inset = capsuleCapInset(canvasWidth, pillWidth) + comfort
    var bottomInset = Math.max(inset, PILL_GESTURE_BAR)
    var bottomEdge = Math.max(inset, canvasHeight - bottomInset)
    return {
      shape: shape,
      contentWidth: pillWidth,
      left: Math.round((canvasWidth - pillWidth) / 2),
      top: inset,
      bottom: bottomEdge,
      height: Math.max(0, bottomEdge - inset),
      gestureBar: PILL_GESTURE_BAR
    }
  }

  var rectWidth = toPositiveNumber(contentWidth, canvasWidth)
  return {
    shape: 'rect',
    contentWidth: rectWidth,
    left: Math.round((canvasWidth - rectWidth) / 2),
    top: 0,
    bottom: canvasHeight,
    height: canvasHeight,
    gestureBar: 0
  }
}

module.exports = {
  DESIGN_WIDTH: DESIGN_WIDTH,
  PILL_GESTURE_BAR: PILL_GESTURE_BAR,
  COMFORT_PADDING: COMFORT_PADDING,
  chordHalfWidth: chordHalfWidth,
  circleWidthAt: circleWidthAt,
  circleBandForWidth: circleBandForWidth,
  capsuleCapInset: capsuleCapInset,
  inscribedSquare: inscribedSquare,
  fitsInCircle: fitsInCircle,
  resolve: resolve
}
