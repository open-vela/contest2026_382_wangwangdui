const assert = require('assert')
const fs = require('fs')
const path = require('path')
const healthView = require('../src/v2/design/views/health')

const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')

const plan = { chartHeight: 24, trendMinHeight: 6 }
const live = healthView.project({
  heartRate: 76,
  spo2: 98,
  stress: 22,
  heartZone: 'normal',
  spo2Zone: 'good',
  stressZone: 'relaxed',
  heartSource: { live: true, mode: 'live' },
  spo2Source: { live: true, mode: 'live' },
  stressSource: { live: true, mode: 'live' },
  anyLive: true,
  serviceAvailable: true,
  updatedAt: new Date(2026, 8, 4, 15, 30).getTime(),
  heartValues: [72, 74, 76, 79, 76],
  spo2Values: [97, 98, 97, 99, 98],
  stressValues: [18, 22, 25, 20, 22]
}, plan)

assert.strictEqual(live.heartSource, '系统')
assert.strictEqual(live.sourceText, '系统健康数据')
assert.strictEqual(live.heartRate, 76)
assert.ok(live.heartBars.length === 5)
assert.ok(Math.max.apply(null, live.heartBars.map(item => item.height)) <= 24)
assert.ok(Math.min.apply(null, live.heartBars.map(item => item.height)) >= 6)

const waiting = healthView.project({
  heartRate: 0,
  spo2: 0,
  stress: null,
  heartZone: 'waiting',
  spo2Zone: 'waiting',
  stressZone: 'waiting',
  heartSource: { live: false, mode: 'fallback' },
  spo2Source: { live: false, mode: 'fallback' },
  stressSource: { live: false, mode: 'fallback' },
  anyLive: false,
  serviceAvailable: true,
  heartValues: [], spo2Values: [], stressValues: []
}, plan)

assert.strictEqual(waiting.heartRate, '--')
assert.strictEqual(waiting.spo2, '--')
assert.strictEqual(waiting.stress, '--')
assert.strictEqual(waiting.heartSource, '等待')
assert.strictEqual(waiting.sourceText, '等待系统数据')
assert.strictEqual(waiting.heartBars.length, 0)

const controller = read('src/v2/features/health/controller.js')
const store = read('src/domain/health/store.js')
const page = read('src/pages/heartrate/heartrate.ux')
assert.ok(controller.includes("data[prefix + 'Source'] === 'live'"), 'Health controller must only promote official system samples into visible metric state')
assert.ok(!controller.includes('var heartValues = [72'), 'Health controller must not seed a fabricated trend')
assert.ok(!controller.includes('historyRepository.loadHourlyHeartRate'), 'Health must not pull demo-backed hourly history into the official data surface')
assert.ok(store.includes('heartRateSource: heart.source'), 'Health store must preserve capability source provenance')
assert.strictEqual((page.match(/class="health-stream"/g) || []).length, 1, 'Health must have one canonical L1 stream')
assert.ok(!page.includes('isCircle') && !page.includes('isPill') && !page.includes('isRect'), 'Health presentation must not fork by form factor')
assert.ok(page.includes('.heart-value { width: 58px; color: #FFFFFF; }'), 'Unified Health value must reserve glyph-safe width for three-digit heart rate')
assert.ok(page.includes('line-height: {{ metaLineHeight }}px'), 'Health metadata must use explicit glyph-safe line boxes')
assert.ok(page.includes('padding-bottom: {{ scrollPaddingBottom }}px'), 'Round scrolling must leave enough tail space to center the final detail card')

require('./history_real_data.test')
console.log('Health official-data contracts verified')
