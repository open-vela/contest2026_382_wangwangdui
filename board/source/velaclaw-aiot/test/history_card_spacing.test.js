const assert = require('assert')
const fs = require('fs')
const path = require('path')
const scene = require('../src/v2/design/scene')
const history = require('../src/v2/design/apps/history')

const profile = { formFactor: 'circle', logicalHeight: 192, screenWidth: 466, screenHeight: 466 }
const host = scene.resolve(profile)
const safe = scene.safeForWidth(profile, history.contentWidth(profile))
const plan = history.resolve(profile, host, safe)

assert.strictEqual(plan.stream.width, 136)
assert.strictEqual(plan.summaryWidth + plan.summaryPaddingX * 2, plan.summaryOuterWidth)
assert.strictEqual(plan.summaryOuterWidth * 2 + plan.summaryGap, plan.stream.width)
assert.strictEqual(plan.insightWidth + plan.insightPadding * 2, plan.insightOuterWidth)
assert.ok(plan.insightOuterWidth * 3 + plan.insightGap * 2 <= plan.stream.width)
assert.ok(plan.stream.width - (plan.insightOuterWidth * 3 + plan.insightGap * 2) <= 2)

const page = fs.readFileSync(path.join(__dirname, '../src/pages/history/history.ux'), 'utf8')
assert.ok(page.includes('margin-left: {{ summaryGap }}px'), 'History summary cards must use the recipe gap explicitly')
assert.strictEqual((page.match(/margin-left: \{\{ insightGap \}\}px/g) || []).length, 2, 'History insight cards must use two explicit recipe gaps')
assert.ok(page.includes('.summary-row, .insight-row { flex-direction: row; justify-content: center; align-items: center; }'), 'Padded History card rows must center fixed-gap groups')
assert.ok(!page.includes('.history-title-row, .summary-row, .insight-row, .trend-head, .row-item'), 'Padded History card rows must not share space-between with header rows')
assert.ok(page.includes('.column-trend { width: 100%; flex: 1; flex-direction: row; align-items: flex-end; justify-content: space-between;'), 'Chart distribution keeps intentional space-between semantics')

console.log('History card spacing verified: padded summary/insight cards use explicit fixed gaps without space-between amplification')
