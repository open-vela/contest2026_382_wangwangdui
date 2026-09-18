/*
 * design-studio / geometry.js
 * ---------------------------------------------------------------------------
 * Pure math for hit testing, snapping, alignment and resize. Keeping it pure
 * means the interaction layer stays thin and the tests stay fast.
 */

export const SNAP_THRESHOLD = 5

export function rotatePoint(x, y, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: x * cos - y * sin, y: x * sin + y * cos }
}

export function boxOf(element) {
  return {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h
  }
}

export function boxCenter(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

/** Axis-aligned bounding box that contains a rotated rectangle. */
export function boundingBox(element) {
  if (!element.rotation) return boxOf(element)
  const center = { x: element.x + element.w / 2, y: element.y + element.h / 2 }
  const corners = [
    { x: -element.w / 2, y: -element.h / 2 },
    { x: element.w / 2, y: -element.h / 2 },
    { x: element.w / 2, y: element.h / 2 },
    { x: -element.w / 2, y: element.h / 2 }
  ].map((corner) => rotatePoint(corner.x, corner.y, element.rotation))
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { x: center.x + minX, y: center.y + minY, w: maxX - minX, h: maxY - minY }
}

export function unionBox(boxes) {
  if (!boxes.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  boxes.forEach((box) => {
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.w)
    maxY = Math.max(maxY, box.y + box.h)
  })
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function containsPoint(box, point) {
  return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h
}

export function intersects(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
}

/**
 * Snap a moving box against a list of static boxes plus the artboard edges and
 * an optional grid. Returns the adjusted position and the guide lines to draw.
 */
export function snapPosition(box, staticBoxes, options = {}) {
  const threshold = options.threshold === undefined ? SNAP_THRESHOLD : options.threshold
  const artboard = options.artboard || null
  const grid = options.grid || 0
  const movingX = [box.x, box.x + box.w / 2, box.x + box.w]
  const movingY = [box.y, box.y + box.h / 2, box.y + box.h]

  const targetsX = []
  const targetsY = []
  staticBoxes.forEach((other) => {
    targetsX.push({ value: other.x, from: other.y, to: other.y + other.h, kind: 'edge' })
    targetsX.push({ value: other.x + other.w / 2, from: other.y, to: other.y + other.h, kind: 'center' })
    targetsX.push({ value: other.x + other.w, from: other.y, to: other.y + other.h, kind: 'edge' })
    targetsY.push({ value: other.y, from: other.x, to: other.x + other.w, kind: 'edge' })
    targetsY.push({ value: other.y + other.h / 2, from: other.x, to: other.x + other.w, kind: 'center' })
    targetsY.push({ value: other.y + other.h, from: other.x, to: other.x + other.w, kind: 'edge' })
  })
  if (artboard) {
    targetsX.push({ value: 0, from: 0, to: artboard.height, kind: 'artboard' })
    targetsX.push({ value: artboard.width / 2, from: 0, to: artboard.height, kind: 'artboard' })
    targetsX.push({ value: artboard.width, from: 0, to: artboard.height, kind: 'artboard' })
    targetsY.push({ value: 0, from: 0, to: artboard.width, kind: 'artboard' })
    targetsY.push({ value: artboard.height / 2, from: 0, to: artboard.width, kind: 'artboard' })
    targetsY.push({ value: artboard.height, from: 0, to: artboard.width, kind: 'artboard' })
  }

  let bestX = null
  let bestY = null
  movingX.forEach((value, index) => {
    targetsX.forEach((target) => {
      const distance = Math.abs(target.value - value)
      if (distance > threshold) return
      if (!bestX || distance < bestX.distance) {
        bestX = {
          distance,
          delta: target.value - value,
          guide: { axis: 'x', value: target.value, from: target.from, to: target.to, kind: target.kind },
          anchor: index
        }
      }
    })
  })
  movingY.forEach((value, index) => {
    targetsY.forEach((target) => {
      const distance = Math.abs(target.value - value)
      if (distance > threshold) return
      if (!bestY || distance < bestY.distance) {
        bestY = {
          distance,
          delta: target.value - value,
          guide: { axis: 'y', value: target.value, from: target.from, to: target.to, kind: target.kind },
          anchor: index
        }
      }
    })
  })

  let x = box.x
  let y = box.y
  const guides = []
  if (bestX) {
    x += bestX.delta
    guides.push(bestX.guide)
  } else if (grid > 1) {
    x = Math.round(x / grid) * grid
  }
  if (bestY) {
    y += bestY.delta
    guides.push(bestY.guide)
  } else if (grid > 1) {
    y = Math.round(y / grid) * grid
  }

  return { x, y, guides }
}

/** Clamp a box inside the artboard when the user asks for it. */
export function clampToArtboard(box, artboard) {
  const maxX = Math.max(0, artboard.width - box.w)
  const maxY = Math.max(0, artboard.height - box.h)
  return {
    x: Math.min(Math.max(0, box.x), maxX),
    y: Math.min(Math.max(0, box.y), maxY)
  }
}

export const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function resizeBox(start, handle, delta) {
  // delta is expressed in the element's local (unrotated) space
  let { x, y, w, h } = start
  if (handle.includes('e')) w = start.w + delta.x
  if (handle.includes('w')) {
    w = start.w - delta.x
    x = start.x + delta.x
  }
  if (handle.includes('s')) h = start.h + delta.y
  if (handle.includes('n')) {
    h = start.h - delta.y
    y = start.y + delta.y
  }
  return { x, y, w, h }
}

/**
 * Translate a screen-space delta into the element's local space, so resizing a
 * rotated element still follows the pointer.
 */
export function screenDeltaToLocal(delta, rotationDeg) {
  if (!rotationDeg) return { x: delta.x, y: delta.y }
  const rad = (-rotationDeg * Math.PI) / 180
  return {
    x: delta.x * Math.cos(rad) - delta.y * Math.sin(rad),
    y: delta.x * Math.sin(rad) + delta.y * Math.cos(rad)
  }
}

/** Chord width available on a circle at a given vertical band. */
export function chordWidth(diameter, top, height) {
  const radius = diameter / 2
  const topOffset = top - radius
  const bottomOffset = top + height - radius
  const worst = Math.max(Math.abs(topOffset), Math.abs(bottomOffset))
  if (worst >= radius) return 0
  return 2 * Math.sqrt(radius * radius - worst * worst)
}

export function roundTo(value, step) {
  if (!step) return value
  return Math.round(value / step) * step
}
