var safeArea = require('../viewport/safe_area')
var constraints = require('./constraints')
var composition = require('./composition')

var MODE_AUTO_STACK = 'auto-stack'
var MODE_FIXED = 'fixed-composition'
var MODE_EXTERNAL = 'external-engine'

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

function scaledRegion(source, scale) {
  return {
    id: source.id,
    role: source.role || source.id,
    variant: source.variant || 'default',
    width: round(number(source.width, 0) * scale),
    height: round(number(source.height, 0) * scale),
    minWidth: round(number(source.minWidth, 0) * scale),
    minHeight: round(number(source.minHeight, 0) * scale),
    align: source.align || 'center',
    visible: source.visible !== false,
    source: source
  }
}

function regionLeft(region) {
  if (region.align === 'left') return 0
  if (region.align === 'right') return safeArea.DESIGN_WIDTH - region.width
  return (safeArea.DESIGN_WIDTH - region.width) / 2
}

function stackStart(profile, regions, gap, spec) {
  if (!regions.length) return 0

  // Start-aligned stacks should use the first region's own safe band rather
  // than the widest region in the page. This is what lets a narrow wearable
  // header live safely in the circle cap while a wider card/list starts lower.
  if (!spec.verticalAlign || spec.verticalAlign === 'start' || spec.verticalAlign === 'top') {
    return constraints.intervalFor(profile, regions[0].width, spec.comfort).top
  }

  var maxWidth = 0
  var totalHeight = 0
  for (var i = 0; i < regions.length; i++) {
    maxWidth = Math.max(maxWidth, regions[i].width)
    totalHeight += regions[i].height
  }
  if (regions.length > 1) totalHeight += gap * (regions.length - 1)
  var bounds = safeArea.resolve(profile, maxWidth || 136, spec.comfort)
  if (spec.verticalAlign === 'center') return Math.max(bounds.top, bounds.top + (bounds.height - totalHeight) / 2)
  if (spec.verticalAlign === 'end' || spec.verticalAlign === 'bottom') return Math.max(bounds.top, bounds.bottom - totalHeight)
  return bounds.top
}

function tryAutoStack(profile, spec, scale) {
  var source = spec.regions || []
  var gap = number(spec.gap, 0) * scale
  var scaled = []
  for (var s = 0; s < source.length; s++) {
    var candidate = scaledRegion(source[s], scale)
    if (candidate.visible) scaled.push(candidate)
  }

  var regions = []
  var cursor = stackStart(profile, scaled, gap, spec)
  var violations = []

  for (var i = 0; i < scaled.length; i++) {
    var region = scaled[i]
    var allowed = constraints.intervalFor(profile, region.width, spec.comfort)
    var top = Math.max(cursor, allowed.top)
    var left = regionLeft(region)
    var placed = {
      id: region.id,
      role: region.role,
      variant: region.variant,
      left: round(left),
      top: round(top),
      width: region.width,
      height: region.height,
      right: round(left + region.width),
      bottom: round(top + region.height),
      scale: scale
    }
    var result = constraints.validateRegion(profile, placed, spec.comfort)
    if (!result.valid) violations.push({ id: region.id, errors: result.errors, interval: result.interval })
    regions.push(placed)
    cursor = placed.bottom + gap
  }

  return {
    valid: violations.length === 0,
    regions: regions,
    violations: violations,
    contentBottom: regions.length ? regions[regions.length - 1].bottom : 0
  }
}

function resolveAutoStack(profile, spec) {
  var minScale = clamp(number(spec.minScale, 0.72), 0.4, 1)
  var maxScale = clamp(number(spec.maxScale, 1), minScale, 1.5)
  var step = clamp(number(spec.scaleStep, 0.02), 0.01, 0.1)
  var best = null
  var scale = maxScale

  while (scale >= minScale - 0.0001) {
    var candidate = tryAutoStack(profile, spec, round(scale))
    if (candidate.valid) {
      best = candidate
      break
    }
    scale = round(scale - step)
  }

  if (!best) {
    var fallback = tryAutoStack(profile, spec, minScale)
    return {
      mode: MODE_AUTO_STACK,
      scale: minScale,
      regions: fallback.regions,
      violations: fallback.violations,
      needsOverride: true,
      reason: 'auto-stack-cannot-fit-within-min-scale'
    }
  }

  return {
    mode: MODE_AUTO_STACK,
    scale: round(scale),
    regions: best.regions,
    violations: [],
    needsOverride: false,
    reason: ''
  }
}

function resolveFixed(profile, spec) {
  var regions = []
  var violations = []
  var source = spec.regions || []
  for (var i = 0; i < source.length; i++) {
    if (source[i].visible === false) continue
    var placed = {
      id: source[i].id,
      role: source[i].role || source[i].id,
      variant: source[i].variant || 'default',
      left: number(source[i].left, 0),
      top: number(source[i].top, 0),
      width: number(source[i].width, 0),
      height: number(source[i].height, 0),
      right: number(source[i].left, 0) + number(source[i].width, 0),
      bottom: number(source[i].top, 0) + number(source[i].height, 0),
      scale: 1
    }
    var result = constraints.validateRegion(profile, placed, spec.comfort)
    if (!result.valid) violations.push({ id: placed.id, errors: result.errors, interval: result.interval })
    regions.push(placed)
  }
  return {
    mode: MODE_FIXED,
    scale: 1,
    regions: regions,
    violations: violations,
    needsOverride: violations.length > 0,
    reason: violations.length ? 'fixed-composition-violates-safe-geometry' : ''
  }
}

function safeBounds(profile, width, comfort) {
  return safeArea.resolve(profile, width || 136, comfort)
}

function resolve(profile, layoutSpec) {
  var selected = composition.select(layoutSpec, profile)
  var mode = selected.mode || MODE_AUTO_STACK
  var plan

  if (mode === MODE_EXTERNAL) {
    plan = { mode: MODE_EXTERNAL, scale: 1, regions: [], violations: [], needsOverride: false, reason: '' }
  } else if (mode === MODE_FIXED) {
    plan = resolveFixed(profile, selected)
  } else {
    plan = resolveAutoStack(profile, selected)
  }

  plan.id = selected.id
  plan.freedomLevel = selected.freedomLevel
  plan.strategy = selected.strategy
  plan.shape = selected.shape
  plan.composition = selected.composition
  plan.hasOverride = selected.hasOverride
  plan.safeBounds = safeBounds(profile, selected.safeWidth || selected.contentWidth || 136, selected.comfort)
  return plan
}

function regionMap(plan) {
  var result = {}
  var regions = plan && plan.regions ? plan.regions : []
  for (var i = 0; i < regions.length; i++) result[regions[i].id] = regions[i]
  return result
}

module.exports = {
  MODE_AUTO_STACK: MODE_AUTO_STACK,
  MODE_FIXED: MODE_FIXED,
  MODE_EXTERNAL: MODE_EXTERNAL,
  resolve: resolve,
  regionMap: regionMap
}
