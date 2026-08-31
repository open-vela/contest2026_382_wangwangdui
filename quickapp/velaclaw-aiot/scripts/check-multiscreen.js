const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'manifest.json'), 'utf8'))
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

const featureNames = new Set((manifest.features || []).map(function (feature) {
  return feature.name
}))

const profileSource = fs.readFileSync(path.join(root, 'src', 'common', 'screen_profile.js'), 'utf8')
const appSource = fs.readFileSync(path.join(root, 'src', 'app.ux'), 'utf8')
const compatibilitySource = fs.readFileSync(path.join(root, 'docs', 'COMPATIBILITY.md'), 'utf8')

requireCondition(manifest.minAPILevel <= 2, 'minAPILevel must remain compatible with vela-miwear-watch-5.0')
requireCondition(typeof manifest.config.designWidth === 'number', 'config.designWidth must be numeric for proportional scaling')
requireCondition(manifest.display && manifest.display.fullScreen === true, 'wearable display must use fullScreen mode')
requireCondition(manifest.display && manifest.display.titleBar === false, 'wearable display must hide the host title bar')
requireCondition(manifest.router && manifest.router.entry === 'pages/clock_guard', 'manifest must retain the beta-safe clock guard entry')
requireCondition(featureNames.has('system.device'), 'system.device must be declared for runtime screen-profile detection')
requireCondition(profileSource.includes('device.getInfo'), 'screen profile must query complete system.device information')
requireCondition(profileSource.includes('pendingCallbacks'), 'screen profile must share concurrent device-profile requests')
requireCondition(profileSource.includes('screenWidth'), 'screen profile must expose screen dimensions')
requireCondition(profileSource.includes('screenHeight'), 'screen profile must expose screen dimensions')
requireCondition(profileSource.includes('viewportClass'), 'screen profile must expose its diagnostic viewport class')
requireCondition(profileSource.includes('viewportPosition'), 'screen profile must expose inline viewport positioning')
requireCondition(profileSource.includes('viewportLeft'), 'screen profile must expose inline viewport offset')
requireCondition(profileSource.includes('viewportTop'), 'screen profile must expose the capsule safe top inset')
requireCondition(profileSource.includes('viewportWidth'), 'screen profile must expose inline viewport width')
requireCondition(profileSource.includes('viewportHeight'), 'screen profile must expose inline viewport height')
requireCondition(profileSource.includes('viewportMath.logicalHeight'), 'beta viewport height must be converted from physical to design coordinates')
requireCondition(profileSource.includes('pickViewportValue'), 'screen dimensions must prefer the actual page viewport')
requireCondition(profileSource.includes("return 'rect'"), 'screen profile must distinguish rectangular devices')
requireCondition(profileSource.includes('xiaomi_band_10'), 'screen profile must include the target device matrix')
requireCondition(profileSource.includes("model === 'Emulator-Vela'"), 'beta viewport correction must be emulator-gated')
requireCondition(profileSource.includes('platformVersionCode === 1200'), 'beta viewport correction must be platform-version-gated')
requireCondition(profileSource.includes("formFactor === 'pill'"), 'beta viewport correction must be pill-only')
requireCondition(!appSource.includes('.beta-pill-viewport'), 'beta correction must not rely on app-global dynamic class styles')

const targetSkins = [
  'redmi_watch',
  'xiaomi_band',
  'xiaomi_band_10',
  'xiaomi_band_pro',
  'xiaomi_s4',
  'xiaomi_s4_41',
  'xiaomi_watch'
]

targetSkins.forEach(function (skin) {
  requireCondition(compatibilitySource.includes('`' + skin + '`'), 'compatibility matrix is missing target skin: ' + skin)
})

const requiredFiles = [
  'src/common/screen_profile.js',
  'src/common/viewport_math.js',
  'src/common/face_registry.js',
  'src/common/face_scope.js',
  'assets/watchfaces/alpine_night_source.jpg',
  'scripts/fade-watchface-background.py',
  'src/common/launcher_apps.js',
  'src/components/watchfaces/sport_circle.ux',
  'src/components/watchfaces/simple_circle.ux',
  'src/components/watchfaces/dashboard_circle.ux',
  'src/components/watchfaces/mechanical_circle.ux',
  'src/components/watchfaces/alpine.ux',
  'src/common/watchfaces/alpine_night.jpg'
]

const iconNames = [
  'brightness',
  'calendar',
  'clock',
  'diagnostics',
  'faces',
  'health',
  'heart',
  'history',
  'motion',
  'notification',
  'settings',
  'sync',
  'vibration',
  'workout'
]

