/*
 * design-studio / static checks
 * ---------------------------------------------------------------------------
 * The editor is browser code, so the tests here focus on what can be verified
 * without a DOM: the schema, the geometry maths, the export contract and the
 * integrity of the shipped web bundle.
 *
 * Run: node tools/design-studio/test/design_studio.test.js
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const STUDIO_ROOT = path.resolve(__dirname, '..')
const WEB = path.join(STUDIO_ROOT, 'web')
const JS = path.join(WEB, 'js')

const results = []

function test(name, fn) {
  try {
    fn()
    results.push({ name, ok: true })
  } catch (error) {
    results.push({ name, ok: false, error })
  }
}

async function testAsync(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
  } catch (error) {
    results.push({ name, ok: false, error })
  }
}

function read(file) {
  return fs.readFileSync(path.join(JS, file), 'utf8')
}

/* ------------------------------------------------------------------ files */

test('web bundle exists', () => {
  const required = [
    'index.html',
    'styles/tokens.css',
    'styles/app.css',
    'styles/canvas.css',
    'js/app.js',
    'js/schema.js',
    'js/store.js',
    'js/geometry.js',
    'js/render.js',
    'js/interact.js',
    'js/inspector.js',
    'js/panels.js',
    'js/preview.js',
    'js/export.js',
    'js/exportui.js',
    'js/icons.js'
  ]
  required.forEach((relative) => {
    assert.ok(fs.existsSync(path.join(WEB, relative)), `缺少 ${relative}`)
  })
})

test('index.html wires every module it needs', () => {
  const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8')
  assert.ok(html.includes('type="module"'), '必须以 ES module 加载')
  assert.ok(html.includes('./js/app.js'), '缺少 app.js 入口')
  assert.ok(html.includes('./styles/tokens.css'))
  assert.ok(html.includes('./styles/canvas.css'))
  const ids = [
    'app',
    'topbar',
    'viewport',
    'artboard',
    'overlayLayer',
    'inspectorBody',
    'panelBody',
    'pageTabs',
    'modal',
    'previewOverlay',
    'toastStack'
  ]
  ids.forEach((id) => {
    assert.ok(html.includes(`id="${id}"`), `缺少 #${id}`)
  })
})

test('no module imports anything that does not exist', () => {
  const files = fs.readdirSync(JS).filter((name) => name.endsWith('.js'))
  files.forEach((name) => {
    const source = read(name)
    const pattern = /from\s+'\.\/([\w.-]+\.js)'/g
    let match
    while ((match = pattern.exec(source)) !== null) {
      assert.ok(fs.existsSync(path.join(JS, match[1])), `${name} 引用了不存在的 ${match[1]}`)
    }
  })
})

/* ----------------------------------------------------------------- schema */

test('palette exposes stable component ids', () => {
  const source = read('schema.js')
  const expected = ['rect', 'ellipse', 'line', 'ring', 'title', 'label', 'metric', 'card', 'stack', 'grid', 'honeycomb', 'button', 'iconButton', 'progress', 'iconSlot', 'listRow', 'chart']
  expected.forEach((id) => {
    assert.ok(source.includes(`id: '${id}'`), `组件库缺少 ${id}`)
  })
})

test('devices cover the wearable shapes plus phone', () => {
  const source = read('schema.js')
  assert.ok(source.includes("id: 'circle'"))
  assert.ok(source.includes("id: 'pill'"))
  assert.ok(source.includes("id: 'rect'"))
  assert.ok(source.includes("id: 'phone'"))
  assert.ok(source.includes('192'), '穿戴设备设计宽度应为 192')
})

/* --------------------------------------------------------------- geometry */

test('boundingBox keeps the size of an unrotated element', () => {
  const geometry = loadGeometry()
  const box = geometry.boundingBox({ x: 10, y: 20, w: 40, h: 30, rotation: 0 })
  assert.deepStrictEqual(box, { x: 10, y: 20, w: 40, h: 30 })
})

