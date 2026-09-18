const safeArea = require('../src/common/safe_area')
const layoutAdapter = require('../src/presentation/layout/adapter')
const pagedStack = require('../src/presentation/layout/paged_stack')
const scrollFlow = require('../src/presentation/layout/scroll_flow')
const workoutLayout = require('../src/presentation/layout/specs/workout')
const settingsLayout = require('../src/presentation/layout/specs/settings')
const diagnosticsLayout = require('../src/presentation/layout/specs/diagnostics')
const workoutHistoryLayout = require('../src/presentation/layout/specs/workout_history')
const workoutSelectLayout = require('../src/presentation/layout/specs/workout_select')
const stepsLayout = require('../src/presentation/layout/specs/steps')

const errors = []
const circleProfile = { formFactor: 'circle', logicalHeight: 192 }

function requirePlan(name, plan) {
  if (plan.needsOverride || (plan.violations && plan.violations.length)) {
    errors.push(name + ' 未通过圆屏安全几何：' + JSON.stringify(plan.violations || []))
  }
}

requirePlan('Workout L2', layoutAdapter.resolve(circleProfile, workoutLayout))

const settingsPlan = pagedStack.resolve(circleProfile, settingsLayout)
requirePlan('Settings L1 Paged', settingsPlan)
if (settingsPlan.pageSize !== 2) errors.push('Settings L1 圆屏应自动收敛为 2 项/页，实际=' + settingsPlan.pageSize)

requirePlan('Diagnostics L1', layoutAdapter.resolve(circleProfile, diagnosticsLayout))

const workoutHistoryPlan = scrollFlow.resolve(circleProfile, workoutHistoryLayout)
requirePlan('Workout History L1 Scroll Flow', workoutHistoryPlan)
if (!workoutHistoryPlan.stream || workoutHistoryPlan.stream.viewportHeight < 50) {
  errors.push('Workout History L1 圆屏必须保留至少 50px 可滚动视口')
}

const workoutSelectPlan = scrollFlow.resolve(circleProfile, workoutSelectLayout)
requirePlan('Workout Select L1 Scroll Flow', workoutSelectPlan)
if (!workoutSelectPlan.stream || workoutSelectPlan.stream.viewportHeight < 70) {
  errors.push('Workout Select L1 圆屏必须保留至少 70px 运动模式滚动视口')
}

const stepsPlan = scrollFlow.resolve(circleProfile, stepsLayout)
requirePlan('Steps L1 Scroll Flow', stepsPlan)
if (!stepsPlan.stream || stepsPlan.stream.viewportHeight < 60) {
  errors.push('Steps L1 圆屏必须保留至少 60px 指标滚动视口')
}

// Today is an L2 art-directed surface. Both circle pages intentionally share this band.
if (!safeArea.fitsInCircle(192, 28, 31, 136, 130)) {
  errors.push('Today L2 圆屏 136×130 art-directed surface 已超出安全带')
}

if (safeArea.capsuleCapInset(192, 168) !== 50) {
  errors.push('胶囊端帽推导偏离真机校准值 50px，请同步复核 test/safe_area.test.js')
}
if (safeArea.inscribedSquare(192) !== 135) {
  errors.push('圆屏内接正方形不再是 135px，蜂巢画布尺寸需要重新推导')
}

if (errors.length) {
  errors.forEach(function (error) { console.error('safe-area error: ' + error) })
  process.exitCode = 1
} else {
  console.log('Checked Design Engine safety contracts; no legacy CSS safe-area parser remains')
}
