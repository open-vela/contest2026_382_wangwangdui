function makeNotification(type, extra) {
  var item
  if (type === 'call') {
    item = {
      type: 'call', icon: 'C', title: '来电提醒', content: '未知 来电中',
      contact: '未知', phone: '+86 123456', typeText: 'CALL', color: '#30D158', duration: 8000
    }
  } else if (type === 'sms') {
    item = {
      type: 'sms', icon: 'S', title: '短信', appName: '短信', appIcon: '/common/logo.png',
      content: '测试', typeText: 'SMS', color: '#0A84FF', duration: 6000
    }
  } else {
    item = {
      type: 'app', icon: 'A', title: 'App通知', appName: '运动健康', appIcon: '/common/logo.png',
      content: '测试', typeText: 'APP', color: '#FF9F0A', duration: 6000
    }
  }

  if (extra) {
    if (extra.title) item.title = extra.title
    if (extra.content) item.content = extra.content
    if (extra.duration) item.duration = extra.duration
    if (extra.contact) item.contact = extra.contact
    if (extra.phone) item.phone = extra.phone
    if (extra.appName) item.appName = extra.appName
    if (extra.appIcon) item.appIcon = extra.appIcon
  }
  return item
}

export default {
  getByType: function (type, extra) {
    if (type !== 'call' && type !== 'sms' && type !== 'app') return null
    return makeNotification(type, extra)
  },
  getAll: function () {
    return [makeNotification('call'), makeNotification('sms'), makeNotification('app')]
  }
}
