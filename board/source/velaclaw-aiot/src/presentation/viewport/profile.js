import deviceCapability from '../../capabilities/device'
import geometry from './geometry'
import safeArea from './safe_area'

var cachedProfile = null
var pendingCallbacks = []
var requestInFlight = false

function getContextDevice(context) {
  return context && context.$device ? context.$device : {}
}

function pickValue(info, contextDevice, key) {
  if (info && info[key] !== undefined && info[key] !== null && info[key] !== '') return info[key]
  return contextDevice && contextDevice[key]
}

function pickViewportValue(info, contextDevice, key) {
  if (contextDevice && contextDevice[key] !== undefined && contextDevice[key] !== null && contextDevice[key] !== '') return contextDevice[key]
  return info && info[key]
}

function toNumber(value) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? number : 0
}

function toText(value) {
  return value === undefined || value === null ? '' : String(value)
}

function getFormFactor(shape, screenWidth, screenHeight) {
  var normalizedShape = shape.toLowerCase()
  if (normalizedShape === 'circle') return 'circle'
  if (normalizedShape === 'pill-shaped' || normalizedShape === 'pill') return 'pill'
  var ratio = screenHeight > 0 ? screenWidth / screenHeight : 0
  if (ratio >= 0.95 && ratio <= 1.05) return 'circle'
  if (ratio > 0.3 && ratio < 0.5) return 'pill'
  return 'rect'
}

function getDeviceFamily(formFactor, screenWidth, screenHeight) {
  var size = screenWidth + 'x' + screenHeight
  if (size === '192x490') return 'xiaomi_band'
  if (size === '212x520') return 'xiaomi_band_10'
  if (size === '336x480') return 'xiaomi_band_pro'
  if (size === '432x514') return 'redmi_watch'
  if (formFactor === 'circle' && size === '466x466') return 'xiaomi_round_466'
  return formFactor + '_generic'
}

function makeProfile(info, context, source) {
  var contextDevice = getContextDevice(context)
  var shape = toText(pickViewportValue(info, contextDevice, 'screenShape')) || 'pill-shaped'
  var screenWidth = toNumber(pickViewportValue(info, contextDevice, 'screenWidth'))
  var screenHeight = toNumber(pickViewportValue(info, contextDevice, 'screenHeight'))
  var infoWidth = toNumber(info && info.screenWidth)
  var infoHeight = toNumber(info && info.screenHeight)
  var normalizedShape = shape.toLowerCase()
  var currentRatio = screenHeight > 0 ? screenWidth / screenHeight : 0
  var ratioLooksWrong = (normalizedShape === 'circle' && (currentRatio < 0.9 || currentRatio > 1.1)) ||
    ((normalizedShape === 'pill' || normalizedShape === 'pill-shaped') && (currentRatio < 0.3 || currentRatio >= 0.5))
  var infoRatio = infoHeight > 0 ? infoWidth / infoHeight : 0
  var infoMatchesShape = (normalizedShape === 'circle' && infoRatio >= 0.9 && infoRatio <= 1.1) ||
    ((normalizedShape === 'pill' || normalizedShape === 'pill-shaped') && infoRatio > 0.3 && infoRatio < 0.5)

  if (ratioLooksWrong && infoMatchesShape) {
    screenWidth = infoWidth
    screenHeight = infoHeight
  }
  if (!screenWidth || !screenHeight) {
    if (normalizedShape === 'circle') {
      screenWidth = 466
      screenHeight = 466
    } else if (normalizedShape === 'pill' || normalizedShape === 'pill-shaped') {
      screenWidth = 192
      screenHeight = 490
    }
  }

  var identityModel = toText(pickValue(info, contextDevice, 'model'))
  var identityVersion = toNumber(pickValue(info, contextDevice, 'platformVersionCode'))
  if (identityModel === 'Emulator-Vela' && identityVersion === 1200 &&
      (normalizedShape === 'pill' || normalizedShape === 'pill-shaped') &&
      screenWidth !== 192 && screenWidth !== 212) {
    if (infoWidth === 192 || infoWidth === 212) {
      screenWidth = infoWidth
      screenHeight = infoHeight
    } else {
      screenWidth = 192
      screenHeight = 490
    }
  }

  var model = toText(pickValue(info, contextDevice, 'model'))
  var platformVersionCode = toNumber(pickValue(info, contextDevice, 'platformVersionCode'))
  var formFactor = getFormFactor(shape, screenWidth, screenHeight)
  var betaPillViewport = model === 'Emulator-Vela' && platformVersionCode === 1200 && formFactor === 'pill' &&
    (screenWidth === 192 || screenWidth === 212)
  var betaLogicalHeight = geometry.logicalHeight(screenWidth, screenHeight, 192)
  var betaTopInset = betaPillViewport ? 24 : 0
  var betaCanvasHeight = betaPillViewport && betaLogicalHeight > betaTopInset ? betaLogicalHeight - betaTopInset : betaLogicalHeight
  var logicalHeight = formFactor === 'circle' ? safeArea.DESIGN_WIDTH : geometry.logicalHeight(screenWidth, screenHeight, safeArea.DESIGN_WIDTH)

  var profile = {
    shape: shape,
    formFactor: formFactor,
    isPill: formFactor === 'pill',
    isRect: formFactor === 'rect',
    isCircle: formFactor === 'circle',
    isCompact: formFactor !== 'pill',
    screenWidth: screenWidth,
    screenHeight: screenHeight,
    logicalHeight: logicalHeight,
    screenClass: 'screen-' + formFactor,
    viewportClass: betaPillViewport ? 'beta-pill-viewport-' + screenWidth : '',
    viewportPosition: betaPillViewport ? 'absolute' : 'relative',
    viewportTop: betaTopInset + 'px',
    viewportLeft: '0px',
    viewportWidth: betaPillViewport ? '192px' : '100%',
    viewportHeight: betaPillViewport ? betaCanvasHeight + 'px' : '100%',
    isBetaPillViewport: betaPillViewport,
    deviceFamily: getDeviceFamily(formFactor, screenWidth, screenHeight),
    model: model,
    platformVersionCode: platformVersionCode,
    deviceModel: toText(pickValue(info, contextDevice, 'deviceModel')),
    miDeviceAlias: toText(pickValue(info, contextDevice, 'miDeviceAlias')),
    miProductId: toText(pickValue(info, contextDevice, 'miProductId')),
    source: source
  }
  profile.safeArea = safeArea.resolve(profile)
  return profile
}

function flush(profile) {
  var callbacks = pendingCallbacks
  pendingCallbacks = []
  for (var i = 0; i < callbacks.length; i++) callbacks[i](profile)
}

function finish(info, context, source) {
  cachedProfile = makeProfile(info || {}, context, source)
  requestInFlight = false
  flush(cachedProfile)
}

function resolve(context, callback) {
  if (typeof callback !== 'function') return
  if (cachedProfile) {
    callback(cachedProfile)
    return
  }
  pendingCallbacks.push(callback)
  if (requestInFlight) return
  requestInFlight = true
  deviceCapability.get(
    function (info) { finish(info, context, 'capability.device') }
  )
}

export default {
  resolve: resolve,
  makeProfile: makeProfile
}
