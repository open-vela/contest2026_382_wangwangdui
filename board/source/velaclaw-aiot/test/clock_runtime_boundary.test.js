const fs = require('fs')
const path = require('path')
const assert = require('assert')

const root = path.resolve(__dirname, '..')
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8') }

const clock = read('src/pages/clock/clock.ux')
const controller = read('src/runtime/power/controller.js')
const core = read('src/runtime/power/core.js')
const powerMapper = read('src/presentation/mappers/power.js')
const batteryMapper = read('src/presentation/mappers/battery.js')

assert.ok(clock.includes("../../runtime/power/controller"), 'clock must consume Power Runtime')
assert.ok(clock.includes("../../presentation/mappers/power"), 'clock power display must come from presentation mapper')
assert.ok(clock.includes("../../presentation/mappers/battery"), 'clock battery display must come from presentation mapper')
assert.ok(clock.includes('this.powerRuntime = powerRuntimeFactory.create'), 'clock must create one page-scoped Power Runtime')
assert.ok(/\.powerRuntime\.configure\s*\(\s*\{/.test(clock), 'device settings must configure runtime rather than restart page timers')
assert.ok(clock.includes('if (this.powerRuntime) this.powerRuntime.start()'), 'clock show/runtime start must activate Power Runtime')
assert.ok(clock.includes('if (this.powerRuntime) this.powerRuntime.stop()'), 'clock hide/destroy must stop Power Runtime')
assert.ok(clock.includes('this.powerRuntime.markActive(reason)'), 'user activity must be forwarded to runtime')
assert.ok(clock.includes('applyRuntimeHeartRate(sample)'), 'clock must consume semantic HR samples from runtime')
assert.ok(clock.includes('batteryMapper.map(percent)'), 'clock must map battery percent through presentation')

;[
  "from '@system.battery'",
  'health_sample_service',
  'power_manager',
  'startPowerControl',
  'stopPowerControl',
  'checkPowerIdle',
  'applyPowerMode',
  'startActiveTimers',
  'stopActiveTimers',
  'startWatchFaceHealth',
  'stopWatchFaceHealth',
  'setInterval('
].forEach(function (token) {
  assert.ok(!clock.includes(token), 'clock page must not regain runtime responsibility: ' + token)
})

assert.ok(controller.includes("import heartRate from '../../capabilities/heart_rate'"), 'runtime controller must use native ES import for heart-rate capability')
assert.ok(controller.includes("import battery from '../../capabilities/battery'"), 'runtime controller must use native ES import for battery capability')
assert.ok(controller.includes("import motion from '../../capabilities/motion'"), 'runtime controller must use native ES import for motion capability')
assert.ok(controller.includes("import displayPower from '../../capabilities/display_power'"), 'runtime controller must use native ES import for display capability')
assert.ok(controller.includes("var core = require('./core')"), 'controller must inject real capabilities into executable runtime core')
assert.ok(controller.includes('core.create({'), 'controller must construct core with explicit capability dependencies')
assert.ok(controller.includes('export default'), 'controller must expose an ES default export to Vela pages')

assert.ok(core.includes("../../domain/power/state_machine"), 'runtime core must orchestrate the Power state machine')
assert.ok(core.includes("../../domain/power/policy"), 'runtime core must consume power cadence policy')
assert.ok(core.includes('reconcileIdleTimer()'), 'runtime must stop idle polling when low power is disabled')
assert.ok(core.includes('brightnessChanged && currentMode === stateMachine.MODE_ACTIVE'), 'loaded active brightness must apply immediately')
assert.ok(core.includes("if (currentMode === stateMachine.MODE_ACTIVE) onHeartRate(sample, 'live')"), 'ACTIVE must publish health samples immediately')
assert.ok(core.includes("onHeartRate(latestHeartSample, 'cadence')"), 'DIM must publish buffered health through cadence')
assert.ok(!controller.includes('@system.') && !core.includes('@system.'), 'runtime must not access raw system APIs')
assert.ok(!controller.includes('@service.') && !core.includes('@service.'), 'runtime must not access raw services')

assert.ok(powerMapper.includes("label: '暗屏'"), 'power labels belong to presentation')
assert.ok(batteryMapper.includes("color = '#FF375F'"), 'battery thresholds/colors belong to presentation')

console.log('Clock runtime boundary verified: Vela page, capability injection and executable core stay separated')
