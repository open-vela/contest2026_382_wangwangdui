const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const manifest = JSON.parse(read('src/manifest.json'))

function pagePath(route, value) { return path.join('src', route, value.component + '.ux') }
function count(source, token) { return source.split(token).length - 1 }

Object.keys(manifest.router.pages || {}).forEach(route => {
  const relative = pagePath(route, manifest.router.pages[route])
  const source = read(relative)
  const ownsScroll = /<(scroll|list)\b/.test(source)
  const ownsRawTouch = /@touch(start|move|end)=/.test(source)
  const ownsSwipe = /@swipe=/.test(source)
  if (ownsScroll) {
    assert.ok(!ownsRawTouch, relative + ' must not combine scroll/list with raw touch gesture recognition')
    assert.ok(!ownsSwipe, relative + ' must not combine scroll/list with a page swipe recognizer')
  }
})

const today = read('src/pages/today/today.ux')
assert.ok(!/<(scroll|list)\b/.test(today), 'Today summary/calendar are fixed surfaces')
assert.ok(!/@touch(start|move|end)=/.test(today) && !/@swipe=/.test(today), 'Today month navigation must remain explicit click interaction')

const clock = read('src/pages/clock/clock.ux')
assert.strictEqual(count(clock, '@swipe='), 1, 'Clock must have exactly one native swipe owner')
assert.strictEqual(count(clock, '@longpress='), 1, 'Clock must have exactly one long-press owner')
assert.strictEqual(count(clock, '@touchstart='), 1, 'Clock must have exactly one raw-touch fallback owner')
assert.strictEqual(count(clock, '@touchmove='), 1, 'Clock must have exactly one raw-touch fallback owner')
assert.strictEqual(count(clock, '@touchend='), 1, 'Clock must have exactly one raw-touch fallback owner')
assert.ok(clock.includes('consumeGestureEvent(event)'), 'Clock vertical fallback must consume the gesture')
assert.ok(clock.includes('this.notificationVisible) return'), 'Clock navigation gestures must be blocked by notification overlay')

const watchfaceDir = path.join(root, 'src/components/watchfaces')
fs.readdirSync(watchfaceDir).filter(name => name.endsWith('.ux')).forEach(name => {
  const source = fs.readFileSync(path.join(watchfaceDir, name), 'utf8')
  assert.ok(!source.includes('@system.router'), name + ' must emit semantic events instead of navigating directly')
  assert.ok(!/@swipe=|@longpress=|@touch(start|move|end)=/.test(source), name + ' must not compete with Clock gesture owner')
  if (/@click=/.test(source)) assert.ok(source.includes('$emit('), name + ' clickable complications must communicate upward')
})

assert.ok(clock.includes('onopen-health="openHealth"'))
assert.ok(clock.includes('onopen-steps="openSteps"'))
assert.ok(clock.includes('onopen-today="openToday"'))

const launcher = read('src/pages/applist/applist.ux')
assert.strictEqual(count(launcher, '@swipe="handleListSwipe"'), 2, 'Pill and Rect launcher surfaces own their swipe behavior')
assert.ok(launcher.includes("event.direction === 'down') navigation.back()"), 'Pill launcher down-swipe must return to Clock')
assert.ok(launcher.includes('event.preventDefault') && launcher.includes('event.stopPropagation'))
assert.ok(launcher.includes('class="list-surface"') && launcher.includes('style="width: {{ sceneWidth }}px; height: {{ sceneHeight }}px;"'))
assert.ok(launcher.includes('circleVisibleSlots'), 'Circle launcher should cull off-screen Honeycomb slots')
assert.ok(launcher.includes('this.openApp(item)'), 'Circle visible app tap should open directly')

const healthPage = read('src/pages/heartrate/heartrate.ux')
assert.strictEqual(count(healthPage, 'class="health-stream"'), 1, 'L1 Health must have one scroll owner')
assert.ok(!healthPage.includes('isCircle') && !healthPage.includes('isPill') && !healthPage.includes('isRect'), 'L1 Health must not own shape-specific interaction branches')

const settings = read('src/pages/settings/settings/settings.ux')
assert.ok(settings.includes('@swipe="handleSwipe"'), 'Settings paging may use one fixed-surface swipe owner')
assert.ok(settings.includes("event.direction === 'left'") && settings.includes("event.direction === 'right'"))

console.log('V2 interaction contracts verified: one gesture owner per rendered surface and Adapter-first L1 pages stay shape-neutral')
