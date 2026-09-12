const assert = require('assert')
const fs = require('fs')
const path = require('path')
const adapter = require('../src/v2/design/adapter')
const scene = require('../src/v2/design/scene')
const freedom = require('../src/v2/design/freedom')

const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const exists = name => fs.existsSync(path.join(root, name))

const apps = {
  index: require('../src/v2/design/apps/index'),
  detail: require('../src/v2/design/apps/detail'),
  steps: require('../src/v2/design/apps/steps'),
  heart: require('../src/v2/design/apps/heart'),
  history: require('../src/v2/design/apps/history'),
  launcher: require('../src/v2/design/apps/launcher'),
  clock: require('../src/v2/design/apps/clock'),
  faces: require('../src/v2/design/apps/faces'),
  notification: require('../src/v2/design/apps/notification'),
  settings: require('../src/v2/design/apps/settings'),
  sync: require('../src/v2/design/apps/sync'),
  brightness: require('../src/v2/design/apps/brightness'),
  vibration: require('../src/v2/design/apps/vibration'),
  motion: require('../src/v2/design/apps/motion'),
  diagnostics: require('../src/v2/design/apps/diagnostics'),
  today: require('../src/v2/design/apps/today'),
  workout: require('../src/v2/design/apps/workout')
}
const workoutHistory = require('../src/v2/design/apps/workout/history')
const workoutSelection = require('../src/v2/design/apps/workout/selection')

const profiles = [
  { name: 'circle', formFactor: 'circle', logicalHeight: 192, screenWidth: 466, screenHeight: 466 },
  { name: 'pill', formFactor: 'pill', logicalHeight: 471, screenWidth: 212, screenHeight: 520 },
  { name: 'rect', formFactor: 'rect', logicalHeight: 228, screenWidth: 432, screenHeight: 514 }
]

function resolve(app, profile) {
  const host = scene.resolve(profile)
  const width = typeof app.contentWidth === 'function' ? app.contentWidth(profile) : 164
  const safe = scene.safeForWidth(profile, width)
  return { host, safe, plan: app.resolve(profile, host, safe) }
}

function validateBox(box, host, label) {
  if (!box || typeof box !== 'object') return
  if (![box.left, box.top, box.width, box.height].every(value => typeof value === 'number' && isFinite(value))) return
  assert.ok(box.left >= 0, label + ' left')
  assert.ok(box.top >= 0, label + ' top')
  assert.ok(box.left + box.width <= host.width + 0.01, label + ' width')
  assert.ok(box.top + box.height <= host.height + 0.01, label + ' height')
}

function walk(value, host, label, seen) {
  if (!value || typeof value !== 'object') return
  if (seen.indexOf(value) >= 0) return
  seen.push(value)
  validateBox(value, host, label)
  Object.keys(value).forEach(key => walk(value[key], host, label + '.' + key, seen))
}

assert.strictEqual(adapter.VERSION, '2.3')
assert.strictEqual(adapter.SYSTEM_ID, 'declarative-adapter-v2.3')
const adapterSource = read('src/v2/design/adapter.js')
;['heightScale', 'fitTop', 'fitBand', 'availableBandWidth'].forEach(name => {
  assert.ok(!adapterSource.includes('function ' + name), name + ' bug-chasing heuristic must stay removed')
})
assert.ok(adapterSource.includes('function placeBand') && adapterSource.includes('function contentBox'), 'Adapter keeps only placement, safety and box-model primitives')

const selected = adapter.select({ base: { width: 100, gap: 6 }, circle: { width: 88 } }, { formFactor: 'circle' })
assert.deepStrictEqual(selected, { width: 88, gap: 6 })

const appFolders = ['index','detail','steps','heart','history','launcher','clock','faces','notification','settings','sync','brightness','vibration','motion','diagnostics','today','workout']
appFolders.forEach(name => {
  assert.ok(exists('src/v2/design/apps/' + name + '/layout.js'), name + ' must own a layout recipe')
  assert.ok(exists('src/v2/design/apps/' + name + '/index.js'), name + ' must own its resolver entry')
  const source = read('src/v2/design/apps/' + name + '/layout.js')
  assert.ok(!source.includes('function '), name + ' layout should remain a declarative JSON-shaped object')
})

const detailApps = ['sync','brightness','vibration','motion','diagnostics']
detailApps.forEach(name => {
  assert.ok(exists('src/v2/design/apps/' + name + '/view.js'), name + ' keeps its view beside its recipe')
})

Object.keys(apps).forEach(name => {
  profiles.forEach(profile => {
    const result = resolve(apps[name], profile)
    assert.ok(result.plan && result.plan.designSystem === 'declarative-adapter-v2.3', name + ' uses v2.3 on ' + profile.name)
    assert.strictEqual(result.plan.shape, profile.formFactor)
    walk(result.plan, result.host, name + ':' + profile.name, [])
  })
})
profiles.forEach(profile => {
  ;[workoutHistory, workoutSelection].forEach((app, index) => {
    const result = resolve(app, profile)
    assert.strictEqual(result.plan.designSystem, 'declarative-adapter-v2.3')
    walk(result.plan, result.host, 'workout-subpage-' + index + ':' + profile.name, [])
  })
})

