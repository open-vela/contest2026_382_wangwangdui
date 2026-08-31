function positiveNumber(value) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? number : 0
}

function logicalHeight(screenWidth, screenHeight, designWidth) {
  var width = positiveNumber(screenWidth)
  var height = positiveNumber(screenHeight)
  var design = positiveNumber(designWidth) || 192
  if (!height) return 0
  if (!width) return Math.round(height)
  return Math.round((height * design) / width)
}

module.exports = {
  logicalHeight: logicalHeight
}
