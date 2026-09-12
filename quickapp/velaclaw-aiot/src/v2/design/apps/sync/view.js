function numberText(value) {
  return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function timeText(timestamp) {
  var value = Number(timestamp) || 0
  if (!value) return '未同步'
  var date = new Date(value)
  var hours = date.getHours() < 10 ? '0' + date.getHours() : '' + date.getHours()
  var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : '' + date.getMinutes()
  return hours + ':' + minutes
}

function phaseText(model) {
  var phase = model.phase || 'idle'
  if (phase === 'connecting') return '正在建立同步链路'
  if (phase === 'connected') return '模拟器链路已连接'
  if (phase === 'disconnected') return '已断开上位机'
  if (phase === 'connect-failed') return '连接失败，请重试'
  if (phase === 'disconnect-blocked') return '同步中不能断开'
  if (phase === 'connect-required') return '请先连接上位机'
  if (phase === 'collecting') return '正在收集健康与运动数据'
  if (phase === 'waiting-ack') return '等待分包 ACK'
  if (phase === 'sending') return '已确认 ' + (model.ackSent || 0) + '/' + (model.ackTotal || 0) + ' 包'
  if (phase === 'completed') return '同步完成，对端已确认'
  if (phase === 'failed') return '同步失败，可重新尝试'
  return '连接上位机后同步手环数据'
}

function packetText(model) {
  var phase = model.phase || 'idle'
  if (model.packetCount > 0) return model.packetCount + ' 包 · ' + (model.payloadChars || 0) + ' 字符'
  if (phase === 'connected') return '可开始同步'
  if (phase === 'disconnected') return '等待连接'
  if (phase === 'collecting') return '正在打包'
  return '等待打包'
}

function transportText(model) {
  if (model.transportMode === 'mock') return '模拟器分包链路'
  return model.realBleAvailable ? '设备传输链路' : '传输不可用'
}

function project(model) {
  var source = model || {}
  var connected = !!source.connected
  var progress = Math.max(0, Math.min(100, Math.round(Number(source.progress) || 0)))
  return {
    statusText: connected ? '已连接' : '未连接',
    statusColor: connected ? '#30D158' : '#8E8E93',
    connectButtonText: connected ? '断开' : '连接',
    lastSyncText: timeText(source.lastSyncAt),
    transportText: transportText(source),
    syncPercent: progress,
    syncWidth: progress + '%',
    syncMessage: phaseText(source),
    packetText: packetText(source),
    todayStepsText: source.todaySteps === undefined || source.todaySteps === null ? '--' : numberText(source.todaySteps) + ' 步',
    historyCount: String(source.historyCount || 0),
    workoutCount: String(source.workoutCount || 0)
  }
}

module.exports = { project: project, timeText: timeText }
