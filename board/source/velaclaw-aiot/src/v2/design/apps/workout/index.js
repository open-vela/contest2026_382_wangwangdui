var freedom = require('../../freedom')
var adapter = require('../../adapter')
var layout = require('./layout')

function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

function box(profile, scene, safe, source) {
  var spec = adapter.merge({}, source || {})
  if (spec.topFromBottom !== undefined) {
    spec.absoluteTop = true
    spec.top = safe.bottom - Number(spec.topFromBottom)
    delete spec.topFromBottom
  }
  return adapter.placeBand(profile, scene, safe, spec)
}

function resolve(profile, scene, safe) {
  var config = adapter.select(layout, profile)
  var plan = adapter.createPlan(profile, scene, safe, freedom.ASSISTED, config.surface)
  plan.header = box(profile, scene, safe, config.header)
  plan.hero = box(profile, scene, safe, config.hero)
  plan.metrics = box(profile, scene, safe, config.metrics)
  plan.actions = box(profile, scene, safe, config.actions)
  plan.metricColumns = config.metricColumns
  plan.metricGap = config.metricGap
  plan.metricHeight = config.metricHeight
  plan.actionGap = config.actionGap
  plan.titleSize = config.titleSize
  plan.statusSize = config.statusSize
  plan.durationSize = config.durationSize
  plan.durationLineHeight = config.durationLineHeight
  plan.durationLabelSize = config.durationLabelSize
  plan.gpsSize = config.gpsSize
  plan.metricValueSize = config.metricValueSize
  plan.metricLabelSize = config.metricLabelSize
  plan.actionSize = config.actionSize
  plan.radius = config.radius
  plan.metricItemWidth = adapter.grid(plan.metrics, plan.metricColumns, plan.metricGap).itemWidth
  plan.actionWidth = adapter.grid(plan.actions, 2, plan.actionGap).itemWidth
  return plan
}

module.exports = { freedomLevel: freedom.ASSISTED, contentWidth: contentWidth, resolve: resolve, layout: layout }
