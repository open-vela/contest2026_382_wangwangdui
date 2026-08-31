import navigationGuard from './navigation_guard'

var FRAME_MS = 16

// Horizontal page slide steps (margin-left in px).
var ENTER_H_STEPS = [14, 11, 8, 5, 2, 0]
var EXIT_FORWARD_H_STEPS = [-2, -5, -7, -9, -12, -14]
var EXIT_BACK_H_STEPS = [2, 5, 7, 9, 12, 14]

// Vertical page slide steps (margin-top in px).
var ENTER_V_STEPS = [90, 72, 54, 36, 18, 0]
var EXIT_FORWARD_V_STEPS = [-15, -30, -45, -60, -75, -90]
var EXIT_BACK_V_STEPS = [15, 30, 45, 60, 75, 90]

var pendingEnterType = 'fromRight'
var lastEnterType = 'fromRight'

function isVertical(type) {
  return type === 'fromBottom' || type === 'fromTop' ||
         type === 'toBottom' || type === 'toTop'
}

function getReverse(type) {
  switch (type) {
    case 'fromBottom': return { exit: 'toBottom', prevEnter: 'fromTop' }
    case 'fromTop': return { exit: 'toTop', prevEnter: 'fromBottom' }
    case 'fromLeft': return { exit: 'toLeft', prevEnter: 'fromRight' }
    case 'fromRight': return { exit: 'toRight', prevEnter: 'fromLeft' }
    default: return { exit: 'zoomOut', prevEnter: 'zoomIn' }
  }
}

function getExitType(enterType) {
  switch (enterType) {
    case 'fromBottom': return 'toTop'
    case 'fromTop': return 'toBottom'
    case 'fromLeft': return 'toRight'
    case 'fromRight': return 'toLeft'
    default: return 'zoomOut'
  }
}

function getSteps(type) {
  switch (type) {
    case 'fromRight': return ENTER_H_STEPS
    case 'fromLeft': return ENTER_H_STEPS.map(function (v) { return -v })
    case 'toRight': return EXIT_BACK_H_STEPS
    case 'toLeft': return EXIT_FORWARD_H_STEPS
    case 'fromBottom': return ENTER_V_STEPS
    case 'fromTop': return ENTER_V_STEPS.map(function (v) { return -v })
    case 'toBottom': return EXIT_BACK_V_STEPS
    case 'toTop': return EXIT_FORWARD_V_STEPS
    default: return [0, 0, 0, 0, 0, 0]
  }
}

function applyFrame(ctx, x, y, opacity) {
  ctx.pageOffset = x
  ctx.pageOffsetY = y
  ctx.pageOpacity = opacity
}

function resetFrame(ctx) {
  if (ctx) {
    ctx.pageOffset = 0
    ctx.pageOffsetY = 0
    ctx.pageOpacity = 1
  }
}

function clearMotion(ctx) {
  if (ctx && ctx.motionTimer) {
    clearTimeout(ctx.motionTimer)
    ctx.motionTimer = null
  }
  resetFrame(ctx)
}

function runFrames(ctx, type, fadeOut, done) {
  var steps = getSteps(type)
  var vertical = isVertical(type)
  var index = 0
  clearMotion(ctx)
  function next() {
    if (index >= steps.length) {
      ctx.motionTimer = null
      if (done) done()
      return
    }
    var progress = (index + 1) / steps.length
    var opacity = fadeOut ? 1 - progress * 0.35 : 0.65 + progress * 0.35
    var x = vertical ? 0 : steps[index]
    var y = vertical ? steps[index] : 0
    applyFrame(ctx, x, y, opacity)
    index++
    ctx.motionTimer = setTimeout(next, FRAME_MS)
  }
  next()
}

export default {
  enter(ctx, type) {
    navigationGuard.enter(ctx)
    var enterType = type || pendingEnterType
    pendingEnterType = 'fromRight'
    lastEnterType = enterType
    resetFrame(ctx)
    if (enterType === 'zoomIn') {
      applyFrame(ctx, 0, 0, 0.65)
      runFrames(ctx, 'zoomIn', false)
    } else {
      var vertical = isVertical(enterType)
      applyFrame(ctx, vertical ? 0 : 14, vertical ? 90 : 0, 0.65)
      runFrames(ctx, enterType, false)
    }
  },

  back(ctx, router) {
    if (!navigationGuard.begin(ctx)) return false
    var reverse = getReverse(lastEnterType)
    pendingEnterType = reverse.prevEnter
    runFrames(ctx, reverse.exit, true, function () {
      try {
        router.back()
      } catch (error) {
        navigationGuard.release(ctx)
        console.log('router back unavailable')
      }
    })
    return true
  },

  push(ctx, router, uri, type) {
    if (!navigationGuard.begin(ctx)) return false
    var enterType = type || 'fromRight'
    var exitType = getExitType(enterType)
    pendingEnterType = enterType
    runFrames(ctx, exitType, true, function () {
      try {
        router.push({ uri: uri, params: {} })
      } catch (error) {
        navigationGuard.release(ctx)
        console.log('router push unavailable')
      }
    })
    return true
  },

  replace(ctx, router, uri, type) {
    if (!navigationGuard.begin(ctx)) return false
    var enterType = type || 'fromRight'
    var exitType = getExitType(enterType)
    pendingEnterType = enterType
    runFrames(ctx, exitType, true, function () {
      try {
        if (router.replace) {
          router.replace({ uri: uri, params: {} })
        } else {
          router.push({ uri: uri, params: {} })
        }
      } catch (error) {
        navigationGuard.release(ctx)
        console.log('router replace unavailable')
      }
    })
    return true
  },

  clear: clearMotion
}
