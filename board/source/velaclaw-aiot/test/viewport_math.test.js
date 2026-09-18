const assert = require('assert')
const viewportMath = require('../src/common/viewport_math')

let passed = 0

function test(name, callback) {
  callback()
  passed++
  console.log('通过 - ' + name)
}

test('Band 9 物理高度保持为逻辑高度', function () {
  assert.strictEqual(viewportMath.logicalHeight(192, 490, 192), 490)
})

test('Band 10 按设计宽度换算逻辑高度', function () {
  assert.strictEqual(viewportMath.logicalHeight(212, 520, 192), 471)
})

test('缺少宽度时保留原始高度', function () {
  assert.strictEqual(viewportMath.logicalHeight(0, 520, 192), 520)
})

console.log('视口换算逻辑测试通过：' + passed + ' 项')
