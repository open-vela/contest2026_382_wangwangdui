const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8') }
const manifest = JSON.parse(read('src/manifest.json'))
const errors = []

function requireCondition(condition, message) {
  if (!condition) errors.push(message)
}

function collectUxFiles(directory, result) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(function (entry) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) collectUxFiles(target, result)
    else if (entry.name.endsWith('.ux')) result.push(target)
  })
}

const features = new Set((manifest.features || []).map(function (item) { return item.name }))
const profileSource = read('src/presentation/viewport/profile.js')
const deviceCapabilitySource = read('src/capabilities/device.js')
const safeAreaSource = read('src/presentation/viewport/safe_area.js')
const runtimeSource = read('src/presentation/viewport/runtime.js')
const designRuntimeSource = read('src/presentation/layout/runtime.js')
const compatibilitySource = read('docs/COMPATIBILITY.md')
const launcherSource = read('src/pages/applist/applist.ux')
const honeycombBridgeSource = read('src/common/honeycomb_layout.js')
const honeycombSource = read('src/presentation/engines/honeycomb.js')
const applistSpecSource = read('src/presentation/layout/specs/applist.js')
const appCatalogSource = read('src/domain/apps/catalog.js')

requireCondition(manifest.minAPILevel <= 2, 'minAPILevel must remain compatible with target watch images')
requireCondition(typeof manifest.config.designWidth === 'number', 'config.designWidth must remain numeric')
requireCondition(manifest.display && manifest.display.fullScreen === true, 'wearable display must use fullScreen mode')
requireCondition(manifest.display && manifest.display.titleBar === false, 'wearable display must hide the host title bar')
requireCondition(manifest.router && manifest.router.entry === 'pages/clock_guard', 'clock_guard must remain the entry page')
requireCondition(features.has('system.device'), 'system.device feature is required for viewport detection')

requireCondition(deviceCapabilitySource.includes("from '@system.device'"), 'Vela device API must stay inside capabilities/device')
requireCondition(profileSource.includes("../../capabilities/device"), 'viewport profile must consume the device capability gateway')
requireCondition(!profileSource.includes('../../platform/vela/device'), 'viewport profile must not regress to the legacy platform device adapter')
requireCondition(profileSource.includes('pendingCallbacks'), 'viewport profile must share concurrent device requests')
requireCondition(profileSource.includes('screenWidth'), 'viewport profile must expose screen width')
requireCondition(profileSource.includes('screenHeight'), 'viewport profile must expose screen height')
requireCondition(profileSource.includes('xiaomi_band_10'), 'viewport profile must retain the Band 10 family')
requireCondition(profileSource.includes("model === 'Emulator-Vela'"), 'beta correction must remain emulator-gated')
requireCondition(profileSource.includes('platformVersionCode === 1200'), 'beta correction must remain platform-version-gated')
requireCondition(profileSource.includes("formFactor === 'pill'"), 'beta correction must remain pill-only')
requireCondition(profileSource.includes('geometry.logicalHeight'), 'physical height must be projected into design coordinates')
requireCondition(profileSource.includes('safeArea.resolve(profile)'), 'profile must expose computed safe geometry')
requireCondition(safeAreaSource.includes('circleBandForWidth'), 'safe-area layer must model circle chords')
requireCondition(safeAreaSource.includes('capsuleCapInset'), 'safe-area layer must model pill caps')
requireCondition(runtimeSource.includes('screenProfile.resolve'), 'page viewport runtime must resolve one shared profile')
requireCondition(designRuntimeSource.includes('viewportRuntime.apply(page, profile)'), 'design engine runtime must project the shared viewport before layout')

const targetSkins = [
  'redmi_watch', 'xiaomi_band', 'xiaomi_band_10', 'xiaomi_band_pro',
  'xiaomi_s4', 'xiaomi_s4_41', 'xiaomi_watch'
]
targetSkins.forEach(function (skin) {
  requireCondition(compatibilitySource.includes('`' + skin + '`'), 'compatibility matrix is missing: ' + skin)
})

;[
  'src/capabilities/device.js',
  'src/presentation/viewport/profile.js',
  'src/presentation/viewport/geometry.js',
  'src/presentation/viewport/safe_area.js',
  'src/presentation/viewport/runtime.js',
  'src/presentation/layout/runtime.js',
  'src/presentation/layout/free_surface.js',
  'src/presentation/layout/specs/applist.js',
  'src/presentation/engines/honeycomb.js',
  'src/domain/apps/catalog.js',
  'src/common/page_viewport.js',
  'src/common/launcher_apps.js',
  'src/common/honeycomb_layout.js',
  'src/components/watchfaces/sport_circle.ux',
  'src/components/watchfaces/simple_circle.ux',
  'src/components/watchfaces/dashboard_circle.ux',
  'src/components/watchfaces/mechanical_circle.ux',
  'src/components/watchfaces/alpine.ux'
].forEach(function (name) {
  requireCondition(fs.existsSync(path.join(root, name)), 'missing multi-screen file: ' + name)
})

