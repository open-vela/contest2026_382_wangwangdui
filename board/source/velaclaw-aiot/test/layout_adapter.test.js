const assert = require('assert')
const adapter = require('../src/presentation/layout/adapter')
const pagedStack = require('../src/presentation/layout/paged_stack')
const detailLayout = require('../src/presentation/layout/specs/detail')
const workoutLayout = require('../src/presentation/layout/specs/workout')
const settingsLayout = require('../src/presentation/layout/specs/settings')

function circle() {
  return { formFactor: 'circle', logicalHeight: 192 }
}

function pill() {
  return { formFactor: 'pill', logicalHeight: 490 }
}

function rect() {
  return { formFactor: 'rect', logicalHeight: 228 }
}

function region(plan, id) {
  for (let i = 0; i < plan.regions.length; i++) {
    if (plan.regions[i].id === id) return plan.regions[i]
  }
  return null
}

const simple = {
  id: 'simple-stack',
  default: {
    mode: 'auto-stack',
    minScale: 0.72,
    maxScale: 1,
    gap: 4,
    regions: [
      { id: 'header', width: 110, height: 16 },
      { id: 'content', width: 136, height: 60 },
      { id: 'actions', width: 110, height: 20 }
    ]
  }
}

const circlePlan = adapter.resolve(circle(), simple)
assert.strictEqual(circlePlan.freedomLevel, 1, 'unspecified simple layouts default to L1 Auto')
assert.strictEqual(circlePlan.strategy, 'auto')
assert.strictEqual(circlePlan.needsOverride, false, 'simple stack should auto-fit circle')
assert.ok(circlePlan.scale > 0.7, 'auto-fit should keep readable scale')
assert.strictEqual(circlePlan.regions.length, 3)
assert.ok(circlePlan.regions[0].top >= 18, 'header should stay below circle cap')
assert.ok(circlePlan.regions[2].bottom <= 174, 'actions should stay above circle bottom cap')

const pillPlan = adapter.resolve(pill(), simple)
assert.strictEqual(pillPlan.needsOverride, false, 'simple stack should auto-fit pill')
assert.strictEqual(pillPlan.scale, 1, 'pill should preserve the golden-reference scale when room exists')

const centeredCircle = adapter.resolve(circle(), detailLayout)
assert.strictEqual(centeredCircle.freedomLevel, 1, 'detail is the L1 Auto reference page')
assert.strictEqual(centeredCircle.strategy, 'auto')
assert.strictEqual(centeredCircle.needsOverride, false, 'simple centered design should auto-fit circle')
assert.ok(Math.abs((centeredCircle.regions[0].top + centeredCircle.regions[0].height / 2) - 96) <= 1, 'L1 centered region should center inside the circle safe band')
const centeredPill = adapter.resolve(pill(), detailLayout)
assert.strictEqual(centeredPill.needsOverride, false, 'simple centered design should auto-fit pill')
assert.ok(centeredPill.regions[0].top > centeredPill.safeBounds.top, 'pill center alignment should use available safe height instead of pinning to the cap')

const settingsCircle = pagedStack.resolve(circle(), settingsLayout)
assert.strictEqual(settingsCircle.freedomLevel, 1, 'settings paged stack is an L1 automatic design')
assert.strictEqual(settingsCircle.needsOverride, false, 'settings must auto-fit without an art-directed override')
assert.strictEqual(settingsCircle.pageSize, 2, 'circle capacity must be derived as two cards per page')
assert.strictEqual(settingsCircle.capacityReduced, true, 'circle should report that automatic capacity was reduced')
assert.ok(settingsCircle.regions[0].top < settingsCircle.regions[1].top, 'narrow header should exploit the circle cap above the wider list')
assert.ok(settingsCircle.regions[2].bottom <= 174, 'circle pager must remain inside its own safe band')

const settingsPill = pagedStack.resolve(pill(), settingsLayout)
assert.strictEqual(settingsPill.pageSize, 3, 'pill should keep three cards when vertical space is available')
assert.strictEqual(settingsPill.capacityReduced, false)
assert.strictEqual(settingsPill.needsOverride, false)
assert.ok(settingsPill.verticalScale >= 1.4, 'tall pill viewport should expand card height instead of leaving a tiny circle-density stack')
assert.ok(settingsPill.itemHeight >= 84, 'pill settings cards should grow to a comfortable touch height')
assert.ok(settingsPill.itemWidth >= 170, 'pill settings cards should use the available horizontal canvas')
assert.ok(settingsPill.visualScale >= 1.35, 'pill typography and icon density should grow with available space')

