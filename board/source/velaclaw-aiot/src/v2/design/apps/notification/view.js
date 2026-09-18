function project(state) {
  var source = state || {}
  var type = source.type === 'call' ? 'call' : 'app'
  return {
    visible: !!source.visible,
    type: type,
    appName: source.appName || (type === 'call' ? '电话' : '通知'),
    appIcon: source.appIcon || '/common/logo.png',
    content: source.content || '',
    contact: source.contact || (type === 'call' ? '未知来电' : ''),
    phone: source.phone || '',
    hangUp: !!source.hangUp,
    hangUpColor: source.hangUp ? '#777777' : '#FFFFFF'
  }
}

module.exports = { project: project }