iconNames.forEach(function (iconName) {
  requiredFiles.push('assets/icons/' + iconName + '.svg')
  requiredFiles.push('src/common/icons/' + iconName + '.jpg')
})

requiredFiles.forEach(function (relativePath) {
  requireCondition(fs.existsSync(path.join(root, relativePath)), 'missing multi-screen file: ' + relativePath)
})

const pageFiles = []
collectUxFiles(path.join(root, 'src', 'pages'), pageFiles)
pageFiles.forEach(function (filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const fixedViewport = /width:\s*192px;\s*\r?\n\s*height:\s*490px;/m
  requireCondition(!fixedViewport.test(source), path.relative(root, filePath) + ' still fixes the old 192x490 root viewport')
})

Object.keys(manifest.router.pages || {}).forEach(function (route) {
  const page = manifest.router.pages[route]
  const relativePath = path.join('src', route, page.component + '.ux')
  const pagePath = path.join(root, relativePath)
  requireCondition(fs.existsSync(pagePath), 'manifest page source is missing: ' + relativePath)
  if (!fs.existsSync(pagePath)) return
  const source = fs.readFileSync(pagePath, 'utf8')
  requireCondition(source.includes('{{ viewportClass }}'), relativePath + ' must bind viewportClass on its root node')
  requireCondition(source.includes('position: {{ viewportPosition }}'), relativePath + ' must bind inline viewport position on its root node')
  requireCondition(source.includes('left: {{ viewportLeft }}'), relativePath + ' must bind inline viewport offset on its root node')
  requireCondition(source.includes('top: {{ viewportTop }}'), relativePath + ' must bind the resolved safe top inset on its root node')
  requireCondition(source.includes('width: {{ viewportWidth }}'), relativePath + ' must bind inline viewport width on its root node')
  requireCondition(source.includes('height: {{ viewportHeight }}'), relativePath + ' must bind inline viewport height on its root node')
  requireCondition(source.includes("viewportPosition: 'relative'"), relativePath + ' must initialize standard viewport position')

  // 视口写回有两种合规写法：走 page_viewport.bind 共享助手（首选），或页面内
  // 逐字段自行赋值（历史写法）。两者都要求最终把档案落到 6 个视口字段上。
  const usesSharedBinding = source.includes('pageViewport.bind(')
  if (usesSharedBinding) {
    requireCondition(
      /import\s+pageViewport\s+from\s+'(\.\.\/)+common\/page_viewport'/.test(source),
      relativePath + ' must import the shared page_viewport helper it calls'
    )
  } else {
    requireCondition(source.includes('self.viewportPosition = profile.viewportPosition'), relativePath + ' must apply resolved viewport position')
    requireCondition(source.includes('self.viewportLeft = profile.viewportLeft'), relativePath + ' must apply resolved viewport offset')
    requireCondition(source.includes('self.viewportWidth = profile.viewportWidth'), relativePath + ' must apply resolved viewport width')
    requireCondition(source.includes('self.viewportHeight = profile.viewportHeight'), relativePath + ' must apply resolved viewport height')
    requireCondition(source.includes('screenProfile.resolve'), relativePath + ' must resolve the screen profile')
  }
})

const launcherSource = fs.readFileSync(path.join(root, 'src', 'common', 'launcher_apps.js'), 'utf8')
const circleAppsSource = launcherSource.split('var CIRCLE_APP_IDS =')[1].split(']')[0]
requireCondition(!circleAppsSource.includes('notification'), 'circle launcher must defer notifications to the Watch S4 system UI')
requireCondition(launcherSource.includes('createPillApps'), 'pill and circle launchers must share the app catalog')

iconNames.forEach(function (iconName) {
  const jpgPath = path.join(root, 'src', 'common', 'icons', iconName + '.jpg')
  requireCondition(fs.statSync(jpgPath).size > 1000, 'rendered icon is unexpectedly small: ' + iconName + '.jpg')
})

;['brightness', 'calendar', 'clock', 'faces', 'health', 'heart', 'history', 'notification', 'settings', 'sync', 'vibration', 'workout'].forEach(function (iconName) {
  requireCondition(launcherSource.includes('/common/icons/' + iconName + '.jpg'), 'app catalog is missing icon: ' + iconName)
  const softPath = path.join(root, 'src', 'common', 'icons', 'soft', iconName + '.jpg')
  requireCondition(fs.existsSync(softPath), 'circle launcher is missing softened icon: ' + iconName + '.jpg')
  if (fs.existsSync(softPath)) requireCondition(fs.statSync(softPath).size > 700, 'softened icon is unexpectedly small: ' + iconName + '.jpg')
})

