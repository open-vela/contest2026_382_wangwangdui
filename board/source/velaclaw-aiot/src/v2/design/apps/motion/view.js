function fixed(value) {
  var number = Number(value)
  if (!isFinite(number)) number = 0
  return number.toFixed(2)
}

function intensity(key) {
  if (key === 'light') return { label: '轻微', color: '#64D2FF' }
  if (key === 'medium') return { label: '中等', color: '#FFD60A' }
  if (key === 'strong') return { label: '强烈', color: '#FF453A' }
  return { label: '平稳', color: '#30D158' }
}

function sensorStatus(code) {
  if (code === 'waiting') return '等待样本'
  if (code === 'streaming') return '正在出数'
  if (code === 'unavailable') return '接口不可用'
  if (code === 'stopped') return '已停止'
  if (code === 'recalibrating') return '重新校准中'
  return '未启动'
}

function measurement(model) {
  var phase = model.measurePhase || 'idle'
  var tone = intensity(model.measureIntensityKey)
  if (phase === 'measuring') {
    return {
      countdownText: (Math.max(0, Number(model.remainingMs) || 0) / 1000).toFixed(1),
      resultText: '测量中',
      color: '#64D2FF',
      buttonText: '请完成动作'
    }
  }
  if (phase === 'complete') return { countdownText: '完成', resultText: tone.label, color: tone.color, buttonText: '再次测量' }
  if (phase === 'no-samples') return { countdownText: '完成', resultText: '无样本', color: '#FF453A', buttonText: '再次测量' }
  return { countdownText: '3.0', resultText: '待测量', color: '#8E8E93', buttonText: '开始测量' }
}

function project(model) {
  var source = model || {}
  var currentIntensity = intensity(source.intensityKey)
  var measure = measurement(source)
  var active = !!source.sensorActive
  return {
    sensorStatus: sensorStatus(source.sensorStatus),
    sensorColor: active ? '#30D158' : '#8E8E93',
    sensorButtonText: active ? '停止诊断' : '开始诊断',
    xText: fixed(source.x),
    yText: fixed(source.y),
    zText: fixed(source.z),
    magnitudeText: fixed(source.magnitude),
    scoreText: fixed(source.score),
    intensityColor: currentIntensity.color,
    sampleText: active ? '已收到 ' + (source.sampleCount || 0) + ' 个样本 · 当前' + currentIntensity.label : '启动后显示真实样本与采样数量',
    countdownText: measure.countdownText,
    actionResult: measure.resultText,
    actionColor: measure.color,
    actionPeakText: fixed(source.measurePeak),
    measureButtonText: measure.buttonText,
    measureActive: !!source.measureActive
  }
}

function pageLabel(index) { return Number(index) === 1 ? '动作测量' : '实时诊断' }

module.exports = { project: project, pageLabel: pageLabel }
