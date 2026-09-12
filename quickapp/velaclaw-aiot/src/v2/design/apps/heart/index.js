var freedom = require('../../freedom')
var adapter = require('../../adapter')
var layout = require('./layout')

function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

function centeredBox(stream, top, width, height) {
  return adapter.region(stream.left + Math.max(0, Math.round((stream.width - width) / 2)), top, width, height)
}

function resolve(profile, scene, safe) {
  var config = adapter.select(layout, profile)
  var plan = adapter.createPlan(profile, scene, safe, freedom.AUTO, config.surface)
  var streamHeight = Math.max(40, safe.bottom - (safe.top + config.streamTop))
  plan.stream = adapter.placeBand(profile, scene, safe, {
    top: config.streamTop,
    width: config.contentWidth,
    height: streamHeight,
    circleFit: 'none'
  })

  plan.headerWidth = Math.min(config.headerWidth, plan.stream.width)
  plan.headerHeight = config.headerHeight
  plan.headGap = 4
  plan.headSummaryWidth = Math.max(44, Math.round(plan.headerWidth * 0.44))
  plan.headTitleWidth = Math.max(32, plan.headerWidth - plan.headSummaryWidth - plan.headGap)
  plan.headSourceWidth = Math.max(42, Math.round(plan.headerWidth * 0.38))
  plan.headSubtitleWidth = Math.max(48, plan.headerWidth - plan.headSourceWidth - plan.headGap)

  plan.cardGap = config.cardGap
  plan.cardRadius = config.cardRadius
  plan.cardPaddingX = config.cardPaddingX
  plan.cardPaddingY = config.cardPaddingY
  plan.miniPaddingX = config.miniPaddingX
  plan.miniPaddingY = config.miniPaddingY
  plan.chartHeight = config.chartHeight
  plan.trendMinHeight = config.trendMinHeight
  plan.scrollPaddingBottom = config.scrollPaddingBottom

  var hero = adapter.contentBox(plan.stream.width, config.heroOuterHeight, plan.cardPaddingX, plan.cardPaddingY)
  plan.cardWidth = hero.width
  plan.heroHeight = hero.height

  var miniGrid = adapter.grid(plan.stream, 2, plan.cardGap)
  var mini = adapter.contentBox(miniGrid.itemWidth, config.miniOuterHeight, plan.miniPaddingX, plan.miniPaddingY)
  plan.miniOuterWidth = miniGrid.itemWidth
  plan.miniWidth = mini.width
  plan.miniRowHeight = config.miniOuterHeight
  plan.miniHeight = mini.height

  var detail = adapter.contentBox(plan.stream.width, config.detailOuterHeight, plan.cardPaddingX, plan.cardPaddingY)
  plan.detailHeight = detail.height

  // These boxes describe the actual Vela elements produced by the page after
  // contentBox translation. They are metadata for tooling/diagnostics only;
  // the page remains a single L1 flow and does not position these absolutely.
  plan.headerBox = centeredBox(plan.stream, plan.stream.top, plan.headerWidth, plan.headerHeight)
  plan.heroBox = centeredBox(plan.stream, plan.stream.top + plan.headerHeight + plan.cardGap, plan.cardWidth, plan.heroHeight)
  plan.miniBox = adapter.region(plan.stream.left, plan.heroBox.top + plan.heroBox.height + plan.cardGap, plan.stream.width, plan.miniRowHeight)

  plan.titleSize = config.titleSize
  plan.subtitleSize = config.subtitleSize
  plan.valueSize = config.valueSize
  plan.miniValueSize = config.miniValueSize
  plan.labelSize = config.labelSize
  plan.metaSize = config.metaSize
  plan.titleLineHeight = config.titleLineHeight
  plan.subtitleLineHeight = config.subtitleLineHeight
  plan.labelLineHeight = config.labelLineHeight
  plan.metaLineHeight = config.metaLineHeight
  plan.valueLineHeight = config.valueLineHeight
  plan.miniValueLineHeight = config.miniValueLineHeight
  return plan
}

module.exports = {
  freedomLevel: freedom.AUTO,
  contentWidth: contentWidth,
  resolve: resolve,
  layout: layout
}