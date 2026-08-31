const assert = require('assert')
const faceScope = require('../src/common/face_scope')

const faces = [
  { id: 'shared' },
  { id: 'mechanical', circleOnly: true },
  { id: 'alpine', pillOnly: true }
]

let passed = 0

function test(name, callback) {
  callback()
  passed++
  console.log('通过 - ' + name)
}

function ids(scope) {
  return faceScope.availableFaces(faces, scope).map(function (face) { return face.id })
}

test('胶囊屏只加入背景图表盘', function () {
  assert.deepStrictEqual(ids('pill'), ['shared', 'alpine'])
})

test('圆屏只加入机械表盘', function () {
  assert.deepStrictEqual(ids('circle'), ['shared', 'mechanical'])
})

test('矩形屏排除两种形态专属表盘', function () {
  assert.deepStrictEqual(ids('rect'), ['shared'])
})

console.log('表盘形态隔离测试通过：' + passed + ' 项')