assert.strictEqual(apps.index.freedomLevel, freedom.AUTO)
assert.strictEqual(apps.detail.freedomLevel, freedom.AUTO)
assert.strictEqual(apps.steps.freedomLevel, freedom.AUTO)
assert.strictEqual(apps.heart.freedomLevel, freedom.AUTO)
assert.strictEqual(apps.history.freedomLevel, freedom.ASSISTED)
assert.strictEqual(apps.workout.freedomLevel, freedom.ASSISTED)
assert.strictEqual(apps.launcher.freedomLevel, freedom.FREE)
assert.strictEqual(apps.clock.freedomLevel, freedom.FREE)
assert.strictEqual(apps.faces.freedomLevel, freedom.FREE)

const circleHeart = resolve(apps.heart, profiles[0]).plan
assert.strictEqual(circleHeart.surface, 'vitals-stream')
assert.strictEqual(circleHeart.stream.width, 136)
assert.strictEqual(circleHeart.cardWidth + circleHeart.cardPaddingX * 2, circleHeart.stream.width)
assert.strictEqual(circleHeart.miniWidth + circleHeart.miniPaddingX * 2, circleHeart.miniOuterWidth)
assert.strictEqual(circleHeart.miniOuterWidth * 2 + circleHeart.cardGap, circleHeart.stream.width - 1)
assert.ok(circleHeart.miniPaddingX < circleHeart.cardPaddingX, 'Health mini cards keep their compact padding independent from hero/detail cards')
const healthPage = read('src/pages/heartrate/heartrate.ux')
assert.ok(healthPage.includes("../../v2/design/apps/heart"))
assert.ok(!healthPage.includes('isCircle') && !healthPage.includes('isPill') && !healthPage.includes('isRect'))
assert.ok(!healthPage.includes('{{ spo2Source }}') && !healthPage.includes('{{ stressSource }}'), 'per-card System labels must stay out of Health mini cards')
assert.ok(healthPage.includes('padding: {{ miniPaddingY }}px {{ miniPaddingX }}px'), 'Health mini cards must use their own padded-card geometry')
assert.ok(healthPage.includes('margin-left: {{ cardGap }}px'), 'Health mini cards must use an explicit fixed visual gap')
assert.ok(healthPage.includes('.mini-row { flex-direction: row; justify-content: center; }'), 'Health mini row must center a fixed-gap pair')
assert.ok(!healthPage.includes('.mini-row { flex-direction: row; justify-content: space-between; }'), 'space-between must not amplify box-model rounding into a giant center gap')
assert.ok(healthPage.includes('.mini-value { width: 100%;') && healthPage.includes('.mini-status { width: 100%;'), 'Health mini-card text stays inside its padded content box')

const circleHistory = resolve(apps.history, profiles[0]).plan
const pillHistory = resolve(apps.history, profiles[1]).plan
assert.strictEqual(circleHistory.surface, 'trend-stream')
assert.strictEqual(circleHistory.trendMode, 'compact-column')
assert.strictEqual(pillHistory.trendMode, 'comparative-row')
assert.strictEqual(circleHistory.trendWidth + circleHistory.trendPaddingX * 2, circleHistory.trendOuterWidth)
assert.strictEqual(circleHistory.summaryWidth + circleHistory.summaryPaddingX * 2, circleHistory.summaryOuterWidth)
const historyPage = read('src/pages/history/history.ux')
assert.ok(historyPage.includes("../../v2/design/apps/history"))
assert.ok(historyPage.includes("trendMode === 'compact-column'") && historyPage.includes("trendMode === 'comparative-row'"))
assert.ok(historyPage.includes('步数趋势') && historyPage.includes('column-label'))
assert.ok(!historyPage.includes('column-date') && !historyPage.includes('column-weekday'), 'Circle trend keeps the compact one-line weekday expression')

const pillFaces = resolve(apps.faces, profiles[1]).plan
assert.deepStrictEqual(pillFaces.content, { left: 12, top: 94, width: 168, height: 275 }, 'Pill face content must preserve the declared top band and enough room for two cards')
assert.ok(pillFaces.content.height >= pillFaces.cardHeight * pillFaces.pageSize + pillFaces.cardGap, 'Pill face selector must fit a complete page of cards')

const circleWorkout = resolve(apps.workout, profiles[0]).plan
assert.deepStrictEqual(circleWorkout.header, { left: 32, top: 24, width: 128, height: 18 })
assert.deepStrictEqual(circleWorkout.hero, { left: 24, top: 45, width: 144, height: 48 })
assert.deepStrictEqual(circleWorkout.metrics, { left: 30, top: 97, width: 132, height: 54 })
assert.deepStrictEqual(circleWorkout.actions, { left: 42, top: 153, width: 108, height: 21 })

const circleWorkoutHistory = resolve(workoutHistory, profiles[0]).plan
assert.deepStrictEqual(circleWorkoutHistory.header, { left: 32, top: 24, width: 128, height: 20 })
assert.deepStrictEqual(circleWorkoutHistory.summary, { left: 26, top: 49, width: 140, height: 38 })

assert.ok(!exists('src/v2/design/assisted.js'), 'v2.1 assisted heuristic helper should be removed')
assert.ok(!exists('src/v2/design/paged_stack.js'), 'dynamic settings stack heuristic should be removed')
assert.ok(!exists('src/v2/design/specs/simple_center.js'), 'unused generic screenshot helper should be removed')

console.log('Declarative Adapter v2.3 verified: recipes own design intent, Adapter only merges, places, validates and computes necessary box/grid geometry')