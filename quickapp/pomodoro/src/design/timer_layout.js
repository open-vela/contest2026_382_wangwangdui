// Pure shape-aware layout maths, expressed in DESIGN pixels (manifest
// designWidth base), mirroring the project's viewport convention: the device
// capability converts physical pixels into a 192-wide design space, so one plan
// renders the same on a 336x480 band and a 466x466 watch.
//
// This module implements references/wearable-design.md for an L2 (Assisted)
// surface: the two shapes share semantics but NOT composition.
//
//   circle -> "circle-ring"   : the ring is the surface; phase/time/status sit
//                               inside it on central bands, progress crosses the
//                               lower chord, controls sit on the bottom chord
//                               (chord-checked), and no data card is drawn.
//   rect   -> "rect-column"   : a vertical rhythm column with a wide primary
//                               action; the ring metaphor is dropped entirely.
//
// Every block is emitted in `blocks` so a contract test (and the report) can
// prove ordering, in-bounds placement, no overlap, and that the two shapes are
// structurally different instead of one layout with different numbers.

function clamp(value, minimum, maximum) {
  if (value < minimum) return minimum
  if (value > maximum) return maximum
  return value
}

function positive(value, fallback) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? number : fallback
}

function round(value) {
  return Math.round(value)
}

function block(id, top, height, extra) {
  var item = { id: id, top: top, height: height }
  if (extra) {
    var keys = Object.keys(extra)
    for (var index = 0; index < keys.length; index++) item[keys[index]] = extra[keys[index]]
  }
  return item
}

// Full width of a circle of `side` diameter at vertical position `y`.
function chordWidth(side, y) {
  var radius = side / 2
  var offset = Math.abs(y - radius)
  if (offset >= radius) return 0
  return round(2 * Math.sqrt(radius * radius - offset * offset))
}

// Narrowest chord across a band: the real horizontal budget for controls.
function safeRowWidth(side, top, height) {
  return Math.min(chordWidth(side, top), chordWidth(side, top + height))
}

