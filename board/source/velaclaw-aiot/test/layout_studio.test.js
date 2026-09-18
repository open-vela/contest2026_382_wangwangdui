'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const studioRoot = path.join(__dirname, '../tools/layout-studio')
const { APPS, PROFILES } = require(path.join(studioRoot, 'config'))
const { applyChanges, rewriteShapeBlock } = require(path.join(studioRoot, 'lib/recipe_file'))
const { translateUx } = require(path.join(studioRoot, 'lib/ux_translator'))
const server = require(path.join(studioRoot, 'server'))

const root = server.PROJECT_ROOT

const sample = {
  base: { width: 164, gap: 6, nested: { height: 80 } },
  circle: { width: 136, nested: { height: 72 } },
  pill: { width: 168 },
  rect: { width: 164 }
}
const changed = applyChanges(sample, 'circle', { width: 140, 'nested.height': 70, gap: 5 })
assert.strictEqual(changed.base.gap, 6)
assert.strictEqual(changed.circle.width, 140)
assert.strictEqual(changed.circle.gap, 5)
assert.strictEqual(changed.circle.nested.height, 70)
const reset = applyChanges(changed, 'circle', { gap: null, 'nested.height': null })
assert.ok(!Object.prototype.hasOwnProperty.call(reset.circle, 'gap'))
assert.ok(!Object.prototype.hasOwnProperty.call(reset.circle, 'nested'))

const source = "module.exports = {\n  base: { width: 164 },\n  circle: { width: 136, card: { height: 72 } },\n  pill: { width: 168 },\n  rect: { width: 164 }\n}\n"
const rewritten = rewriteShapeBlock(source, 'circle', { width: 140, card: { height: 68 } })
assert.ok(rewritten.includes("circle: {\n    width: 140,"))
assert.ok(rewritten.includes('card: { height: 68 }'))
assert.ok(rewritten.includes('base: { width: 164 }'))
assert.ok(rewritten.includes('pill: { width: 168 }'))

const ux = '<template><stack class="root"><text class="title" style="font-size: {{ titleSize }}px;">{{ title }}</text></stack></template><script>throw new Error()</script><style>.title{color:#fff}</style>'
const translated = translateUx(ux, { titleSize: 12 }, { width: 192, height: 192 }, { left: 20, top: 10, width: 152, height: 172 }, { title: '健康' })
assert.ok(translated.html.includes('data-vela-tag="stack"'))
assert.ok(translated.html.includes('data-vela-tag="text"'))
assert.ok(translated.html.includes('健康'))
assert.ok(!translated.html.includes('<script>'))
assert.ok(translated.css.includes('.title'))
assert.ok(translated.css.includes('box-sizing:border-box!important'), 'Studio must emulate Vela size semantics instead of browser content-box expansion')

const loopUx = '<template><div class="root"><div class="bars"><div class="bar" for="{{ heartBars }}" style="height: {{ $item.height }}px; background-color: {{ $item.color }};"></div></div><text if="{{ isCircle }}">圆屏</text><text if="{{ isPill }}">手环</text></div></template><style>.bars{display:flex}</style>'
const loopPreview = translateUx(loopUx, { shape: 'circle', chartHeight: 18, trendMinHeight: 5 }, { width: 192, height: 192 }, { left: 20, top: 10, width: 152, height: 172 }, {})
assert.strictEqual((loopPreview.html.match(/class="bar"/g) || []).length, 10, 'for renderer must expand representative preview items')
assert.ok(loopPreview.html.includes('圆屏'))
assert.ok(!loopPreview.html.includes('手环'))
assert.ok(loopPreview.html.includes('background-color: #FF375F') || loopPreview.html.includes('background-color: #7A2436'))

Object.values(PROFILES).forEach(profile => {
  assert.ok(['circle', 'pill', 'rect'].includes(profile.formFactor))
})
Object.values(APPS).forEach(app => {
  assert.ok(fs.existsSync(path.join(root, app.page)), app.id + ' UX 页面必须存在')
  assert.ok(fs.existsSync(path.join(root, app.appDir, 'layout.js')), app.id + ' layout.js 必须存在')
  assert.ok(fs.existsSync(path.join(root, app.appDir, 'index.js')), app.id + ' resolver 必须存在')
})

const heart = server.buildProject('heart', 'circle', {})
assert.strictEqual(heart.app.level, 'L1')
assert.strictEqual(heart.plan.designSystem, 'declarative-adapter-v2.3')
assert.ok(heart.groups.some(group => group.id === 'hero'))
assert.ok(heart.ux.html.includes('health-stream'))
assert.strictEqual((heart.ux.html.match(/class="trend-bar"/g) || []).length, 30, 'Health preview should render all three representative trend series')
assert.ok(heart.safe.width > 0)

const heartDraft = server.buildProject('heart', 'circle', { heroOuterHeight: 78 })
const heroField = heartDraft.groups.find(group => group.id === 'hero').fields.find(field => field.path === 'heroOuterHeight')
assert.strictEqual(heroField.value, 78)
assert.strictEqual(heroField.source, 'override')

const workout = server.buildProject('workout', 'circle', { 'hero.top': 47 })
assert.strictEqual(workout.plan.hero.top, 47)
assert.ok(workout.components.some(component => component.id === 'hero'))
assert.throws(() => server.validateChanges(APPS.heart, { '__proto__.bad': 1 }), /不允许修改字段/)

console.log('Layout Studio v2.4 contracts verified: local UX preview, Vela-like box model, loop/condition rendering and minimal shape overrides')