const launcherPageSource = fs.readFileSync(path.join(root, 'src', 'pages', 'applist', 'applist.ux'), 'utf8')
const settingsPageSource = fs.readFileSync(path.join(root, 'src', 'pages', 'settings', 'settings', 'settings.ux'), 'utf8')
requireCondition(!launcherPageSource.includes('<scroll'), 'application list must use fixed pages instead of scroll')
requireCondition(!launcherPageSource.includes('<swiper'), 'application list must not use a native swiper')
requireCondition(launcherPageSource.includes('circleSlots'), 'circle launcher must build fixed honeycomb slots')
requireCondition(launcherPageSource.includes('var CIRCLE_GRID_COORDS'), 'circle launcher must use fixed honeycomb coordinates')
requireCondition(launcherPageSource.includes('center-label'), 'circle launcher must label the enlarged center application')
requireCondition(launcherPageSource.includes('center-hint'), 'circle launcher must reserve a separate center name/hint band')
requireCondition(!launcherPageSource.includes('class="center-label" @click'), 'circle launcher name band must not intercept free dragging')
// 这两条约束的是行为而非写法：外围图标要降透明度、要用柔化图。
// 槽位对象改为逐字段构造后，语句形式从 `next.x = ...` 变成对象字面量键值，
// 因此按「键 + 值」匹配，不再绑定具体的赋值语句写法。
requireCondition(/opacity:\s*0\.5 \+ emphasis \* 0\.5/.test(launcherPageSource), 'surrounding circle applications must be visually subdued')
// 换图阈值必须落在「聚焦判定半径」与「晶格间距」之间，否则邻居静止位贴着
// 阈值来回抖动会导致图标反复重载。旧值 45 距离间距 46 只差 1px。
requireCondition(/icon:\s*distance < 30 \? slot\.normalIcon : slot\.softIcon/.test(launcherPageSource), 'surrounding circle applications must use softened JPG assets')
requireCondition(launcherPageSource.includes('buildCircleSlots'), 'circle launcher must build a fixed app honeycomb')
requireCondition(launcherPageSource.includes('CIRCLE_DIRECTION_STEPS'), 'circle launcher must map eight swipe directions')
requireCondition(launcherPageSource.includes('circleDragOffsetX'), 'circle launcher must track the two-dimensional drag vector')
requireCondition(launcherPageSource.includes('@touchmove="handleCircleTouchMove"'), 'circle launcher must support free two-axis touch movement')
requireCondition(launcherPageSource.includes('circleDragOffset'), 'circle launcher must expose continuous drag offset')
requireCondition(launcherPageSource.includes('updateCircleSlotPositions'), 'circle launcher must update slots during free drag')
requireCondition(launcherPageSource.includes('CIRCLE_SNAP_DISTANCE'), 'circle launcher must snap free drag to the nearest focus')
requireCondition(launcherPageSource.includes('circleDragFocusIndex'), 'circle launcher must derive the selected icon from the drag position')
requireCondition(launcherPageSource.includes('CIRCLE_DRAG_DAMPING'), 'circle launcher must dampen sensitive finger movement')
requireCondition(launcherPageSource.includes('CIRCLE_MAX_FRAME_DELTA'), 'circle launcher must cap anomalous touch frame deltas')
requireCondition(launcherPageSource.includes('circleTouchActive'), 'circle launcher must guard duplicate swipe/touch sessions')
requireCondition(launcherPageSource.includes('snapCircleFocus'), 'circle launcher must smoothly settle after release')
requireCondition(launcherPageSource.includes('avoidanceProgress'), 'circle launcher icons must yield to the name band')
requireCondition(launcherPageSource.includes('backStrength'), 'circle launcher must use a mild release rebound')
requireCondition(launcherPageSource.includes('elasticFollow'), 'all circle icons must use elastic drag following')
// 不重叠原来靠每帧 O(n²) 斥力循环兜底。晶格间距恒为 46px 之后，
// 「最大图标半径之和 < 间距」成为纯几何事实，由 tests/honeycomb_layout.test.js
// 扫描全拖拽范围证明，因此这里改为约束晶格本身的规整性。
requireCondition(launcherPageSource.includes('var CIRCLE_SPACING'), 'circle launcher must derive slots from one uniform lattice spacing')
requireCondition(!launcherPageSource.includes('minimumDistance'), 'uniform lattice must make the per-frame repulsion pass unnecessary')