// --------------------------------------------------------------------- circle
function circleLayout(side, scale) {
  var ringSize = round(side * 0.86)
  var ringTop = round((side - ringSize) / 2)
  var ringBorder = Math.max(3, round(scale * 3))
  var phaseTop = round(side * 0.146)
  var phaseHeight = round(side * 0.073)
  var timeTop = round(side * 0.240)
  var timeHeight = round(side * 0.208)
  var hintTop = round(side * 0.469)
  var hintHeight = round(side * 0.052)
  var barTop = round(side * 0.542)
  var barHeight = Math.max(3, round(scale * 2))
  var barWidth = round(side * 0.34)
  // round primary action inside the ring, not a wide bar in a column
  var primarySize = round(side * 0.188)
  var primaryTop = round(side * 0.583)
  var controlHeight = round(side * 0.115)
  var controlTop = round(side * 0.792)
  var controlGap = round(side * 0.02)
  var controlBudget = safeRowWidth(side, controlTop, controlHeight)
  var controlWidth = Math.floor((controlBudget - controlGap * 2) / 3)

  var listTop = round(side * 0.28)
  var listWidth = Math.round(chordWidth(side, side / 2) * 0.62)
  var centreWidth = ringSize - ringBorder * 2
  var centreLeft = Math.round((side - centreWidth) / 2)
  // Top/bottom bands are narrow chords: clamp each text run to its own band.
  function bandWidth(top, height) {
    var width = Math.min(centreWidth, safeRowWidth(side, top, height))
    return { width: width, left: Math.round((side - width) / 2) }
  }
  var phaseBand = bandWidth(phaseTop, phaseHeight)
  var timeBand = bandWidth(timeTop, timeHeight)
  var hintBand = bandWidth(hintTop, hintHeight)

  return {
    composition: 'circle-ring',
    shape: 'circle',
    scale: scale,
    sceneWidth: side,
    sceneHeight: side,
    pad: round(side * 0.09),

    ringSize: ringSize,
    ringTop: ringTop,
    ringBorder: ringBorder,
    ringLeft: 0,

    phaseTop: phaseTop,
    phaseSize: round(side * 0.062),
    timeTop: timeTop,
    timeSize: round(side * 0.20),
    hintTop: hintTop,
    hintSize: round(side * 0.058),

    barTop: barTop,
    barWidth: barWidth,
    barHeight: barHeight,

    // circle deliberately has no summary card: the value is the surface
    hasCard: false,
    cardTop: 0,
    cardHeight: 0,
    cardWidth: 0,

    // circle: circular primary button inside the ring
    primaryTop: primaryTop,
    primarySize: primarySize,
    primaryFontSize: round(side * 0.048),
    actionTop: primaryTop,
    actionWidth: primarySize,
    actionHeight: primarySize,
    actionFontSize: round(side * 0.048),
    controlsTop: controlTop,
    controlsHeight: controlHeight,
    controlWidth: controlWidth,
    controlGap: controlGap,
    controlFontSize: round(side * 0.048),
    controlBudget: controlBudget,

    titleSize: round(scale * 11),
    bodySize: round(scale * 9),
    valueSize: round(scale * 13),
    rowHeight: round(scale * 30),
    rowGap: round(scale * 6),
    listTop: listTop,
    listWidth: listWidth,
    listHeight: Math.max(round(scale * 80), controlTop - round(side * 0.05) - listTop),
    pillTop: controlTop,
    pillHeight: controlHeight,
    pillWidth: Math.round(controlBudget * 0.72),
    pillFontSize: round(side * 0.048),

    blocks: [
      block('phase', phaseTop, phaseHeight, phaseBand),
      block('time', timeTop, timeHeight, timeBand),
      block('hint', hintTop, hintHeight, hintBand),
      block('bar', barTop, barHeight,
        { width: barWidth, left: Math.round((side - barWidth) / 2) }),
      block('primary', primaryTop, primarySize,
        { width: primarySize, left: Math.round((side - primarySize) / 2) }),
      block('controls', controlTop, controlHeight,
        { width: controlBudget, left: Math.round((side - controlBudget) / 2) })
    ]
  }
}

