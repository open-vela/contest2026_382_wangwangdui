var adapter = require('./adapter')

function number(value, fallback) {
  var result = Number(value)
  return isFinite(result) ? result : fallback
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function round(value) {
  return Math.round(value * 100) / 100
}

function listHeight(itemHeight, itemGap, count) {
  if (count <= 0) return 0
  return itemHeight * count + itemGap * Math.max(0, count - 1)
}

function expansionMetrics(source, verticalScale) {
  var config = source || {}
  var stretch = Math.max(1, number(verticalScale, 1))
  var rhythm = 1 + (stretch - 1) * number(config.rhythmExpansion, 0.55)
  var chrome = 1 + (stretch - 1) * number(config.chromeExpansion, 0.35)
  return {
    verticalScale: stretch,
    rhythmScale: rhythm,
    chromeScale: chrome
  }
}

function layoutSpec(source, count, verticalScale, lockedScale) {
  var config = source || {}
  var header = config.header || {}
  var item = config.item || {}
  var footer = config.footer || {}
  var metrics = expansionMetrics(config, verticalScale)
  var itemHeight = number(item.height, 50) * metrics.verticalScale
  var itemGap = number(config.itemGap, 6) * metrics.rhythmScale
  var minScale = lockedScale === undefined || lockedScale === null
    ? number(config.minScale, 0.86)
    : lockedScale
  var maxScale = lockedScale === undefined || lockedScale === null
    ? number(config.maxScale, 1.14)
    : lockedScale

  return {
    id: config.id || 'paged-stack',
    freedomLevel: config.freedomLevel || 1,
    strategy: config.strategy || 'auto',
    default: {
      mode: 'auto-stack',
      verticalAlign: config.verticalAlign || 'start',
      minScale: minScale,
      maxScale: maxScale,
      scaleStep: number(config.scaleStep, 0.02),
      gap: number(config.sectionGap, 4) * metrics.rhythmScale,
      comfort: config.comfort,
      regions: [
        {
          id: 'header',
          role: 'header',
          width: number(header.width, 120),
          height: number(header.height, 20) * metrics.chromeScale
        },
        {
          id: 'list',
          role: 'list',
          width: number(item.width, 148),
          height: listHeight(itemHeight, itemGap, count)
        },
        {
          id: 'footer',
          role: 'pager',
          width: number(footer.width, 110),
          height: number(footer.height, 14) * metrics.chromeScale
        }
      ]
    }
  }
}

function decorate(plan, source, visibleCount, verticalScale) {
  var config = source || {}
  var metrics = expansionMetrics(config, verticalScale)
  var scale = plan.scale || 1
  var maxVisualScale = number(config.maxVisualScale, 1.34)
  var visualScale = scale * (1 + (metrics.verticalScale - 1) * number(config.visualExpansion, 0.5))

  plan.visibleCount = visibleCount
  plan.itemWidth = round(number(config.item && config.item.width, 148) * scale)
  plan.itemHeight = round(number(config.item && config.item.height, 50) * metrics.verticalScale * scale)
  plan.itemGap = round(number(config.itemGap, 6) * metrics.rhythmScale * scale)
  plan.verticalScale = round(metrics.verticalScale)
  plan.visualScale = round(clamp(visualScale, scale, maxVisualScale))
  return plan
}

function expandComfort(profile, source, count, basePlan) {
  var config = source || {}
  var maxVerticalScale = Math.max(1, number(config.maxVerticalScale, 1.4))
  var step = clamp(number(config.verticalScaleStep, 0.05), 0.02, 0.2)
  var scale = maxVerticalScale

  while (scale >= 1 - 0.0001) {
    var candidate = adapter.resolve(profile, layoutSpec(config, count, round(scale), basePlan.scale))
    if (!candidate.needsOverride) return decorate(candidate, config, count, round(scale))
    scale = round(scale - step)
  }

  return decorate(basePlan, config, count, 1)
}

function resolve(profile, source) {
  var config = source || {}
  var maxItems = Math.max(1, Math.round(number(config.maxItems, 3)))
  var minItems = Math.max(1, Math.min(maxItems, Math.round(number(config.minItems, 1))))
  var lastPlan = null

  for (var count = maxItems; count >= minItems; count--) {
    var plan = adapter.resolve(profile, layoutSpec(config, count, 1))
    lastPlan = plan
    if (!plan.needsOverride) {
      var result = expandComfort(profile, config, count, plan)
      result.pageSize = count
      result.capacityReduced = count < maxItems
      return result
    }
  }

  if (!lastPlan) lastPlan = adapter.resolve(profile, layoutSpec(config, minItems, 1))
  var fallback = decorate(lastPlan, config, minItems, 1)
  fallback.pageSize = minItems
  fallback.capacityReduced = minItems < maxItems
  return fallback
}

function resolvePage(profile, source, capacityPlan, visibleCount) {
  var config = source || {}
  var capacity = capacityPlan && capacityPlan.pageSize
    ? capacityPlan.pageSize
    : Math.max(1, Math.round(number(config.maxItems, 3)))
  var count = Math.max(1, Math.min(capacity, Math.round(number(visibleCount, capacity))))
  var geometryScale = capacityPlan && capacityPlan.scale ? capacityPlan.scale : 1
  var verticalScale = capacityPlan && capacityPlan.verticalScale ? capacityPlan.verticalScale : 1
  var candidate = adapter.resolve(profile, layoutSpec(config, count, verticalScale, geometryScale))
  var result = decorate(candidate, config, count, verticalScale)

  result.pageSize = capacity
  result.capacityReduced = capacityPlan ? !!capacityPlan.capacityReduced : capacity < Math.max(1, Math.round(number(config.maxItems, 3)))
  result.visualScale = capacityPlan && capacityPlan.visualScale ? capacityPlan.visualScale : result.visualScale
  result.isPartialPage = count < capacity
  return result
}

module.exports = {
  resolve: resolve,
  resolvePage: resolvePage,
  listHeight: listHeight,
  layoutSpec: layoutSpec
}