// 蜂巢几何参数在 applist.ux（运行时）与 honeycomb_layout.js（可测试副本）
// 各存一份。两者一旦漂移，test/honeycomb_layout.test.js 证明的「永不重叠」
// 就不再是页面的实际行为。这里逐项比对，把它们钉在一起。
const honeycombSource = fs.readFileSync(path.join(root, 'src', 'common', 'honeycomb_layout.js'), 'utf8')

function readNumber(source, name) {
  const match = source.match(new RegExp('var\\s+' + name + '\\s*=\\s*(-?\\d+(?:\\.\\d+)?)'))
  return match ? Number(match[1]) : null
}

;[
  ['CIRCLE_SPACING', 'SPACING'],
  ['CIRCLE_FOCUS_X', 'FOCUS_X'],
  ['CIRCLE_FOCUS_Y', 'FOCUS_Y'],
  ['CIRCLE_ICON_BASE', 'ICON_BASE'],
  ['CIRCLE_ICON_GROW', 'ICON_GROW'],
  ['CIRCLE_EMPHASIS_FALLOFF', 'EMPHASIS_FALLOFF'],
  ['CIRCLE_ELASTIC_BASE', 'ELASTIC_BASE'],
  ['CIRCLE_ELASTIC_RANGE', 'ELASTIC_RANGE'],
  ['CIRCLE_DRAG_LIMIT', 'DRAG_LIMIT']
].forEach(function (pair) {
  const pageValue = readNumber(launcherPageSource, pair[0])
  const modelValue = readNumber(honeycombSource, pair[1])
  requireCondition(
    pageValue !== null && modelValue !== null && pageValue === modelValue,
    'honeycomb constant drifted: applist ' + pair[0] + '=' + pageValue +
    ' vs honeycomb_layout ' + pair[1] + '=' + modelValue
  )
})
requireCondition(launcherPageSource.includes('if="{{ profileReady && !isCircle }}"'), 'circle launcher must not render the pill title row')
requireCondition(launcherPageSource.includes('page-side-spacer'), 'pill launcher title must remain centered inside the rounded safe area')
requireCondition(/\.top-row\s*\{[^}]*margin-top:\s*50px;/s.test(launcherPageSource), 'pill launcher title must stay below the deep capsule top curve')
requireCondition(/\.pager-row\s*\{[^}]*height:\s*28px;[^}]*margin-top:\s*0px;/s.test(launcherPageSource), 'pill launcher pager must stay above the bottom gesture area')
requireCondition(!launcherPageSource.includes('startInertia'), 'circle launcher must not restore a high-frequency inertia timer')
requireCondition(!settingsPageSource.includes('<scroll'), 'settings must use fixed pages instead of scroll')
requireCondition(settingsPageSource.includes("import fixedPager"), 'settings and launcher must share the fixed pager')
requireCondition(settingsPageSource.includes('/common/icons/diagnostics.jpg'), 'settings must expose device diagnostics')
requireCondition(settingsPageSource.includes('/common/icons/motion.jpg'), 'settings must expose motion diagnostics')