const settingsPillLastPage = pagedStack.resolvePage(pill(), settingsLayout, settingsPill, 2)
const pillLastList = region(settingsPillLastPage, 'list')
const pillLastFooter = region(settingsPillLastPage, 'footer')
assert.strictEqual(settingsPillLastPage.pageSize, 3, 'partial page reflow must preserve navigation capacity')
assert.strictEqual(settingsPillLastPage.visibleCount, 2, 'partial page must expose the actual visible item count')
assert.strictEqual(settingsPillLastPage.isPartialPage, true, 'two items in a three-item capacity page must be marked partial')
assert.ok(Math.abs(pillLastList.height - (settingsPillLastPage.itemHeight * 2 + settingsPillLastPage.itemGap)) < 1, 'partial page list height must contain only visible cards and one real gap')
assert.ok(pillLastFooter.top - pillLastList.bottom < 20, 'partial page must keep pager near the visible card group instead of leaving a hollow middle')

const settingsRect = pagedStack.resolve(rect(), settingsLayout)
assert.strictEqual(settingsRect.pageSize, 3, 'rect should keep three cards when they fit at readable scale')
assert.strictEqual(settingsRect.needsOverride, false)
assert.ok(settingsRect.verticalScale <= settingsPill.verticalScale, 'short rect should not expand more aggressively than a tall pill')

const workoutCircle = adapter.resolve(circle(), workoutLayout)
assert.strictEqual(workoutCircle.freedomLevel, 2, 'workout is the L2 Assisted reference page')
assert.strictEqual(workoutCircle.strategy, 'assisted')
assert.strictEqual(workoutCircle.hasOverride, true, 'L2 may choose art-directed shape composition')

const impossible = {
  id: 'too-dense',
  default: {
    mode: 'auto-stack',
    minScale: 0.82,
    maxScale: 1,
    gap: 8,
    regions: [
      { id: 'a', width: 148, height: 64 },
      { id: 'b', width: 148, height: 64 },
      { id: 'c', width: 148, height: 64 }
    ]
  }
}
const impossiblePlan = adapter.resolve(circle(), impossible)
assert.strictEqual(impossiblePlan.needsOverride, true, 'adapter must refuse unreadable auto-compression')
assert.strictEqual(impossiblePlan.reason, 'auto-stack-cannot-fit-within-min-scale')

const override = {
  id: 'history',
  freedomLevel: 2,
  default: {
    mode: 'auto-stack',
    minScale: 0.8,
    regions: [
      { id: 'summary', width: 156, height: 54 },
      { id: 'chart', width: 156, height: 146 },
      { id: 'records', width: 156, height: 144 }
    ]
  },
  compositions: {
    circle: {
      mode: 'fixed-composition',
      regions: [
        { id: 'chart', left: 22, top: 37, width: 148, height: 78, variant: 'compact' },
        { id: 'insights', left: 36, top: 121, width: 120, height: 34, variant: 'compact' }
      ]
    }
  }
}
const historyCircle = adapter.resolve(circle(), override)
assert.strictEqual(historyCircle.freedomLevel, 2)
assert.strictEqual(historyCircle.strategy, 'assisted')
assert.strictEqual(historyCircle.composition, 'circle')
assert.strictEqual(historyCircle.hasOverride, true)
assert.strictEqual(historyCircle.mode, 'fixed-composition')
assert.strictEqual(historyCircle.needsOverride, false, 'explicit safe composition should validate')
assert.strictEqual(historyCircle.regions[0].variant, 'compact')

const external = {
  id: 'honeycomb',
  freedomLevel: 3,
  default: { mode: 'external-engine', safeWidth: 136 }
}
const enginePlan = adapter.resolve(circle(), external)
assert.strictEqual(enginePlan.freedomLevel, 3)
assert.strictEqual(enginePlan.strategy, 'free')
assert.strictEqual(enginePlan.mode, 'external-engine')
assert.strictEqual(enginePlan.regions.length, 0)
assert.ok(enginePlan.safeBounds.height > 0)

const fixedUnsafe = {
  id: 'unsafe',
  default: {
    mode: 'fixed-composition',
    regions: [{ id: 'wide-top', left: 22, top: 10, width: 148, height: 30 }]
  }
}
const unsafePlan = adapter.resolve(circle(), fixedUnsafe)
assert.strictEqual(unsafePlan.needsOverride, true, 'fixed designer composition must still be safety-validated')
assert.ok(unsafePlan.violations.length > 0)

const rectPlan = adapter.resolve(rect(), simple)
assert.strictEqual(rectPlan.needsOverride, false)

console.log('Design Engine verified: L1 capacity/partial-page comfort, L2 composition, L3 free mode and refusal boundaries work')
