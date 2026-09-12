const assert = require('assert')
const fs = require('fs')
const path = require('path')
const scene = require('../src/v2/design/scene')

const root = path.resolve(__dirname, '..')
const profiles = [
  { name: 'circle-192', formFactor: 'circle', logicalHeight: 192, screenWidth: 466, screenHeight: 466, width: 148 },
  { name: 'rect-228', formFactor: 'rect', logicalHeight: 228, screenWidth: 432, screenHeight: 514, width: 164 },
  { name: 'band10-pill', formFactor: 'pill', logicalHeight: 471, screenWidth: 212, screenHeight: 520, width: 168 }
]

profiles.forEach(profile => {
  const host = scene.resolve(profile)
  const safe = scene.safeForWidth(profile, profile.width)
  assert.strictEqual(host.width, 192)
  assert.strictEqual(host.hostTop, 0)
  assert.ok(safe.left >= 0 && safe.left + safe.width <= host.width)
  assert.ok(safe.top >= 0 && safe.bottom <= host.height)
  assert.ok(safe.height > 0)
  if (profile.formFactor === 'circle') assert.ok(safe.height >= 168)
  if (profile.formFactor === 'pill') assert.strictEqual(safe.gestureBar, 36)
})

const appEntries = {
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

function validateBox(box, host, label) {
  if (!box || typeof box !== 'object') return
  if (![box.left, box.top, box.width, box.height].every(value => typeof value === 'number' && isFinite(value))) return
  assert.ok(box.left >= 0, label + ' left')
  assert.ok(box.top >= 0, label + ' top')
  assert.ok(box.left + box.width <= host.width + 0.01, label + ' width')
  assert.ok(box.top + box.height <= host.height + 0.01, label + ' height')
}
function walk(value, host, label, seen) {
  if (!value || typeof value !== 'object' || seen.indexOf(value) >= 0) return
  seen.push(value); validateBox(value, host, label)
  Object.keys(value).forEach(key => walk(value[key], host, label + '.' + key, seen))
}

Object.keys(appEntries).forEach(name => {
  const app = appEntries[name]
  if (!app || typeof app.resolve !== 'function') return
  profiles.forEach(profile => {
    const host = scene.resolve(profile)
    const safe = scene.safeForWidth(profile, app.contentWidth ? app.contentWidth(profile) : profile.width)
    const plan = app.resolve(profile, host, safe)
    assert.strictEqual(plan.shape, profile.formFactor, name + ':' + profile.name)
    assert.ok(typeof plan.surface === 'string' && plan.surface.length > 0)
    walk(plan, host, name + ':' + profile.name, [])
  })
})

const designFiles = []
function collect(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) collect(target)
    else if (entry.name.endsWith('.js')) designFiles.push(target)
  })
}
collect(path.join(root, 'src/v2/design'))
designFiles.forEach(full => {
  const source = fs.readFileSync(full, 'utf8')
  const relative = path.relative(root, full).replace(/\\/g, '/')
  assert.ok(!source.includes('/features/'), relative + ' Design must never depend upward on Feature')
  assert.ok(!source.includes('/capabilities/'), relative + ' Design must never access device APIs')
})

const pageRuntime = fs.readFileSync(path.join(root, 'src/v2/app/page_runtime.js'), 'utf8')
assert.ok(pageRuntime.includes('applyHostViewport(page, profile)'))
assert.ok(pageRuntime.includes("page.viewportTop = '0px'"))

const clock = fs.readFileSync(path.join(root, 'src/pages/clock/clock.ux'), 'utf8')
assert.ok(clock.includes('<div class="pill-stage" if="{{ isPill }}">'))
assert.ok(clock.includes('<div class="rect-stage" if="{{ isRect }}">'))
assert.ok(clock.includes('<div class="circle-stage" if="{{ isCircle && faceMounted }}">'))

const launcher = fs.readFileSync(path.join(root, 'src/pages/applist/applist.ux'), 'utf8')
assert.ok(launcher.includes('class="list-surface"') && launcher.includes('circleVisibleSlots'))

const watchfacePage = fs.readFileSync(path.join(root, 'src/pages/watchface/index.ux'), 'utf8')
assert.ok(watchfacePage.includes('class="circle-surface"') && watchfacePage.includes('class="pill-surface"') && watchfacePage.includes('class="rect-surface"'))

const healthPage = fs.readFileSync(path.join(root, 'src/pages/heartrate/heartrate.ux'), 'utf8')
assert.strictEqual((healthPage.match(/class="health-stream"/g) || []).length, 1)
assert.ok(!healthPage.includes('isCircle') && !healthPage.includes('isPill') && !healthPage.includes('isRect'))
assert.ok(healthPage.includes('class="heart-card"') && healthPage.includes('class="mini-row"') && healthPage.includes('class="detail-card"'))
assert.ok(healthPage.includes('width: {{ cardWidth }}px; height: {{ heroHeight }}px; padding:'))
assert.ok(!healthPage.includes('{{ spo2Source }}') && !healthPage.includes('{{ stressSource }}'))

const historyPage = fs.readFileSync(path.join(root, 'src/pages/history/history.ux'), 'utf8')
const historyView = fs.readFileSync(path.join(root, 'src/v2/design/apps/history/view.js'), 'utf8')
assert.strictEqual((historyPage.match(/class="history-stream"/g) || []).length, 1)
assert.ok(historyPage.includes("trendMode === 'compact-column'") && historyPage.includes("trendMode === 'comparative-row'"))
assert.ok(!historyPage.includes('isCircle') && !historyPage.includes('isPill') && !historyPage.includes('isRect'))
assert.ok(historyPage.includes('步数趋势') && historyPage.includes('column-label'))
assert.ok(!historyPage.includes('column-date') && !historyPage.includes('column-weekday'))
assert.ok(historyView.includes("color: isToday ? '#FFD60A' : '#4C7CF3'"))

const settingsPage = fs.readFileSync(path.join(root, 'src/pages/settings/settings/settings.ux'), 'utf8')
assert.ok(settingsPage.includes('@swipe="handleSwipe"'))
const vibrationPage = fs.readFileSync(path.join(root, 'src/pages/settings/vibration/vibration.ux'), 'utf8')
assert.ok(vibrationPage.includes('levelButtonWidth') && !vibrationPage.includes('width: 31%'))
assert.ok(!vibrationPage.includes('applyShape(') && !vibrationPage.includes('shape-pill'))

require('./settings_selector_compat.test')
console.log('V2 visual contracts verified: declarative recipes, one L1 shell, local L2 expressions and intentional L3 surfaces')
