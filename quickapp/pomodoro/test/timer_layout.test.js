// Layout contract test for the L2 shape-native composition.
//
// This is the gate the skill itself does not provide: it proves the two shapes
// are structurally different (not one layout with different numbers) and that
// no block overlaps, stays in bounds, or violates the circle's chord budget.

var h = require('./harness')
var layout = require('../src/design/timer_layout')

var BAND = { shape: 'rect', logicalWidth: 192, logicalHeight: 274 }
var WATCH = { shape: 'circle', logicalWidth: 192, logicalHeight: 192 }

function ids(plan) {
  return plan.blocks.map(function (b) { return b.id }).join(',')
}

h.test('every plan keeps its blocks ordered, in bounds and non-overlapping', function () {
  var plans = [layout.computeLayout(BAND), layout.computeLayout(WATCH),
    layout.computeLayout({ shape: 'pill', logicalWidth: 192, logicalHeight: 490 }),
    layout.computeLayout({ shape: 'rect', logicalWidth: 192, logicalHeight: 180 })]
  plans.forEach(function (plan) {
    var previous = -1
    plan.blocks.forEach(function (b) {
      h.ok(b.top >= 0, plan.composition + ' ' + b.id + ' must not start above 0')
      h.ok(b.top + b.height <= plan.sceneHeight, plan.composition + ' ' + b.id + ' must fit')
      h.ok(b.top >= previous, plan.composition + ' blocks must be ordered (' + b.id + ')')
      previous = b.top + b.height
    })
    h.equal(layout.findOverlaps(plan).join(','), '', plan.composition + ' overlaps')
  })
})

h.test('circle uses an explicit round composition, not a scaled column', function () {
  var plan = layout.computeLayout(WATCH)
  h.equal(plan.composition, 'circle-ring')
  h.ok(plan.ringSize > 0, 'circle must own a ring surface')
  h.equal(plan.hasCard, false, 'circle drops the data card to protect the value')
  h.equal(ids(plan), 'phase,time,hint,bar,primary,controls')
  h.equal(plan.primarySize, plan.actionHeight, 'primary action is the round button')
})

h.test('rect drops the ring and leads with a value + wide action column', function () {
  var plan = layout.computeLayout(BAND)
  h.equal(plan.composition, 'rect-column')
  h.equal(plan.ringSize, 0, 'column layout must not draw a ring')
  h.equal(ids(plan), 'status,value,bar,count,action,controls')
  h.equal(plan.actionWidth, plan.listWidth, 'primary action spans the column')
  h.ok(plan.actionWidth / plan.actionHeight > 4, 'wide action, not a round button')
})

h.test('the two shapes are structurally different by contract', function () {
  var band = layout.computeLayout(BAND)
  var watch = layout.computeLayout(WATCH)
  h.ok(ids(band) !== ids(watch), 'block sets must differ')
  h.ok(band.hasCard !== watch.hasCard, 'density must differ (card only on the column)')
  h.ok(band.ringSize !== watch.ringSize, 'ring ownership must differ')
  h.ok(band.actionWidth > watch.actionWidth * 3, 'control placement must differ')
})

h.test('circle controls respect the chord budget of the row they sit on', function () {
  var plan = layout.computeLayout(WATCH)
  var rowWidth = plan.controlWidth * 3 + plan.controlGap * 2
  h.ok(rowWidth <= plan.controlBudget, 'pill row must fit the narrowest chord')
  h.equal(plan.controlBudget, layout.safeRowWidth(plan.sceneWidth, plan.controlsTop, plan.controlsHeight))
  h.ok(layout.chordWidth(192, 168) < layout.chordWidth(192, 96), 'chord narrows towards the edge')
})

h.test('progress bar is shared semantics but sized per shape', function () {
  var band = layout.computeLayout(BAND)
  var watch = layout.computeLayout(WATCH)
  h.equal(band.barWidth, band.listWidth, 'column bar spans the column')
  h.ok(watch.barWidth < watch.sceneWidth * 0.5, 'circle bar stays on the central band')
  h.ok(watch.barWidth < band.barWidth, 'circle bar is proportionally shorter')
})

h.test('short screens drop the summary line before the primary value', function () {
  var plan = layout.computeLayout({ shape: 'rect', logicalWidth: 192, logicalHeight: 180 })
  h.equal(plan.hasCard, false, 'summary line is the first block to go')
  h.equal(ids(plan), 'status,value,bar,action,controls')
  h.equal(layout.findOverlaps(plan).join(','), '')
})

h.test('unknown shapes fall back to the column and clamp bad input', function () {
  var plan = layout.computeLayout({ shape: 'triangle', logicalWidth: 0, logicalHeight: -10 })
  h.equal(plan.composition, 'rect-column')
  h.equal(plan.sceneWidth, 192)
  h.ok(plan.sceneHeight > 0)
  h.equal(layout.clamp(5, 1, 3), 3)
})

// ---------------------------------------------------------------------------
// Every page, every shape. The first version of this app only verified the
// focus composition, which is exactly how the circle settings/stats pages
// shipped with a clipped title and a left-shifted row/back button.
// ---------------------------------------------------------------------------
var ALL_PROFILES = [
  { shape: 'rect', logicalWidth: 192, logicalHeight: 274 },
  { shape: 'pill', logicalWidth: 192, logicalHeight: 490 },
  { shape: 'circle', logicalWidth: 192, logicalHeight: 192 }
]

h.test('circle: no block of any page may cross the chord of its own band', function () {
  ALL_PROFILES.forEach(function (profile) {
    ['computeLayout', 'computeListLayout'].forEach(function (factory) {
      var plan = layout[factory](profile)
      h.equal(layout.findChordViolations(plan).join(' | '), '',
        factory + ' on ' + profile.shape + ' violates the chord budget')
    })
  })
})

h.test('list pages centre their content on a circle and use full width on rect', function () {
  var circle = layout.computeListLayout({ shape: 'circle', logicalWidth: 192, logicalHeight: 192 })
  var band = layout.computeListLayout({ shape: 'rect', logicalWidth: 192, logicalHeight: 274 })

  h.ok(circle.listLeft > band.pad, 'circle rows must be inset by the chord, not by the rect pad')
  // odd widths cannot split a circle perfectly; 1px asymmetry is acceptable
  function centred(left, width, scene) {
    var right = scene - (left + width)
    return Math.abs(right - left) <= 1
  }
  h.ok(centred(circle.titleLeft, circle.titleWidth, circle.sceneWidth),
    'circle title must be centred')
  h.ok(centred(circle.listLeft, circle.listWidth, circle.sceneWidth),
    'circle rows must be centred')
  h.ok(centred(circle.backLeft, circle.backWidth, circle.sceneWidth),
    'circle back button must be centred')
  h.ok(circle.backWidth <= layout.safeRowWidth(circle.sceneWidth, circle.backTop, circle.backHeight),
    'back button must fit the chord')

  h.equal(band.listLeft, band.pad, 'rect rows start at the pad')
  h.equal(band.listWidth, band.sceneWidth - band.pad * 2, 'rect rows span the column')
})

h.test('list pages keep a scrollable body with room left for the back button', function () {
  ALL_PROFILES.forEach(function (profile) {
    var plan = layout.computeListLayout(profile)
    h.ok(plan.listHeight >= plan.rowHeight, 'list body must fit at least one row on ' + profile.shape)
    h.ok(plan.listTop + plan.listHeight <= plan.backTop, 'list must not run into the back button on ' + profile.shape)
    h.equal(layout.findOverlaps(plan).join(','), '', 'list plan overlaps on ' + profile.shape)
  })
})

h.report('timer_layout')
