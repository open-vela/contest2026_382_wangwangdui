const assert = require('assert')
const motion = require('../src/common/motion_metrics')

let passed = 0

function test(name, callback) {
  callback()
  passed++
  console.log('通过 - ' + name)
}

test('计算三轴合加速度', function () {
  assert.strictEqual(motion.magnitude({ x: 3, y: 4, z: 0 }), 5)
})

test('计算相邻样本向量变化', function () {
  assert.strictEqual(motion.vectorDelta({ x: 0, y: 4, z: 0 }, { x: 3, y: 0, z: 0 }), 5)
})

test('强度分类覆盖四档', function () {
  assert.strictEqual(motion.classify(0.5).key, 'stable')
  assert.strictEqual(motion.classify(2).key, 'light')
  assert.strictEqual(motion.classify(5).key, 'medium')
  assert.strictEqual(motion.classify(10).key, 'strong')
})

test('连续样本保留峰值与计数', function () {
  let state = motion.createState()
  state = motion.applySample(state, { x: 9.8, y: 0, z: 0 })
  state = motion.applySample(state, { x: 0, y: 9.8, z: 0 })
  assert.strictEqual(state.sampleCount, 2)
  assert.ok(state.peak > 13)
  assert.strictEqual(state.intensity.key, 'strong')
})

console.log('动作强度逻辑测试通过：' + passed + ' 项')
