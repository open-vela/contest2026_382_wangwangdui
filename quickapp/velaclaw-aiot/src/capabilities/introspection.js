import motion from './motion'
import heartRate from './heart_rate'
import vibration from './vibration'
import battery from './battery'
import displayPower from './display_power'
import systemEvent from './system_event'
import interconnect from './interconnect'
import storage from './storage'

function entry(id, name, api, available, fallback) {
  return {
    id: id,
    name: name,
    api: api,
    available: !!available,
    fallback: !!fallback
  }
}

export default {
  list: function () {
    return [
      entry('motion', '加速度计', 'motion.subscribe', motion.isAvailable()),
      entry('health', '健康服务', 'heartRate.subscribe', heartRate.isAvailable(), true),
      entry('haptic', '震动反馈', 'vibration.vibrate', vibration.available()),
      entry('battery', '电池状态', 'battery.get', battery.isAvailable(), true),
      entry('brightness', '屏幕控制', 'displayPower.setBrightness', displayPower.isAvailable()),
      entry('event', '公共事件', 'systemEvent.isAvailable', systemEvent.isAvailable()),
      entry('interconnect', '设备互联', 'interconnect.isAvailable', interconnect.isAvailable()),
      entry('storage', '本地存储', 'storage.get / set', !!(storage && storage.get && storage.set), true)
    ]
  }
}
