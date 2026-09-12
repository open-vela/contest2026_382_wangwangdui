var META = {
  steps: { name: '步数', unit: '步', color: '#FFD60A' },
  calories: { name: '卡路里', unit: 'kcal', color: '#FF9F0A' },
  stand: { name: '站立', unit: 'h', color: '#0A84FF' }
}

function formatNumber(value) {
  return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function withUnit(value, unit) {
  var text = formatNumber(value)
  return unit ? text + ' ' + unit : text
}

function progress(current, goal, trackWidth, unit, color) {
  var now = Math.max(0, Number(current) || 0)
  var target = Math.max(0, Number(goal) || 0)
  var width = Math.max(0, Math.round(Number(trackWidth) || 0))
  if (!target) {
    return {
      progressText: '--',
      progressWidth: 0,
      goalText: '未设置目标',
      statusText: '等待目标',
      statusColor: '#8E8E93',
      isComplete: false
    }
  }

  var ratio = now / target
  var percent = Math.max(0, Math.round(ratio * 100))
  var displayPercent = percent > 999 ? '999%+' : percent + '%'
  var complete = now >= target
  var remaining = Math.max(0, target - now)
  var extra = Math.max(0, now - target)
  return {
    progressText: displayPercent,
    progressWidth: Math.round(Math.max(0, Math.min(1, ratio)) * width),
    goalText: '目标 ' + withUnit(target, unit),
    statusText: complete ? (extra > 0 ? '超额 ' + formatNumber(extra) : '已达成') : '还差 ' + formatNumber(remaining),
    statusColor: complete ? color : '#8E8E93',
    isComplete: complete
  }
}

function present(metrics, trackWidth) {
  var source = metrics || []
  var result = []
  for (var i = 0; i < source.length; i++) {
    var item = source[i]
    var meta = META[item.id] || { name: item.id || '', unit: '', color: '#FFFFFF' }
    var state = progress(item.current, item.goal, trackWidth, meta.unit, meta.color)
    result.push({
      id: item.id,
      name: meta.name,
      current: formatNumber(item.current),
      goal: formatNumber(item.goal),
      unit: meta.unit,
      color: meta.color,
      progressText: state.progressText,
      progressWidth: state.progressWidth,
      goalText: state.goalText,
      statusText: state.statusText,
      statusColor: state.statusColor,
      isComplete: state.isComplete
    })
  }
  return result
}

module.exports = { present: present, progress: progress }
