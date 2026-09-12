const assert = require('assert')
const fs = require('fs')
const path = require('path')

const activityView = require('../src/v2/design/views/activity')
const motionView = require('../src/v2/design/views/motion')
const syncView = require('../src/v2/design/views/sync')
const notificationView = require('../src/v2/design/views/notification')
const vibrationView = require('../src/v2/design/views/settings_vibration')
const historyView = require('../src/v2/design/views/history')

const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')

let passed = 0
function test(name, callback) { callback(); passed++; console.log('通过 - ' + name) }

test('Activity View 独占名称、单位、格式和真实目标进度投影', function () {
  const view = activityView.present([
    { id: 'steps', current: 12345, goal: 6000 },
    { id: 'calories', current: 180, goal: 300 }
  ], 120)
  assert.strictEqual(view[0].name, '步数')
  assert.strictEqual(view[0].unit, '步')
  assert.strictEqual(view[0].current, '12,345')
  assert.strictEqual(view[0].progressText, '206%')
  assert.strictEqual(view[0].progressWidth, 120)
  assert.strictEqual(view[0].goalText, '目标 6,000 步')
  assert.strictEqual(view[0].statusText, '超额 6,345')
  assert.strictEqual(view[0].isComplete, true)
  assert.ok(!Object.prototype.hasOwnProperty.call(view[0], 'bars'))
  assert.strictEqual(view[1].name, '卡路里')
  assert.strictEqual(view[1].unit, 'kcal')
  assert.strictEqual(view[1].progressText, '60%')
  assert.strictEqual(view[1].progressWidth, 72)
  assert.strictEqual(view[1].statusText, '还差 120')
})

test('Activity 未设置目标时不伪造进度', function () {
  const view = activityView.present([{ id: 'stand', current: 5, goal: 0 }], 100)
  assert.strictEqual(view[0].progressText, '--')
  assert.strictEqual(view[0].progressWidth, 0)
  assert.strictEqual(view[0].goalText, '未设置目标')
  assert.strictEqual(view[0].statusText, '等待目标')
})

test('Motion View 独占数值格式、强度文案和倒计时展示', function () {
  const view = motionView.project({
    sensorActive: true,
    sensorStatus: 'streaming',
    x: 1.234,
    y: -2,
    z: 0,
    magnitude: 3.456,
    score: 5.2,
    sampleCount: 12,
    intensityKey: 'medium',
    measureActive: true,
    measurePhase: 'measuring',
    measureIntensityKey: 'stable',
    measurePeak: 7.123,
    remainingMs: 1450
  })
  assert.strictEqual(view.xText, '1.23')
  assert.strictEqual(view.magnitudeText, '3.46')
  assert.ok(view.sampleText.includes('中等'))
  assert.strictEqual(view.countdownText, '1.4')
  assert.strictEqual(view.actionPeakText, '7.12')
})

test('Motion 完成态只由 semantic intensity key 投影', function () {
  const view = motionView.project({ measurePhase: 'complete', measureIntensityKey: 'strong', measurePeak: 9 })
  assert.strictEqual(view.actionResult, '强烈')
  assert.strictEqual(view.actionColor, '#FF453A')
  assert.strictEqual(view.measureButtonText, '再次测量')
})

test('Sync View 独占进度百分比、阶段文案和数据单位', function () {
  const view = syncView.project({
    connected: true,
    phase: 'sending',
    progress: 47.6,
    ackSent: 4,
    ackTotal: 9,
    transportMode: 'mock',
    todaySteps: 12345,
    historyCount: 7,
    workoutCount: 2,
    packetCount: 9,
    payloadChars: 860
  })
  assert.strictEqual(view.statusText, '已连接')
  assert.strictEqual(view.syncPercent, 48)
  assert.strictEqual(view.syncWidth, '48%')
  assert.strictEqual(view.syncMessage, '已确认 4/9 包')
  assert.strictEqual(view.todayStepsText, '12,345 步')
  assert.strictEqual(view.packetText, '9 包 · 860 字符')
})

test('Sync 时间格式属于 View，Domain 只需要 timestamp', function () {
  const timestamp = new Date(2026, 0, 2, 8, 5, 0).getTime()
  assert.strictEqual(syncView.timeText(0), '未同步')
  assert.strictEqual(syncView.timeText(timestamp), '08:05')
})

