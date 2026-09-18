var freedom = require('../../freedom')
var adapter = require('../../adapter')

function create(layout, surface) {
  function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

  function resolve(profile, scene, safe) {
    var config = adapter.select(layout, profile)
    var plan = adapter.createPlan(profile, scene, safe, freedom.AUTO, surface || config.surface || 'centered-content')
    plan.region = adapter.placeBand(profile, scene, safe, {
      top: config.contentTop,
      width: config.contentWidth,
      height: config.contentHeight,
      circleFit: config.circleFit || 'none',
      edgePadding: config.edgePadding || 0
    })
    plan.titleSize = config.titleSize
    plan.buttonHeight = config.buttonHeight
    plan.radius = config.radius
    return plan
  }

  return { freedomLevel: freedom.AUTO, contentWidth: contentWidth, resolve: resolve, layout: layout }
}

module.exports = { create: create }
