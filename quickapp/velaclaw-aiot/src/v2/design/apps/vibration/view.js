var LEVEL_TEXT = { light: '轻', medium: '中', strong: '强' }
var PATTERN_TEXT = { tap: '轻触', goal: '达标', countdown: '倒计时', alert: '警报' }

function selected(value, target) { return value === target ? '#FF9F0A' : '#1C1C1E' }
function patternBg(value, target) { return value === target ? '#2D210F' : '#14181F' }
function patternState(value, target) { return value === target ? '已选' : '›' }

function feedbackText(source) {
  if (source.feedbackCode === 'disabled') return '请先开启震动反馈'
  if (source.feedbackCode === 'unavailable') return '当前设备无法震动'
  if (source.feedbackCode === 'played') return (PATTERN_TEXT[source.pattern] || '反馈') + ' · 已播放'
  if (source.feedbackCode === 'loaded') return '当前模式：' + (PATTERN_TEXT[source.pattern] || '达标')
  return '点击播放反馈'
}

function project(model) {
  var source = model || {}
  var enabled = source.enabled !== false
  var available = !!source.capabilityAvailable
  var level = LEVEL_TEXT[source.level] ? source.level : 'medium'
  var pattern = PATTERN_TEXT[source.pattern] ? source.pattern : 'goal'
  return {
    enabled: enabled,
    enabledText: enabled ? '开' : '关',
    level: level,
    levelText: LEVEL_TEXT[level],
    pattern: pattern,
    patternText: PATTERN_TEXT[pattern],
    statusText: enabled ? '已开启' : '已关闭',
    statusColor: enabled ? '#30D158' : '#8E8E93',
    feedbackText: feedbackText({ feedbackCode: source.feedbackCode, pattern: pattern }),
    systemModeText: Number(source.systemMode) < 0 ? '未提供' : String(source.systemMode),
    capabilityText: available ? '反馈可用' : '当前设备不可用',
    capabilityColor: available ? '#30D158' : '#FFD60A',
    lightBg: selected(level, 'light'),
    mediumBg: selected(level, 'medium'),
    strongBg: selected(level, 'strong'),
    tapBg: patternBg(pattern, 'tap'),
    goalBg: patternBg(pattern, 'goal'),
    countdownBg: patternBg(pattern, 'countdown'),
    alertBg: patternBg(pattern, 'alert'),
    tapState: patternState(pattern, 'tap'),
    goalState: patternState(pattern, 'goal'),
    countdownState: patternState(pattern, 'countdown'),
    alertState: patternState(pattern, 'alert')
  }
}

module.exports = { project: project }
