var FACE_CATALOG = {
  sport: { id: 'sport', name: '活力数字', description: '时间、心率、步数集中展示', tag: '运动日常' },
  simple: { id: 'simple', name: '极简霓虹', description: '大时间和目标完成度', tag: '简洁耐看' },
  dashboard: { id: 'dashboard', name: '运动仪表', description: '进度条和心率趋势图', tag: '数据控' },
  mechanical: { id: 'mechanical', name: '曜金机械', description: '金属刻度、三针和机械副盘', tag: '经典机械' },
  alpine: { id: 'alpine', name: '星野远山', description: '星空雪山和透明数据层', tag: '沉浸夜景' }
}

function clone(face) {
  if (!face) return null
  return { id: face.id, name: face.name, description: face.description, tag: face.tag }
}

function get(id) { return clone(FACE_CATALOG[id]) }

function list(ids) {
  var source = ids && ids.length ? ids : Object.keys(FACE_CATALOG)
  var result = []
  for (var i = 0; i < source.length; i++) {
    var face = get(source[i])
    if (face) result.push(face)
  }
  return result
}

function indexOf(ids, faceId) {
  var source = ids || []
  for (var i = 0; i < source.length; i++) if (source[i] === faceId) return i
  return 0
}

module.exports = { get: get, list: list, indexOf: indexOf }
