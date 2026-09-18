var freedom = require('../../freedom')
var adapter = require('../../adapter')
var layout = require('./layout')

function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

function resolve(profile, scene, safe) {
  var config = adapter.select(layout, profile)
  var plan = adapter.createPlan(profile, scene, safe, freedom.ASSISTED, config.surface)
  var streamHeight = Math.max(40, safe.bottom - (safe.top + config.streamTop))
  plan.stream = adapter.placeBand(profile, scene, safe, {
    top: config.streamTop,
    width: config.contentWidth,
    height: streamHeight,
    circleFit: 'none'
  })

  plan.headerWidth = Math.min(config.headerWidth, plan.stream.width)
  plan.headerHeight = config.headerHeight
  plan.titleWidth = config.titleWidth
  plan.goalWidth = config.goalWidth
  plan.titleSize = config.titleSize
  plan.subtitleSize = config.subtitleSize
  plan.goalSize = config.goalSize
  plan.titleLineHeight = config.titleLineHeight
  plan.subtitleLineHeight = config.subtitleLineHeight
  plan.goalLineHeight = config.goalLineHeight
  plan.cardGap = config.cardGap
  plan.cardRadius = config.cardRadius

  plan.summaryGap = config.cardGap
  plan.summaryRowHeight = config.summaryOuterHeight
  plan.summaryPaddingX = config.summaryPaddingX
  plan.summaryPaddingY = config.summaryPaddingY
  var summaryOuter = adapter.grid(plan.stream, 2, plan.summaryGap).itemWidth
  var summaryBox = adapter.contentBox(summaryOuter, config.summaryOuterHeight, plan.summaryPaddingX, plan.summaryPaddingY)
  plan.summaryOuterWidth = summaryOuter
  plan.summaryWidth = summaryBox.width
  plan.summaryHeight = summaryBox.height
  plan.summaryLabelSize = config.summaryLabelSize
  plan.summaryValueSize = config.summaryValueSize

  plan.insightGap = Math.max(3, Math.min(config.cardGap, 6))
  plan.insightRowHeight = config.insightOuterHeight
  plan.insightPadding = config.insightPadding
  var insightOuter = adapter.grid(plan.stream, 3, plan.insightGap).itemWidth
  var insightBox = adapter.contentBox(insightOuter, config.insightOuterHeight, plan.insightPadding, plan.insightPadding)
  plan.insightOuterWidth = insightOuter
  plan.insightWidth = insightBox.width
  plan.insightHeight = insightBox.height
  plan.insightLabelSize = config.insightLabelSize
  plan.insightValueSize = config.insightValueSize

  var trend = config.trend || {}
  plan.trendMode = trend.mode || 'compact-column'
  plan.trendOuterWidth = Math.min(Number(trend.outerWidth) || plan.stream.width, plan.stream.width)
  plan.trendOuterHeight = Number(trend.outerHeight) || 80
  plan.trendPaddingX = Number(trend.paddingX) || 0
  plan.trendPaddingY = Number(trend.paddingY) || 0
  var trendBox = adapter.contentBox(plan.trendOuterWidth, plan.trendOuterHeight, plan.trendPaddingX, plan.trendPaddingY)
  plan.trendWidth = trendBox.width
  plan.trendHeight = trendBox.height
  plan.trendHeadHeight = trend.headHeight || 14
  plan.trendTitleSize = trend.titleSize || 9
  plan.trendCaptionSize = trend.captionSize || 6
  plan.chartHeight = trend.chartHeight || 30
  plan.columnLabelSize = trend.labelSize || 0
  plan.columnLabelLineHeight = trend.labelLineHeight || 0
  plan.columnBarWidth = trend.barWidth || 0
  plan.pillTrendMinWidth = trend.rowMinWidth || 0
  plan.pillTrendMaxWidth = trend.rowMaxWidth || 0
  if (plan.trendMode === 'compact-column') {
    plan.columnCellWidth = adapter.grid({ width: plan.trendWidth }, 7, 0).itemWidth
  } else {
    plan.columnCellWidth = 0
  }
  return plan
}

module.exports = {
  freedomLevel: freedom.ASSISTED,
  contentWidth: contentWidth,
  resolve: resolve,
  layout: layout
}
