const assert = require('assert')
const hapticsCore = require('../src/v2/system/haptics_core')

let passed = 0
function test(name, callback) { callback(); passed++; console.log('通过 - ' + name) }

function harness(vibrateResult) {
  const pulses = []
  const scheduled = []
  let nextId = 1
  const runtime = hapticsCore.createRuntime({
    vibrate: function (mode) { pulses.push(mode); return vibrateResult !== false },
    setTimeout: function (callback, delay) {
      const entry = { id: nextId++, callback: callback, delay: delay, cleared: false }
      scheduled.push(entry)
      return entry.id
    },
    clearTimeout: function (id) {
      const entry = scheduled.find(function (item) { return item.id === id })
      if (entry) entry.cleared = true
    }
  })
  return { runtime: runtime, pulses: pulses, scheduled: scheduled }
}

const doublePulse = { mode: 'short', count: 2, duration: 100, interval: 50 }
const triplePulse = { mode: 'short', count: 3, duration: 80, interval: 20 }

test('播放立即触发首个脉冲并登记唯一 owner', function () {
  const h = harness()
  assert.strictEqual(h.runtime.play(doublePulse, 'notification'), true)
  assert.deepStrictEqual(h.pulses, ['short'])
  assert.strictEqual(h.runtime.getActiveOwner(), 'notification')
  assert.strictEqual(h.scheduled.length, 1)
  assert.strictEqual(h.scheduled[0].delay, 150)
})

test('新 owner 接管时旧节奏被取消', function () {
  const h = harness()
  h.runtime.play(triplePulse, 'motion')
  const oldCallbacks = h.scheduled.slice()
  h.runtime.play(doublePulse, 'notification')
  assert.strictEqual(h.runtime.getActiveOwner(), 'notification')
  assert.ok(oldCallbacks.every(function (entry) { return entry.cleared }))
})

test('旧 owner 的 stop 不能停止新 owner', function () {
  const h = harness()
  h.runtime.play(triplePulse, 'motion')
  h.runtime.play(doublePulse, 'notification')
  assert.strictEqual(h.runtime.stop('motion'), false)
  assert.strictEqual(h.runtime.getActiveOwner(), 'notification')
})

test('旧 generation 回调即使被触发也不能产生脉冲', function () {
  const h = harness()
  h.runtime.play(triplePulse, 'motion')
  const stale = h.scheduled[0].callback
  h.runtime.play(doublePulse, 'notification')
  const before = h.pulses.length
  stale()
  assert.strictEqual(h.pulses.length, before)
})

test('当前 owner stop 会清理自己的全部延迟脉冲', function () {
  const h = harness()
  h.runtime.play(triplePulse, 'settings-vibration')
  assert.strictEqual(h.runtime.stop('settings-vibration'), true)
  assert.strictEqual(h.runtime.getActiveOwner(), null)
  assert.ok(h.scheduled.every(function (entry) { return entry.cleared }))
})

test('首脉冲执行失败时不留下幽灵 owner 或 timer', function () {
  const h = harness(false)
  assert.strictEqual(h.runtime.play(triplePulse, 'motion'), false)
  assert.strictEqual(h.runtime.getActiveOwner(), null)
  assert.strictEqual(h.scheduled.length, 0)
})

test('无 owner 的调用被拒绝，避免无归属生命周期', function () {
  const h = harness()
  assert.strictEqual(h.runtime.play(doublePulse), false)
  assert.strictEqual(h.runtime.stop(), false)
  assert.strictEqual(h.pulses.length, 0)
})

console.log('Haptics Runtime ownership 测试通过：' + passed + ' 项')
