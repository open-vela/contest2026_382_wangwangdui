const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const root = path.resolve(__dirname, '..')
const repositoryPath = path.join(root, 'src/domain/history/repository.js')
const source = fs.readFileSync(repositoryPath, 'utf8')

assert.ok(!source.includes('makeDemoHistory'), 'Production History repository must not synthesize demo day records')
assert.ok(!source.includes('makeDemoHourly'), 'Production History repository must not synthesize demo hourly heart-rate records')
assert.ok(!source.includes('3800, 5200, 6100'), 'Production History repository must not embed sample step history')

function loadRepository(options) {
  const config = options || {}
  const writes = []
  const restored = []
  const activitySnapshot = config.activitySnapshot || {
    steps: 1234,
    calories: 88,
    standHours: 4,
    goalPercent: 31
  }
  const heartStats = config.heartStats || { avg: 72, min: 60, max: 91 }
  const storedHistory = config.storedHistory === undefined ? [] : config.storedHistory
  const storedHourly = config.storedHourly === undefined ? [] : config.storedHourly

  const mocks = {
    storage: {
      getJSON(key, callback) {
        if (key === 'health_history_7d') callback(storedHistory)
        else if (key === 'hourly_heart_rate_24h') callback(storedHourly)
        else callback([])
      },
      set(key, value, callback) {
        writes.push({ key, value: JSON.parse(JSON.stringify(value)) })
        if (callback) callback({ ok: true })
      }
    },
    activityStore: {
      getSnapshot() { return activitySnapshot },
      restoreTotals(value) { restored.push(JSON.parse(JSON.stringify(value))) }
    },
    recentHealth: {
      getStats() { return heartStats }
    }
  }

  let transformed = source
    .replace("import storage from '../../capabilities/storage'", 'var storage = __mocks.storage')
    .replace("import activityStore from '../activity/store'", 'var activityStore = __mocks.activityStore')
    .replace("import recentHealth from '../health/recent'", 'var recentHealth = __mocks.recentHealth')
    .replace('export default {', 'module.exports = {')

  const context = {
    module: { exports: {} },
    exports: {},
    __mocks: mocks,
    Date,
    JSON,
    Array,
    Number,
    Math
  }
  vm.runInNewContext(transformed, context, { filename: repositoryPath })
  return { repository: context.module.exports, writes, restored }
}

function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

{
  const runtime = loadRepository()
  assert.deepStrictEqual(plain(runtime.repository.getHourlyHeartRate()), [], 'Missing hourly data must stay empty')

  let loadedHourly = null
  runtime.repository.loadHourlyHeartRate(value => { loadedHourly = plain(value) })
  assert.deepStrictEqual(loadedHourly, [], 'Loading missing hourly data must not fabricate a chart')
  assert.strictEqual(runtime.writes.length, 0, 'Loading missing hourly data must not persist fabricated samples')

  let history = null
  runtime.repository.getHistory(value => { history = plain(value) })
  assert.strictEqual(history.length, 1, 'Fresh history should contain only the real current-day snapshot')
  assert.strictEqual(history[0].steps, 1234)
  assert.strictEqual(history[0].calories, 88)
  assert.strictEqual(history[0].avgHeartRate, 72)
  assert.strictEqual(runtime.writes.length, 1, 'Current-day history may be persisted once')
  assert.strictEqual(runtime.writes[0].key, 'health_history_7d')
}

{
  const stored = [{
    date: '2026-09-11',
    steps: 4321,
    calories: 210,
    standHours: 8,
    avgHeartRate: 69,
    minHeartRate: 55,
    maxHeartRate: 88,
    goalPercent: 77
  }]
  const runtime = loadRepository({ storedHistory: stored })
  let history = null
  runtime.repository.getHistory(value => { history = plain(value) })
  assert.strictEqual(history.length, 2, 'Real persisted history must be preserved and combined with today')
  assert.strictEqual(history[0].steps, 4321)
  assert.strictEqual(history[1].steps, 1234)
}

console.log('History real-data contracts verified: no production demo history or hourly heart-rate fallback')
