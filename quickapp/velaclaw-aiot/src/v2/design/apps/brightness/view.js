function switchView(enabled) {
  return { text: enabled ? '开' : '关', color: enabled ? '#30D158' : '#8E8E93' }
}

function project(model) {
  var source = model || {}
  var value = Math.max(0, Math.min(255, Math.round(Number(source.brightnessValue) || 0)))
  var auto = switchView(!!source.autoBrightness)
  var raise = switchView(source.raiseWakeEnabled !== false)
  var lowPower = switchView(source.lowPowerEnabled !== false)
  return {
    brightnessValue: value,
    brightnessText: Math.round((value / 255) * 100) + '%',
    brightnessDetail: value + ' / 255',
    manualStateText: source.autoBrightness ? '自动管理' : '可调节',
    autoText: auto.text,
    autoColor: auto.color,
    raiseText: raise.text,
    raiseColor: raise.color,
    lowPowerText: lowPower.text,
    lowPowerColor: lowPower.color
  }
}

module.exports = { project: project }
