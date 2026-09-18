const assert = require('assert')
const scene = require('../src/v2/design/scene')

const band10 = {
  formFactor: 'pill',
  logicalHeight: 471,
  screenWidth: 212,
  screenHeight: 520,
  viewportTop: '24px',
  viewportHeight: '447px'
}

const host = scene.resolve(band10)
assert.strictEqual(host.height, 471)
assert.strictEqual(host.hostTop, 0)
assert.strictEqual(host.hostBottom, 471)

const safe168 = scene.safeForWidth(band10, 168)
assert.ok(safe168.top > 0, 'full-bleed scene must still preserve the capsule top safe band')
assert.ok(safe168.bottom < host.height, 'full-bleed scene must still preserve the capsule bottom safe band')
assert.ok(safe168.height > 300, 'Band10 should retain a useful safe design region')

const circle = { formFactor: 'circle', logicalHeight: 192, screenWidth: 466, screenHeight: 466, viewportTop: '0px', viewportHeight: '100%' }
const circleHost = scene.resolve(circle)
assert.strictEqual(circleHost.height, 192, 'percentage viewport height must never be parsed as 100 logical pixels')
const circleSafe = scene.safeForWidth(circle, 136)
assert.ok(circleSafe.top > 0 && circleSafe.bottom < 192)
assert.ok(circleSafe.top <= 12 && circleSafe.bottom >= 180, 'circle design viewport must use the near-full display instead of an inscribed rectangular crop')
assert.ok(circleSafe.height >= 168, 'circle design viewport must leave enough vertical room for product-style scroll surfaces')

const rect = { formFactor: 'rect', logicalHeight: 228, screenWidth: 432, screenHeight: 514, viewportTop: '0px', viewportHeight: '100%' }
assert.strictEqual(scene.resolve(rect).height, 229, 'scene coverage may round upward to avoid a one-pixel bottom seam')

console.log('V2 full-bleed Host Scene projection verified')
