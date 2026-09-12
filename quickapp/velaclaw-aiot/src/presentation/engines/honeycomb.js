/**
 * Circle honeycomb presentation engine.
 *
 * Pages own touch events, page state and routing. This engine owns only visual
 * lattice geometry, focus projection, fading and snap animation math.
 */
var SPACING = 46
var ROW_HEIGHT = Math.round(SPACING * Math.sqrt(3) / 2)
var HALF_STEP = Math.round(SPACING / 2)
var FOCUS_X = 96
var FOCUS_Y = 90
var ICON_BASE = 34
var ICON_GROW = 16
var EMPHASIS_FALLOFF = 60
var CENTER_RADIUS = 27
var ACTIVE_ICON_RADIUS = 30
var ELASTIC_BASE = 0.9
var ELASTIC_RANGE = 0.1
var DRAG_LIMIT = 132
var DRAG_DAMPING = 0.58
var MAX_FRAME_DELTA = 18
var SNAP_DISTANCE = 20
var SNAP_DURATION = 280
var FRAME_MS = 16
var SNAP_BACK = 0.34
var LABEL_CENTER_Y = 162
var LABEL_HALF_HEIGHT = 10
var LABEL_HALF_WIDTH = 48

var DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  upLeft: { x: -0.7071, y: -0.7071 },
  upRight: { x: 0.7071, y: -0.7071 },
  downLeft: { x: -0.7071, y: 0.7071 },
  downRight: { x: 0.7071, y: 0.7071 }
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value
}

function clamp01(value) {
  return clamp(value, 0, 1)
}

function smoothStep(value) {
  var t = clamp01(value)
  return t * t * (3 - 2 * t)
}

function buildCoords() {
  return [
    { x: FOCUS_X, y: FOCUS_Y },
    { x: FOCUS_X - HALF_STEP, y: FOCUS_Y - ROW_HEIGHT },
    { x: FOCUS_X + HALF_STEP, y: FOCUS_Y - ROW_HEIGHT },
    { x: FOCUS_X - SPACING, y: FOCUS_Y },
    { x: FOCUS_X + SPACING, y: FOCUS_Y },
    { x: FOCUS_X - HALF_STEP, y: FOCUS_Y + ROW_HEIGHT },
    { x: FOCUS_X + HALF_STEP, y: FOCUS_Y + ROW_HEIGHT },
    { x: FOCUS_X - SPACING - HALF_STEP, y: FOCUS_Y - ROW_HEIGHT },
    { x: FOCUS_X + SPACING + HALF_STEP, y: FOCUS_Y - ROW_HEIGHT },
    { x: FOCUS_X - SPACING - HALF_STEP, y: FOCUS_Y + ROW_HEIGHT },
    { x: FOCUS_X + SPACING + HALF_STEP, y: FOCUS_Y + ROW_HEIGHT }
  ]
}

