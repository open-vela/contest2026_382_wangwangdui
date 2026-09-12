const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const analog = require('../src/v2/design/analog')
const clockView = require('../src/v2/design/views/clock')

const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')

const ticksA = analog.ticks()
const ticksB = analog.ticks()
assert.strictEqual(ticksA, ticksB, 'static analog tick geometry must be reused across projections')
assert.strictEqual(ticksA.length, 60, 'static analog geometry still contains sixty ticks')

const heartValues = [72, 75, 78]
const projected = clockView.project({
  faceId: 'sport',
  timestamp: new Date(2026, 8, 12, 10, 20, 30).getTime(),
  batteryPercent: 80,
  currentHeartRate: 78,
  heartRateValues: heartValues,
  steps: 1234,
  stepsGoal: 6000,
  goalPercent: 20,
  stepsPercent: 20,
  powerMode: 'ACTIVE'
})
assert.strictEqual(projected.analogTicks, ticksA, 'Clock projection must reuse static analog ticks')
assert.strictEqual(projected.heartRateData, heartValues, 'Clock View must reuse the Controller-owned snapshot array instead of copying it again')

const clockController = read('src/v2/features/clock/controller.js')
assert.ok(clockController.includes('heartRateValues: heartValues.slice()'), 'Clock Controller must make one owned heart-rate copy at the snapshot boundary')
assert.ok(!clockController.includes('state.heartRateValues = heartValues.slice()'), 'Clock heart-rate sampling must not allocate a second intermediate array')

function loadStorage(mock) {
  let source = read('src/capabilities/storage.js')
  source = source.replace("import storage from '@system.storage'", 'var storage = globalThis.__storageMock')
  source = source.replace('export default adapter', 'module.exports = adapter')
  const sandbox = {
    module: { exports: {} },
    exports: {},
    globalThis: { __storageMock: mock },
    JSON,
    Error
  }
  vm.runInNewContext(source, sandbox, { filename: 'storage.js' })
  return sandbox.module.exports
}

let setCalls = 0
const persistedMock = {
  set(options) { setCalls++; options.success() },
  get(options) { options.fail() },
  delete(options) { options.success() }
}
const persistedStorage = loadStorage(persistedMock)
let firstResult
persistedStorage.set('same', { value: 1 }, result => { firstResult = result })
assert.strictEqual(setCalls, 1, 'first value must reach native storage')
assert.strictEqual(firstResult.persisted, true)
persistedStorage.set('same', { value: 1 }, result => { assert.strictEqual(result.persisted, true) })
assert.strictEqual(setCalls, 1, 'identical proven-persisted value must skip a duplicate native write')
persistedStorage.set('same', { value: 2 }, () => {})
assert.strictEqual(setCalls, 2, 'changed value must reach native storage')
persistedStorage.updateJSON('same', {}, current => current, (value, result) => {
  assert.strictEqual(value.value, 2)
  assert.strictEqual(result.persisted, true)
})
assert.strictEqual(setCalls, 2, 'updateJSON must also skip an identical proven-persisted payload')
persistedStorage.clearCache()
persistedStorage.set('same', { value: 2 }, () => {})
assert.strictEqual(setCalls, 3, 'clearing cache must discard persisted-value proof and force a native write')

let retryCalls = 0
const retryMock = {
  set(options) {
    retryCalls++
    if (retryCalls === 1) options.fail(new Error('simulated write failure'))
    else options.success()
  },
  get(options) { options.fail() },
  delete(options) { options.success() }
}
const retryStorage = loadStorage(retryMock)
let failedResult
retryStorage.set('retry', 'payload', result => { failedResult = result })
assert.strictEqual(failedResult.persisted, false)
assert.strictEqual(retryCalls, 1)
retryStorage.set('retry', 'payload', result => { assert.strictEqual(result.persisted, true) })
assert.strictEqual(retryCalls, 2, 'same value must retry after a failed native write')
retryStorage.set('retry', 'payload', () => {})
assert.strictEqual(retryCalls, 2, 'same value may dedupe only after the retry succeeds')

console.log('V2 runtime allocation verified: static ticks, single heart snapshot copy, and persisted-only storage dedupe')
