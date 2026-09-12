const assert = require('assert')
const honeycomb = require('../src/v2/design/engines/honeycomb')

let passed = 0
function test(name, callback) { callback(); passed++; console.log('通过 - ' + name) }
function fitsInCircle(left, top, width, height) {
  const radius = 96
  const corners = [[left, top], [left + width, top], [left, top + height], [left + width, top + height]]
  return corners.every(function (point) { const dx = point[0] - radius; const dy = point[1] - radius; return dx * dx + dy * dy <= radius * radius + 0.01 })
}

const coords = honeycomb.buildCoords(37)

test('动态 hex ring 按 1/7/19/37 容量扩展且坐标唯一', function () {
  assert.strictEqual(honeycomb.buildCoords(1).length, 1)
  assert.strictEqual(honeycomb.buildCoords(7).length, 7)
  assert.strictEqual(honeycomb.buildCoords(19).length, 19)
  assert.strictEqual(coords.length, 37)
  const keys = coords.map(function (point) { return point.q + ':' + point.r })
  assert.strictEqual(new Set(keys).size, 37)
})

test('中心格恰好有六个等距邻居', function () {
  const distances = coords.slice(1).map(function (point) { const dx = point.x - coords[0].x, dy = point.y - coords[0].y; return Math.round(Math.sqrt(dx * dx + dy * dy)) })
  assert.strictEqual(distances.filter(function (d) { return d === honeycomb.SPACING }).length, 6)
})

test('动态晶格最近邻间距保持 SPACING', function () {
  for (let i = 0; i < coords.length; i++) {
    let nearest = Infinity
    for (let j = 0; j < coords.length; j++) {
      if (i === j) continue
      const dx = coords[i].x - coords[j].x, dy = coords[i].y - coords[j].y
      nearest = Math.min(nearest, Math.sqrt(dx * dx + dy * dy))
    }
    assert.strictEqual(Math.round(nearest), honeycomb.SPACING)
  }
})

test('12 个应用不再复用第一个坐标', function () {
  const apps = []
  for (let i = 0; i < 12; i++) apps.push({ id: 'app-' + i, label: 'App ' + i, icon: '/' + i + '.png', softIcon: '/' + i + '-soft.png' })
  const slots = honeycomb.buildSlots(apps)
  const keys = slots.map(function (slot) { return slot.gridX + ':' + slot.gridY })
  assert.strictEqual(slots.length, 12)
  assert.strictEqual(new Set(keys).size, 12)
  assert.notStrictEqual(keys[0], keys[11])
})

test('聚焦时图标保持间隙并明显大于邻居', function () {
  const sample = honeycomb.buildCoords(19)
  for (let focus = 0; focus < sample.length; focus++) {
    const panX = honeycomb.FOCUS_X - sample[focus].x
    const panY = honeycomb.FOCUS_Y - sample[focus].y
    const frame = honeycomb.layoutFrame(sample, panX, panY, 0, 0)
    assert.ok(honeycomb.minimumEdgeGap(frame) > 0)
    assert.strictEqual(frame[focus].size, honeycomb.ICON_BASE + honeycomb.ICON_GROW)
  }
})

test('槽位只保留渲染与语义字段，不携带路由', function () {
  const slots = honeycomb.buildSlots([{ id: 'a', label: 'A', icon: '/a.png', softIcon: '/a-soft.png' }, { id: 'b', label: 'B', icon: '/b.png', softIcon: '/b-soft.png' }])
  assert.strictEqual(slots.length, 2)
  assert.strictEqual(slots[0].id, 'a')
  assert.strictEqual(slots[0].route, undefined)
  assert.strictEqual(slots[0].normalIcon, '/a.png')
  assert.strictEqual(slots[0].softIcon, '/a-soft.png')
  assert.strictEqual(slots[0].gridX, honeycomb.FOCUS_X)
  assert.strictEqual(slots[0].gridY, honeycomb.FOCUS_Y)
})

