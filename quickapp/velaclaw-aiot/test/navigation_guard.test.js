const assert = require('assert')
const navigationGuard = require('../src/common/navigation_guard')

let passed = 0

function test(name, callback) {
  navigationGuard.reset()
  callback()
  passed++
  console.log('通过 - ' + name)
}

test('同一页面重复返回只接受第一次', function () {
  const page = {}
  assert.strictEqual(navigationGuard.begin(page, 1000), true)
  assert.strictEqual(navigationGuard.begin(page, 1100), false)
})

test('新页面也不能接收同一手势的第二次返回', function () {
  const oldPage = {}
  const revealedPage = {}
  assert.strictEqual(navigationGuard.begin(oldPage, 1000), true)
  navigationGuard.enter(revealedPage)
  assert.strictEqual(navigationGuard.begin(revealedPage, 1300), false)
})

test('冷却结束后允许下一次独立导航', function () {
  const firstPage = {}
  const nextPage = {}
  assert.strictEqual(navigationGuard.begin(firstPage, 1000), true)
  assert.strictEqual(navigationGuard.begin(nextPage, 1000 + navigationGuard.lockDuration), true)
})

console.log('返回手势防连退测试通过：' + passed + ' 项')
