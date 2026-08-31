const assert = require('assert')
const calendarUtils = require('../src/common/calendar_utils')

let passed = 0

function test(name, callback) {
  callback()
  passed++
  console.log('通过 - ' + name)
}

test('春节日期换算为农历正月初一', function () {
  assert.strictEqual(calendarUtils.formatLunar(new Date(2026, 1, 17)), '农历正月初一')
})

test('普通日期可显示完整农历月日', function () {
  assert.strictEqual(calendarUtils.formatLunar(new Date(2026, 7, 5)), '农历六月廿三')
})

test('月历固定生成六周四十二格', function () {
  const cells = calendarUtils.buildMonth(2026, 7, new Date(2026, 7, 5))
  assert.strictEqual(cells.length, 42)
  assert.strictEqual(cells[0].key, '2026-07-26')
  assert.strictEqual(cells[6].day, 1)
  assert.strictEqual(cells.filter(function (cell) { return cell.isToday }).length, 1)
})

test('跨年切换月份保持正确年份', function () {
  assert.deepStrictEqual(calendarUtils.shiftMonth(2026, 0, -1), { year: 2025, month: 11 })
  assert.deepStrictEqual(calendarUtils.shiftMonth(2026, 11, 1), { year: 2027, month: 0 })
})

console.log('日历与农历逻辑测试通过：' + passed + ' 项')