test('boundingBox grows for a rotated element', () => {
  const geometry = loadGeometry()
  const box = geometry.boundingBox({ x: 0, y: 0, w: 40, h: 20, rotation: 90 })
  assert.ok(Math.abs(box.w - 20) < 1e-6, `宽度应变为 20，实际 ${box.w}`)
  assert.ok(Math.abs(box.h - 40) < 1e-6, `高度应变为 40，实际 ${box.h}`)
})

test('snapPosition snaps to the artboard centre', () => {
  const geometry = loadGeometry()
  const result = geometry.snapPosition({ x: 73, y: 0, w: 46, h: 20 }, [], { artboard: { width: 192, height: 192 }, threshold: 5 })
  assert.strictEqual(result.x, 73)
  assert.ok(result.guides.length >= 0)
  const centred = geometry.snapPosition({ x: 72, y: 0, w: 48, h: 20 }, [], { artboard: { width: 192, height: 192 }, threshold: 5 })
  assert.strictEqual(centred.x, 72, '元素水平中心 96 正好等于画板中心，不应被推动')
  const nearlyCentred = geometry.snapPosition({ x: 71, y: 0, w: 48, h: 20 }, [], { artboard: { width: 192, height: 192 }, threshold: 5 })
  assert.strictEqual(nearlyCentred.x, 72, '相差 1px 时应吸附到画板中心')
})

test('snapPosition snaps to a sibling edge', () => {
  const geometry = loadGeometry()
  const sibling = { x: 100, y: 0, w: 40, h: 20 }
  const result = geometry.snapPosition({ x: 58, y: 40, w: 40, h: 20 }, [sibling], { threshold: 5 })
  assert.strictEqual(result.x, 60, '右边缘应吸附到兄弟元素的左边缘')
})

test('resizeBox respects the anchor edge', () => {
  const geometry = loadGeometry()
  const se = geometry.resizeBox({ x: 10, y: 10, w: 20, h: 20 }, 'se', { x: 5, y: 5 })
  assert.deepStrictEqual(se, { x: 10, y: 10, w: 25, h: 25 })
  const nw = geometry.resizeBox({ x: 10, y: 10, w: 20, h: 20 }, 'nw', { x: -5, y: -5 })
  assert.deepStrictEqual(nw, { x: 5, y: 5, w: 25, h: 25 })
})

test('screenDeltaToLocal rotates the pointer delta', () => {
  const geometry = loadGeometry()
  const local = geometry.screenDeltaToLocal({ x: 10, y: 0 }, 90)
  assert.ok(Math.abs(local.x) < 1e-9, `x 应约为 0，实际 ${local.x}`)
  assert.ok(Math.abs(local.y + 10) < 1e-9, `y 应约为 -10，实际 ${local.y}`)
})

test('chordWidth shrinks away from the circle centre', () => {
  const geometry = loadGeometry()
  const centre = geometry.chordWidth(192, 88, 16)
  const edge = geometry.chordWidth(192, 8, 16)
  assert.ok(centre > edge, '靠近圆心的弦宽必须更大')
  assert.ok(edge > 0, '圆内区域应有可用弦宽')
  assert.strictEqual(geometry.chordWidth(192, 200, 10), 0, '完全在圆外时应为 0')
})

/* ----------------------------------------------------------------- export */

test('export module documents the agent contract', () => {
  const source = read('export.js')
  assert.ok(source.includes('designstudio/v1') || source.includes('SCHEMA_VERSION'))
  assert.ok(source.includes('agentInstructions'), '导出 JSON 必须包含 agentInstructions')
  assert.ok(source.includes('buildPromptJson'))
  assert.ok(source.includes('buildSummary'))
  assert.ok(source.includes('buildVelaCode'))
})

test('exported fields cover box, style, note and flows', () => {
  const source = read('export.js')
  ;['box', 'rotation', 'opacity', 'sizeMode', 'style', 'note', 'interactions', 'children', 'flows', 'groups'].forEach((key) => {
    assert.ok(source.includes(key), `导出结构缺少 ${key}`)
  })
})

/* --------------------------------------------------------------- editor UX */

