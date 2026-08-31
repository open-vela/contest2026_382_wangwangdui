const assert = require('assert')
const metrics = require('../src/common/health_metrics')

let passed = 0

function test(name, callback) {
  callback()
  passed++
  console.log('通过 - ' + name)
}

test('心率区间边界', function () {
  assert.strictEqual(metrics.classifyHeartRate(59), 'rest')
  assert.strictEqual(metrics.classifyHeartRate(60), 'normal')
  assert.strictEqual(metrics.classifyHeartRate(99), 'normal')
  assert.strictEqual(metrics.classifyHeartRate(100), 'elevated')
  assert.strictEqual(metrics.classifyHeartRate(139), 'elevated')
  assert.strictEqual(metrics.classifyHeartRate(140), 'peak')
})

test('压力区间边界', function () {
  assert.strictEqual(metrics.classifyStress(29), 'relaxed')
  assert.strictEqual(metrics.classifyStress(30), 'normal')
  assert.strictEqual(metrics.classifyStress(60), 'elevated')
  assert.strictEqual(metrics.classifyStress(80), 'high')
})

test('滑动窗口保持固定长度', function () {
  assert.deepStrictEqual(metrics.pushWindow([1, 2, 3], 4, 3), [2, 3, 4])
  assert.deepStrictEqual(metrics.pushWindow([], 7, 3), [7])
})

test('统计最低平均最高', function () {
  assert.deepStrictEqual(metrics.stats([60, 70, 80]), { min: 60, avg: 70, max: 80 })
  assert.deepStrictEqual(metrics.stats([]), { min: 0, avg: 0, max: 0 })
})

test('自适应柱高保持起伏', function () {
  const heights = metrics.barHeights([80, 82, 84, 81], 4, 28, 8)
  assert.strictEqual(heights.length, 4)
  assert.ok(heights[2] > heights[1])
  assert.ok(heights[1] > heights[0])
  assert.ok(Math.max.apply(null, heights) - Math.min.apply(null, heights) >= 10)
})

test('格式化和错误码', function () {
  assert.strictEqual(metrics.formatValue(97.6, 'SPO2'), '98%')
  assert.strictEqual(metrics.formatValue(null, 'SPO2'), '--')
  assert.strictEqual(metrics.codeMessage(203), '设备暂不支持')
})

console.log('\n健康逻辑测试通过：' + passed + ' 项')
