function normalize(payload) {
  var source = payload || {}
  var type = source.type === 'call' ? 'call' : 'app'
  return {
    type: type,
    appName: source.appName || source.title || '',
    appIcon: source.appIcon || '',
    content: source.content || '',
    contact: source.contact || source.title || '',
    phone: source.phone || '',
    hangUp: false
  }
}

function demo(type) {
  if (type === 'call') return normalize({ type: 'call', contact: '演示来电', phone: '未知号码' })
  if (type === 'sms') return normalize({ type: 'app', appName: '短信', content: '这是一条短信演示通知。' })
  return normalize({ type: 'app', appName: 'VelaClaw', content: '设备通知通路已连接。' })
}

module.exports = { normalize: normalize, demo: demo }
