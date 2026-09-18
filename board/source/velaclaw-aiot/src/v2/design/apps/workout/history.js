var freedom = require('../../freedom')
var adapter = require('../../adapter')
var layout = require('./history_layout')

function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

function fill(profile, scene, safe, spec) {
  var copy = adapter.merge({}, spec || {})
  if (copy.height === undefined) copy.height = Math.max(40, safe.bottom - (safe.top + Number(copy.top || 0)))
  return adapter.placeBand(profile, scene, safe, copy)
}

function resolve(profile, scene, safe) {
  var config = adapter.select(layout, profile)
  var plan = adapter.createPlan(profile, scene, safe, freedom.AUTO, config.surface)
  plan.header = fill(profile, scene, safe, config.header)
  plan.summary = fill(profile, scene, safe, config.summary)
  plan.stream = fill(profile, scene, safe, config.stream)

  plan.summaryGap = config.summaryGap
  plan.summaryPaddingLeft = config.summaryPaddingLeft
  var summaryGrid = adapter.grid(plan.summary, 2, plan.summaryGap)
  plan.summaryCardOuterWidth = summaryGrid.itemWidth
  plan.summaryCardWidth = Math.max(1, plan.summaryCardOuterWidth - plan.summaryPaddingLeft)

  var recordBox = adapter.contentBox(plan.stream.width, config.itemHeight, config.padding, config.padding)
  plan.stream.itemWidth = recordBox.width
  plan.stream.itemHeight = recordBox.height
  plan.stream.outerItemWidth = plan.stream.width
  plan.stream.outerItemHeight = config.itemHeight
  plan.stream.gap = config.itemGap

  plan.titleSize = config.titleSize
  plan.backSize = config.backSize
  plan.summaryValueSize = config.summaryValueSize
  plan.summaryLabelSize = config.summaryLabelSize
  plan.recordTitleSize = config.recordTitleSize
  plan.recordMetaSize = config.recordMetaSize
  plan.radius = config.radius
  plan.padding = config.padding
  return plan
}

module.exports = { freedomLevel: freedom.AUTO, contentWidth: contentWidth, resolve: resolve, layout: layout }
