var adapter = require('./adapter')
var composition = require('./composition')
var safeArea = require('../viewport/safe_area')
var constraints = require('./constraints')

function number(value, fallback) {
  var result = Number(value)
  return isFinite(result) ? result : fallback
}

function round(value) {
  return Math.round(value * 100) / 100
}

function maxBottom(plan, ignoredId) {
  var regions = plan && plan.regions ? plan.regions : []
  var bottom = 0
  for (var i = 0; i < regions.length; i++) {
    if (ignoredId && regions[i].id === ignoredId) continue
    bottom = Math.max(bottom, number(regions[i].bottom, 0))
  }
  return bottom
}

function findRegion(plan, id) {
  var regions = plan && plan.regions ? plan.regions : []
  for (var i = 0; i < regions.length; i++) {
    if (regions[i].id === id) return regions[i]
  }
  return null
}

function resolve(profile, spec) {
  var selected = composition.select(spec, profile)
  var plan = adapter.resolve(profile, spec)
  var stream = selected.stream || {}
  var regionId = stream.regionId || ''
  var reserved = regionId ? findRegion(plan, regionId) : null
  var width = reserved ? reserved.width : number(stream.width, 156)
  var topGap = reserved ? 0 : number(stream.topGap, 8)
  var top = reserved ? reserved.top : round(maxBottom(plan) + topGap)
  var left = reserved ? reserved.left : round((safeArea.DESIGN_WIDTH - width) / 2)
  var viewportHeight = reserved ? reserved.height : number(stream.viewportHeight, 0)
  var scale = stream.scaleWithPlan ? number(plan.scale, 1) : 1

  if (stream.growViewport) {
    var allowed = constraints.intervalFor(profile, width, selected.comfort)
    viewportHeight = Math.max(viewportHeight, round(allowed.bottom - top))
  }

  plan.heroHeight = reserved ? round(maxBottom(plan, regionId)) : top
  plan.stream = {
    top: round(top),
    left: round(left),
    width: round(width),
    viewportHeight: round(Math.max(0, viewportHeight)),
    itemHeight: round(number(stream.itemHeight, 44) * scale),
    gap: round(number(stream.gap, 6) * scale),
    bottomPadding: round(number(stream.bottomPadding, 24) * scale),
    regionId: regionId
  }
  plan.tokens = selected.tokens || {}
  plan.flowMode = reserved ? 'reserved-viewport-scroll' : 'composed-header-scroll'
  return plan
}

module.exports = {
  resolve: resolve,
  maxBottom: maxBottom,
  findRegion: findRegion
}
