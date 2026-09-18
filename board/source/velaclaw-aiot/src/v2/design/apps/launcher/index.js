var freedom = require('../../freedom')
var adapter = require('../../adapter')
var layout = require('./layout')

function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

function resolveBand(profile, scene, safe, spec) {
  if (!spec) return null
  var copy = adapter.merge({}, spec)
  if (copy.bottomInset !== undefined) {
    copy.absoluteTop = true
    copy.top = safe.bottom - Number(copy.bottomInset) - Number(copy.height || 0)
  }
  if (copy.height === undefined && copy.bottomInset !== undefined) copy.height = Math.max(1, safe.bottom - (safe.top + Number(copy.top || 0)) - Number(copy.bottomInset || 0))
  return adapter.placeBand(profile, scene, safe, copy)
}

function resolve(profile, scene, safe) {
  var config = adapter.select(layout, profile)
  var plan = adapter.createPlan(profile, scene, safe, freedom.FREE, config.surface)
  plan.appIds = (config.appIds || []).slice()
  plan.pageSize = config.pageSize
  if (config.frame === 'scene') plan.frame = adapter.region(0, 0, scene.width, scene.height)
  if (config.header) plan.header = resolveBand(profile, scene, safe, config.header)
  if (config.content) {
    var contentSpec = adapter.merge({}, config.content)
    if (contentSpec.height === undefined) contentSpec.height = Math.max(1, safe.height - Number(contentSpec.top || 0) - Number(contentSpec.bottomInset || 0))
    plan.content = resolveBand(profile, scene, safe, contentSpec)
  }
  if (config.pager) {
    var pagerSpec = adapter.merge({}, config.pager)
    pagerSpec.absoluteTop = true
    pagerSpec.top = safe.bottom - Number(pagerSpec.bottomInset || 0)
    plan.pager = adapter.placeBand(profile, scene, safe, pagerSpec)
  }
  plan.columns = config.columns
  plan.gap = config.gap
  plan.itemWidth = config.columns && plan.content ? adapter.grid(plan.content, config.columns, config.gap).itemWidth : config.itemWidth
  plan.itemHeight = config.itemHeight
  plan.itemGap = config.itemGap
  plan.titleSize = config.titleSize
  plan.nameSize = config.nameSize
  plan.arrowSize = config.arrowSize
  plan.iconSize = config.iconSize
  plan.itemRadius = config.itemRadius
  return plan
}

module.exports = { freedomLevel: freedom.FREE, contentWidth: contentWidth, resolve: resolve, layout: layout }
