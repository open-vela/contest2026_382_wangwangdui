var APPS = {
  workout: { label: '运动', icon: '/common/icons/workout.jpg', accent: '#34C759', glyph: '跑', glyphSize: 18 },
  history: { label: '趋势', icon: '/common/icons/history.jpg', accent: '#3434B8', glyph: '趋', glyphSize: 17 },
  heart: { label: '心率', icon: '/common/icons/heart.jpg', accent: '#FF375F', glyph: '心', glyphSize: 20 },
  clock: { label: '表盘', icon: '/common/icons/clock.jpg', accent: '#0A84FF', glyph: '表', glyphSize: 17 },
  steps: { label: '健康', icon: '/common/icons/health.jpg', accent: '#14B8A6', glyph: '康', glyphSize: 17 },
  faces: { label: '表盘库', icon: '/common/icons/faces.jpg', accent: '#BF5AF2', glyph: '盘', glyphSize: 17 },
  sync: { label: '同步', icon: '/common/icons/sync.jpg', accent: '#0A84FF', glyph: '同', glyphSize: 17 },
  brightness: { label: '亮度', icon: '/common/icons/brightness.jpg', accent: '#C9A100', glyph: '光', glyphSize: 17 },
  settings: { label: '设置', icon: '/common/icons/settings.jpg', accent: '#8E8E93', glyph: '设', glyphSize: 17 },
  vibration: { label: '振动', icon: '/common/icons/vibration.jpg', accent: '#A855F7', glyph: '振', glyphSize: 17 },
  notification: { label: '通知', icon: '/common/icons/notification.jpg', accent: '#A16207', glyph: '铃', glyphSize: 17 },
  today: { label: '今日日历', icon: '/common/icons/calendar.jpg', accent: '#C83245', glyph: '今', glyphSize: 17 }
}

function softIcon(path) { return String(path || '').replace('/common/icons/', '/common/icons/soft/') }
function launcherIcon(path) { return String(path || '').replace('/common/icons/', '/common/icons/launcher/') }

function get(id) {
  var source = APPS[id]
  if (!source) return { id: id, label: id || '', icon: '', softIcon: '', launcherIcon: '', accent: '#8E8E93', glyph: '?', glyphSize: 17, glyphColor: '#FFFFFF' }
  return { id: id, label: source.label, icon: source.icon, softIcon: softIcon(source.icon), launcherIcon: launcherIcon(source.icon), accent: source.accent, glyph: source.glyph, glyphSize: source.glyphSize || 17, glyphColor: source.glyphColor || '#FFFFFF' }
}

function list(ids) {
  var source = Array.isArray(ids) ? ids : []
  var result = []
  for (var i = 0; i < source.length; i++) result.push(get(source[i]))
  return result
}

module.exports = { get: get, list: list }
