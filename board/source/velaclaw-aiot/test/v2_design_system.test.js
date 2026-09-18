const assert = require('assert')
const scene = require('../src/v2/design/scene')
const adapter = require('../src/v2/design/adapter')
const freedom = require('../src/v2/design/freedom')
const steps = require('../src/v2/design/apps/steps')
const heart = require('../src/v2/design/apps/heart')
const history = require('../src/v2/design/apps/history')
const today = require('../src/v2/design/apps/today')
const workout = require('../src/v2/design/apps/workout')
const launcher = require('../src/v2/design/apps/launcher')
const clock = require('../src/v2/design/apps/clock')
const faces = require('../src/v2/design/apps/faces')
const settings = require('../src/v2/design/apps/settings')

const profiles = [
  { name: 'circle-192', formFactor: 'circle', logicalHeight: 192, screenWidth: 466, screenHeight: 466 },
  { name: 'rect-228', formFactor: 'rect', logicalHeight: 228, screenWidth: 432, screenHeight: 514 },
  { name: 'band10-pill', formFactor: 'pill', logicalHeight: 471, screenWidth: 212, screenHeight: 520 }
]

function resolved(app, profile) {
  const host = scene.resolve(profile)
  const safe = scene.safeForWidth(profile, app.contentWidth ? app.contentWidth(profile) : 164)
  return { host, safe, plan: app.resolve(profile, host, safe) }
}

assert.strictEqual(adapter.VERSION, '2.3')
assert.strictEqual(freedom.describe(freedom.AUTO).adapter, 'adaptive-geometry')
assert.strictEqual(freedom.describe(freedom.ASSISTED).adapter, 'local-expression')
assert.strictEqual(freedom.describe(freedom.FREE).adapter, 'independent-surface')

profiles.forEach(profile => {
  ;[steps, heart, history, today, workout, launcher, clock, faces, settings].forEach(app => {
    const plan = resolved(app, profile).plan
    assert.strictEqual(plan.designSystem, 'declarative-adapter-v2.3')
    assert.strictEqual(plan.designSystemVersion, '2.3')
    assert.strictEqual(plan.shape, profile.formFactor)
  })
})

assert.strictEqual(steps.freedomLevel, freedom.AUTO, 'Goal progress is one geometry-adapted component tree')
assert.strictEqual(heart.freedomLevel, freedom.AUTO, 'Health remains L1')
assert.strictEqual(history.freedomLevel, freedom.ASSISTED, 'Only History trend expression varies')
assert.strictEqual(workout.freedomLevel, freedom.ASSISTED, 'Workout keeps one page with L2 composition recipes')
assert.strictEqual(today.freedomLevel, freedom.ASSISTED)
assert.strictEqual(launcher.freedomLevel, freedom.FREE)
assert.strictEqual(clock.freedomLevel, freedom.FREE)
assert.strictEqual(faces.freedomLevel, freedom.FREE)

const circleHeart = resolved(heart, profiles[0]).plan
assert.strictEqual(circleHeart.stream.width, 136)
assert.strictEqual(circleHeart.cardWidth + circleHeart.cardPaddingX * 2, circleHeart.stream.width)
assert.strictEqual(circleHeart.miniWidth + circleHeart.miniPaddingX * 2, circleHeart.miniOuterWidth)
assert.ok(circleHeart.miniPaddingX < circleHeart.cardPaddingX, 'Health mini cards keep an independent compact padding contract')
assert.ok(circleHeart.metaLineHeight > circleHeart.metaSize)

const circleHistory = resolved(history, profiles[0]).plan
const rectHistory = resolved(history, profiles[1]).plan
const pillHistory = resolved(history, profiles[2]).plan
assert.strictEqual(circleHistory.trendMode, 'compact-column')
assert.strictEqual(rectHistory.trendMode, 'compact-column')
assert.strictEqual(pillHistory.trendMode, 'comparative-row')
assert.strictEqual(pillHistory.pillTrendMinWidth, 14)
assert.strictEqual(pillHistory.pillTrendMaxWidth, 70)
assert.strictEqual(circleHistory.trendOuterHeight, 68)
assert.strictEqual(circleHistory.chartHeight, 30)
assert.strictEqual(circleHistory.summaryHeight, 36, 'Circle History must preserve the readable pre-declarative summary content height')
assert.strictEqual(circleHistory.insightHeight, 38, 'Circle History must preserve three readable insight text lines')
assert.strictEqual(rectHistory.summaryHeight, 41, 'Rect History summary content must not shrink when outer-box recipes add padding')
assert.strictEqual(rectHistory.insightHeight, 41, 'Rect History insight cards must retain enough content height for three lines')
assert.strictEqual(pillHistory.summaryHeight, 42, 'Pill History summary content height should match the stable layout scale')
assert.strictEqual(pillHistory.insightHeight, 42, 'Pill History insight cards should match the stable layout scale')
assert.strictEqual(pillHistory.cardRadius, 17, 'Pill History should keep the reduced historical corner radius')
assert.ok(pillHistory.summaryValueSize <= 17, 'Pill History values must not reintroduce the oversized text regression')

const circleToday = resolved(today, profiles[0]).plan
assert.deepStrictEqual(circleToday.circleFrame, { left: 28, top: 30, width: 136, height: 128 })
assert.strictEqual(circleToday.interaction, 'explicit-buttons')
assert.strictEqual(circleToday.overflow, 'fixed')
assert.ok(!circleToday.needsOverride)

const circleWorkout = resolved(workout, profiles[0]).plan
assert.strictEqual(circleWorkout.metricColumns, 2)
assert.strictEqual(circleWorkout.durationSize, 27)
assert.strictEqual(circleWorkout.durationLineHeight, 31)
assert.deepStrictEqual(circleWorkout.header, { left: 32, top: 24, width: 128, height: 18 })
assert.strictEqual(circleWorkout.metricItemWidth * 2 + circleWorkout.metricGap, circleWorkout.metrics.width)

profiles.forEach(profile => {
  const result = resolved(steps, profile)
  assert.strictEqual(result.plan.progressTrackWidth, result.plan.stream.width - result.plan.metricPadding * 2)
})

const circleSettings = resolved(settings, profiles[0]).plan
const pillSettings = resolved(settings, profiles[2]).plan
assert.strictEqual(circleSettings.capacity.pageSize, 2)
assert.strictEqual(pillSettings.capacity.pageSize, 3)
assert.strictEqual(circleSettings.capacity.fixedFrame, true)

console.log('Design System v2.3 contracts verified: declarative L1 geometry, local L2 renderers and explicit L3 surfaces')
