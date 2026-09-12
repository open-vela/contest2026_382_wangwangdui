var freedom = require('../../freedom')
var adapter = require('../../adapter')
var layout = require('./layout')

function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

function band(profile, scene, safe, spec) {
  if (!spec) return null
  var copy = adapter.merge({}, spec)
  var relativeTop = Number(copy.top) || 0
  var bottomInset = copy.bottomInset === undefined ? 0 : Number(copy.bottomInset) || 0
  if (copy.height === undefined) copy.height = Math.max(1, safe.height - relativeTop - bottomInset)
  if (copy.bottomInset !== undefined) {
    copy.absoluteTop = true
    copy.top = safe.bottom - bottomInset - Number(copy.height || 0)
  }
  return adapter.placeBand(profile, scene, safe, copy)
}

function resolve(profile, scene, safe) {
  var config = adapter.select(layout, profile)
  var plan = adapter.createPlan(profile, scene, safe, freedom.FREE, config.surface)
  plan.faceIds = (config.faceIds || []).slice()
  plan.pageSize = config.pageSize
  plan.header = band(profile, scene, safe, config.header)
  plan.preview = band(profile, scene, safe, config.preview)
  plan.footer = band(profile, scene, safe, config.footer)
  plan.content = band(profile, scene, safe, config.content)
  plan.pager = band(profile, scene, safe, config.pager)
  plan.cardHeight = config.cardHeight
  plan.cardGap = config.cardGap
  plan.gap = config.gap
  plan.cardWidth = config.gap && plan.content ? adapter.grid(plan.content, 2, config.gap).itemWidth : config.cardWidth
  plan.titleSize = config.titleSize
  plan.nameSize = config.nameSize
  plan.descSize = config.descSize
  plan.previewWidth = config.previewWidth
  plan.previewNameSize = config.previewNameSize
  plan.previewTimeSize = config.previewTimeSize
  plan.previewRadius = config.previewRadius
  return plan
}

module.exports = { freedomLevel: freedom.FREE, contentWidth: contentWidth, resolve: resolve, layout: layout }
