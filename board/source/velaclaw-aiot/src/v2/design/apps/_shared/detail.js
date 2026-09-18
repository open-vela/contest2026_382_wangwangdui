var freedom = require('../../freedom')
var adapter = require('../../adapter')

function create(layout) {
  function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

  function resolve(profile, scene, safe) {
    var config = adapter.select(layout, profile)
    var plan = adapter.createPlan(profile, scene, safe, freedom.AUTO, config.surface || 'settings-stream')
    plan.header = adapter.placeBand(profile, scene, safe, {
      top: config.headerTop,
      width: config.headerWidth || config.contentWidth,
      height: config.headerHeight,
      circleFit: config.headerCircleFit || 'edges',
      edgePadding: 3
    })
    var streamTop = plan.header.top + plan.header.height + config.headerGap
    var streamHeight = Math.max(config.streamMinHeight || 40, safe.bottom - streamTop)
    plan.stream = adapter.placeBand(profile, scene, safe, {
      absoluteTop: true,
      top: streamTop,
      width: config.streamWidth || config.contentWidth,
      height: streamHeight,
      circleFit: config.streamCircleFit || 'none'
    })
    plan.compact = !!config.compact
    plan.tall = !!config.tall
    plan.titleSize = config.titleSize
    plan.cardRadius = config.cardRadius
    plan.cardGap = config.cardGap
    plan.bodySize = config.bodySize
    plan.valueSize = config.valueSize
    plan.testTitleSize = config.testTitleSize
    plan.controls = adapter.merge({}, config.controls || {})
    plan.controls.levelButtonWidth = adapter.grid(plan.stream, 3, plan.cardGap).itemWidth
    return plan
  }

  return { freedomLevel: freedom.AUTO, contentWidth: contentWidth, resolve: resolve, layout: layout }
}

module.exports = { create: create }
