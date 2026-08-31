import device from '@system.device'
import viewportMath from './viewport_math'
import safeArea from './safe_area'

var cachedProfile = null
var pendingCallbacks = []
var requestInFlight = false

function getContextDevice(context) {
  return context && context.$device ? context.$device : {}
}

function pickValue(info, contextDevice, key) {
  if (info && info[key] !== undefined && info[key] !== null && info[key] !== '') {
    return info[key]
  }
  return contextDevice && contextDevice[key]
}

function pickViewportValue(info, contextDevice, key) {
  if (contextDevice && contextDevice[key] !== undefined && contextDevice[key] !== null && contextDevice[key] !== '') {
    return contextDevice[key]
  }
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
  // The shape field is the host's authoritative value.  Beta skins can
  // report the launcher canvas (often 466x466) as width/height even while
  // the physical display is a pill; deriving the shape from that ratio would
  // render the wrong layout and clip half of the page.
  if (normalizedShape === 'circle') return 'circle'
  if (normalizedShape === 'pill-shaped' || normalizedShape === 'pill') return 'pill'
  var ratio = screenHeight > 0 ? screenWidth / screenHeight : 0

  if (ratio > 0) {
    if (ratio >= 0.95 && ratio <= 1.05) return 'circle'
    if (ratio > 0.3 && ratio < 0.5) return 'pill'
    if (ratio >= 0.5 && ratio < 1) return 'rect'
  }
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
  // $device describes the page's actual AVD/physical viewport. Some beta images
  // report the image's default watch dimensions from system.device instead.
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
  // If the beta host leaks its 466px launcher canvas for a pill, retain the
  // known capsule design widths instead of letting the page be classified as
  // a giant/cropped circle.  Prefer a valid value from system.device, then
  // fall back to Band 9's 192 design width.
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
  var deviceModel = toText(pickValue(info, contextDevice, 'deviceModel'))
  var miDeviceAlias = toText(pickValue(info, contextDevice, 'miDeviceAlias'))
  var miProductId = toText(pickValue(info, contextDevice, 'miProductId'))
  var formFactor = getFormFactor(shape, screenWidth, screenHeight)
  var betaPillViewport = model === 'Emulator-Vela' &&
    platformVersionCode === 1200 &&
    formFactor === 'pill' &&
    (screenWidth === 192 || screenWidth === 212)
  var betaViewportClass = betaPillViewport ? 'beta-pill-viewport-' + screenWidth : ''
  var betaLogicalHeight = viewportMath.logicalHeight(screenWidth, screenHeight, 192)
  // Beta capsule hosts draw a system/status strip over the first design rows.
  // Keep the app canvas inside the visible area.  The 192dp design canvas is
  // already scaled to the physical width by the runtime, so it must remain
  // anchored at logical x=0 to avoid clipping the right edge on Band 10.
  var betaTopInset = betaPillViewport ? 24 : 0
  var betaCanvasHeight = betaPillViewport && betaLogicalHeight > betaTopInset
    ? betaLogicalHeight - betaTopInset
    : betaLogicalHeight
  var betaLeft = 0
  // 逻辑高度：页面按 192 设计宽度绘制，物理高度要按同一比例换算回设计坐标。
  // 圆屏画布是正方形，直接取设计宽度。
  var logicalHeight = formFactor === 'circle'
    ? safeArea.DESIGN_WIDTH
    : viewportMath.logicalHeight(screenWidth, screenHeight, safeArea.DESIGN_WIDTH)
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
    viewportClass: betaViewportClass,
    viewportPosition: betaPillViewport ? 'absolute' : 'relative',
    viewportTop: betaTopInset + 'px',
    viewportLeft: betaLeft + 'px',
    viewportWidth: betaPillViewport ? '192px' : '100%',
    viewportHeight: betaPillViewport ? betaCanvasHeight + 'px' : '100%',
    isBetaPillViewport: betaPillViewport,
    deviceFamily: getDeviceFamily(formFactor, screenWidth, screenHeight),
    model: model,
    platformVersionCode: platformVersionCode,
    deviceModel: deviceModel,
    miDeviceAlias: miDeviceAlias,
    miProductId: miProductId,
    source: source
  }
  // 安全区：把“192 画布”换算成圆/胶囊里真正看得见的区域，
  // 让页面直接拿到可用的 top/height，而不是各自去试 padding。
  profile.safeArea = safeArea.resolve(profile)
  return profile
}

function flush(profile) {
  var callbacks = pendingCallbacks
  pendingCallbacks = []
  for (var index = 0; index < callbacks.length; index++) {
    callbacks[index](profile)
  }
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

  try {
    if (device && device.getInfo) {
      device.getInfo({
        success: function (info) {
          finish(info, context, 'system.device')
        },
        fail: function () {
          finish(getContextDevice(context), context, 'fallback')
        }
      })
      return
    }
  } catch (error) {
    console.log('device profile unavailable')
  }

  finish(getContextDevice(context), context, 'fallback')
}

export default {
  resolve: resolve
}
