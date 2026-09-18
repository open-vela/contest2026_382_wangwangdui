import deviceProfile from '../system/device_profile'
var scene = require('../design/scene')
var setterWarningLogged = false

function setPageValue(page, key, value) {
  try {
    page[key] = value
    return true
  } catch (error) {
    if (!setterWarningLogged) {
      setterWarningLogged = true
      try { console.log('page runtime skipped readonly host viewport property: ' + key) } catch (e) {}
    }
  }
  return false
}

function applyHostViewport(page, profile) {
  var hostScene = scene.resolve(profile)
  var betaPill = !!(profile && profile.isBetaPillViewport)
  setPageValue(page, 'viewportClass', profile && profile.viewportClass ? profile.viewportClass : '')
  setPageValue(page, 'viewportPosition', betaPill ? 'absolute' : ((profile && profile.viewportPosition) || 'relative'))
  setPageValue(page, 'viewportLeft', betaPill ? '0px' : ((profile && profile.viewportLeft) || '0px'))
  setPageValue(page, 'viewportTop', '0px')
  setPageValue(page, 'viewportWidth', betaPill ? hostScene.width + 'px' : ((profile && profile.viewportWidth) || '100%'))
  setPageValue(page, 'viewportHeight', betaPill ? hostScene.height + 'px' : '100%')
}

function resolveContentWidth(profile, value) {
  var next = typeof value === 'function' ? value(profile) : value
  var number = Number(next)
  if (!isFinite(number) || number <= 0) number = 168
  return Math.max(48, Math.min(192, Math.round(number)))
}

function applyScene(page, profile, contentWidth) {
  var hostScene = scene.resolve(profile)
  var safe = scene.safeForWidth(profile, contentWidth || 168)
  setPageValue(page, 'sceneWidth', hostScene.width)
  setPageValue(page, 'sceneHeight', hostScene.height)
  setPageValue(page, 'sceneShape', hostScene.shape)
  setPageValue(page, 'sceneSafeLeft', safe.left)
  setPageValue(page, 'sceneSafeTop', safe.top)
  setPageValue(page, 'sceneSafeBottom', safe.bottom)
  setPageValue(page, 'sceneSafeHeight', safe.height)
  return { scene: hostScene, safe: safe }
}

function bind(page, options, callback) {
  var config = options || {}
  deviceProfile.resolve(page, function (profile) {
    applyHostViewport(page, profile)
    var width = resolveContentWidth(profile, config.contentWidth)
    var result = applyScene(page, profile, width)
    if (typeof callback === 'function') callback(profile, result.scene, result.safe)
  })
}

export default {
  bind: bind,
  applyHostViewport: applyHostViewport,
  applyScene: applyScene
}
