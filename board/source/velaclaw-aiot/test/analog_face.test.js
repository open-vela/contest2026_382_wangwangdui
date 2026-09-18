const assert = require('assert')
const analog = require('../src/v2/design/analog')

let passed = 0
function test(name, callback) { callback(); passed++; console.log('通过 - ' + name) }

test('十二点三针均指向零度', function () {
  assert.deepStrictEqual(analog.angles(12, 0, 0), { hour: 0, minute: 0, second: 0 })
})

test('时针随分钟连续移动', function () {
  assert.deepStrictEqual(analog.angles(3, 30, 15), { hour: 105.1, minute: 181.5, second: 90 })
})

test('旋转值使用 Vela 支持的变换对象字符串', function () {
  assert.strictEqual(analog.transform(90), '{"rotate":"90deg"}')
})

test('机械表盘生成六十刻度和十二个主刻度', function () {
  const marks = analog.ticks()
  assert.strictEqual(marks.length, 60)
  assert.strictEqual(marks.filter(function (mark) { return mark.className === 'mechanical-major-tick' }).length, 12)
  assert.strictEqual(marks[15].transform, '{"rotate":"90deg"}')
})

console.log('V2 机械表盘角度逻辑测试通过：' + passed + ' 项')
