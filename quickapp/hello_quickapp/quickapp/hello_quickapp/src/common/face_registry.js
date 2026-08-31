import faceScope from './face_scope'

var FACE_LIST = [
  {
    id: 'sport',
    name: '活力数字',
    description: '大字时间、心率和运动进度',
    background: '#000000',
    accent: '#0A84FF'
  },
  {
    id: 'simple',
    name: '极简霓虹',
    description: '极简时间和目标圆环',
    background: '#05060A',
    accent: '#00E5FF'
  },
  {
    id: 'dashboard',
    name: '运动仪表',
    description: '集中展示活动和设备状态',
    background: '#080B10',
    accent: '#32D74B'
  },
  {
    id: 'mechanical',
    name: '曜金机械',
    description: '金属刻度、三针和机械副盘',
    background: '#050607',
    accent: '#D6B878',
    circleOnly: true
  },
  {
    id: 'alpine',
    name: '星野远山',
    description: '星空雪山背景与玻璃数据层',
    background: '#020713',
    accent: '#FF9F4A',
    pillOnly: true
  }
]

function getAll(scope) {
  return faceScope.availableFaces(FACE_LIST, scope)
}

function getIndex(faceId, scope) {
  var faces = getAll(scope)
  for (var index = 0; index < faces.length; index++) {
    if (faces[index].id === faceId) {
      return index
    }
  }
  return 0
}

function getById(faceId, scope) {
  return getByIndex(getIndex(faceId, scope), scope)
}

function getByIndex(index, scope) {
  var faces = getAll(scope)
  if (index < 0 || index >= faces.length) {
    return faces[0]
  }
  return faces[index]
}

function makeDots(index, scope) {
  var faces = getAll(scope)
  var activeFace = getByIndex(index, scope)
  var dots = []
  for (var dotIndex = 0; dotIndex < faces.length; dotIndex++) {
    dots.push({
      width: dotIndex === index ? 18 : 6,
      color: dotIndex === index ? activeFace.accent : '#3A3A3C'
    })
  }
  return dots
}

export default {
  getAll: getAll,
  getIndex: getIndex,
  getById: getById,
  getByIndex: getByIndex,
  makeDots: makeDots
}
