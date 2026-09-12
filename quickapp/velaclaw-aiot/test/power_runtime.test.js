const assert = require('assert')
const powerRuntimeCore = require('../src/runtime/power/core')

let clock = 1000
let nextTimerId = 1
const timers = {}
const displayCalls = []
const heartEvents = []
const wakeEvents = []
let heartListener = null
let heartSubscribeCount = 0
let heartUnsubscribeCount = 0
let motionListener = null
let motionSubscribeCount = 0
let motionUnsubscribeCount = 0
let batteryReads = 0
const modes = []

function schedule(callback, interval) {
  const id = nextTimerId++
  timers[id] = { callback: callback, interval: interval, active: true }
  return id
}

function cancel(id) {
  if (timers[id]) timers[id].active = false
}

function runActiveTimer(interval) {
  const ids = Object.keys(timers)
  for (let i = ids.length - 1; i >= 0; i--) {
    const timer = timers[ids[i]]
    if (timer.active && timer.interval === interval) {
      timer.callback()
      return true
    }
  }
  return false
}

const runtime = powerRuntimeCore.create({
  now: function () { return clock },
  setInterval: schedule,
  clearInterval: cancel,
  displayPower: {
    setBrightness: function (value) { displayCalls.push(['brightness', value]) },
    setKeepScreenOn: function (value) { displayCalls.push(['keep', value]) }
  },
  heartRate: {
    getSnapshot: function () { return { value: 88, updatedAt: 900, live: false } },
    subscribe: function (listener) {
      heartSubscribeCount++
      heartListener = listener
      listener({ value: 88, updatedAt: clock, live: false })
    },
    unsubscribe: function (listener) {
      heartUnsubscribeCount++
      if (heartListener === listener) heartListener = null
    }
  },
  motion: {
    subscribe: function (listener) {
      motionSubscribeCount++
      motionListener = listener
      return true
    },
    unsubscribe: function (listener) {
      motionUnsubscribeCount++
      if (motionListener === listener) motionListener = null
    }
  },
  battery: {
    get: function (callback) {
      batteryReads++
      callback(73)
    }
  }
}, {
  activeBrightnessValue: 140,
  onMode: function (mode) { modes.push(mode) },
  onHeartRate: function (sample, source) { heartEvents.push([sample.value, source]) },
  onWake: function (reason) { wakeEvents.push(reason) }
})

runtime.start()
assert.strictEqual(runtime.getMode(), 'ACTIVE', 'runtime must start ACTIVE')
assert.strictEqual(heartSubscribeCount, 1, 'ACTIVE start must subscribe heart rate exactly once')
assert.strictEqual(motionSubscribeCount, 1, 'raise wake must register once')
assert.strictEqual(batteryReads, 1, 'runtime start must read battery once')
assert.strictEqual(runtime.getSnapshot().idleTimerActive, true, 'low-power runtime must start idle evaluation')
assert.ok(displayCalls.some(function (call) { return call[0] === 'brightness' && call[1] === 140 }), 'ACTIVE must apply configured brightness')

heartListener({ value: 91, updatedAt: 1100, live: true })
assert.deepStrictEqual(heartEvents[heartEvents.length - 1], [91, 'live'], 'ACTIVE must publish live heart samples immediately')

// Raw accelerometer samples are not wake events. Ordinary movement must not
// continuously reset lastActiveAt and prevent the idle state machine from firing.
clock = 2000
motionListener({ x: 0, y: 0, z: 0 })
clock = 2200
motionListener({ x: 0.2, y: 0.1, z: 0 })
assert.strictEqual(wakeEvents.length, 0, 'ordinary accelerometer samples must not be promoted to raise-wake events')

clock = 9000
runtime.evaluateIdle()
assert.strictEqual(runtime.getMode(), 'DIM', '8 seconds idle must enter DIM even while motion sampling is active')
assert.strictEqual(heartUnsubscribeCount, 0, 'DIM must keep health subscribed')
const beforeDimSample = heartEvents.length
heartListener({ value: 96, updatedAt: 9100, live: true })
assert.strictEqual(heartEvents.length, beforeDimSample, 'DIM must buffer raw heart samples instead of publishing at raw cadence')
assert.strictEqual(runActiveTimer(30000), true, 'DIM must own a 30s heart business timer')
assert.deepStrictEqual(heartEvents[heartEvents.length - 1], [96, 'cadence'], 'DIM cadence must publish the latest buffered heart sample')

clock = 16000
runtime.evaluateIdle()
assert.strictEqual(runtime.getMode(), 'SLEEP', '15 seconds idle must enter SLEEP')
assert.strictEqual(heartUnsubscribeCount, 1, 'SLEEP must release heart sampling')
assert.strictEqual(runtime.getSnapshot().healthActive, false, 'SLEEP health state must be inactive')

// A real raise gesture is a semantic decision: establish a baseline then move
// far enough to cross the preserved delta threshold after the cooldown.
clock = 16100
motionListener({ x: 0.2, y: 0.1, z: 0 })
clock = 16300
motionListener({ x: 6.5, y: 0.1, z: 0 })
assert.strictEqual(runtime.getMode(), 'ACTIVE', 'semantic raise gesture must wake SLEEP back to ACTIVE')
assert.strictEqual(wakeEvents.length, 1, 'raise detector must emit exactly one wake event')
assert.strictEqual(heartSubscribeCount, 2, 'wake from SLEEP must restore heart subscription exactly once')

runtime.configure({ lowPowerEnabled: false, activeBrightnessValue: 180 })
assert.strictEqual(runtime.getSnapshot().idleTimerActive, false, 'disabling low power must remove idle polling')
assert.ok(displayCalls.some(function (call) { return call[0] === 'brightness' && call[1] === 180 }), 'ACTIVE brightness changes must apply immediately')

runtime.stop()
assert.strictEqual(heartUnsubscribeCount, 2, 'stop must release the restored heart subscription')
assert.strictEqual(motionUnsubscribeCount, 1, 'stop must release raise-wake consumer')
assert.strictEqual(runtime.getSnapshot().mainTimerActive, false, 'stop must clear main cadence')
assert.strictEqual(runtime.getSnapshot().heartTimerActive, false, 'stop must clear heart cadence')
assert.ok(modes.indexOf('DIM') >= 0 && modes.indexOf('SLEEP') >= 0, 'mode callbacks must expose DIM and SLEEP transitions')

console.log('Power Runtime executed: raw motion is filtered, ACTIVE/DIM/SLEEP works, and HR cadence is preserved')
