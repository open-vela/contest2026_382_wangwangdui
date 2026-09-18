var stateMachine = require('./state_machine')

var POLICIES = {}
POLICIES[stateMachine.MODE_ACTIVE] = {
  brightness: 210,
  keepScreenOn: true,
  timeInterval: 1000,
  heartInterval: 3000,
  batteryInterval: 60000,
  healthEnabled: true
}
POLICIES[stateMachine.MODE_DIM] = {
  brightness: 60,
  keepScreenOn: true,
  timeInterval: 5000,
  heartInterval: 30000,
  batteryInterval: 120000,
  healthEnabled: true
}
POLICIES[stateMachine.MODE_SLEEP] = {
  brightness: 8,
  keepScreenOn: false,
  timeInterval: 60000,
  heartInterval: 0,
  batteryInterval: 0,
  healthEnabled: false
}

function get(mode) {
  return POLICIES[mode] || POLICIES[stateMachine.MODE_ACTIVE]
}

module.exports = {
  get: get
}
