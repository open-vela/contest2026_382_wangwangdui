var pager = require('../../pager')

function capability(entry) {
  var source = entry || {}
  var status = source.available ? { text: '可用', color: '#30D158', background: '#102A19' } : (source.fallback ? { text: '兼容', color: '#FFD60A', background: '#2A2310' } : { text: '不可用', color: '#FF453A', background: '#321519' })
  return {
    id: source.id,
    name: source.name,
    api: source.api,
    status: status.text,
    color: status.color,
    background: status.background
  }
}

function project(model) {
  var source = model || {}
  var device = source.device || {}
  var host = source.host || {}
  var raw = Array.isArray(source.capabilities) ? source.capabilities : []
  var capabilities = []
  for (var i = 0; i < raw.length; i++) capabilities.push(capability(raw[i]))
  return {
    device: {
      deviceFamily: device.deviceFamily || device.model || 'unknown',
      screenSize: (device.screenWidth || '--') + ' × ' + (device.screenHeight || '--'),
      formFactor: device.formFactor || 'rect',
      platformText: (device.model || 'unknown') + ' / ' + (device.platformVersionCode || '--'),
      hostSceneText: Math.round(Number(host.width) || 0) + ' × ' + Math.round(Number(host.height) || 0),
      viewportMode: device.isBetaPillViewport ? '宿主兼容视口' : '标准宿主视口'
    },
    capabilities: capabilities
  }
}

function page(capabilities, pageIndex, pageSize) {
  var groups = [{ id: 'device' }]
  var source = Array.isArray(capabilities) ? capabilities : []
  var size = Math.max(1, Math.round(Number(pageSize) || 3))
  for (var start = 0; start < source.length; start += size) groups.push({ id: 'cap-' + start, items: source.slice(start, start + size) })
  var state = pager.resolve(groups, pageIndex, 1)
  var group = state.items[0]
  return {
    pageIndex: state.pageIndex,
    pageText: state.pageText,
    pageProgress: state.progress,
    capabilityPage: group && group.items ? group.items : []
  }
}

module.exports = { project: project, page: page }