test('Notification 默认标题、图标和挂断色只由 Design View 提供', function () {
  const call = notificationView.project({ visible: true, type: 'call', hangUp: true })
  assert.strictEqual(call.appName, '电话')
  assert.strictEqual(call.appIcon, '/common/logo.png')
  assert.strictEqual(call.contact, '未知来电')
  assert.strictEqual(call.hangUpColor, '#777777')
  const app = notificationView.project({ visible: true, type: 'app' })
  assert.strictEqual(app.appName, '通知')
})

test('Vibration pattern 中文名称只存在于 Design View', function () {
  const view = vibrationView.project({
    enabled: true,
    level: 'strong',
    pattern: 'countdown',
    feedbackCode: 'played',
    systemMode: 1,
    capabilityAvailable: true
  })
  assert.strictEqual(view.levelText, '强')
  assert.strictEqual(view.patternText, '倒计时')
  assert.strictEqual(view.feedbackText, '倒计时 · 已播放')
})

test('Trend View 保留七日趋势但不再投影每日记录列表', function () {
  const view = historyView.project({
    todaySteps: 6000,
    avgSteps: 5400,
    bestSteps: 7200,
    bestDate: '2026-09-03',
    avgHeartRate: 76,
    goalPercent: 100,
    records: [
      { date: '2026-09-02', steps: 4800 },
      { date: '2026-09-03', steps: 7200 }
    ]
  }, { chartHeight: 52 })
  assert.strictEqual(view.bars.length, 2)
  assert.strictEqual(view.bestDayText, '09/03')
  assert.ok(!Object.prototype.hasOwnProperty.call(view, 'records'))
})

test('Pill History L2 使用纵向比较行并保留完整步数', function () {
  const view = historyView.project({
    todaySteps: 10000,
    avgSteps: 7500,
    bestSteps: 10000,
    bestDate: '2026-09-04',
    avgHeartRate: 76,
    goalPercent: 82,
    records: [
      { date: '2026-09-03', steps: 5000 },
      { date: '2026-09-04', steps: 10000 }
    ]
  }, { chartHeight: 10, pillTrendMinWidth: 14, pillTrendMaxWidth: 70 })
  assert.strictEqual(view.bars[0].stepsText, '5,000')
  assert.strictEqual(view.bars[0].pillWidth, 42)
  assert.strictEqual(view.bars[1].stepsText, '10,000')
  assert.strictEqual(view.bars[1].pillWidth, 70)
  assert.strictEqual(view.bars[1].pillLabel, '今天')
  assert.strictEqual(view.bars[1].color, '#FFD60A')
})

test('对应 Feature 不重复生成展示格式', function () {
  const activityFeature = read('src/v2/features/activity/controller.js')
  const motionFeature = read('src/v2/features/settings/motion_controller.js')
  const syncFeature = read('src/v2/features/sync/controller.js')
  const vibrationFeature = read('src/v2/features/settings/vibration_controller.js')
  const notificationFeature = read('src/v2/features/notification/controller.js')
  const hapticDomain = read('src/domain/haptics/patterns.js')
  const notificationDomain = read('src/domain/notification/factory.js')

  assert.ok(!activityFeature.includes("name: '步数'") && !activityFeature.includes('unit:') && !activityFeature.includes('progressText') && !activityFeature.includes('#FFD60A'))
  assert.ok(!motionFeature.includes('.toFixed(') && !motionFeature.includes('强烈') && !motionFeature.includes('轻微'))
  assert.ok(!syncFeature.includes("+ '%'") && !syncFeature.includes('已连接') && !syncFeature.includes('未同步'))
  assert.ok(!vibrationFeature.includes('倒计时') && !vibrationFeature.includes('已播放'))
  assert.ok(!notificationFeature.includes('/common/logo.png') && !notificationFeature.includes('#777777'))
  assert.ok(!hapticDomain.includes('label:') && !hapticDomain.includes('轻触') && !hapticDomain.includes('达标'))
  assert.ok(!notificationDomain.includes('/common/logo.png') && !notificationDomain.includes("type === 'call' ? '电话'"))
})

console.log('V2 Design View ownership 测试通过：' + passed + ' 项')
