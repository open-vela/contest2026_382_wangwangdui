const fs = require('fs')
const path = require('path')
const assert = require('assert')

const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const manifest = JSON.parse(read('src/manifest.json'))

function hasRawDeviceApi(source) {
  return [
    '@system.battery', '@system.brightness', '@system.device', '@system.event',
    '@system.geolocation', '@system.interconnect', '@system.sensor', '@system.storage',
    '@system.vibrator', '@service.health'
  ].some(token => source.includes(token))
}

const healthChannel = read('src/capabilities/internal/health_channel.js')
const heart = read('src/capabilities/heart_rate.js')
const spo2 = read('src/capabilities/blood_oxygen.js')
const stress = read('src/capabilities/stress.js')
const motion = read('src/capabilities/motion.js')
const location = read('src/capabilities/location.js')
const device = read('src/capabilities/device.js')
const battery = read('src/capabilities/battery.js')
const displayPower = read('src/capabilities/display_power.js')
const vibration = read('src/capabilities/vibration.js')
const storage = read('src/capabilities/storage.js')
const systemEvent = read('src/capabilities/system_event.js')
const interconnect = read('src/capabilities/interconnect.js')
const introspection = read('src/capabilities/introspection.js')

assert.ok(healthChannel.includes("from '@service.health'"), 'health raw API must be isolated in capability runtime')
assert.ok(healthChannel.includes('listeners.length === 1') && healthChannel.includes('listeners.length === 0'), 'health gateway must be demand-driven')
assert.ok(heart.includes("dataTypeName: 'HEART_RATE'"), 'heart rate must be independently triggerable')
assert.ok(spo2.includes("dataTypeName: 'SPO2'"), 'SpO2 must be independently triggerable')
assert.ok(stress.includes("dataTypeName: 'STRESS'"), 'stress must be independently triggerable')
assert.ok(motion.includes("from '@system.sensor'"), 'motion gateway must own accelerometer API')
assert.ok(location.includes("from '@system.geolocation'"), 'location gateway must own geolocation API')
assert.ok(device.includes("from '@system.device'"), 'device gateway must own device API')
assert.ok(battery.includes("from '@system.battery'"), 'battery gateway must own battery API')
assert.ok(displayPower.includes("from '@system.brightness'"), 'display gateway must own brightness API')
assert.ok(vibration.includes("from '@system.vibrator'"), 'vibration gateway must own vibrator API')
assert.ok(storage.includes("from '@system.storage'"), 'storage gateway must own storage API')
assert.ok(systemEvent.includes("from '@system.event'"), 'event gateway must own system event API')
assert.ok(interconnect.includes("from '@system.interconnect'"), 'interconnect gateway must own interconnect API')

assert.ok(!hasRawDeviceApi(introspection), 'capability introspection must compose gateways without probing native APIs')
assert.ok(introspection.includes("import motion from './motion'"), 'introspection must consume motion gateway')
assert.ok(introspection.includes("import systemEvent from './system_event'"), 'introspection must consume event gateway')

const powerRuntime = read('src/runtime/power/controller.js')
assert.ok(powerRuntime.includes("../../capabilities/display_power"), 'Power Runtime must use display gateway')
assert.ok(powerRuntime.includes("../../capabilities/motion"), 'Power Runtime must use motion gateway')
assert.ok(powerRuntime.includes("../../capabilities/heart_rate"), 'Power Runtime must use heart-rate gateway')
assert.ok(powerRuntime.includes("../../capabilities/battery"), 'Power Runtime must use battery gateway')
assert.ok(!hasRawDeviceApi(powerRuntime), 'Power Runtime must never regress to raw device APIs')

const brightnessFeature = read('src/v2/features/settings/brightness_controller.js')
const motionFeature = read('src/v2/features/settings/motion_controller.js')
const diagnosticsFeature = read('src/v2/features/settings/diagnostics_controller.js')
const workoutFeature = read('src/v2/features/workout/controller.js')
const notificationFeature = read('src/v2/features/notification/controller.js')
const deviceProfile = read('src/v2/system/device_profile.js')

assert.ok(brightnessFeature.includes("../../../capabilities/display_power"), 'brightness Feature must use display gateway')
assert.ok(motionFeature.includes("../../../capabilities/motion"), 'motion Feature must use motion gateway')
assert.ok(diagnosticsFeature.includes("../../../capabilities/introspection"), 'diagnostics Feature must use capability introspection')
assert.ok(workoutFeature.includes("../../../capabilities/location"), 'workout Feature must use location gateway')
assert.ok(notificationFeature.includes("../../../capabilities/system_event") && notificationFeature.includes("../../../capabilities/interconnect"), 'notification Feature must use event/interconnect gateways')
assert.ok(deviceProfile.includes("../../capabilities/device"), 'V2 device profile must use device gateway')
;[brightnessFeature, motionFeature, diagnosticsFeature, workoutFeature, notificationFeature, deviceProfile].forEach(source => assert.ok(!hasRawDeviceApi(source), 'V2 application layers must not bypass capability gateways'))

Object.keys(manifest.router.pages || {}).forEach(route => {
  const page = manifest.router.pages[route]
  const source = read(path.join('src', route, page.component + '.ux'))
  assert.ok(!source.includes('/capabilities/'), route + ' Page must not depend on Capability directly')
  assert.ok(!hasRawDeviceApi(source), route + ' Page must not access raw device APIs')
  assert.ok(!source.includes('@system.router'), route + ' Page must delegate navigation to V2 app runtime')
})

const navigation = read('src/v2/app/navigation.js')
assert.ok(navigation.includes("from '@system.router'"), 'V2 navigation must be the sole router framework boundary')

console.log('Capability Runtime verified: raw Vela APIs stay in gateways and Pages stay capability-free')
