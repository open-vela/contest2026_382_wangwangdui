var geometry = require('./geometry')

function positive(value, fallback) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? number : (fallback || 0)
}

function coverageHeight(profile) {
  var logicalHeight = positive(profile && profile.logicalHeight, geometry.DESIGN_WIDTH)
  var screenWidth = positive(profile && profile.screenWidth, 0)
  var screenHeight = positive(profile && profile.screenHeight, 0)
  if (screenWidth && screenHeight) {
    var physicalCoverage = Math.ceil(screenHeight * geometry.DESIGN_WIDTH / screenWidth)
    if (physicalCoverage > logicalHeight) logicalHeight = physicalCoverage
  }
  return logicalHeight
}

function resolve(profile) {
  var height = coverageHeight(profile)
  return {
    width: geometry.DESIGN_WIDTH,
    height: height,
    hostTop: 0,
    hostBottom: height,
    shape: profile && profile.formFactor ? profile.formFactor : 'rect'
  }
}

function safeForWidth(profile, contentWidth, comfort) {
  var host = resolve(profile)
  var globalSafe = geometry.safe(profile, contentWidth, comfort)
  var top = Math.max(0, Math.min(host.height, globalSafe.top))
  var bottom = Math.max(top, Math.min(host.height, globalSafe.bottom))
  return {
    left: globalSafe.left,
    top: top,
    bottom: bottom,
    width: globalSafe.contentWidth,
    height: bottom - top,
    gestureBar: globalSafe.gestureBar
  }
}

module.exports = {
  resolve: resolve,
  safeForWidth: safeForWidth,
  coverageHeight: coverageHeight
}