test('移动期间图标 src 保持稳定，由尺寸和透明度表达焦点', function () {
  const slots = honeycomb.buildSlots([{ id: 'a', label: 'A', icon: '/a.png', softIcon: '/a-soft.png' }, { id: 'b', label: 'B', icon: '/b.png', softIcon: '/b-soft.png' }])
  const centered = honeycomb.layoutSlots(slots, 0, 0, 0, 0)
  const shifted = honeycomb.layoutSlots(slots, -80, -80, 0, 0)
  assert.strictEqual(centered.slots[0].icon, '/a.png')
  assert.strictEqual(shifted.slots[0].icon, '/a.png')
  assert.strictEqual(centered.slots[0].size, 50)
  assert.ok(centered.slots[0].opacity > shifted.slots[0].opacity)
})

test('visible-slot culling 会排除远离圆屏的图标', function () {
  const source = [
    { id: 'a', centerX: 96, centerY: 96, size: 40 },
    { id: 'b', centerX: 400, centerY: 96, size: 40 },
    { id: 'c', centerX: -300, centerY: 96, size: 40 }
  ]
  const visible = honeycomb.visibleSlots(source)
  assert.strictEqual(visible.length, 1)
  assert.strictEqual(visible[0].id, 'a')
})

test('pan bounds 允许最外层应用移动到焦点', function () {
  const apps = []
  for (let i = 0; i < 19; i++) apps.push({ id: 'a' + i, label: 'A' + i, icon: '/a.png' })
  const slots = honeycomb.buildSlots(apps)
  const bounds = honeycomb.panBounds(slots)
  slots.forEach(function (slot) {
    const target = honeycomb.panForSlot(slot)
    assert.ok(target.x >= bounds.minX && target.x <= bounds.maxX)
    assert.ok(target.y >= bounds.minY && target.y <= bounds.maxY)
  })
})

test('拖动越界只进入有限 rubber-band 区域', function () {
  const slots = honeycomb.buildSlots([{ id: 'a', label: 'A', icon: '/a.png' }, { id: 'b', label: 'B', icon: '/b.png' }])
  const bounds = honeycomb.panBounds(slots)
  let pan = { x: 0, y: 0 }
  for (let i = 0; i < 40; i++) pan = honeycomb.nextPan(slots, pan.x, pan.y, 100, 100)
  assert.ok(pan.x <= bounds.maxX + honeycomb.OVERSCROLL_LIMIT)
  assert.ok(pan.y <= bounds.maxY + honeycomb.OVERSCROLL_LIMIT)
  const strict = honeycomb.clampPan(slots, pan.x, pan.y, 0)
  assert.ok(strict.x <= bounds.maxX && strict.y <= bounds.maxY)
})

test('frame cadence 和惯性参数保持 wearable 级限幅', function () {
  assert.ok(honeycomb.FRAME_MS >= 20 && honeycomb.FRAME_MS <= 32)
  assert.ok(honeycomb.INERTIA_DECAY > 0.75 && honeycomb.INERTIA_DECAY < 0.95)
  assert.ok(honeycomb.MAGNET_DISTANCE <= honeycomb.SPACING / 2)
  assert.ok(honeycomb.ELASTIC_RANGE <= 0.1)
  assert.ok(honeycomb.DRAG_CAPTURE_DISTANCE <= 4)
})

test('焦点图标完整落在圆屏可视范围内', function () {
  const sample = honeycomb.buildCoords(19)
  sample.forEach(function (point, index) {
    const panX = honeycomb.FOCUS_X - point.x
    const panY = honeycomb.FOCUS_Y - point.y
    const focused = honeycomb.layoutFrame(sample, panX, panY, 0, 0)[index]
    const half = focused.size / 2
    assert.ok(fitsInCircle(focused.centerX - half, focused.centerY - half, focused.size, focused.size))
  })
})

test('精简后的名称条仍位于圆屏安全区域', function () { assert.strictEqual(fitsInCircle(54, 159, 84, 18), true) })

console.log('V2 圆屏蜂巢布局测试通过：' + passed + ' 项')
