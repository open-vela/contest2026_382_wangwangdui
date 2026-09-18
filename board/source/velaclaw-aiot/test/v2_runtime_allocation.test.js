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

let nativeCalls = 0
const nativeMock = {
  set() { nativeCalls++ },
  get() { nativeCalls++ },
  delete() { nativeCalls++ }
}
const memoryStorage = loadStorage(nativeMock)
let firstResult
memoryStorage.set('same', { value: 1 }, result => { firstResult = result })
assert.strictEqual(nativeCalls, 0, 'target storage must not touch native usr.db')
assert.strictEqual(firstResult.persisted, false)
assert.strictEqual(firstResult.memoryOnly, true)
let forcedValue = ''
memoryStorage.get('same', value => { forcedValue = value }, true)
assert.strictEqual(forcedValue, '{"value":1}', 'forceRefresh must not discard memory fallback values')
memoryStorage.set('same', { value: 1 }, result => { assert.strictEqual(result.memoryOnly, true) })
assert.strictEqual(nativeCalls, 0, 'duplicate memory writes must stay local')
memoryStorage.set('same', { value: 2 }, () => {})
assert.strictEqual(nativeCalls, 0, 'changed memory values must stay local')
memoryStorage.updateJSON('same', {}, current => current, (value, result) => {
  assert.strictEqual(value.value, 2)
  assert.strictEqual(result.memoryOnly, true)
})
assert.strictEqual(nativeCalls, 0, 'updateJSON must not touch native storage')
memoryStorage.clearCache()
memoryStorage.set('same', { value: 2 }, result => { assert.strictEqual(result.memoryOnly, true) })
assert.strictEqual(nativeCalls, 0, 'clearing cache must not re-enable native storage')

console.log('V2 runtime allocation verified: static ticks, single heart snapshot copy, and target-safe memory storage')
