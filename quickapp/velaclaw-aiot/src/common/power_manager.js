import displayPower from '../capabilities/display_power'
import motion from '../capabilities/motion'
import powerState from '../domain/power/state_machine'
import powerPolicy from '../domain/power/policy'
import raiseWake from '../domain/power/raise_wake'
import powerMapper from '../presentation/mappers/power'

var raiseWakeCallback = null
var raiseDetector = raiseWake.create()

function handleAcceleration(data) {
  if (!raiseWakeCallback || !data) return
  if (raiseDetector.push(data, Date.now())) raiseWakeCallback()
}

export default {
  MODE_ACTIVE: powerState.MODE_ACTIVE,
  MODE_DIM: powerState.MODE_DIM,
  MODE_SLEEP: powerState.MODE_SLEEP,

  getModeByIdle: function (idleMs) {
    return powerState.modeForIdle(idleMs)
  },

  getRefreshConfig: function (mode) {
    return powerPolicy.get(mode)
  },

  getUiState: function (mode) {
    return powerMapper.map(mode)
  },

  applyMode: function (mode, activeBrightnessValue) {
    var config = powerPolicy.get(mode)
    var brightnessValue = config.brightness
    if (mode === powerState.MODE_ACTIVE && typeof activeBrightnessValue === 'number') brightnessValue = activeBrightnessValue
    displayPower.setBrightness(brightnessValue)
    displayPower.setKeepScreenOn(config.keepScreenOn)
  },

  startRaiseWake: function (callback) {
    raiseWakeCallback = callback
    raiseDetector.reset()
    return motion.subscribe(handleAcceleration)
  },

  stopRaiseWake: function () {
    raiseWakeCallback = null
    raiseDetector.reset()
    motion.unsubscribe(handleAcceleration)
    return true
  }
}
