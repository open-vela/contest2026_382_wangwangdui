const assert = require('assert')
const honeycomb = require('../src/common/honeycomb_layout')
const safeArea = require('../src/common/safe_area')

let passed = 0

function test(name, callback) {
  callback()
  passed++
  console.log('通过 - ' + name)
}

const coords = honeycomb.buildCoords()

test('晶格最近邻间距完全一致', function () {
  // 旧的手工坐标表最近邻间距在 44.1~48.4 之间漂移，看起来是「散落」而非蜂巢。
  let min = Infinity
  let max = 0
  for (let i = 0; i < coords.length; i++) {
    let nearest = Infinity
    for (let j = 0; j < coords.length; j++) {
      if (i === j) continue
      const dx = coords[i].x - coords[j].x
      const dy = coords[i].y - coords[j].y
      nearest = Math.min(nearest, Math.sqrt(dx * dx + dy * dy))
    }
    min = Math.min(min, nearest)
    max = Math.max(max, nearest)
  }
  assert.strictEqual(Math.round(min), honeycomb.SPACING)
  assert.strictEqual(Math.round(max), honeycomb.SPACING)
})

test('中心格恰好有六个等距邻居', function () {
  const distances = coords.slice(1).map(function (point) {
    const dx = point.x - coords[0].x
    const dy = point.y - coords[0].y
    return Math.round(Math.sqrt(dx * dx + dy * dy))
  })
  const neighbours = distances.filter(function (d) { return d === honeycomb.SPACING })
  assert.strictEqual(neighbours.length, 6, '期望 6 个直接邻居，实际 ' + neighbours.length)
})

test('晶格左右对称', function () {
  coords.forEach(function (point) {
    const mirrored = coords.some(function (other) {
      return other.y === point.y && other.x === 2 * honeycomb.FOCUS_X - point.x
    })
    assert.ok(mirrored, '(' + point.x + ',' + point.y + ') 缺少镜像格')
  })
})

// 这是本文件的核心用例：不重叠原本靠每帧 O(n²) 斥力循环兜底，
// 现在必须是晶格的几何性质。穷举「聚焦任一格 × 全拖拽范围」验证。
test('全拖拽空间内图标永不重叠', function () {
  const limit = honeycomb.DRAG_LIMIT
  let worst = Infinity
  let worstAt = null
  for (let focus = 0; focus < coords.length; focus++) {
    const panX = honeycomb.FOCUS_X - coords[focus].x
    const panY = honeycomb.FOCUS_Y - coords[focus].y
    for (let ox = -limit; ox <= limit; ox += 4) {
      for (let oy = -limit; oy <= limit; oy += 4) {
        const gap = honeycomb.minimumEdgeGap(
          honeycomb.layoutFrame(coords, panX, panY, ox, oy)
        )
        if (gap < worst) {
          worst = gap
          worstAt = { focus, ox, oy }
        }
      }
    }
  }
  assert.ok(worst > 0, '出现重叠，最小间隙 ' + worst.toFixed(2) + 'px @ ' + JSON.stringify(worstAt))
})

test('弹性差值被约束在 0.10 以内', function () {
  // 守住上一条用例的前提：0.14 时 132px 拖拽极值会把相邻图标压出重叠
  // （实测最小间隙 -0.61px），这正是当初需要每帧斥力循环的原因。
  assert.ok(honeycomb.ELASTIC_RANGE <= 0.1, '弹性差值必须留在 0.10 以内')
})

test('聚焦图标明显大于邻居', function () {
  const frame = honeycomb.layoutFrame(coords, 0, 0, 0, 0)
  const focused = frame[0].size
  const neighbour = frame[1].size
  assert.strictEqual(focused, honeycomb.ICON_BASE + honeycomb.ICON_GROW)
  assert.ok(focused - neighbour >= 12, '聚焦与邻居的体量差不足：' + (focused - neighbour))
})

test('八向滑动都能落到相邻格', function () {
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    upLeft: { x: -0.7071, y: -0.7071 },
    upRight: { x: 0.7071, y: -0.7071 },
    downLeft: { x: -0.7071, y: 0.7071 },
    downRight: { x: 0.7071, y: 0.7071 }
  }
  Object.keys(directions).forEach(function (name) {
    const target = honeycomb.pickByDirection(coords, 0, directions[name])
    assert.ok(target >= 0, name + ' 方向从中心找不到目标格')
    assert.notStrictEqual(target, 0)
  })
})

test('方向选格取该方向最近的一格', function () {
  // 从中心向右：应落到 (142,90)，而不是更远的外环 (165,50)。
  const target = honeycomb.pickByDirection(coords, 0, { x: 1, y: 0 })
  assert.strictEqual(coords[target].x, honeycomb.FOCUS_X + honeycomb.SPACING)
  assert.strictEqual(coords[target].y, honeycomb.FOCUS_Y)
})

test('聚焦格居中后其邻居仍在圆屏可视范围内', function () {
  // 聚焦任意一格时，被放大的那一个必须完整落在内切圆里。
  coords.forEach(function (point, index) {
    const panX = honeycomb.FOCUS_X - point.x
    const panY = honeycomb.FOCUS_Y - point.y
    const frame = honeycomb.layoutFrame(coords, panX, panY, 0, 0)
    const focused = frame[index]
    const half = focused.size / 2
    assert.ok(
      safeArea.fitsInCircle(
        safeArea.DESIGN_WIDTH,
        focused.centerX - half,
        focused.centerY - half,
        focused.size,
        focused.size
      ),
      '第 ' + index + ' 格聚焦后超出圆屏可视范围'
    )
  })
})

test('名称条四角落在内切圆内', function () {
  // .center-label-glass: left 48, top 152, 96×20
  assert.strictEqual(safeArea.fitsInCircle(safeArea.DESIGN_WIDTH, 48, 152, 96, 20), true)
})

console.log('圆屏蜂巢布局测试通过：' + passed + ' 项')
