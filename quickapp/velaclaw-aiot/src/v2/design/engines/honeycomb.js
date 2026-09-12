var SPACING = 46
var ROW_HEIGHT = Math.round(SPACING * Math.sqrt(3) / 2)
var FOCUS_X = 96
var FOCUS_Y = 90
var ICON_BASE = 34
var ICON_GROW = 16
var EMPHASIS_FALLOFF = 60
var CENTER_RADIUS = 27
var ELASTIC_BASE = 0.94
var ELASTIC_RANGE = 0.06
var DRAG_DAMPING = 0.92
var DRAG_CAPTURE_DISTANCE = 3
var MAX_FRAME_DELTA = 24
var FRAME_MS = 24
var OVERSCROLL_LIMIT = 30
var OVERSCROLL_DAMPING = 0.34
var INERTIA_DECAY = 0.86
var MIN_VELOCITY = 0.025
var MAGNET_DISTANCE = 22
var VISIBLE_MARGIN = 42
var LABEL_CENTER_Y = 168
var LABEL_HALF_HEIGHT = 9
var LABEL_HALF_WIDTH = 43
var DEFAULT_COORD_COUNT = 19

var AXIAL_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
]

function clamp(value, min, max) { return value < min ? min : value > max ? max : value }
function clamp01(value) { return clamp(value, 0, 1) }
function smoothStep(value) { var t = clamp01(value); return t * t * (3 - 2 * t) }

function axialPoint(q, r) {
  return {
    q: q,
    r: r,
    x: Math.round(FOCUS_X + SPACING * (q + r / 2)),
    y: Math.round(FOCUS_Y + ROW_HEIGHT * r)
  }
}

function buildCoords(count) {
  var wanted = Math.max(1, Math.floor(Number(count) || DEFAULT_COORD_COUNT))
  var coords = [axialPoint(0, 0)]
  var ring = 1
  while (coords.length < wanted) {
    var q = 0
    var r = -ring
    for (var side = 0; side < AXIAL_DIRECTIONS.length && coords.length < wanted; side++) {
      var direction = AXIAL_DIRECTIONS[side]
      for (var step = 0; step < ring && coords.length < wanted; step++) {
        coords.push(axialPoint(q, r))
        q += direction.q
        r += direction.r
      }
    }
    ring++
  }
  return coords
}

function buildSlots(apps) {
  var source = apps || []
  var coords = buildCoords(source.length)
  var slots = []
  for (var index = 0; index < source.length; index++) {
    var app = source[index]
    var coordinate = coords[index]
    slots.push({
      slotKey: app.id + '-' + index,
      id: app.id,
      label: app.label,
      normalIcon: app.icon,
      softIcon: app.softIcon,
      sourceIndex: index,
      q: coordinate.q,
      r: coordinate.r,
      gridX: coordinate.x,
      gridY: coordinate.y
    })
  }
  return slots
}

function projectPoint(x, y, panX, panY, offsetX, offsetY) {
  var baseX = x + panX
  var baseY = y + panY
  var baseDx = baseX - FOCUS_X
  var baseDy = baseY - FOCUS_Y
  var baseDistance = Math.sqrt(baseDx * baseDx + baseDy * baseDy)
  var elasticFollow = ELASTIC_BASE + clamp01(1 - baseDistance / 90) * ELASTIC_RANGE
  var centerX = baseX + offsetX * elasticFollow
  var centerY = baseY + offsetY * elasticFollow
  var dx = centerX - FOCUS_X
  var dy = centerY - FOCUS_Y
  var distance = Math.sqrt(dx * dx + dy * dy)
  var emphasis = smoothStep(1 - distance / EMPHASIS_FALLOFF)
  return { centerX: centerX, centerY: centerY, distance: distance, size: Math.round(ICON_BASE + emphasis * ICON_GROW), emphasis: emphasis }
}

function layoutFrame(coords, panX, panY, offsetX, offsetY) {
  var result = []
  for (var index = 0; index < coords.length; index++) result.push(projectPoint(coords[index].x, coords[index].y, panX, panY, offsetX, offsetY))
  return result
}