test('interaction supports the required gestures', () => {
  const source = read('interact.js')
  ;['handleSurfacePointerDown', 'handleHandlePointerDown', 'handleDoubleClick', 'handleDrop', 'handleWheel', 'contextmenu'].forEach((key) => {
    assert.ok(source.includes(key), `交互层缺少 ${key}`)
  })
  assert.ok(source.includes("kind: 'marquee'"), '缺少框选')
  assert.ok(source.includes("kind: 'pan'"), '缺少平移')
})

test('app wires the mandatory keyboard shortcuts', () => {
  const source = read('app.js')
  ;['ctrl', 'meta'].forEach((mod) => assert.ok(source.includes(mod), `缺少 ${mod} 组合键处理`))
  ;["'z'", "'d'", "'c'", "'v'", "'g'", "'e'", "'a'"].forEach((key) => {
    assert.ok(source.includes(key), `缺少快捷键 ${key}`)
  })
  assert.ok(source.includes('ArrowLeft'), '缺少方向键微调')
  assert.ok(source.includes('Delete'), '缺少删除键处理')
})

test('inspector exposes size, color, radius, note and interactions', () => {
  const source = read('inspector.js')
  ;['位置与尺寸', '外观', '填充', '描边', '圆角', '语义备注', '交互 / 跳转'].forEach((label) => {
    assert.ok(source.includes(label), `属性面板缺少「${label}」`)
  })
  assert.ok(source.includes('scrub'), '数字输入需要支持拖动调节')
})

test('panels cover palette, layers, pages and tokens', () => {
  const source = read('panels.js')
  ;['renderInsert', 'renderLayers', 'renderPages', 'renderTokens'].forEach((fn) => {
    assert.ok(source.includes(fn), `面板缺少 ${fn}`)
  })
  assert.ok(source.includes('reparentElement'), '图层需要支持拖入组合')
  assert.ok(source.includes('跳转总览'), '页面面板需要展示跳转总览')
})

test('preview supports navigation, swipe and back', () => {
  const source = read('preview.js')
  ;['attachSwipe', 'makeHotspot', 'goBack', 'navigate'].forEach((fn) => {
    assert.ok(source.includes(fn), `预览缺少 ${fn}`)
  })
})

test('no leftover references to the removed layout studio', () => {
  const files = fs.readdirSync(JS)
  files.forEach((name) => {
    const source = read(name)
    assert.ok(!/layout-studio|layout_studio/i.test(source), `${name} 仍在引用旧的 layout-studio`)
  })
})

/* ----------------------------------------------------------------- server */

test('server is local-only and dependency free', () => {
  const source = fs.readFileSync(path.join(STUDIO_ROOT, 'server.js'), 'utf8')
  assert.ok(source.includes('127.0.0.1'), '必须只监听本机地址')
  assert.ok(!/require\('(express|koa|fastify)'\)/.test(source), '服务端不应引入第三方依赖')
  assert.ok(source.includes('/api/health'))
  assert.ok(source.includes('/api/documents'))
})

void testAsync

/* ------------------------------------------------------------------ runner */

function loadGeometry() {
  const source = read('geometry.js')
  const shim = source
    .replace(/^export const /gm, 'const ')
    .replace(/^export function /gm, 'function ')
    .concat('\nmodule.exports = { boundingBox, boxOf, snapPosition, resizeBox, screenDeltaToLocal, chordWidth, rotatePoint, unionBox, containsPoint, intersects, clampToArtboard, roundTo, SNAP_THRESHOLD }\n')
  const module = { exports: {} }
  // eslint-disable-next-line no-new-func
  const factory = new Function('module', 'exports', shim)
  factory(module, module.exports)
  return module.exports
}

let failed = 0
results.forEach((result) => {
  const mark = result.ok ? 'PASS' : 'FAIL'
  if (!result.ok) failed += 1
  process.stdout.write(`${mark}  ${result.name}\n`)
  if (!result.ok) process.stdout.write(`      ${result.error && result.error.message}\n`)
})
process.stdout.write(`\n${results.length - failed}/${results.length} design-studio checks passed\n`)
if (failed) process.exitCode = 1
