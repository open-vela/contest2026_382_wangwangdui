/**
 * 屏幕安全区几何
 *
 * manifest 里 `config.designWidth = 192`，页面统一按 192 宽的方形画布绘制，运行时
 * 再等比映射到物理分辨率。矩形屏可以用满整块画布，但圆屏和胶囊屏的四角会被物理
 * 外形切掉：
 *
 *   - 圆屏：可视范围是画布的内切圆，越靠近上下边缘，横向可用宽度收得越窄。
 *   - 胶囊屏：左右是直边，上下各扣一个半圆端帽，同样吃掉四角。
 *
 * 也就是说“元素在 192 画布内”并不等于“元素看得见”。以前每个页面都靠肉眼试出
 * `margin-top: 50px`、`padding: 12px 22px` 这类经验值，改一次布局就要重新试一轮，
 * 而且不同页面试出来的值互相矛盾。本模块把这层关系写成纯函数：给定内容宽度，直接
 * 算出它在圆/胶囊里能落的纵向区间。
 *
 * 校验：胶囊屏 168px 宽的标题行 -> capsuleCapInset(192, 168) = 96 - √(96²-84²) ≈ 49.5，
 * 正是 applist 之前手工试出来的 `margin-top: 50px`。手工值与纯几何值吻合，说明真机
 * 可视区域就是理想内切圆，因此下面的几何函数不额外内缩半径——留白由调用方按需追加，
 * 而不是悄悄混进公式里。
 *
 * 纯计算、不依赖 Quick App 运行时，可直接用 Node.js 单元测试（见 test/safe_area.test.js）。
 */

// 设计画布宽度，与 manifest.config.designWidth 保持一致。
var DESIGN_WIDTH = 192

// 胶囊宿主在屏幕底部绘制的手势条高度（逻辑像素）。
// 这块区域由系统绘制，应用无法覆盖，内容必须让开，详见 docs/COMPATIBILITY.md。
var PILL_GESTURE_BAR = 36

// 推荐的视觉留白：贴着数学边界摆放虽然不会被切，但看起来会“擦边”。
// resolve() 默认追加这点余量；需要压满可视区的场景（表盘背景）可显式传 0。
var COMFORT_PADDING = 2

function toPositiveNumber(value, fallback) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? number : fallback
}

/**
 * 圆的半弦长：距圆心 offset 处，圆内可用的半宽。
 * offset 超出半径时返回 0（该位置完全在圆外）。
 */
function chordHalfWidth(radius, offset) {
  var r = toPositiveNumber(radius, 0)
  var distance = Math.abs(Number(offset) || 0)
  if (distance >= r) return 0
  return Math.sqrt(r * r - distance * distance)
}

/**
 * 圆屏在纵坐标 y 处的可用宽度。
 * @param {number} diameter 圆屏画布直径（逻辑像素）
 * @param {number} y 距画布顶部的纵坐标
 * @returns {number} 该行的可用宽度
 */
function circleWidthAt(diameter, y) {
  var radius = toPositiveNumber(diameter, DESIGN_WIDTH) / 2
  return Math.floor(chordHalfWidth(radius, y - radius) * 2)
}

/**
 * 圆屏中，指定宽度的内容能够落在的纵向区间。
 *
 * 内容越宽，能用的纵向区间越短；这条曲线就是圆屏排版的核心约束：
 *   宽 148 -> 高 122     宽 136 -> 高 135     宽 120 -> 高 150
 *
 * @param {number} diameter 圆屏画布直径
 * @param {number} contentWidth 内容宽度（横向居中）
 * @returns {{top:number, bottom:number, height:number}} 可用区间，取不到时 height 为 0
 */
function circleBandForWidth(diameter, contentWidth) {
  var size = toPositiveNumber(diameter, DESIGN_WIDTH)
  var radius = size / 2
  var half = toPositiveNumber(contentWidth, 0) / 2
  var reach = chordHalfWidth(radius, half)
  if (reach <= 0) {
    return { top: Math.round(radius), bottom: Math.round(radius), height: 0 }
  }
  var top = Math.ceil(radius - reach)
  var bottom = Math.floor(radius + reach)
  return { top: top, bottom: bottom, height: bottom - top }
}

/**
 * 胶囊屏上下半圆端帽让出的纵向距离。
 *
 * 胶囊左右是直边，只有顶部和底部各一个半径 = 屏宽/2 的半圆。宽度为 contentWidth
 * 的内容要完整落在端帽里，距离上/下边缘至少要留出这个距离。
 *
 * @param {number} screenWidth 胶囊逻辑宽度（通常 192）
 * @param {number} contentWidth 内容宽度（横向居中）
 * @returns {number} 顶部（或底部）需要让出的距离
 */
