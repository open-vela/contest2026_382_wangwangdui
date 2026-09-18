var ITEMS = {
  sync: { name: '蓝牙同步', description: '连接手机并模拟数据上传', icon: '/common/icons/sync.jpg' },
  vibration: { name: '震动反馈', description: '提醒开关、强度与反馈模式', icon: '/common/icons/vibration.jpg' },
  brightness: { name: '亮度与省电', description: '亮度、抬腕亮屏、低功耗', icon: '/common/icons/brightness.jpg' },
  motion: { name: '动作与加速度', description: '三轴诊断与动作强度测量', icon: '/common/icons/motion.jpg' },
  diagnostics: { name: '设备自检', description: '屏幕档案与系统能力状态', icon: '/common/icons/diagnostics.jpg' }
}

function get(id) {
  var source = ITEMS[id] || {}
  return { id: id, name: source.name || id || '', description: source.description || '', icon: source.icon || '' }
}

function list(ids) {
  var source = Array.isArray(ids) ? ids : []
  var result = []
  for (var i = 0; i < source.length; i++) result.push(get(source[i]))
  return result
}

module.exports = { get: get, list: list }
