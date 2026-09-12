var APPS = {
  workout: { label: '运动', icon: '/common/icons/workout.jpg', accent: '#3A7DFF' },
  history: { label: '趋势', icon: '/common/icons/history.jpg', accent: '#30D158' },
  heart: { label: '心率', icon: '/common/icons/heart.jpg', accent: '#FF375F' },
  clock: { label: '表盘', icon: '/common/icons/clock.jpg', accent: '#FFD60A' },
  steps: { label: '健康', icon: '/common/icons/health.jpg', accent: '#64D2FF' },
  faces: { label: '表盘库', icon: '/common/icons/faces.jpg', accent: '#BF5AF2' },
  sync: { label: '同步', icon: '/common/icons/sync.jpg', accent: '#0A84FF' },
  brightness: { label: '亮度', icon: '/common/icons/brightness.jpg', accent: '#FFD60A' },
  settings: { label: '设置', icon: '/common/icons/settings.jpg', accent: '#8E8E93' },
  vibration: { label: '振动', icon: '/common/icons/vibration.jpg', accent: '#FF9F0A' },
  notification: { label: '通知', icon: '/common/icons/notification.jpg', accent: '#FF453A' },
  today: { label: '今日日历', icon: '/common/icons/calendar.jpg', accent: '#30D158' }
}

function softIcon(path) { return String(path || '').replace('/common/icons/', '/common/icons/soft/') }

function get(id) {
  var source = APPS[id]
  if (!source) return { id: id, label: id || '', icon: '', softIcon: '', accent: '#8E8E93' }
  return { id: id, label: source.label, icon: source.icon, softIcon: softIcon(source.icon), accent: source.accent }
}

function list(ids) {
  var source = Array.isArray(ids) ? ids : []
  var result = []
  for (var i = 0; i < source.length; i++) result.push(get(source[i]))
  return result
}

module.exports = { get: get, list: list }
