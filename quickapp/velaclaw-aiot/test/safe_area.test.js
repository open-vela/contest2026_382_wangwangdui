const assert = require('assert')
const safeArea = require('../src/common/safe_area')

let passed = 0

function test(name, callback) {
  callback()
  passed++
  console.log('通过 - ' + name)
}

// 这条用例是整个安全区模型的锚点：applist 的 168px 标题行以前靠肉眼试出
// `margin-top: 50px`，几何推导必须落在同一个位置，才能证明公式与真机一致。
test('胶囊端帽推导复现手工试出的标题行位置', function () {
  const inset = safeArea.capsuleCapInset(192, 168)
  assert.ok(inset >= 48 && inset <= 52, '期望约 50px，实际 ' + inset)
})

test('内容越宽，圆屏可用纵向区间越短', function () {
  const wide = safeArea.circleBandForWidth(192, 148)
  const narrow = safeArea.circleBandForWidth(192, 120)
  assert.ok(wide.height < narrow.height)
  // 148px 宽的卡片在 192 圆屏里只有约 120px 纵向空间，
  // today.ux 之前排了 168px，必然被切角。
  assert.ok(wide.height < 126, '148px 宽应少于 126px 纵向空间，实际 ' + wide.height)
})

test('圆屏安全带上下对称居中', function () {
  const band = safeArea.circleBandForWidth(192, 136)
  assert.strictEqual(band.top + band.height, band.bottom)
  assert.ok(Math.abs(band.top - (192 - band.bottom)) <= 1)
})

test('过宽内容在圆屏上没有可用区间', function () {
  assert.strictEqual(safeArea.circleBandForWidth(192, 200).height, 0)
})

test('圆屏中线可用宽度等于直径', function () {
  assert.strictEqual(safeArea.circleWidthAt(192, 96), 192)
  assert.ok(safeArea.circleWidthAt(192, 20) < 192)
})

test('内接正方形按 直径÷√2 收敛', function () {
  assert.strictEqual(safeArea.inscribedSquare(192), Math.floor(192 / Math.SQRT2))
  // 135 是 192 圆屏能容纳的最大正方形，蜂巢画布不应超过它。
  assert.strictEqual(safeArea.inscribedSquare(192), 135)
})

test('矩形判定能识别越界的圆屏卡片', function () {
  // 148 宽、168 高，从 y=12 开始：正是 today.ux 修复前的摘要页布局。
  assert.strictEqual(safeArea.fitsInCircle(192, 22, 12, 148, 168), false)
  // 收敛到安全带之后四角都在圆内。
  const band = safeArea.circleBandForWidth(192, 148)
  assert.strictEqual(safeArea.fitsInCircle(192, 22, band.top, 148, band.height), true)
})

test('胶囊安全盒同时避开端帽和系统手势条', function () {
  const box = safeArea.resolve({ formFactor: 'pill', logicalHeight: 490 }, 168)
  assert.ok(box.top >= 48, '顶部需让出端帽')
  assert.strictEqual(box.gestureBar, 36)
  assert.ok(490 - box.bottom >= 36, '底部需让出系统手势条')
})

test('矩形屏保留完整画布', function () {
  const box = safeArea.resolve({ formFactor: 'rect', logicalHeight: 480 }, 192)
  assert.strictEqual(box.top, 0)
  assert.strictEqual(box.bottom, 480)
  assert.strictEqual(box.gestureBar, 0)
})

console.log('安全区几何测试通过：' + passed + ' 项')