// ----------------------------------------------------------------- rect/pill
function rectLayout(width, height, scale, shape) {
  var pad = round(scale * 12)
  var statusTop = pad
  var statusHeight = round(scale * 14)
  var controlHeight = round(scale * 26)
  var controlTop = height - pad - controlHeight
  var controlGap = round(scale * 6)
  var usable = width - pad * 2

  var valueHeight = round(scale * 52)
  var barHeight = Math.max(4, round(scale * 4))
  var countHeight = round(scale * 16)
  var actionHeight = round(scale * 34)
  var gap = round(scale * 8)
  var gapLarge = round(scale * 10)

  var top = statusTop + statusHeight + round(scale * 8)
  var bottom = controlTop - gapLarge

  // Progressive disclosure: the summary line is the first thing dropped when
  // the band is short, so the primary value and the action always survive.
  var withCount = valueHeight + gap + barHeight + gapLarge + countHeight + gapLarge + actionHeight
  var withoutCount = valueHeight + gap + barHeight + gapLarge + actionHeight
  var includeCount = true
  var stackHeight = withCount
  if (stackHeight > bottom - top) {
    includeCount = false
    stackHeight = withoutCount
  }
  if (stackHeight > bottom - top) {
    gap = Math.max(2, round(scale * 4))
    gapLarge = Math.max(3, round(scale * 6))
    stackHeight = valueHeight + gap + barHeight + gapLarge + actionHeight
  }

  var cursor = top + Math.max(0, Math.round((bottom - top - stackHeight) / 2))
  var valueTop = cursor
  cursor += valueHeight + gap
  var barTop = cursor
  cursor += barHeight + gapLarge
  var countTop = -1
  if (includeCount) {
    countTop = cursor
    cursor += countHeight + gapLarge
  }
  var actionTop = cursor

  var blocks = [
    block('status', statusTop, statusHeight),
    block('value', valueTop, valueHeight),
    block('bar', barTop, barHeight, { width: usable })
  ]
  if (includeCount) blocks.push(block('count', countTop, countHeight))
  blocks.push(block('action', actionTop, actionHeight, { width: usable }))
  blocks.push(block('controls', controlTop, controlHeight, { width: usable }))

  return {
    composition: 'rect-column',
    shape: shape,
    scale: scale,
    sceneWidth: width,
    sceneHeight: height,
    pad: pad,

    // no ring surface on a column layout
    ringSize: 0,
    ringTop: 0,
    ringBorder: 0,
    ringLeft: 0,

    statusTop: statusTop,
    statusSize: round(scale * 10),
    valueTop: valueTop,
    timeTop: valueTop,
    timeSize: round(scale * 40),
    countTop: countTop,
    countSize: round(scale * 10),
    hasCard: includeCount,
    cardTop: countTop,
    cardHeight: countHeight,
    cardWidth: usable,

    barTop: barTop,
    barWidth: usable,
    barHeight: barHeight,

    actionTop: actionTop,
    actionWidth: usable,
    actionHeight: actionHeight,
    actionFontSize: round(scale * 13),
    controlsTop: controlTop,
    controlsHeight: controlHeight,
    controlWidth: Math.floor((usable - controlGap * 2) / 3),
    controlGap: controlGap,
    controlFontSize: round(scale * 10),

    titleSize: round(scale * 11),
    bodySize: round(scale * 9),
    valueSize: round(scale * 13),
    rowHeight: round(scale * 30),
    rowGap: round(scale * 6),
    listTop: statusTop + statusHeight + round(scale * 8),
    listWidth: usable,
    listHeight: Math.max(round(scale * 60), controlTop - gapLarge - (statusTop + statusHeight + round(scale * 8))),
    pillTop: controlTop,
    pillHeight: controlHeight,
    pillWidth: usable,
    pillFontSize: round(scale * 10),

    blocks: blocks
  }
}

// profile: { shape, logicalWidth, logicalHeight }
function computeLayout(profile) {
  var source = profile && typeof profile === 'object' ? profile : {}
  var shape = source.shape === 'circle' ? 'circle' : source.shape === 'pill' ? 'pill' : 'rect'
  var width = round(positive(source.logicalWidth, 192))
  var height = round(positive(source.logicalHeight, 490))
  var scale = clamp(width / 192, 0.8, 3)

  if (shape === 'circle') {
    var side = Math.min(width, height)
    var circle = circleLayout(side, scale)
    circle.orientation = 'square'
    circle.ringLeft = Math.round((side - circle.ringSize) / 2)
    return circle
  }

  var plan = rectLayout(width, height, scale, shape)
  plan.orientation = height >= width ? 'portrait' : 'landscape'
  return plan
}

