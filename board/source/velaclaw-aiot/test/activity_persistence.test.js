const fs = require('fs')
const path = require('path')
const assert = require('assert')
const core = require('../src/domain/activity/store_core')

const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')

let passed = 0
function test(name, callback) { callback(); passed++; console.log('通过 - ' + name) }

function fakeRepository(syncValue) {
  const loads = []
  const saves = []
  let syncReads = 0
  return {
    loads: loads,
    saves: saves,
    loadSync: function () { syncReads++; return syncValue || null },
    load: function (callback) { loads.push(callback) },
    save: function (snapshot, callback) { saves.push({ snapshot: JSON.parse(JSON.stringify(snapshot)), callback: callback, resolved: false }) },
    resolveLoad: function (value) {
      const callback = loads.shift()
      assert.ok(callback, 'expected pending activity load')
      callback(value)
    },
    resolveSave: function () {
      const entry = saves.find(function (item) { return !item.resolved })
      assert.ok(entry, 'expected pending activity save')
      entry.resolved = true
      entry.callback(JSON.parse(JSON.stringify(entry.snapshot)), true)
    },
    syncReadCount: function () { return syncReads }
  }
}

test('并发 hydrate 合并为一个初始读取 transaction', function () {
  const repo = fakeRepository({ steps: 4700, calories: 190, standHours: 8, stepsGoal: 6000, caloriesGoal: 300, standGoal: 12 })
  const store = core.createStore(repo)
  let first = null, second = null
  store.hydrate(function (value) { first = value })
  store.hydrate(function (value) { second = value })
  assert.strictEqual(repo.syncReadCount(), 1)
  assert.strictEqual(repo.loads.length, 1)
  repo.resolveLoad({ steps: 4800, calories: 200, standHours: 9, stepsGoal: 7000, caloriesGoal: 320, standGoal: 12 })
  assert.strictEqual(first.steps, 4800)
  assert.strictEqual(second.stepsGoal, 7000)
  store.hydrate(function (value) { second = value })
  assert.strictEqual(repo.loads.length, 0, 'hydrated Store must remain the in-memory truth source')
})

test('hydrate 期间的运动增量在读取完成后只应用一次', function () {
  const repo = fakeRepository()
  const store = core.createStore(repo)
  let committed = null
  store.addAndPersist(120, 30, function (value) { committed = value })
  assert.strictEqual(repo.saves.length, 0, 'must not persist against defaults before hydration completes')
  repo.resolveLoad({ steps: 5000, calories: 220, standHours: 8, stepsGoal: 6000, caloriesGoal: 300, standGoal: 12 })
  assert.strictEqual(store.getSnapshot().steps, 5120)
  assert.strictEqual(store.getSnapshot().calories, 250)
  assert.strictEqual(repo.saves.length, 1)
  assert.strictEqual(repo.saves[0].snapshot.steps, 5120)
  repo.resolveSave()
  assert.strictEqual(committed.steps, 5120)
})

test('连续运动提交按顺序落盘，旧写入不能覆盖新快照', function () {
  const repo = fakeRepository()
  const store = core.createStore(repo)
  store.hydrate(function () {})
  repo.resolveLoad({ steps: 5000, calories: 200, standHours: 8, stepsGoal: 6000, caloriesGoal: 300, standGoal: 12 })
  let first = null, second = null
  store.addAndPersist(100, 10, function (value) { first = value.steps })
  store.addAndPersist(200, 20, function (value) { second = value.steps })
  assert.strictEqual(repo.saves.length, 1, 'only one storage save may be in flight')
  assert.strictEqual(repo.saves[0].snapshot.steps, 5100)
  repo.resolveSave()
  assert.strictEqual(first, 5100)
  assert.strictEqual(repo.saves.length, 2)
  assert.strictEqual(repo.saves[1].snapshot.steps, 5300)
  repo.resolveSave()
  assert.strictEqual(second, 5300)
  assert.strictEqual(store.getSnapshot().steps, 5300)
})

test('较旧持久快照永远不能把今日累计值回滚', function () {
  const repo = fakeRepository()
  const store = core.createStore(repo)
  store.add(1000, 100)
  store.hydrate(function () {})
  repo.resolveLoad({ steps: 3000, calories: 100, standHours: 2, stepsGoal: 6000, caloriesGoal: 300, standGoal: 12 })
  assert.ok(store.getSnapshot().steps >= core.DEFAULT_STATE.steps + 1000)
  assert.ok(store.getSnapshot().calories >= core.DEFAULT_STATE.calories + 100)
})

const repository = read('src/domain/activity/repository.js')
const storeWrapper = read('src/domain/activity/store.js')
const workout = read('src/v2/features/workout/controller.js')
const activityFeature = read('src/v2/features/activity/controller.js')
const steps = read('src/pages/steps/steps.ux')
const today = read('src/pages/today/today.ux')

assert.ok(repository.includes("../../capabilities/storage"), 'Activity Repository must persist through the storage gateway')
assert.ok(storeWrapper.includes("require('./store_core')"), 'Activity Store must delegate concurrency to the executable core')
assert.ok(workout.includes('activityStore.addAndPersist(record.steps, record.calories'), 'Workout Feature must commit activity before finishing navigation flow')
assert.ok(workout.includes('historyRepository.saveToday(activitySnapshot'), 'History must receive the exact committed Activity snapshot')
assert.ok(activityFeature.includes("../../../domain/activity/store"), 'Activity Feature must own page-facing Activity access')
assert.ok(activityFeature.includes('lifecycleEpoch'), 'Activity Feature must ignore stale hydration callbacks')
assert.ok(!activityFeature.includes("name: '步数'") && !activityFeature.includes('RATIOS') && !activityFeature.includes("unit: '步'"), 'Activity Feature must remain presentation-free')
assert.ok(steps.includes("../../v2/features/activity/controller") && steps.includes("../../v2/design/specs/activity") && steps.includes("../../v2/design/views/activity"), 'Steps Page must bind Activity Feature through Design')
assert.ok(!steps.includes("../../domain/activity/store") && !steps.includes('profile.formFactor'), 'Steps Page must not bypass Feature or own shape policy')
assert.ok(today.includes("../../v2/features/today/controller") && !today.includes("../../domain/activity/store"), 'Today Page must consume Activity only through its Feature orchestration')

console.log('Activity persistence verified: one hydration source, ordered writes and V2 page boundaries (' + passed + ' runtime tests)')
