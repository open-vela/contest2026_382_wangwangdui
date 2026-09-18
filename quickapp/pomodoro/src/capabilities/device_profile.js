import device from '@system.device'

// Capability boundary for @system.device.
//
// screenShape / screenWidth / screenHeight are the fields the project-verified
// vela_band viewport layer reads from device.getInfo(); the normalisation and
// the design/logical conversion below mirror that layer (DESIGN_WIDTH = 192,
// logicalHeight = height * design / width) instead of inventing new rules.

var DESIGN_WIDTH = 192
var cached = null

function toNumber(value) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? number : 0
}

function normaliseShape(shape, width, height) {
  var text = shape === undefined || shape === null ? '' : String(shape).toLowerCase()
  if (text === 'circle') return 'circle'
  if (text === 'pill' || text === 'pill-shaped') return 'pill'
  if (text === 'rect' || text === 'rectangular') return 'rect'
  var ratio = height > 0 ? width / height : 0
  if (ratio >= 0.95 && ratio <= 1.05) return 'circle'
  if (ratio > 0.3 && ratio < 0.5) return 'pill'
  return 'rect'
}

function logicalHeightFor(shape, width, height) {
  if (shape === 'circle') return DESIGN_WIDTH
  if (!width || !height) return 490
  return Math.round((height * DESIGN_WIDTH) / width)
}

function build(info) {
  var source = info || {}
  var screenWidth = toNumber(source.screenWidth)
  var screenHeight = toNumber(source.screenHeight)
  var shape = normaliseShape(source.screenShape, screenWidth, screenHeight)
  if (!screenWidth || !screenHeight) {
    screenWidth = shape === 'circle' ? 466 : DESIGN_WIDTH
    screenHeight = shape === 'circle' ? 466 : 490
  }
  return {
    shape: shape,
    physicalWidth: screenWidth,
    physicalHeight: screenHeight,
    logicalWidth: DESIGN_WIDTH,
    logicalHeight: logicalHeightFor(shape, screenWidth, screenHeight),
    rawShape: source.screenShape === undefined ? '' : String(source.screenShape),
    source: 'device'
  }
}

function fallback() {
  return build({ screenShape: 'rect', screenWidth: DESIGN_WIDTH, screenHeight: 490 })
}

function get() {
  return new Promise(function (resolve) {
    if (cached) {
      resolve(cached)
      return
    }
    if (!device || typeof device.getInfo !== 'function') {
      cached = fallback()
      resolve(cached)
      return
    }
    try {
      device.getInfo({
        success: function (info) {
          cached = build(info)
          resolve(cached)
        },
        fail: function () {
          cached = fallback()
          resolve(cached)
        }
      })
    } catch (error) {
      cached = fallback()
      resolve(cached)
    }
  })
}

export default {
  DESIGN_WIDTH: DESIGN_WIDTH,
  get: get,
  normaliseShape: normaliseShape,
  logicalHeightFor: logicalHeightFor,
  build: build,
  fallback: fallback,
  reset: function () {
    cached = null
  }
}
