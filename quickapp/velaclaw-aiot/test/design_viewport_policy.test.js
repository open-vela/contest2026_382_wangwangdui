const assert = require('assert')
const fs = require('fs')
const path = require('path')
const viewportPolicy = require('../src/presentation/viewport/policy')

const root = path.resolve(__dirname, '..')
const layoutRuntime = fs.readFileSync(path.join(root, 'src/presentation/layout/runtime.js'), 'utf8')

const band10Beta = {
  viewportClass: 'beta-pill-viewport-212',
  viewportPosition: 'absolute',
  viewportLeft: '0px',
  viewportTop: '24px',
  viewportWidth: '192px',
  viewportHeight: '447px',
  logicalHeight: 471,
  isBetaPillViewport: true,
  screenWidth: 212
}

const legacy = viewportPolicy.legacy(band10Beta)
assert.strictEqual(legacy.viewportTop, '24px', 'legacy Band 10 pages must retain the beta host compatibility inset')
assert.strictEqual(legacy.viewportHeight, '447px', 'legacy Band 10 pages must retain the reduced beta canvas')

const design = viewportPolicy.design(band10Beta)
assert.strictEqual(design.viewportPosition, 'absolute')
assert.strictEqual(design.viewportTop, '0px', 'Band 10 Design Engine coordinates must start at the full design-canvas origin')
assert.strictEqual(design.viewportWidth, '192px')
assert.strictEqual(design.viewportHeight, '471px', 'Band 10 Design Engine render height must match profile.logicalHeight')
assert.ok(layoutRuntime.includes('viewportRuntime.applyDesign(page, profile)'), 'Design Engine runtime must render through the design viewport policy')

const band9Beta = Object.assign({}, band10Beta, {
  viewportClass: 'beta-pill-viewport-192',
  viewportHeight: '466px',
  logicalHeight: 490,
  screenWidth: 192
})
assert.deepStrictEqual(viewportPolicy.design(band9Beta), viewportPolicy.legacy(band9Beta), 'Band 9 Golden Reference must retain its beta viewport behavior')

const normal = {
  viewportClass: '',
  viewportPosition: 'relative',
  viewportLeft: '0px',
  viewportTop: '0px',
  viewportWidth: '100%',
  viewportHeight: '100%',
  logicalHeight: 192,
  isBetaPillViewport: false,
  screenWidth: 466
}
assert.deepStrictEqual(viewportPolicy.design(normal), viewportPolicy.legacy(normal), 'non-beta devices must not gain a second viewport policy')

console.log('Design viewport policy verified: Band 10 uses full design coordinates while Band 9 remains Golden Reference')
