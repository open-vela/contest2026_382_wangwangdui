var safeArea = require('../viewport/safe_area')

function positive(value, fallback) {
  var number = Number(value)
  return isFinite(number) && number >= 0 ? number : fallback
}

function intervalFor(profile, width, comfort) {
  var shape = profile && profile.formFactor ? profile.formFactor : 'rect'
  var canvasHeight = positive(profile && profile.logicalHeight, safeArea.DESIGN_WIDTH)
  var padding = comfort === undefined ? safeArea.COMFORT_PADDING : positive(comfort, 0)

  if (shape === 'circle') {
    var band = safeArea.circleBandForWidth(safeArea.DESIGN_WIDTH, width)
    return {
      top: band.top + padding,
      bottom: band.bottom - padding,
      height: Math.max(0, band.height - padding * 2)
    }
  }

  if (shape === 'pill') {
    var inset = safeArea.capsuleCapInset(safeArea.DESIGN_WIDTH, width) + padding
    var bottomInset = Math.max(inset, safeArea.PILL_GESTURE_BAR)
    return {
      top: inset,
      bottom: Math.max(inset, canvasHeight - bottomInset),
      height: Math.max(0, canvasHeight - bottomInset - inset)
    }
  }

  return { top: padding, bottom: Math.max(padding, canvasHeight - padding), height: Math.max(0, canvasHeight - padding * 2) }
}

function validateRegion(profile, region, comfort) {
  var width = positive(region && region.width, 0)
  var height = positive(region && region.height, 0)
  var left = positive(region && region.left, 0)
  var top = positive(region && region.top, 0)
  var right = left + width
  var bottom = top + height
  var interval = intervalFor(profile, width, comfort)
  var errors = []

  if (left < 0 || right > safeArea.DESIGN_WIDTH) errors.push('horizontal-overflow')
  if (top < interval.top) errors.push('safe-top')
  if (bottom > interval.bottom) errors.push('safe-bottom')

  if (profile && profile.formFactor === 'circle' &&
      !safeArea.fitsInCircle(safeArea.DESIGN_WIDTH, left, top, width, height)) {
    errors.push('circle-corners')
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    interval: interval
  }
}

module.exports = {
  intervalFor: intervalFor,
  validateRegion: validateRegion
}
