var stateMachine = require('../../domain/power/state_machine')
var powerPolicy = require('../../domain/power/policy')
var raiseWake = require('../../domain/power/raise_wake')

function noop() {}

function create(dependencies, options) {
  var deps = dependencies || {}
  var config = options || {}
  var displayPower = deps.displayPower
  var motion = deps.motion
  var heartRate = deps.heartRate
  var battery = deps.battery
  var now = typeof deps.now === 'function' ? deps.now : Date.now
  var schedule = typeof deps.setInterval === 'function' ? deps.setInterval : setInterval
  var cancel = typeof deps.clearInterval === 'function' ? deps.clearInterval : clearInterval

  var machine = stateMachine.create(now())
  var raiseDetector = raiseWake.create()
  var started = false
  var idleTimer = null
  var mainTimer = null
  var heartTimer = null
  var healthActive = false
  var raiseWakeRegistered = false
  var latestHeartSample = null
  var currentMode = stateMachine.MODE_ACTIVE
  var lowPowerEnabled = config.lowPowerEnabled !== false
  var raiseWakeEnabled = config.raiseWakeEnabled !== false
  var activeBrightnessValue = typeof config.activeBrightnessValue === 'number' ? config.activeBrightnessValue : 140

  var onMode = typeof config.onMode === 'function' ? config.onMode : noop
  var onTime = typeof config.onTime === 'function' ? config.onTime : noop
  var onHeartRate = typeof config.onHeartRate === 'function' ? config.onHeartRate : noop
  var onBattery = typeof config.onBattery === 'function' ? config.onBattery : noop
  var onWake = typeof config.onWake === 'function' ? config.onWake : noop

  function clearTimer(timer) {
    if (timer !== null && timer !== undefined) cancel(timer)
    return null
  }

  function applyDisplay(mode) {
    var policy = powerPolicy.get(mode)
    var brightness = policy.brightness
    if (mode === stateMachine.MODE_ACTIVE && typeof activeBrightnessValue === 'number') brightness = activeBrightnessValue
    if (displayPower && displayPower.setBrightness) displayPower.setBrightness(brightness)
    if (displayPower && displayPower.setKeepScreenOn) displayPower.setKeepScreenOn(policy.keepScreenOn)
  }

  function handleHeartSample(sample) {
    latestHeartSample = sample
    // Golden Reference: ACTIVE publishes raw samples immediately. DIM buffers
    // samples and only publishes through the lower-frequency business cadence.
    if (currentMode === stateMachine.MODE_ACTIVE) onHeartRate(sample, 'live')
  }

  function startHealth() {
    if (healthActive || !heartRate || !heartRate.subscribe) return
    healthActive = true
    heartRate.subscribe(handleHeartSample)
  }

  function stopHealth() {
    if (!healthActive) return
    if (heartRate && heartRate.unsubscribe) heartRate.unsubscribe(handleHeartSample)
    healthActive = false
  }

  function refreshHealthPolicy(mode) {
    if (powerPolicy.get(mode).healthEnabled) startHealth()
    else stopHealth()
  }

  function readBattery() {
    if (!battery || !battery.get) return
    battery.get(function (percent) { onBattery(percent) })
  }

  function restartCadence(mode) {
    mainTimer = clearTimer(mainTimer)
    heartTimer = clearTimer(heartTimer)
    var policy = powerPolicy.get(mode)
    var lastBatteryAt = 0

    if (policy.timeInterval > 0) {
      mainTimer = schedule(function () {
        var time = now()
        onTime(time)
        if (policy.batteryInterval > 0 && time - lastBatteryAt >= policy.batteryInterval) {
          readBattery()
          lastBatteryAt = time
        }
      }, policy.timeInterval)
    }

    if (policy.heartInterval > 0) {
      heartTimer = schedule(function () {
        if (latestHeartSample) onHeartRate(latestHeartSample, 'cadence')
      }, policy.heartInterval)
    }
  }

  function applyMode(mode, reason) {
    if (!started) return currentMode
    if (mode !== stateMachine.MODE_ACTIVE && mode !== stateMachine.MODE_DIM && mode !== stateMachine.MODE_SLEEP) mode = stateMachine.MODE_ACTIVE
    var changed = mode !== currentMode
    currentMode = mode
    applyDisplay(mode)
    refreshHealthPolicy(mode)
    if (changed || mainTimer === null) restartCadence(mode)
    onMode(mode, powerPolicy.get(mode), reason || 'transition')
    return currentMode
  }

  function evaluateIdle() {
    if (!started || !lowPowerEnabled) return
    var snapshot = machine.evaluate(now())
    if (snapshot.mode !== currentMode) applyMode(snapshot.mode, snapshot.reason)
  }

  function markActive(reason) {
    if (!started) return currentMode
    var snapshot = machine.markActive(reason || 'activity', now())
    if (snapshot.mode !== currentMode) applyMode(snapshot.mode, reason || 'activity')
    return currentMode
  }

  function handleMotionSample(sample) {
    if (!started || !raiseWakeEnabled || !lowPowerEnabled) return
    if (!raiseDetector.push(sample, now())) return
    markActive('raise-wake')
    onWake('raise-wake')
  }

  function reconcileRaiseWake() {
    var shouldRegister = started && lowPowerEnabled && raiseWakeEnabled
    if (!shouldRegister) {
      if (raiseWakeRegistered && motion && motion.unsubscribe) motion.unsubscribe(handleMotionSample)
      raiseWakeRegistered = false
      raiseDetector.reset()
      return
    }
    if (!raiseWakeRegistered && motion && motion.subscribe) {
      // Motion capability emits raw acceleration. The semantic detector decides
      // whether a sample sequence is actually a raise-to-wake gesture.
      motion.subscribe(handleMotionSample, { interval: 'normal' })
      raiseWakeRegistered = true
      raiseDetector.reset()
    }
  }

  function reconcileIdleTimer() {
    idleTimer = clearTimer(idleTimer)
    if (started && lowPowerEnabled) idleTimer = schedule(evaluateIdle, 1000)
  }

  function start() {
    if (started) return
    started = true
    machine = stateMachine.create(now())
    raiseDetector.reset()
    currentMode = stateMachine.MODE_ACTIVE
    latestHeartSample = heartRate && heartRate.getSnapshot ? heartRate.getSnapshot() : null
    applyMode(stateMachine.MODE_ACTIVE, 'start')
    onTime(now())
    readBattery()
    reconcileRaiseWake()
    reconcileIdleTimer()
  }

  function stop() {
    if (!started) return
    started = false
    idleTimer = clearTimer(idleTimer)
    mainTimer = clearTimer(mainTimer)
    heartTimer = clearTimer(heartTimer)
    if (raiseWakeRegistered && motion && motion.unsubscribe) motion.unsubscribe(handleMotionSample)
    raiseWakeRegistered = false
    raiseDetector.reset()
    stopHealth()
    if (displayPower && displayPower.setBrightness) displayPower.setBrightness(activeBrightnessValue)
    if (displayPower && displayPower.setKeepScreenOn) displayPower.setKeepScreenOn(true)
    currentMode = stateMachine.MODE_ACTIVE
  }

  function configure(next) {
    var value = next || {}
    var brightnessChanged = typeof value.activeBrightnessValue === 'number' && value.activeBrightnessValue !== activeBrightnessValue
    if (value.lowPowerEnabled !== undefined) lowPowerEnabled = value.lowPowerEnabled !== false
    if (value.raiseWakeEnabled !== undefined) raiseWakeEnabled = value.raiseWakeEnabled !== false
    if (typeof value.activeBrightnessValue === 'number') activeBrightnessValue = value.activeBrightnessValue

    if (!started) return
    reconcileRaiseWake()
    reconcileIdleTimer()
    if (!lowPowerEnabled) {
      machine.markActive('low-power-disabled', now())
      applyMode(stateMachine.MODE_ACTIVE, 'low-power-disabled')
    } else {
      evaluateIdle()
    }
    if (brightnessChanged && currentMode === stateMachine.MODE_ACTIVE) applyDisplay(currentMode)
  }

  return {
    start: start,
    stop: stop,
    configure: configure,
    markActive: markActive,
    evaluateIdle: evaluateIdle,
    forceMode: function (mode, reason) {
      machine.force(mode, reason || 'force', now())
      return applyMode(mode, reason || 'force')
    },
    getMode: function () { return currentMode },
    getSnapshot: function () {
      return {
        started: started,
        mode: currentMode,
        policy: powerPolicy.get(currentMode),
        lowPowerEnabled: lowPowerEnabled,
        raiseWakeEnabled: raiseWakeEnabled,
        healthActive: healthActive,
        raiseWakeActive: raiseWakeRegistered,
        idleTimerActive: idleTimer !== null,
        mainTimerActive: mainTimer !== null,
        heartTimerActive: heartTimer !== null
      }
    }
  }
}

module.exports = { create: create }