// ------------------------------------------------------------------- list pages
// settings / stats are ordinary list surfaces (L1), but they still live on a
// round display: on a circle every band of content must be centred inside the
// chord of its own vertical extent, otherwise rows drift to the left and the
// title / back button get clipped by the bezel. That check is what the first
// version missed, so this plan derives every horizontal budget from the chord.
function computeListLayout(profile) {
  var base = computeLayout(profile)
  var circle = base.composition === 'circle-ring'
  var scale = base.scale
  var pad = base.pad

  var titleSize = round(scale * 11)
  var titleHeight = round(scale * 18)
  var rowHeight = round(scale * 30)
  var rowGap = round(scale * 6)
  var backHeight = base.controlsHeight

  // On a circle, start the title low enough that its chord is usable.
  var titleTop = circle ? round(base.sceneHeight * 0.14) : pad
  var backTop = circle ? base.controlsTop : base.sceneHeight - pad - backHeight
  var listTop = titleTop + titleHeight + round(scale * 6)
  var listBottom = backTop - round(scale * 8)
  var listHeight = Math.max(rowHeight, listBottom - listTop)

  var titleBudget = circle
    ? safeRowWidth(base.sceneWidth, titleTop, titleHeight)
    : base.sceneWidth - pad * 2
  var backBudget = circle
    ? safeRowWidth(base.sceneWidth, backTop, backHeight)
    : base.sceneWidth - pad * 2
  var listBudget = circle
    ? safeRowWidth(base.sceneWidth, listTop, listHeight)
    : base.sceneWidth - pad * 2
  // keep a deliberate margin from the bezel instead of filling the whole chord
  var listWidth = circle ? Math.min(listBudget, round(base.sceneWidth * 0.62)) : listBudget

  function centred(width) {
    return Math.round((base.sceneWidth - width) / 2)
  }

  base.titleTop = titleTop
  base.titleLeft = circle ? centred(Math.min(titleBudget, base.sceneWidth)) : pad
  base.titleWidth = titleBudget
  base.titleSize = titleSize
  base.titleAlign = circle ? 'center' : 'left'
  base.listTop = listTop
  base.listLeft = circle ? centred(listWidth) : pad
  base.listWidth = listWidth
  base.listHeight = listHeight
  base.rowHeight = rowHeight
  base.rowGap = rowGap
  base.backTop = backTop
  base.backLeft = circle ? centred(backBudget) : pad
  base.backWidth = backBudget
  base.backHeight = backHeight
  base.pillTop = backTop
  base.pillLeft = base.backLeft
  base.pillWidth = backBudget
  base.pillHeight = backHeight
  base.pillFontSize = circle ? round(base.scale * 10) : round(base.scale * 10)
  base.blocks = [
    block('title', titleTop, titleHeight, { width: titleBudget, left: base.titleLeft }),
    block('list', listTop, listHeight, { width: listWidth, left: base.listLeft }),
    block('back', backTop, backHeight, { width: backBudget, left: base.backLeft })
  ]
  return base
}

// Every block of a plan must sit inside the circle's chord at its own vertical
// band. Returns the offending blocks (empty array = clean).
function findChordViolations(plan) {
  var bad = []
  if (!plan || plan.composition !== 'circle-ring') return bad
  var blocks = plan.blocks || []
  for (var index = 0; index < blocks.length; index++) {
    var item = blocks[index]
    var width = item.width
    if (width === undefined) continue
    var budget = safeRowWidth(plan.sceneWidth, item.top, item.height)
    var left = item.left === undefined ? Math.round((plan.sceneWidth - width) / 2) : item.left
    var right = left + width
    var safeLeft = Math.round((plan.sceneWidth - budget) / 2)
    var safeRight = safeLeft + budget
    if (width > budget || left < safeLeft || right > safeRight) {
      bad.push(item.id + '[' + left + '..' + right + ' vs ' + safeLeft + '..' + safeRight + ']')
    }
  }
  return bad
}

// Overlap detector used by the layout contract test (and by anyone reviewing a
// new shape): two blocks may not share vertical space.
function findOverlaps(plan) {
  var found = []
  var blocks = (plan && plan.blocks) || []
  for (var a = 0; a < blocks.length; a++) {
    for (var b = a + 1; b < blocks.length; b++) {
      var first = blocks[a]
      var second = blocks[b]
      if (first.top < second.top + second.height && second.top < first.top + first.height) {
        found.push(first.id + '/' + second.id)
      }
    }
  }
  return found
}

module.exports = {
  clamp: clamp,
  chordWidth: chordWidth,
  safeRowWidth: safeRowWidth,
  computeLayout: computeLayout,
  computeListLayout: computeListLayout,
  findOverlaps: findOverlaps,
  findChordViolations: findChordViolations
}