function buildSlots(apps) {
  var source = apps || []
  var coords = buildCoords()
  var slots = []
  for (var index = 0; index < source.length; index++) {
    var app = source[index]
    var coordinate = coords[index % coords.length]
    slots.push({
      slotKey: app.id + '-' + index,
      id: app.id,
      label: app.label,
      icon: app.softIcon,
      normalIcon: app.icon,
      softIcon: app.softIcon,
      route: app.route,
      sourceIndex: index,
      isCenter: false,
      gridX: coordinate.x,
      gridY: coordinate.y,
      left: coordinate.x - ICON_BASE / 2,
      top: coordinate.y - ICON_BASE / 2,
      size: ICON_BASE,
      radius: ICON_BASE / 2,
      opacity: 0.5
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
  return {
    centerX: centerX,
    centerY: centerY,
    distance: distance,
    size: Math.round(ICON_BASE + emphasis * ICON_GROW),
    emphasis: emphasis
  }
}

function layoutFrame(coords, panX, panY, offsetX, offsetY) {
  var result = []
  for (var index = 0; index < coords.length; index++) {
    result.push(projectPoint(coords[index].x, coords[index].y, panX, panY, offsetX, offsetY))
  }
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
    if (point.distance < nearestDistance) {
      nearestDistance = point.distance
      nearestIndex = index
    }

    var bandFadeY = clamp01(1 - Math.abs(point.centerY - LABEL_CENTER_Y) / (LABEL_HALF_HEIGHT + point.size / 2))
    var bandFadeX = clamp01(1 - Math.abs(point.centerX - FOCUS_X) / (LABEL_HALF_WIDTH + point.size / 2))
    var avoidanceProgress = smoothStep(bandFadeY * bandFadeX)
    var opacity = (0.5 + point.emphasis * 0.5) * (1 - avoidanceProgress * 0.8)

    nextSlots.push({
      slotKey: slot.slotKey,
      id: slot.id,
      label: slot.label,
      normalIcon: slot.normalIcon,
      softIcon: slot.softIcon,
      route: slot.route,
      sourceIndex: slot.sourceIndex,
      gridX: slot.gridX,
      gridY: slot.gridY,
      isCenter: point.distance < CENTER_RADIUS,
      size: point.size,
      radius: Math.round(point.size / 2),
      opacity: opacity,
      icon: point.distance < ACTIVE_ICON_RADIUS ? slot.normalIcon : slot.softIcon,
      left: Math.round(point.centerX - point.size / 2),
      top: Math.round(point.centerY - point.size / 2)
    })
  }

  return { slots: nextSlots, nearestIndex: nearestIndex }
}

function minimumEdgeGap(placed) {
  var worst = Infinity
  for (var i = 0; i < placed.length; i++) {
    for (var j = i + 1; j < placed.length; j++) {
      var dx = placed[j].centerX - placed[i].centerX
      var dy = placed[j].centerY - placed[i].centerY
      var gap = Math.sqrt(dx * dx + dy * dy) - (placed[i].size + placed[j].size) / 2
      if (gap < worst) worst = gap
    }
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
    if (score < bestScore) {
      bestScore = score
      bestIndex = index
    }
  }
  return bestIndex
}

function pickSlotByDirection(slots, currentIndex, direction) {
  var source = slots || []
  var coords = []
  for (var index = 0; index < source.length; index++) coords.push({ x: source[index].gridX, y: source[index].gridY })
  return pickByDirection(coords, currentIndex, direction)
}

function panForSlot(slot, focusY) {
  if (!slot) return null
  return {
    x: FOCUS_X - slot.gridX,
    y: (focusY === undefined ? FOCUS_Y : focusY) - slot.gridY
  }
}

function nextDragOffset(current, delta) {
  var frameDelta = clamp(delta || 0, -MAX_FRAME_DELTA, MAX_FRAME_DELTA)
  return clamp((current || 0) + frameDelta * DRAG_DAMPING, -DRAG_LIMIT, DRAG_LIMIT)
}

function backOut(progress, strength) {
  var t = clamp01(progress)
  var backStrength = strength === undefined ? SNAP_BACK : strength
  var offset = t - 1
  return 1 + (backStrength + 1) * Math.pow(offset, 3) + backStrength * Math.pow(offset, 2)
}

module.exports = {
  SPACING: SPACING,
  ROW_HEIGHT: ROW_HEIGHT,
  HALF_STEP: HALF_STEP,
  FOCUS_X: FOCUS_X,
  FOCUS_Y: FOCUS_Y,
  ICON_BASE: ICON_BASE,
  ICON_GROW: ICON_GROW,
  EMPHASIS_FALLOFF: EMPHASIS_FALLOFF,
  CENTER_RADIUS: CENTER_RADIUS,
  ACTIVE_ICON_RADIUS: ACTIVE_ICON_RADIUS,
  ELASTIC_BASE: ELASTIC_BASE,
  ELASTIC_RANGE: ELASTIC_RANGE,
  DRAG_LIMIT: DRAG_LIMIT,
  DRAG_DAMPING: DRAG_DAMPING,
  MAX_FRAME_DELTA: MAX_FRAME_DELTA,
  SNAP_DISTANCE: SNAP_DISTANCE,
  SNAP_DURATION: SNAP_DURATION,
  FRAME_MS: FRAME_MS,
  SNAP_BACK: SNAP_BACK,
  LABEL_CENTER_Y: LABEL_CENTER_Y,
  LABEL_HALF_HEIGHT: LABEL_HALF_HEIGHT,
  LABEL_HALF_WIDTH: LABEL_HALF_WIDTH,
  DIRECTIONS: DIRECTIONS,
  buildCoords: buildCoords,
  buildSlots: buildSlots,
  layoutFrame: layoutFrame,
  layoutSlots: layoutSlots,
  minimumEdgeGap: minimumEdgeGap,
  pickByDirection: pickByDirection,
  pickSlotByDirection: pickSlotByDirection,
  panForSlot: panForSlot,
  nextDragOffset: nextDragOffset,
  backOut: backOut
}
