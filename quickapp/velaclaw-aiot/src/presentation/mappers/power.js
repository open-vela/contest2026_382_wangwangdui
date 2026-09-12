var stateMachine = require('../../domain/power/state_machine')

function map(mode) {
  if (mode === stateMachine.MODE_DIM) {
    return { label: '暗屏', hint: '5秒刷新', color: '#FFD60A', dimVisible: true, sleepVisible: false }
  }
  if (mode === stateMachine.MODE_SLEEP) {
    return { label: '息屏', hint: '低频保活', color: '#8E8E93', dimVisible: false, sleepVisible: true }
  }
  return { label: '亮屏', hint: '1秒刷新', color: '#30D158', dimVisible: false, sleepVisible: false }
}

module.exports = { map: map }
