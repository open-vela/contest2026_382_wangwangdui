const fs = require('fs')
const path = require('path')
const assert = require('assert')
const scrollFlow = require('../src/presentation/layout/scroll_flow')
const historyLayout = require('../src/presentation/layout/specs/history')

const root = path.resolve(__dirname, '..')
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8') }

const page = read('src/pages/history/history.ux')
const mapper = read('src/presentation/mappers/history.js')

assert.ok(page.includes("../../domain/history/repository"), 'history page must read history domain directly')
assert.ok(page.includes("../../presentation/mappers/history"), 'history page must map presentation explicitly')
assert.ok(page.includes("../../presentation/layout/scroll_flow"), 'history must use the composed scroll-flow primitive')
assert.ok(page.includes("../../presentation/layout/specs/history"), 'history composition must live outside the page')
assert.ok(page.includes('layoutRuntime.bind('), 'history viewport/composition must resolve through Design Engine')
assert.ok(!page.includes('watch_data'), 'history page must not depend on watch_data')
assert.ok(!page.includes('isCircle'), 'L2 page business code should consume composition tokens instead of shape flags')
assert.ok(!page.includes('@media (shape: circle)'), 'history top-level geometry must not regress to shape CSS')

assert.strictEqual(historyLayout.freedomLevel, 2, 'history is an L2 Assisted design')
assert.strictEqual(historyLayout.strategy, 'assisted')
assert.ok(historyLayout.compositions.circle, 'history must define an art-directed circle composition')
assert.ok(historyLayout.compositions.rect, 'history must define an art-directed rect composition')

const circlePlan = scrollFlow.resolve({ formFactor: 'circle', logicalHeight: 192 }, historyLayout)
assert.strictEqual(circlePlan.mode, 'fixed-composition')
assert.strictEqual(circlePlan.tokens.summaryVisible, false, 'circle prioritizes compact chart + insights over duplicate summary cards')
assert.strictEqual(circlePlan.tokens.compactLabels, true)
assert.strictEqual(circlePlan.stream.width, 148, 'circle record stream remains full readable width')
assert.ok(circlePlan.heroHeight <= 176, 'circle composed header must leave the record stream reachable by scrolling')
assert.strictEqual(circlePlan.needsOverride, false, 'circle composition must pass safe geometry')

const rectPlan = scrollFlow.resolve({ formFactor: 'rect', logicalHeight: 228 }, historyLayout)
assert.strictEqual(rectPlan.mode, 'fixed-composition')
assert.strictEqual(rectPlan.tokens.insightVariant, 'column', 'rect uses a side insight column beside the chart')
assert.strictEqual(rectPlan.tokens.summaryVisible, true)
assert.strictEqual(rectPlan.needsOverride, false)

const pillPlan = scrollFlow.resolve({ formFactor: 'pill', logicalHeight: 490 }, historyLayout)
assert.strictEqual(pillPlan.mode, 'auto-stack', 'pill keeps the full vertical composition')
assert.strictEqual(pillPlan.tokens.summaryVisible, true)
assert.strictEqual(pillPlan.tokens.compactLabels, false)
assert.ok(pillPlan.heroHeight > 340, 'pill should use its tall canvas for a full dashboard before records')
assert.strictEqual(pillPlan.needsOverride, false)

assert.ok(mapper.includes('chartMaxHeight'), 'history chart mapper must consume composition-provided chart height')
assert.ok(mapper.includes('compactLabels'), 'history label density must be a composition token, not a shape branch')
assert.ok(mapper.includes("toFixed(1)"), 'compact step labels must retain one decimal when useful')
assert.ok(!mapper.includes('COMPACT_CHART_MAX_HEIGHT'), 'mapper must not own circle geometry constants')
assert.ok(!mapper.includes("Math.round(item.steps / 1000) + 'k'"), 'history must not collapse nearby days into the same rounded whole-k label')

console.log('History L2 verified: composed hero + scroll stream preserve distinct circle/rect/pill designs')
