const assert = require('assert')
const core = require('../src/domain/settings/store_core')

let passed = 0
function test(name, callback) { callback(); passed++; console.log('通过 - ' + name) }

function fakeStorage() {
  const reads = []
  const writes = []
  return {
    reads: reads,
    writes: writes,
    getJSON: function (key, callback) { reads.push({ key: key, callback: callback }) },
    set: function (key, value, callback) {
      writes.push({ key: key, value: JSON.parse(JSON.stringify(value)), callback: callback })
    },
    resolveRead: function (value) {
      const read = reads.shift()
      assert.ok(read, 'expected pending storage read')
      read.callback(value)
    },
    resolveWrite: function (result) {
      const write = writes.find(function (entry) { return !entry.resolved })
      assert.ok(write, 'expected pending storage write')
      write.resolved = true
      write.callback(result === undefined ? true : result)
    },
    pendingWrites: function () { return writes.filter(function (entry) { return !entry.resolved }) }
  }
}

test('并发 load 合并为一次初始读取，后续 load 只读内存真源', function () {
  const storage = fakeStorage()
  const store = core.createStore(storage)
  let first = null
  let second = null
  let third = null
  store.load(function (value) { first = value })
  store.load(function (value) { second = value })
  assert.strictEqual(storage.reads.length, 1)
  storage.resolveRead({ brightnessValue: 88, vibrationLevel: 'strong' })
  assert.strictEqual(first.brightnessValue, 88)
  assert.strictEqual(second.vibrationLevel, 'strong')
  store.load(function (value) { third = value })
  assert.strictEqual(storage.reads.length, 0)
  assert.strictEqual(third.brightnessValue, 88)
})

test('初始读取期间 update 不会用默认值提前覆盖已存配置', function () {
  const storage = fakeStorage()
  const store = core.createStore(storage)
  store.load(function () {})
  store.update('brightnessValue', 210)
  assert.strictEqual(storage.writes.length, 0, 'load 完成前不得写入基于默认值的快照')
  storage.resolveRead({ brightnessValue: 80, vibrationLevel: 'strong', vibrationPattern: 'alert' })
  const snapshot = store.getSnapshot()
  assert.strictEqual(snapshot.brightnessValue, 210, 'pending update must win over stored value')
  assert.strictEqual(snapshot.vibrationLevel, 'strong', 'unrelated stored fields must survive')
  assert.strictEqual(snapshot.vibrationPattern, 'alert', 'initial load must not be erased by early update')
  assert.strictEqual(storage.writes.length, 1)
  assert.strictEqual(storage.writes[0].value.brightnessValue, 210)
  assert.strictEqual(storage.writes[0].value.vibrationLevel, 'strong')
})

test('快速连续 update 串行写入，最终落盘一定是最新快照', function () {
  const storage = fakeStorage()
  const store = core.createStore(storage)
  store.load(function () {})
  storage.resolveRead({ brightnessValue: 100 })

  store.update('brightnessValue', 150)
  store.update('brightnessValue', 160)
  assert.strictEqual(storage.writes.length, 1, 'first write must be the only in-flight write')
  assert.strictEqual(storage.writes[0].value.brightnessValue, 150)

  storage.resolveWrite()
  assert.strictEqual(storage.writes.length, 2, 'queued latest snapshot must start after first write completes')
  assert.strictEqual(storage.writes[1].value.brightnessValue, 160)

  store.update('brightnessValue', 170)
  assert.strictEqual(storage.writes.length, 2, 'third update must wait for second write')
  storage.resolveWrite()
  assert.strictEqual(storage.writes.length, 3)
  assert.strictEqual(storage.writes[2].value.brightnessValue, 170)
  storage.resolveWrite()
  assert.strictEqual(store.getSnapshot().brightnessValue, 170)
})

test('persist callback 等到合并后的最终写入完成', function () {
  const storage = fakeStorage()
  const store = core.createStore(storage)
  store.load(function () {})
  storage.resolveRead({ brightnessValue: 100 })
  let callbackValue = null
  store.update('brightnessValue', 120, function (value) { callbackValue = value.brightnessValue })
  store.update('brightnessValue', 130)
  storage.resolveWrite()
  assert.strictEqual(callbackValue, null)
  storage.resolveWrite()
  assert.strictEqual(callbackValue, 130)
})

test('瞬时蓝牙连接状态不属于持久 Settings Domain', function () {
  const normalized = core.normalize({ bluetoothConnected: true, brightnessValue: 140 })
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, 'bluetoothConnected'), false)
})

test('load 回调拿到副本，外部修改不会污染 Store', function () {
  const storage = fakeStorage()
  const store = core.createStore(storage)
  let exposed = null
  store.load(function (value) { exposed = value })
  storage.resolveRead({ vibrationPattern: 'countdown' })
  exposed.vibrationPattern = 'alert'
  assert.strictEqual(store.getSnapshot().vibrationPattern, 'countdown')
})

console.log('Settings Store 单一真源测试通过：' + passed + ' 项')