function capsuleCapInset(screenWidth, contentWidth) {
  var width = toPositiveNumber(screenWidth, DESIGN_WIDTH)
  var radius = width / 2
  var half = toPositiveNumber(contentWidth, 0) / 2
  var reach = chordHalfWidth(radius, half)
  if (reach <= 0) return Math.round(radius)
  return Math.max(0, Math.ceil(radius - reach))
}

/**
 * 圆屏最大内接正方形边长：diameter / √2。
 * 用于需要方形容器（表盘、蜂巢画布）而不想逐行算弦长的场景。
 */
function inscribedSquare(diameter) {
  return Math.floor(toPositiveNumber(diameter, DESIGN_WIDTH) / Math.SQRT2)
}

/**
 * 判断一个矩形是否完整落在圆内，用于自检脚本和回归测试。
 * @returns {boolean} 四角全部在圆内才返回 true
 */
function fitsInCircle(diameter, left, top, width, height) {
  var radius = toPositiveNumber(diameter, DESIGN_WIDTH) / 2
  var limit = radius
  var corners = [
    [left, top],
    [left + width, top],
    [left, top + height],
    [left + width, top + height]
  ]
  for (var i = 0; i < corners.length; i++) {
    var dx = corners[i][0] - radius
    var dy = corners[i][1] - radius
    if (Math.sqrt(dx * dx + dy * dy) > limit) return false
  }
  return true
}

/**
 * 按屏幕形态给出页面可直接使用的安全盒。
 *
 * 页面拿到的是最终 px 值，不需要再自己判断形态，也不需要重复这套三角计算。
 * 默认在数学边界内再收 COMFORT_PADDING，避免内容“擦边”；表盘背景这类需要压满
 * 可视区的场景可以显式传 padding = 0。
 *
 * @param {object} profile screen_profile 解析出的屏幕档案
 * @param {number} [contentWidth] 页面打算使用的内容宽度；不传则按形态取推荐值
 * @param {number} [padding] 额外视觉留白，默认 COMFORT_PADDING
 * @returns {{shape:string, contentWidth:number, top:number, bottom:number,
 *            height:number, left:number, gestureBar:number}}
 */
function resolve(profile, contentWidth, padding) {
  var shape = (profile && profile.formFactor) || 'rect'
  var canvasWidth = DESIGN_WIDTH
  var canvasHeight = toPositiveNumber(profile && profile.logicalHeight, DESIGN_WIDTH)
  var comfort = padding === undefined || padding === null ? COMFORT_PADDING : Math.max(0, Number(padding) || 0)

  if (shape === 'circle') {
    // 圆屏画布是正方形，宽高都等于设计宽度。
    var width = toPositiveNumber(contentWidth, 136)
    var band = circleBandForWidth(canvasWidth, width)
    var circleHeight = Math.max(0, band.height - comfort * 2)
    return {
      shape: shape,
      contentWidth: width,
      left: Math.round((canvasWidth - width) / 2),
      top: band.top + comfort,
      bottom: band.top + comfort + circleHeight,
      height: circleHeight,
      gestureBar: 0
    }
  }

  if (shape === 'pill') {
    var pillWidth = toPositiveNumber(contentWidth, 168)
    var inset = capsuleCapInset(canvasWidth, pillWidth) + comfort
    // 底部同时受端帽和系统手势条约束，取更严格的一侧。
    var bottomInset = Math.max(inset, PILL_GESTURE_BAR)
    var bottomEdge = Math.max(inset, canvasHeight - bottomInset)
    return {
      shape: shape,
      contentWidth: pillWidth,
      left: Math.round((canvasWidth - pillWidth) / 2),
      top: inset,
      bottom: bottomEdge,
      height: Math.max(0, bottomEdge - inset),
      gestureBar: PILL_GESTURE_BAR
    }
  }

  // 矩形屏没有被裁切的角，整块画布都可用。
  var rectWidth = toPositiveNumber(contentWidth, canvasWidth)
  return {
    shape: 'rect',
    contentWidth: rectWidth,
    left: Math.round((canvasWidth - rectWidth) / 2),
    top: 0,
    bottom: canvasHeight,
    height: canvasHeight,
    gestureBar: 0
  }
}

module.exports = {
  DESIGN_WIDTH: DESIGN_WIDTH,
  PILL_GESTURE_BAR: PILL_GESTURE_BAR,
  COMFORT_PADDING: COMFORT_PADDING,
  chordHalfWidth: chordHalfWidth,
  circleWidthAt: circleWidthAt,
  circleBandForWidth: circleBandForWidth,
  capsuleCapInset: capsuleCapInset,
  inscribedSquare: inscribedSquare,
  fitsInCircle: fitsInCircle,
  resolve: resolve
}
