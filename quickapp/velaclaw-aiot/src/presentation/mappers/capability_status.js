function mapCapabilityStatus(items) {
  var source = items || []
  var result = []
  for (var i = 0; i < source.length; i++) {
    var item = source[i]
    var available = !!item.available
    result.push({
      id: item.id,
      name: item.name,
      api: item.api,
      status: available ? '可用' : '不可用',
      color: available ? '#30D158' : '#FF453A',
      background: available ? '#123422' : '#3A1517',
      fallback: !!item.fallback
    })
  }
  return result
}

module.exports = {
  mapCapabilityStatus: mapCapabilityStatus
}
