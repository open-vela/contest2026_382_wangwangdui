const assert = require('assert')
const fs = require('fs')
const path = require('path')
const workoutView = require('../src/v2/design/views/workout')
const workoutDesign = require('../src/v2/design/specs/workout')
const workoutHistoryDesign = require('../src/v2/design/specs/workout_history')

const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')

const running = workoutView.project({
  type: 'run',
  status: 'running',
  durationMs: 65000,
  steps: 420,
  calories: 31,
  distanceMeters: 720,
  gpsDistanceMeters: 720,
  gpsStatus: 'active',
  currentHeartRate: 136
})

assert.strictEqual(running.statusText, '运动中')
assert.strictEqual(running.statusColor, '#30D158')
assert.strictEqual(running.durationText, '01:05')
assert.strictEqual(running.durationLabelText, '运动时长')
assert.strictEqual(running.heartRateText, '136')
assert.strictEqual(running.heartRateLabel, '心率 bpm')
assert.strictEqual(running.pauseButtonText, '暂停')
assert.strictEqual(running.metricOpacity, 1)

const paused = workoutView.project({
  type: 'walk',
  status: 'paused',
  durationMs: 125000,
  steps: 300,
  calories: 12,
  distanceMeters: 210,
  gpsDistanceMeters: 0,
  gpsStatus: 'paused',
  currentHeartRate: null
})

assert.strictEqual(paused.statusText, '已暂停')
assert.strictEqual(paused.statusColor, '#FFD60A')
assert.strictEqual(paused.durationLabelText, '已记录时长')
assert.strictEqual(paused.heartRateText, '--')
assert.strictEqual(paused.heartRateLabel, '等待心率')
assert.strictEqual(paused.pauseButtonText, '继续')
assert.strictEqual(paused.pauseButtonBackground, '#30D158')
assert.ok(paused.metricOpacity < 1)
assert.strictEqual(paused.gpsText, 'GPS 已暂停')

const state = read('src/domain/workout/state_machine.js')
const controller = read('src/v2/features/workout/controller.js')
const page = read('src/pages/workout/workout.ux')
const historyPage = read('src/pages/workout_history/workout_history.ux')

assert.ok(!state.includes('initialHeartRate'), 'Workout state must not fabricate a mode-based heart rate')
assert.ok(!state.includes('heartRateSpan'), 'Workout state must not fabricate a changing heart-rate waveform')
assert.ok(state.includes('updateHeartRate: function (value)'), 'Workout state must expose a semantic heart-rate update owned by the feature')
assert.ok(state.includes('currentHeartRate: null'), 'A new workout must wait for an official heart-rate sample')
assert.ok(state.includes('heartSamples: 0'), 'A new workout must not seed its heart-rate average with a fake sample')
assert.ok(state.includes("activeSession.heartSource = 'official'"), 'Official workout heart-rate provenance must survive persistence')
assert.ok(state.includes("if (activeSession.heartSource === 'official')"), 'Restored legacy sessions must not retain unproven heart-rate samples')
assert.ok(state.includes("heartSource: session.heartSamples > 0 && session.heartSource === 'official' ? 'official' : 'none'"), 'Saved workout records must preserve heart-rate provenance')

assert.ok(controller.includes("import heartRate from '../../../capabilities/heart_rate'"), 'Workout must consume the heart-rate capability')
assert.ok(controller.includes("!snapshot.live || snapshot.source !== 'live'"), 'Workout must reject fallback health samples')
assert.ok(controller.includes('heartRate.subscribe(onHeartRate)'), 'Workout must subscribe to heart rate while running')
assert.ok(controller.includes('heartRate.unsubscribe(onHeartRate)'), 'Workout must release heart rate while paused/hidden')

assert.ok(page.includes('class="status-chip"'), 'Workout status must be a visible product state, not plain helper text')
assert.ok(page.includes('background-color: {{ heroBackground }}'), 'Workout hero must visually distinguish running and paused states')
assert.ok(page.includes('opacity: {{ metricOpacity }}'), 'Paused workout metrics must visually de-emphasize frozen values')
assert.ok(page.includes('background-color: {{ pauseButtonBackground }}'), 'Resume action must have a state-specific visual treatment')
assert.ok(page.includes('{{ heartRateLabel }}'), 'Workout page must explain when official heart rate is still waiting')
assert.ok(page.includes('height: {{ durationLineHeight }}px; line-height: {{ durationLineHeight }}px;'), 'Workout timer must reserve an explicit glyph-safe line box')
assert.ok(page.includes('metric-card metric-right metric-bottom') && page.includes('metric-card metric-bottom'), 'Workout 2x2 metrics must only put horizontal gap on the left column')

const circleSafe = { left: 22, top: 10, width: 148, height: 172, bottom: 182 }
const circleScene = { width: 192, height: 192 }
const circlePlan = workoutDesign.resolve({ formFactor: 'circle' }, circleScene, circleSafe)
assert.deepStrictEqual(circlePlan.header, { left: 32, top: 24, width: 128, height: 18 })
assert.deepStrictEqual(circlePlan.hero, { left: 24, top: 45, width: 144, height: 48 })
assert.deepStrictEqual(circlePlan.metrics, { left: 30, top: 97, width: 132, height: 54 })
assert.strictEqual(circlePlan.metricItemWidth * 2 + circlePlan.metricGap, circlePlan.metrics.width, 'Circle metric row must exactly fit two cards plus one gap')
assert.strictEqual(circlePlan.durationLineHeight, 31, 'Circle timer must keep explicit vertical breathing room')
assert.deepStrictEqual(circlePlan.actions, { left: 42, top: 153, width: 108, height: 21 })

const circleHistory = workoutHistoryDesign.resolve({ formFactor: 'circle' }, circleScene, circleSafe)
assert.deepStrictEqual(circleHistory.header, { left: 32, top: 24, width: 128, height: 20 }, 'Circle history title must start in a wide enough round-screen chord')
assert.deepStrictEqual(circleHistory.summary, { left: 26, top: 49, width: 140, height: 38 })
assert.ok(historyPage.includes('height: {{ headerHeight }}px; line-height: {{ headerHeight }}px;'), 'Workout history title row must reserve a full glyph-safe line box')

console.log('Workout state experience verified: official heart rate plus distinct running/paused presentation and round-screen-safe composition')
