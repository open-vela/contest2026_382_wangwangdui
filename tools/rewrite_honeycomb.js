/*
 * One-off source fixup for src/presentation/engines/honeycomb.js.
 *
 * The engine used to hold its lattice geometry in frozen module constants. The
 * file is rewritten here so every reference reads the live GEOMETRY record that
 * configure() derives from the measured surface, while the exported names stay
 * working for the self-tests and the page.
 */

const fs = require('fs')
const path = require('path')

const FILE = path.resolve(
  __dirname,
  '../quickapp/velaclaw-aiot/src/presentation/engines/honeycomb.js'
)

const source = fs.readFileSync(FILE, 'utf8')
const headerEnd = source.indexOf('*/') + 2
if (headerEnd < 2) throw new Error('file header not found')
const marker = source.indexOf('var DIRECTIONS = {')
if (marker < 0) throw new Error('body marker not found')

const header = source.slice(0, headerEnd)
const body = source.slice(marker)

const MAP = {
  SPACING: 'spacing',
  ROW_HEIGHT: 'rowHeight',
  HALF_STEP: 'halfStep',
  FOCUS_X: 'focusX',
  FOCUS_Y: 'focusY',
  ICON_BASE: 'iconBase',
  ICON_GROW: 'iconGrow',
  EMPHASIS_FALLOFF: 'emphasisFalloff',
  CENTER_RADIUS: 'centerRadius',
  ACTIVE_ICON_RADIUS: 'activeIconRadius',
  ELASTIC_BASE: 'elasticBase',
  ELASTIC_RANGE: 'elasticRange',
  DRAG_LIMIT: 'dragLimit',
  DRAG_DAMPING: 'dragDamping',
  MAX_FRAME_DELTA: 'maxFrameDelta',
  SNAP_DISTANCE: 'snapDistance',
  SNAP_DURATION: 'snapDuration',
  FRAME_MS: 'frameMs',
  SNAP_BACK: 'snapBack',
  LABEL_CENTER_Y: 'labelCenterY',
  LABEL_HALF_HEIGHT: 'labelHalfHeight',
  LABEL_HALF_WIDTH: 'labelHalfWidth'
}

let rewritten = body
Object.keys(MAP).forEach((name) => {
  rewritten = rewritten.replace(new RegExp('\\b' + name + '\\b', 'g'), 'GEOMETRY.' + MAP[name])
})

const GEOMETRY_SECTION = `
/**
 * Honeycomb lattice geometry.
 *
 * The values below are the design numbers for a 192x192 wearable surface. They
 * used to be frozen module constants, which is why the rectangular launcher
 * (same width, different height and content band) reused circle geometry: its
 * focus point, label band and icon budget no longer matched the measured
 * surface, so the lattice sat off-centre and a focused cell could grow into its
 * neighbours.
 *
 * configure() re-derives them from the surface the launcher actually measured.
 * The invariants it protects:
 *
 *   - the focus point stays horizontally centred on the surface
 *   - the icon never grows past spacing - MIN_EDGE_GAP, so the focused cell
 *     keeps a visible gutter against its six neighbours
 *   - the lattice scales down as one unit on a narrower band instead of keeping
 *     circle-sized icons inside a smaller content box
 */
var DESIGN_SPACING = 46
var DESIGN_ICON_BASE = 34
var MIN_SPACING = 34
var MIN_EDGE_GAP = 6

var GEOMETRY = createGeometry()

function createGeometry(overrides) {
  var source = overrides || {}
  var designWidth = Math.max(64, Number(source.designWidth) || 192)
  var hostWidth = Math.max(1, Number(source.hostWidth) || designWidth)
  var hostHeight = Math.max(1, Number(source.hostHeight) || designWidth)
  var scale = clamp(hostWidth / designWidth, 0.8, 1)
  var spacing = Math.max(MIN_SPACING, Math.round(DESIGN_SPACING * scale))
  var iconBase = Math.max(24, Math.round(DESIGN_ICON_BASE * scale))
  var grow = Math.max(4, spacing - MIN_EDGE_GAP - iconBase)
  return {
    designWidth: designWidth,
    hostWidth: hostWidth,
    hostHeight: hostHeight,
    spacing: spacing,
    rowHeight: Math.round(spacing * Math.sqrt(3) / 2),
    halfStep: Math.round(spacing / 2),
    focusX: Math.round(hostWidth / 2),
    focusY: Math.round(Math.min(hostHeight / 2, 90 * scale) + Math.max(0, (hostHeight - designWidth) / 2)),
    iconBase: iconBase,
    iconGrow: grow,
    emphasisFalloff: Math.round(60 * scale),
    centerRadius: Math.round(27 * scale),
    activeIconRadius: Math.round(30 * scale),
    elasticBase: 0.9,
    elasticRange: 0.1,
    dragLimit: Math.round(132 * scale),
    dragDamping: 0.58,
    maxFrameDelta: 18,
    snapDistance: 20,
    snapDuration: 280,
    frameMs: 16,
    snapBack: 0.34,
    labelCenterY: Math.round(hostHeight - 18 * scale),
    labelHalfHeight: Math.max(8, Math.round(10 * scale)),
    labelHalfWidth: Math.max(34, Math.round(48 * scale))
  }
}

function configure(host) {
  GEOMETRY = createGeometry(host)
  return describe()
}

function reset() {
  GEOMETRY = createGeometry()
  return describe()
}

function describe() {
  var copy = {}
  for (var key in GEOMETRY) copy[key] = GEOMETRY[key]
  return copy
}

`

const EXPORTS = `
/*
 * The geometry names stay exported for the page and the self-tests, but as live
 * getters: after configure() they report the geometry actually in use, and with
 * no configuration they report the 192x192 design defaults.
 */
var EXPORT_NAMES = {
  SPACING: 'spacing',
  ROW_HEIGHT: 'rowHeight',
  HALF_STEP: 'halfStep',
  FOCUS_X: 'focusX',
  FOCUS_Y: 'focusY',
  ICON_BASE: 'iconBase',
  ICON_GROW: 'iconGrow',
  EMPHASIS_FALLOFF: 'emphasisFalloff',
  CENTER_RADIUS: 'centerRadius',
  ACTIVE_ICON_RADIUS: 'activeIconRadius',
  ELASTIC_BASE: 'elasticBase',
  ELASTIC_RANGE: 'elasticRange',
  DRAG_LIMIT: 'dragLimit',
  DRAG_DAMPING: 'dragDamping',
  MAX_FRAME_DELTA: 'maxFrameDelta',
  SNAP_DISTANCE: 'snapDistance',
  SNAP_DURATION: 'snapDuration',
  FRAME_MS: 'frameMs',
  SNAP_BACK: 'snapBack',
  LABEL_CENTER_Y: 'labelCenterY',
  LABEL_HALF_HEIGHT: 'labelHalfHeight',
  LABEL_HALF_WIDTH: 'labelHalfWidth'
}

module.exports = {
  configure: configure,
  reset: reset,
  describe: describe,
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

Object.keys(EXPORT_NAMES).forEach(function (name) {
  var key = EXPORT_NAMES[name]
  Object.defineProperty(module.exports, name, {
    enumerable: true,
    get: function () {
      return GEOMETRY[key]
    }
  })
})
`

fs.writeFileSync(FILE, header + GEOMETRY_SECTION + rewritten + EXPORTS)
console.log('rewrote', path.relative(process.cwd(), FILE), 'lines', fs.readFileSync(FILE, 'utf8').split('\n').length)