function layoutSlots(slots, panX, panY, offsetX, offsetY) {
  var source = slots || []
  var nextSlots = []
  var nearestIndex = -1
  var nearestDistance = Infinity
  for (var index = 0; index < source.length; index++) {
    var slot = source[index]
    var point = projectPoint(slot.gridX, slot.gridY, panX, panY, offsetX, offsetY)
    if (point.distance < nearestDistance) { nearestDistance = point.distance; nearestIndex = index }
    var bandFadeY = clamp01(1 - Math.abs(point.centerY - LABEL_CENTER_Y) / (LABEL_HALF_HEIGHT + point.size / 2))
    var bandFadeX = clamp01(1 - Math.abs(point.centerX - FOCUS_X) / (LABEL_HALF_WIDTH + point.size / 2))
    var avoidanceProgress = smoothStep(bandFadeY * bandFadeX)
    var opacity = (0.48 + point.emphasis * 0.52) * (1 - avoidanceProgress * 0.72)
    nextSlots.push({
      slotKey: slot.slotKey,
      id: slot.id,
      label: slot.label,
      normalIcon: slot.normalIcon,
      softIcon: slot.softIcon,
      sourceIndex: slot.sourceIndex,
      q: slot.q,
      r: slot.r,
      gridX: slot.gridX,
      gridY: slot.gridY,
      isCenter: point.distance < CENTER_RADIUS,
      size: point.size,
      radius: Math.round(point.size / 2),
      opacity: opacity,
      icon: slot.normalIcon || slot.softIcon,
      left: Math.round(point.centerX - point.size / 2),
      top: Math.round(point.centerY - point.size / 2),
      centerX: point.centerX,
      centerY: point.centerY
    })
  }
  return { slots: nextSlots, nearestIndex: nearestIndex, nearestDistance: nearestDistance }
}

function visibleSlots(slots) {
  var source = slots || []
  var result = []
  var min = -VISIBLE_MARGIN
  var max = 192 + VISIBLE_MARGIN
  for (var index = 0; index < source.length; index++) {
    var slot = source[index]
    var half = slot.size / 2
    if (slot.centerX + half < min || slot.centerX - half > max || slot.centerY + half < min || slot.centerY - half > max) continue
    result.push(slot)
  }
  return result
}

function panBounds(slots) {
  var source = slots || []
  if (!source.length) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  var minX = source[0].gridX
  var maxX = source[0].gridX
  var minY = source[0].gridY
  var maxY = source[0].gridY
  for (var index = 1; index < source.length; index++) {
    minX = Math.min(minX, source[index].gridX)
    maxX = Math.max(maxX, source[index].gridX)
    minY = Math.min(minY, source[index].gridY)
    maxY = Math.max(maxY, source[index].gridY)
  }
  return {
    minX: FOCUS_X - maxX,
    maxX: FOCUS_X - minX,
    minY: FOCUS_Y - maxY,
    maxY: FOCUS_Y - minY
  }
}

function clampPan(slots, panX, panY, overscroll) {
  var bounds = panBounds(slots)
  var extra = Math.max(0, Number(overscroll) || 0)
  return {
    x: clamp(Number(panX) || 0, bounds.minX - extra, bounds.maxX + extra),
    y: clamp(Number(panY) || 0, bounds.minY - extra, bounds.maxY + extra)
  }
}

function nextPan(slots, panX, panY, deltaX, deltaY) {
  var bounds = panBounds(slots)
  var dx = clamp(Number(deltaX) || 0, -MAX_FRAME_DELTA, MAX_FRAME_DELTA) * DRAG_DAMPING
  var dy = clamp(Number(deltaY) || 0, -MAX_FRAME_DELTA, MAX_FRAME_DELTA) * DRAG_DAMPING
  var nextX = (Number(panX) || 0) + dx
  var nextY = (Number(panY) || 0) + dy
  if (nextX < bounds.minX) nextX = bounds.minX + (nextX - bounds.minX) * OVERSCROLL_DAMPING
  if (nextX > bounds.maxX) nextX = bounds.maxX + (nextX - bounds.maxX) * OVERSCROLL_DAMPING
  if (nextY < bounds.minY) nextY = bounds.minY + (nextY - bounds.minY) * OVERSCROLL_DAMPING
  if (nextY > bounds.maxY) nextY = bounds.maxY + (nextY - bounds.maxY) * OVERSCROLL_DAMPING
  return clampPan(slots, nextX, nextY, OVERSCROLL_LIMIT)
}

