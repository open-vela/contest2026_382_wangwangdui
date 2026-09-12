const assert = require('assert')
const metrics = require('../src/domain/health/metrics')
const healthView = require('../src/v2/design/apps/heart/view')

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

test('健康展示只由 V2.3 Heart View 投影官方来源模型', function () {
  const view = healthView.project({
    heartRate: 105,
    spo2: 93,
    stress: 82,
    heartZone: 'elevated',
    spo2Zone: 'attention',
    stressZone: 'high',
    dailyMin: 58,
    dailyMax: 112,
    stressMin: 20,
    stressAvg: 45,
    stressMax: 82,
    heartSource: { live: true, errorCode: 0, mode: 'live' },
    spo2Source: { live: false, errorCode: 203, mode: 'fallback' },
    stressSource: { live: false, errorCode: 1, mode: 'fallback' },
    anyLive: true,
    serviceAvailable: true,
    updatedAt: new Date(2026, 0, 2, 8, 5, 0).getTime(),
    heartValues: [70, 80, 100],
    spo2Values: [96, 97, 98],
    stressValues: [20, 40, 80]
  }, { chartHeight: 30 })

  assert.strictEqual(view.heartStatus, '偏高')
  assert.strictEqual(view.spo2Status, '请关注')
  assert.strictEqual(view.stressStatus, '较高')
  assert.strictEqual(view.heartSource, '系统')
  assert.strictEqual(view.spo2Source, '不支持')
  assert.strictEqual(view.stressSource, '异常')
  assert.strictEqual(view.sourceText, '系统健康数据')
  assert.strictEqual(view.updatedAtText, '08:05')
  assert.strictEqual(view.heartBars.length, 3)
  assert.strictEqual(view.heartBars[2].height, 30)
  assert.ok(view.heartBars[1].height > view.heartBars[0].height)
})

console.log('\n健康 Domain / Design View 测试通过：' + passed + ' 项')
