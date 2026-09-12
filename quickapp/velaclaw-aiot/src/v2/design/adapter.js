var freedom = require('./freedom')

var SYSTEM_ID = 'declarative-adapter-v2.3'
var VERSION = '2.3'
var SHAPES = {
  circle: { contentWidth: 148, density: 'compact', radius: 14, rhythm: 4 },
  pill: { contentWidth: 168, density: 'vertical', radius: 20, rhythm: 8 },
  rect: { contentWidth: 164, density: 'balanced', radius: 16, rhythm: 6 }
}

function clamp(value, min, max) {
  var number = Number(value)
  if (!isFinite(number)) number = Number(min) || 0
  return Math.max(Number(min) || 0, Math.min(Number(max), number))
}

function shapeOf(profile) {
  var shape = profile && profile.formFactor ? String(profile.formFactor) : 'rect'
  return SHAPES[shape] ? shape : 'rect'
}

function clone(value) {
  if (Array.isArray(value)) return value.slice()
  if (!value || typeof value !== 'object') return value
  var result = {}
  for (var key in value) result[key] = clone(value[key])
  return result
}

function merge(base, override) {
  var result = clone(base || {})
  var source = override || {}
  for (var key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = merge(result[key], source[key])
    } else {
      result[key] = clone(source[key])
    }
  }
  return result
}

function select(recipe, profile) {
  var source = recipe || {}
  return merge(source.base || {}, source[shapeOf(profile)] || {})
}

function contentWidth(profile, recipeOrOverrides) {
  var shape = shapeOf(profile)
  if (recipeOrOverrides && (recipeOrOverrides.base || recipeOrOverrides.circle || recipeOrOverrides.pill || recipeOrOverrides.rect)) {
    var selected = select(recipeOrOverrides, profile)
    if (Number(selected.contentWidth) > 0) return Number(selected.contentWidth)
  }
  if (recipeOrOverrides && Number(recipeOrOverrides[shape]) > 0) return Number(recipeOrOverrides[shape])
  return SHAPES[shape].contentWidth
}

function region(left, top, width, height) {
  return {
    left: Math.round(Number(left) || 0),
    top: Math.round(Number(top) || 0),
    width: Math.max(0, Math.round(Number(width) || 0)),
    height: Math.max(0, Math.round(Number(height) || 0))
  }
}

function circleChordWidth(scene, y, edgePadding) {
  var width = Math.max(1, Number(scene && scene.width) || 192)
  var height = Math.max(1, Number(scene && scene.height) || 192)
  var radius = Math.min(width, height) / 2 - Math.max(0, Number(edgePadding) || 0)
  var dy = Math.abs(Number(y) - height / 2)
  if (radius <= 0 || dy >= radius) return 0
  return 2 * Math.sqrt(radius * radius - dy * dy)
}

function circleBandWidth(scene, top, height, edgePadding, mode) {
  var start = Number(top) || 0
  var size = Math.max(1, Number(height) || 1)
  if (mode === 'none') return Math.max(1, Number(scene && scene.width) || 192)
  if (mode === 'center') return circleChordWidth(scene, start + size / 2, edgePadding)
  var inset = Math.max(1, Number(edgePadding) || 0)
  return Math.min(
    circleChordWidth(scene, start + inset, edgePadding),
    circleChordWidth(scene, start + size - inset, edgePadding)
  )
}

// Recipes decide where a band belongs. Adapter only clamps it to the scene and,
// when explicitly requested, caps its width to the available round-screen chord.
// It never scans for a prettier position and never changes design proportions.
function placeBand(profile, scene, safe, spec) {
  var config = spec || {}
  var shape = shapeOf(profile)
  var sceneWidth = Math.max(1, Number(scene && scene.width) || 192)
  var sceneHeight = Math.max(1, Number(scene && scene.height) || 192)
  var safeTop = Math.max(0, Number(safe && safe.top) || 0)
  var safeBottom = Math.min(sceneHeight, Number(safe && safe.bottom) || sceneHeight)
  var safeLeft = Math.max(0, Number(safe && safe.left) || 0)
  var safeWidth = Math.max(1, Number(safe && safe.width) || sceneWidth)
  var height = Math.max(1, Number(config.height) || 1)
  var top = config.absoluteTop === true ? Number(config.top) || 0 : safeTop + (Number(config.top) || 0)
  top = clamp(top, 0, Math.max(0, sceneHeight - height))
  if (config.keepInsideSafe !== false) top = clamp(top, safeTop, Math.max(safeTop, safeBottom - height))

  var width = Math.min(Math.max(1, Number(config.width) || safeWidth), sceneWidth)
  if (config.keepInsideSafe !== false) width = Math.min(width, safeWidth)
  var circleFit = config.circleFit || 'none'
  if (shape === 'circle' && circleFit !== 'none') {
    width = Math.min(width, Math.max(1, Math.floor(circleBandWidth(scene, top, height, Number(config.edgePadding) || 0, circleFit))))
  }

  var left
  if (config.absoluteLeft === true) left = Number(config.left) || 0
  else if (config.align === 'left') left = safeLeft + (Number(config.left) || 0)
  else if (config.align === 'right') left = safeLeft + safeWidth - width - (Number(config.right) || 0)
  else left = (sceneWidth - width) / 2 + (Number(config.offsetX) || 0)
  left = clamp(left, 0, Math.max(0, sceneWidth - width))
  return region(left, top, width, height)
}

function grid(regionValue, columns, gap) {
  var source = regionValue || { width: 0 }
  var count = Math.max(1, Math.round(Number(columns) || 1))
  var spacing = Math.max(0, Number(gap) || 0)
  return {
    columns: count,
    gap: spacing,
    itemWidth: Math.max(1, Math.floor((Math.max(1, Number(source.width) || 1) - spacing * (count - 1)) / count))
  }
}

// Vela uses content-box-like sizing for these components: padding grows the
// rendered box. Recipes describe the desired OUTER box; this helper returns the
// width/height that should be assigned to the element before padding is applied.
function contentBox(outerWidth, outerHeight, paddingX, paddingY) {
  var px = Math.max(0, Number(paddingX) || 0)
  var py = Math.max(0, Number(paddingY) || 0)
  return {
    width: Math.max(1, Math.round(Number(outerWidth) || 0) - px * 2),
    height: Math.max(1, Math.round(Number(outerHeight) || 0) - py * 2)
  }
}

function createPlan(profile, scene, safe, level, surface) {
  var shape = shapeOf(profile)
  var tokens = SHAPES[shape]
  return {
    designSystem: SYSTEM_ID,
    designSystemVersion: VERSION,
    freedom: freedom.describe(level || freedom.AUTO),
    freedomLevel: level || freedom.AUTO,
    strategy: level === freedom.FREE ? 'free' : (level === freedom.ASSISTED ? 'assisted' : 'auto'),
    shape: shape,
    surface: surface || 'adaptive-surface',
    tokens: clone(tokens),
    content: region(safe && safe.left, safe && safe.top, safe && safe.width, safe && safe.height)
  }
}

module.exports = {
  SYSTEM_ID: SYSTEM_ID,
  VERSION: VERSION,
  shapeOf: shapeOf,
  select: select,
  merge: merge,
  contentWidth: contentWidth,
  region: region,
  placeBand: placeBand,
  circleChordWidth: circleChordWidth,
  circleBandWidth: circleBandWidth,
  grid: grid,
  contentBox: contentBox,
  createPlan: createPlan,
  clamp: clamp
}
