const assert = require('assert')
const patterns = require('../src/common/haptic_patterns')

let passed = 0

function test(name, callback) {
  callback()
  passed++
  console.log('通过 - ' + name)
}

test('未知模式回退为达标而不是警报', function () {
  assert.strictEqual(patterns.normalize('unknown'), 'goal')
  assert.strictEqual(patterns.label('unknown'), '达标')
})

test('四种模式保持独立配置', function () {
  assert.strictEqual(patterns.get('tap').count, 1)
  assert.strictEqual(patterns.get('goal').count, 2)
  assert.strictEqual(patterns.get('countdown').count, 3)
  assert.strictEqual(patterns.get('alert').fallback, 'long')
})

test('基础降级仍保留不同节奏次数', function () {
  assert.deepStrictEqual(patterns.fallbackOffsets('tap'), [0])
  assert.strictEqual(patterns.fallbackOffsets('goal').length, 2)
  assert.strictEqual(patterns.fallbackOffsets('countdown').length, 3)
})

test('强度只缩放持续时间，不改变所选模式', function () {
  assert.strictEqual(patterns.get('tap', 'strong').key, 'tap')
  assert.ok(patterns.get('tap', 'strong').duration > patterns.get('tap', 'light').duration)
})

console.log('震动模式逻辑测试通过：' + passed + ' 项')