function minimumEdgeGap(placed) {
  var worst = Infinity
  for (var i = 0; i < placed.length; i++) for (var j = i + 1; j < placed.length; j++) {
    var dx = placed[j].centerX - placed[i].centerX
    var dy = placed[j].centerY - placed[i].centerY
    var gap = Math.sqrt(dx * dx + dy * dy) - (placed[i].size + placed[j].size) / 2
    if (gap < worst) worst = gap
  }
  return worst
}

function pickByDirection(coords, currentIndex, direction) {
  var current = coords[currentIndex]
  if (!current || !direction) return -1
  var bestIndex = -1
  var bestScore = Infinity
  for (var index = 0; index < coords.length; index++) {
    if (index === currentIndex) continue
    var dx = coords[index].x - current.x
    var dy = coords[index].y - current.y
    var distance = Math.sqrt(dx * dx + dy * dy)
    if (!distance) continue
    var alignment = (dx * direction.x + dy * direction.y) / distance
    if (alignment < 0.5) continue
    var score = distance / alignment
    if (score < bestScore) { bestScore = score; bestIndex = index }
  }
  return bestIndex
}

function panForSlot(slot, focusY) {
  if (!slot) return null
  return { x: FOCUS_X - slot.gridX, y: (focusY === undefined ? FOCUS_Y : focusY) - slot.gridY }
}

var DIRECTIONS = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  upLeft: { x: -0.7071, y: -0.7071 }, upRight: { x: 0.7071, y: -0.7071 }, downLeft: { x: -0.7071, y: 0.7071 }, downRight: { x: 0.7071, y: 0.7071 }
}

module.exports = {
  SPACING: SPACING,
  ROW_HEIGHT: ROW_HEIGHT,
  FOCUS_X: FOCUS_X,
  FOCUS_Y: FOCUS_Y,
  ICON_BASE: ICON_BASE,
  ICON_GROW: ICON_GROW,
  EMPHASIS_FALLOFF: EMPHASIS_FALLOFF,
  CENTER_RADIUS: CENTER_RADIUS,
  ELASTIC_BASE: ELASTIC_BASE,
  ELASTIC_RANGE: ELASTIC_RANGE,
  DRAG_DAMPING: DRAG_DAMPING,
  DRAG_CAPTURE_DISTANCE: DRAG_CAPTURE_DISTANCE,
  MAX_FRAME_DELTA: MAX_FRAME_DELTA,
  FRAME_MS: FRAME_MS,
  OVERSCROLL_LIMIT: OVERSCROLL_LIMIT,
  INERTIA_DECAY: INERTIA_DECAY,
  MIN_VELOCITY: MIN_VELOCITY,
  MAGNET_DISTANCE: MAGNET_DISTANCE,
  VISIBLE_MARGIN: VISIBLE_MARGIN,
  LABEL_CENTER_Y: LABEL_CENTER_Y,
  LABEL_HALF_HEIGHT: LABEL_HALF_HEIGHT,
  LABEL_HALF_WIDTH: LABEL_HALF_WIDTH,
  DIRECTIONS: DIRECTIONS,
  buildCoords: buildCoords,
  buildSlots: buildSlots,
  layoutFrame: layoutFrame,
  layoutSlots: layoutSlots,
  visibleSlots: visibleSlots,
  panBounds: panBounds,
  clampPan: clampPan,
  nextPan: nextPan,
  minimumEdgeGap: minimumEdgeGap,
  pickByDirection: pickByDirection,
  panForSlot: panForSlot
}