const clockSource = fs.readFileSync(path.join(root, 'src', 'pages', 'clock', 'clock.ux'), 'utf8')
requireCondition(clockSource.includes('class="circle-face-stage"'), 'circle watch faces must use a full-width stage')
requireCondition(clockSource.includes('<mechanicalcircle'), 'circle watch faces must include the mechanical dial')
requireCondition(clockSource.includes('<alpineface'), 'pill watch faces must include the scenic background face')
requireCondition(clockSource.includes('faceScope = profile.formFactor'), 'watch-face availability must follow the resolved form factor')
requireCondition(clockSource.includes('analogFace.handAngles'), 'mechanical hands must follow the shared angle calculator')
requireCondition(clockSource.includes('if="{{ !isPill }}"'), 'rectangular screens must reuse the compact watch-face stage')
requireCondition(clockSource.includes('class="pill-face-stage"'), 'pill watch faces must use a static touch stage')
requireCondition(!clockSource.includes('id="faceSwiper"'), 'pill watch faces must not use a native swiper that captures vertical gestures')
requireCondition(/\.pill-face-stage\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s.test(clockSource), 'pill watch-face stage must fill the immersive viewport')
requireCondition(!clockSource.includes('class="face-header"'), 'watch faces must not render a separate title header')
requireCondition(!clockSource.includes('class="gesture-hint"'), 'watch faces must not reserve a bottom gesture hint')
requireCondition(clockSource.includes("self.viewportTop = '0px'"), 'beta pill watch faces must extend the background into the former top inset')
requireCondition(clockSource.includes('pillBackgroundHeight - 36'), 'pill watch-face content must stay above the host gesture bar')
requireCondition(clockSource.includes('getGestureDirection(dx, dy)'), 'watch faces must classify touch gestures by axis')
requireCondition(clockSource.includes("if (direction === 'up')"), 'watch faces must route upward touch gestures to the launcher')
requireCondition(clockSource.includes("pageMotion.push(this, router, '/pages/applist', 'fromBottom')"), 'upward watch-face gestures must open the application list')
requireCondition(clockSource.includes('this.switchFaceByStep'), 'horizontal watch-face gestures must still switch faces')
requireCondition((clockSource.match(/@swipe="handleSwipe"/g) || []).length >= 9, 'root and mounted watch-face components must retain the runtime swipe fallback')
requireCondition((clockSource.match(/@longpress="handleLongPress"/g) || []).length >= 7, 'root and mounted watch-face components must use native long-press events')
requireCondition(!clockSource.includes('this.longPressTimer = setTimeout'), 'watch-face long press must not use a timer that misclassifies swipes')
requireCondition(clockSource.includes('this.routeGesture(e.direction)'), 'runtime and touch gestures must share one routing path')
requireCondition(clockSource.includes('now - this.lastGestureAt < 300'), 'dual gesture channels must suppress duplicate routing')

const mechanicalSource = fs.readFileSync(path.join(root, 'src', 'components', 'watchfaces', 'mechanical_circle.ux'), 'utf8')
requireCondition(mechanicalSource.includes('transform-origin'), 'mechanical hands must rotate around the dial center')
requireCondition(mechanicalSource.includes('analogTicks'), 'mechanical dial must render all minute marks')
requireCondition(mechanicalSource.includes("uri: '/pages/heartrate'"), 'mechanical heart subdial must open health details')
requireCondition(mechanicalSource.includes("uri: '/pages/today'"), 'mechanical date window must open today calendar')

const alpineSource = fs.readFileSync(path.join(root, 'src', 'components', 'watchfaces', 'alpine.ux'), 'utf8')
const alpineBackgroundPath = path.join(root, 'src', 'common', 'watchfaces', 'alpine_night.jpg')
const registrySource = fs.readFileSync(path.join(root, 'src', 'common', 'face_registry.js'), 'utf8')
const faceSelectSource = fs.readFileSync(path.join(root, 'src', 'pages', 'watchface', 'index.ux'), 'utf8')
requireCondition(alpineSource.includes('/common/watchfaces/alpine_night.jpg'), 'scenic face must render the bundled background')
requireCondition(alpineSource.includes('panelGlassTop'), 'scenic data panel must use a runtime-safe top coordinate')
requireCondition(!alpineSource.includes('bottom: 47px'), 'scenic data panel must not rely on unsupported bottom anchoring')
requireCondition(alpineSource.includes("uri: '/pages/today'"), 'scenic date panel must open today calendar')
requireCondition(alpineSource.includes("uri: '/pages/heartrate'"), 'scenic heart panel must open health details')
requireCondition(alpineSource.includes("uri: '/pages/steps'"), 'scenic step panel must open activity details')
requireCondition(fs.statSync(alpineBackgroundPath).size > 50000, 'scenic background is unexpectedly small')
requireCondition(registrySource.includes('pillOnly: true'), 'scenic face must remain pill-only')
requireCondition(registrySource.includes('circleOnly: true'), 'mechanical face must remain circle-only')
requireCondition(faceSelectSource.includes('pillPageIndex === 1'), 'pill face library must paginate the fourth face')
requireCondition(faceSelectSource.includes('selectAlpine'), 'pill face library must apply the scenic face')

;['sport.ux', 'simple.ux', 'dashboard.ux', 'alpine.ux'].forEach(function (fileName) {
  const source = fs.readFileSync(path.join(root, 'src', 'components', 'watchfaces', fileName), 'utf8')
  requireCondition(/height:\s*100%;/.test(source), fileName + ' must fill the immersive pill stage')
})

if (errors.length > 0) {
  errors.forEach(function (error) {
    console.error('multiscreen error: ' + error)
  })
  process.exitCode = 1
} else {
  console.log('Checked multi-screen manifest, profiles, faces, shared icons, launcher, and ' + pageFiles.length + ' pages')
}
