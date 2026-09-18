const assert = require('assert')
const freeSurface = require('../src/presentation/layout/free_surface')
const selectorLayout = require('../src/presentation/layout/specs/watchface_selector')
const selectorMapper = require('../src/presentation/mappers/watchface_selector')
const faceCatalog = require('../src/domain/watchface/catalog')

function profile(shape, height) {
  return { formFactor: shape, logicalHeight: height }
}

const circle = freeSurface.resolve(profile('circle', 192), selectorLayout)
const pill = freeSurface.resolve(profile('pill', 490), selectorLayout)
const rect = freeSurface.resolve(profile('rect', 228), selectorLayout)

assert.strictEqual(circle.freedomLevel, 3)
assert.strictEqual(circle.surface, 'preview-swiper')
assert.deepStrictEqual(circle.itemIds, ['sport', 'simple', 'dashboard', 'mechanical'])
assert.strictEqual(circle.itemIds.indexOf('alpine'), -1, 'circle surface must not expose alpine')

assert.strictEqual(pill.surface, 'cards-pager')
assert.strictEqual(pill.pageSize, 2)
assert.deepStrictEqual(pill.itemIds, ['sport', 'simple', 'dashboard', 'alpine'])
assert.strictEqual(pill.itemIds.indexOf('mechanical'), -1, 'pill surface must not expose mechanical')

assert.strictEqual(rect.surface, 'preview-grid')
assert.strictEqual(rect.columns, 2)
assert.deepStrictEqual(rect.itemIds, ['sport', 'simple', 'dashboard'])

const rectSelection = selectorMapper.mapFaces(rect.itemIds, 'alpine')
assert.strictEqual(rectSelection.selectedId, 'sport', 'unavailable persisted face must normalize to the surface first face')
assert.strictEqual(rectSelection.selectedIndex, 0)
assert.strictEqual(rectSelection.faces[0].selected, true)

const pillSelection = selectorMapper.mapFaces(pill.itemIds, 'dashboard')
assert.strictEqual(selectorMapper.pageIndex(pillSelection.selectedIndex, pill.pageSize), 1, 'dashboard must open pill page two')
assert.strictEqual(faceCatalog.get('dashboard').accent, '#32D74B')

console.log('Watchface L3 selector verified: shared catalog feeds independent swiper/cards/grid surfaces')
