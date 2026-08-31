/**
 * 圆屏蜂巢晶格几何
 *
 * 从 applist.ux 抽出的纯计算层：坐标生成、每帧尺寸/位置推导、方向选格。
 * 抽出来的目的不是复用（只有一个调用方），而是可验证——
 * 「图标永不重叠」原本靠每帧 O(n²) 斥力循环兜底，现在是晶格的几何性质，
 * 可以用 Node.js 穷举 pan × offset 全空间来证明（见 test/honeycomb_layout.test.js）。
 *
 * 不依赖 Quick App 运行时。
 */

// 晶格间距。六邻居与中心、以及相邻外环之间，距离恒为该值。
var SPACING = 46
// 行距 = 间距 × √3/2，这是正六边形晶格的定义。
var ROW_HEIGHT = Math.round(SPACING * Math.sqrt(3) / 2)
var HALF_STEP = Math.round(SPACING / 2)

// 聚焦点比画布正中 (96,96) 略高，把底部弧线让给名称条。
var FOCUS_X = 96
var FOCUS_Y = 90

var ICON_BASE = 34
var ICON_GROW = 16
// 放大衰减半径。
var EMPHASIS_FALLOFF = 60
// 弹性跟随：近处跟手多、远处少，形成纵深。
// 差值必须 ≤ 0.10——0.14 时 132px 拖拽极值会把相邻图标压到重叠。
var ELASTIC_BASE = 0.9
var ELASTIC_RANGE = 0.1
var DRAG_LIMIT = 132

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

function smoothStep(t) {
  return t * t * (3 - 2 * t)
}

/** 中心 + 六邻居 + 四外环，左右上下对称。 */
function buildCoords() {
  return [
    { x: FOCUS_X, y: FOCUS_Y },
    { x: FOCUS_X - HALF_STEP, y: FOCUS_Y - ROW_HEIGHT },
    { x: FOCUS_X + HALF_STEP, y: FOCUS_Y - ROW_HEIGHT },
    { x: FOCUS_X - SPACING, y: FOCUS_Y },
    { x: FOCUS_X + SPACING, y: FOCUS_Y },
    { x: FOCUS_X - HALF_STEP, y: FOCUS_Y + ROW_HEIGHT },
    { x: FOCUS_X + HALF_STEP, y: FOCUS_Y + ROW_HEIGHT },
    { x: FOCUS_X - SPACING - HALF_STEP, y: FOCUS_Y - ROW_HEIGHT },
    { x: FOCUS_X + SPACING + HALF_STEP, y: FOCUS_Y - ROW_HEIGHT },
    { x: FOCUS_X - SPACING - HALF_STEP, y: FOCUS_Y + ROW_HEIGHT },
    { x: FOCUS_X + SPACING + HALF_STEP, y: FOCUS_Y + ROW_HEIGHT }
  ]
}

/**
 * 推导一帧里每个格子的圆心与直径，与 applist.ux 的每帧算法保持一致。
 * @returns {Array<{centerX:number, centerY:number, size:number, emphasis:number}>}
 */
function layoutFrame(coords, panX, panY, offsetX, offsetY) {
  var result = []
  for (var index = 0; index < coords.length; index++) {
    var baseX = coords[index].x + panX
    var baseY = coords[index].y + panY
    var baseDx = baseX - FOCUS_X
    var baseDy = baseY - FOCUS_Y
    var baseDistance = Math.sqrt(baseDx * baseDx + baseDy * baseDy)
    var elasticFollow = ELASTIC_BASE + clamp01(1 - baseDistance / 90) * ELASTIC_RANGE
    var centerX = baseX + offsetX * elasticFollow
    var centerY = baseY + offsetY * elasticFollow
    var dx = centerX - FOCUS_X
    var dy = centerY - FOCUS_Y
    var emphasis = smoothStep(clamp01(1 - Math.sqrt(dx * dx + dy * dy) / EMPHASIS_FALLOFF))
    result.push({
      centerX: centerX,
      centerY: centerY,
      size: Math.round(ICON_BASE + emphasis * ICON_GROW),
      emphasis: emphasis
    })
  }
  return result
}

/** 一帧内任意两图标的最小边缘间隙；> 0 表示无重叠。 */
function minimumEdgeGap(placed) {
  var worst = Infinity
  for (var i = 0; i < placed.length; i++) {
    for (var j = i + 1; j < placed.length; j++) {
      var dx = placed[j].centerX - placed[i].centerX
      var dy = placed[j].centerY - placed[i].centerY
      var gap = Math.sqrt(dx * dx + dy * dy) - (placed[i].size + placed[j].size) / 2
      if (gap < worst) worst = gap
    }
  }
  return worst
}

/**
 * 按空间方向就近选格：方向 ±60° 锥形内，取投影距离最小者。
 * @returns {number} 目标下标；该方向无格子时返回 -1
 */
function pickByDirection(coords, currentIndex, direction) {
  var current = coords[currentIndex]
  if (!current || !direction) return -1
  var bestIndex = -1
  var bestScore = Infinity
  for (var index = 0; index < coords.length; index++) {
    if (index === currentIndex) continue
    var dx = coords[index].x - current.x
    var dy = coords[index].y - current.y
    var distance = Math.sqrt(dx * dx + dy * dy)
    if (!distance) continue
    var alignment = (dx * direction.x + dy * direction.y) / distance
    if (alignment < 0.5) continue
    var score = distance / alignment
    if (score < bestScore) {
      bestScore = score
      bestIndex = index
    }
  }
  return bestIndex
}

module.exports = {
  SPACING: SPACING,
  ROW_HEIGHT: ROW_HEIGHT,
  HALF_STEP: HALF_STEP,
  FOCUS_X: FOCUS_X,
  FOCUS_Y: FOCUS_Y,
  ICON_BASE: ICON_BASE,
  ICON_GROW: ICON_GROW,
  EMPHASIS_FALLOFF: EMPHASIS_FALLOFF,
  ELASTIC_BASE: ELASTIC_BASE,
  ELASTIC_RANGE: ELASTIC_RANGE,
  DRAG_LIMIT: DRAG_LIMIT,
  buildCoords: buildCoords,
  layoutFrame: layoutFrame,
  minimumEdgeGap: minimumEdgeGap,
  pickByDirection: pickByDirection
}