const pageFiles = []
collectUxFiles(path.join(root, 'src', 'pages'), pageFiles)
pageFiles.forEach(function (filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  requireCondition(!/width:\s*192px;\s*\r?\n\s*height:\s*490px;/m.test(source), path.relative(root, filePath) + ' fixes the old root viewport')
})

Object.keys(manifest.router.pages || {}).forEach(function (route) {
  const page = manifest.router.pages[route]
  const relativePath = path.join('src', route, page.component + '.ux')
  const pagePath = path.join(root, relativePath)
  requireCondition(fs.existsSync(pagePath), 'manifest page source is missing: ' + relativePath)
  if (!fs.existsSync(pagePath)) return
  const source = fs.readFileSync(pagePath, 'utf8')
  ;[
    '{{ viewportClass }}',
    'position: {{ viewportPosition }}',
    'left: {{ viewportLeft }}',
    'top: {{ viewportTop }}',
    'width: {{ viewportWidth }}',
    'height: {{ viewportHeight }}'
  ].forEach(function (token) {
    requireCondition(source.includes(token), relativePath + ' is missing viewport binding: ' + token)
  })
  requireCondition(source.includes("viewportPosition: 'relative'"), relativePath + ' must initialize viewport position')
  requireCondition(
    source.includes('pageViewport.bind(') || source.includes('screenProfile.resolve') || source.includes('layoutRuntime.bind('),
    relativePath + ' must resolve viewport directly or through the design engine'
  )
})

requireCondition(launcherSource.includes("import honeycombLayout from '../../presentation/engines/honeycomb'"), 'L3 applist must consume the presentation honeycomb engine directly')
requireCondition(launcherSource.includes("import appCatalog from '../../domain/apps/catalog'"), 'L3 applist must consume the shared domain app catalog')
requireCondition(launcherSource.includes("import freeSurface from '../../presentation/layout/free_surface'"), 'L3 applist must resolve art-directed surfaces through free_surface')
requireCondition(launcherSource.includes("surface === 'designed-grid'"), 'rect launcher must render its own designed grid surface')
requireCondition(launcherSource.includes("surface === 'paged-list'"), 'pill launcher must retain its own paged list surface')
requireCondition(launcherSource.includes('honeycombLayout.buildSlots'), 'applist must delegate slot construction')
requireCondition(launcherSource.includes('honeycombLayout.layoutSlots'), 'applist must delegate frame projection')
requireCondition(launcherSource.includes('honeycombLayout.pickSlotByDirection'), 'applist must delegate directional focus')
requireCondition(launcherSource.includes('honeycombLayout.nextDragOffset'), 'applist must delegate drag damping')
requireCondition(launcherSource.includes('honeycombLayout.backOut'), 'applist must delegate snap easing')
;['CIRCLE_SPACING', 'CIRCLE_EMPHASIS_FALLOFF', 'CIRCLE_ELASTIC_RANGE', 'CIRCLE_GRID_COORDS'].forEach(function (token) {
  requireCondition(!launcherSource.includes(token), 'applist duplicated honeycomb geometry: ' + token)
})
requireCondition(applistSpecSource.includes("surface: 'honeycomb'"), 'L3 applist spec must retain circle Honeycomb')
requireCondition(applistSpecSource.includes("surface: 'paged-list'"), 'L3 applist spec must retain pill list')
requireCondition(applistSpecSource.includes("surface: 'designed-grid'"), 'L3 applist spec must define rect grid')
requireCondition(!appCatalogSource.includes('PILL_APP_IDS') && !appCatalogSource.includes('CIRCLE_APP_IDS'), 'domain app catalog must remain screen-agnostic')
requireCondition(honeycombBridgeSource.includes("../presentation/engines/honeycomb"), 'common honeycomb path must remain a thin compatibility bridge')
requireCondition(honeycombBridgeSource.split(/\r?\n/).filter(Boolean).length <= 2, 'common honeycomb bridge must not regain visual-engine implementation')
requireCondition(honeycombSource.includes('SPACING = 46'), 'L3 honeycomb engine must retain golden-reference spacing')
requireCondition(honeycombSource.includes('FOCUS_Y = 90'), 'L3 honeycomb engine must retain golden-reference focus point')
requireCondition(honeycombSource.includes('ICON_BASE = 34'), 'L3 honeycomb engine must retain golden-reference icon size')

if (errors.length) {
  errors.forEach(function (error) { console.error('multiscreen error: ' + error) })
  process.exitCode = 1
} else {
  console.log('Checked capability viewport, Design Engine entry paths, target skins, and L3 launcher surfaces')
}
