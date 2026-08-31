const assert = require('assert')
const pager = require('../src/common/fixed_pager')

let passed = 0

function test(name, callback) {
  callback()
  passed++
  console.log('通过 - ' + name)
}

test('固定分页按容量切片', function () {
  const state = pager.build(['a', 'b', 'c', 'd', 'e'], 0, 3)
  assert.deepStrictEqual(state.items, ['a', 'b', 'c'])
  assert.strictEqual(state.pageCount, 2)
  assert.strictEqual(state.pageText, '1 / 2')
  assert.strictEqual(state.hasPrevious, false)
  assert.strictEqual(state.hasNext, true)
})

test('最后一页保留剩余项目', function () {
  const state = pager.build(['a', 'b', 'c', 'd', 'e'], 1, 3)
  assert.deepStrictEqual(state.items, ['d', 'e'])
  assert.strictEqual(state.hasPrevious, true)
  assert.strictEqual(state.hasNext, false)
})

test('越界页码会被限制', function () {
  assert.strictEqual(pager.build([1, 2], 99, 1).pageIndex, 1)
  assert.strictEqual(pager.build([1, 2], -5, 1).pageIndex, 0)
})

test('移动分页不会越过边界', function () {
  assert.strictEqual(pager.move([1, 2, 3], 0, 2, -1).pageIndex, 0)
  assert.strictEqual(pager.move([1, 2, 3], 1, 2, 1).pageIndex, 1)
})

console.log('固定分页逻辑测试通过：' + passed + ' 项')
