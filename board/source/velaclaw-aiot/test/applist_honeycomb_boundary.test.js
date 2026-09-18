const assert = require('assert')
const fs = require('fs')
const path = require('path')
const freeSurface = require('../src/presentation/layout/free_surface')
const applistSpec = require('../src/presentation/layout/specs/applist')
const appCatalog = require('../src/domain/apps/catalog')

const root = path.join(__dirname, '..')
const applistPath = path.join(root, 'src', 'pages', 'applist', 'applist.ux')
const source = fs.readFileSync(applistPath, 'utf8')
const bridge = fs.readFileSync(path.join(root, 'src', 'common', 'honeycomb_layout.js'), 'utf8')
const engine = fs.readFileSync(path.join(root, 'src', 'presentation', 'engines', 'honeycomb.js'), 'utf8')
const catalogSource = fs.readFileSync(path.join(root, 'src', 'domain', 'apps', 'catalog.js'), 'utf8')

assert.ok(source.includes("import honeycombLayout from '../../presentation/engines/honeycomb'"), 'L3 applist must import the honeycomb presentation engine directly')
assert.ok(source.includes("import appCatalog from '../../domain/apps/catalog'"), 'launcher surfaces must share one domain app catalog')
assert.ok(source.includes("import freeSurface from '../../presentation/layout/free_surface'"), 'L3 launcher must resolve surface strategy outside the page')
assert.ok(source.includes("import applistLayout from '../../presentation/layout/specs/applist'"), 'L3 launcher design decision must live in a spec')
assert.ok(source.includes('honeycombLayout.buildSlots'), 'slot construction must be delegated to honeycomb engine')
assert.ok(source.includes('honeycombLayout.layoutSlots'), 'per-frame geometry must be delegated to honeycomb engine')
assert.ok(source.includes('honeycombLayout.pickSlotByDirection'), 'direction picking must be delegated to honeycomb engine')
assert.ok(source.includes('honeycombLayout.nextDragOffset'), 'drag projection must be delegated to honeycomb engine')
assert.ok(source.includes('honeycombLayout.backOut'), 'snap easing must be delegated to honeycomb engine')
assert.ok(source.includes("surface === 'paged-list'"), 'pill list must be a distinct L3 surface')
assert.ok(source.includes("surface === 'designed-grid'"), 'rect grid must be a distinct L3 surface')

;[
  'CIRCLE_SPACING',
  'CIRCLE_ROW_HEIGHT',
  'CIRCLE_HALF_STEP',
  'CIRCLE_EMPHASIS_FALLOFF',
  'CIRCLE_ELASTIC_BASE',
  'CIRCLE_ELASTIC_RANGE',
  'CIRCLE_GRID_COORDS'
].forEach(function (token) {
  assert.ok(!source.includes(token), 'applist leaked honeycomb geometry constant: ' + token)
})

assert.ok(!source.includes('Math.sqrt(CIRCLE_SPACING'), 'applist must not regenerate honeycomb lattice geometry')
assert.ok(!source.includes('distance / alignment'), 'applist must not duplicate directional geometry scoring')
assert.ok(!source.includes('launcherApps.createCircleApps'), 'page must not own screen-specific app catalogs')
assert.ok(!source.includes('launcherApps.createPillApps'), 'page must not own screen-specific app catalogs')
assert.ok(bridge.includes("../presentation/engines/honeycomb"), 'common path must remain a compatibility bridge to the L3 engine')
assert.ok(bridge.split(/\r?\n/).filter(Boolean).length <= 2, 'compatibility bridge must not regain honeycomb implementation')
assert.ok(engine.includes('SPACING = 46'), 'presentation engine must own lattice spacing')
assert.ok(engine.includes('FOCUS_Y = 90'), 'presentation engine must own focus geometry')
assert.ok(engine.includes('ICON_BASE = 34'), 'presentation engine must own icon geometry')

assert.strictEqual(applistSpec.freedomLevel, 3, 'launcher must explicitly declare L3 free design')
assert.strictEqual(applistSpec.strategy, 'free')
const circle = freeSurface.resolve({ formFactor: 'circle', logicalHeight: 192 }, applistSpec)
const pill = freeSurface.resolve({ formFactor: 'pill', logicalHeight: 490 }, applistSpec)
const rect = freeSurface.resolve({ formFactor: 'rect', logicalHeight: 228 }, applistSpec)
assert.strictEqual(circle.surface, 'honeycomb', 'circle launcher remains honeycomb')
assert.strictEqual(pill.surface, 'paged-list', 'pill launcher remains paged list')
assert.strictEqual(rect.surface, 'designed-grid', 'rect launcher must have its own designed grid')
assert.strictEqual(rect.columns, 2, 'rect grid is a two-column composition')
assert.strictEqual(rect.pageSize, 6, 'rect grid should expose six apps per page')
assert.ok(appCatalog.list(circle.appIds).length === circle.appIds.length, 'all circle surface ids must resolve through shared app catalog')
assert.ok(appCatalog.list(rect.appIds).length === rect.appIds.length, 'all rect surface ids must resolve through shared app catalog')
assert.ok(!catalogSource.includes('PILL_APP_IDS') && !catalogSource.includes('CIRCLE_APP_IDS'), 'domain app catalog must not know screen-specific product surfaces')

console.log('applist L3 verified: shared app semantics feed independent honeycomb/list/grid surfaces')
