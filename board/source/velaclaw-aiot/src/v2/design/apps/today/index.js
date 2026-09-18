var freedom = require('../../freedom')
var adapter = require('../../adapter')
var layout = require('./layout')

function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

function requiredHeights(profile) {
  var config = adapter.select(layout, profile)
  return adapter.merge({}, config.requiredHeights || {})
}

function resolve(profile, scene, safe) {
  var config = adapter.select(layout, profile)
  var plan = adapter.createPlan(profile, scene, safe, freedom.ASSISTED, config.surface)
  plan.interaction = config.interaction
  plan.overflow = config.overflow
  plan.requiredHeights = adapter.merge({}, config.requiredHeights || {})
  var maxRequired = 0
  for (var key in plan.requiredHeights) if (plan.requiredHeights[key] > maxRequired) maxRequired = plan.requiredHeights[key]
  plan.needsOverride = maxRequired > safe.height
  if (config.circleFrame) plan.circleFrame = adapter.region(config.circleFrame.left, config.circleFrame.top, config.circleFrame.width, config.circleFrame.height)
  return plan
}

module.exports = { freedomLevel: freedom.ASSISTED, contentWidth: contentWidth, requiredHeights: requiredHeights, resolve: resolve, layout: layout }
