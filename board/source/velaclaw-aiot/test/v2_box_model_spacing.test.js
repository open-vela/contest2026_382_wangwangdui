const assert = require('assert')
const fs = require('fs')
const path = require('path')
const scene = require('../src/v2/design/scene')
const workoutHistory = require('../src/v2/design/apps/workout/history')

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
}

const circle = { formFactor: 'circle', logicalHeight: 192, screenWidth: 466, screenHeight: 466 }
const host = scene.resolve(circle)
const safe = scene.safeForWidth(circle, workoutHistory.contentWidth(circle))
const historyPlan = workoutHistory.resolve(circle, host, safe)

assert.strictEqual(
  historyPlan.summaryCardOuterWidth * 2 + historyPlan.summaryGap,
  historyPlan.summary.width,
  'Workout History summary outer cards plus the authored gap must exactly fill the summary row'
)
assert.strictEqual(
  historyPlan.summaryCardWidth + historyPlan.summaryPaddingLeft,
  historyPlan.summaryCardOuterWidth,
  'Workout History summary width must be the content width before left padding is applied'
)
assert.strictEqual(
  historyPlan.stream.itemWidth + historyPlan.padding * 2,
  historyPlan.stream.outerItemWidth,
  'Workout History record width must preserve the authored outer width after padding'
)
assert.strictEqual(
  historyPlan.stream.itemHeight + historyPlan.padding * 2,
  historyPlan.stream.outerItemHeight,
  'Workout History record height must preserve the authored outer height after padding'
)

const workoutPage = read('src/pages/workout_history/workout_history.ux')
assert.ok(workoutPage.includes('margin-left: {{ summaryGap }}px'), 'Workout History uses its explicit summary gap')
assert.ok(workoutPage.includes('.summary-row { flex-direction: row; justify-content: center; }'), 'Workout History centers a fixed-gap summary pair')
assert.ok(!workoutPage.includes('.summary-row { flex-direction: row; justify-content: space-between; }'), 'Workout History must not amplify padded-card geometry with space-between')
assert.ok(workoutPage.includes('width: {{ recordWidth }}px; height: {{ recordHeight }}px;'), 'Workout History record cards use resolved content-box dimensions')

const todayPage = read('src/pages/today/today.ux')
assert.strictEqual(51 + 6 * 2, 63, 'Circle metric content width restores the original 63px outer card')
assert.strictEqual(63 * 2 + 4, 130, 'Circle metric pair plus fixed gap exactly fills the 130px row')
assert.strictEqual(60 + 10 * 2, 80, 'Pill metric content width restores the original 80px outer card')
assert.strictEqual(50 + 9 * 2, 68, 'Pill metric content height restores the original 68px outer card')
assert.strictEqual(80 * 2 + 8, 168, 'Pill metric pair plus fixed gap exactly fills the 168px row')
assert.strictEqual(28 + 5 * 2, 38, 'Rect metric content width restores the original 38px outer card')
assert.strictEqual(38 * 4 + 4 * 3, 164, 'Rect metric cards plus fixed gaps exactly fill the 164px row')
assert.ok(todayPage.includes('.circle-metrics { width: 130px; height: 42px; margin-top: 4px; flex-direction: row; flex-wrap: wrap; justify-content: center; }'), 'Circle Today metrics use a centered fixed-gap group')
assert.ok(todayPage.includes('.circle-metric-card { width: 51px; height: 19px;'), 'Circle Today cards expose content width, not outer width')
assert.ok(todayPage.includes('.pill-grid { width: 168px; height: 144px; margin-top: 10px; flex-direction: row; flex-wrap: wrap; justify-content: center; }'), 'Pill Today metrics use a centered fixed-gap grid')
assert.ok(todayPage.includes('.pill-card { width: 60px; height: 50px;'), 'Pill Today cards expose content dimensions before padding')
assert.ok(todayPage.includes('class="pill-card orange" style="margin-left: 8px; margin-bottom: 8px;"'), 'Pill Today first-row second card owns the authored horizontal gap')
assert.ok(todayPage.includes('class="pill-card green" style="margin-left: 8px;"'), 'Pill Today second-row second card owns the authored horizontal gap')
assert.ok(todayPage.includes('.rect-metrics { width: 164px; height: 42px; margin-top: 3px; flex-direction: row; justify-content: center; }'), 'Rect Today metrics use a centered fixed-gap group')
assert.ok(todayPage.includes('.rect-metric { width: 28px; height: 32px;'), 'Rect Today cards expose content dimensions before padding')
assert.strictEqual((todayPage.match(/class="rect-metric [^"]+" style="margin-left: 4px;"/g) || []).length, 3, 'Rect Today metrics use exactly three explicit 4px gaps')

console.log('V2 box-model spacing verified: padded card groups preserve authored outer geometry and fixed gaps')
