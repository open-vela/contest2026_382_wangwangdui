const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const manifest = JSON.parse(read('src/manifest.json'))

function walk(dir, files) {
  if (!fs.existsSync(dir)) return
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(target, files)
    else files.push(target)
  })
}

function pageSource(route, page) { return path.join('src', route, page.component + '.ux') }

function resolveRelative(owner, request) {
  const target = path.resolve(path.dirname(owner), request)
  return [target, target + '.js', target + '.ux', path.join(target, 'index.js')].some(fs.existsSync)
}

function dependencyRequests(source) {
  const requests = []
  const patterns = [
    /(?:from\s+|require\(\s*)['"]([^'"]+)['"]/g,
    /<import\b[^>]*\bsrc=['"]([^'"]+)['"][^>]*>/g
  ]
  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(source))) requests.push(match[1])
  })
  return requests
}

function dependsOn(source, fragment) {
  return dependencyRequests(source).some(request => request.includes(fragment))
}

function validateRelativeImports(full, source) {
  dependencyRequests(source).forEach(request => {
    if (!/^\.{1,2}\//.test(request)) return
    assert.ok(resolveRelative(full, request), path.relative(root, full) + ' has unresolved relative dependency ' + request)
  })
}

function assertSemanticFeature(relative) {
  const source = read(relative)
  assert.ok(!dependsOn(source, '/presentation/'), relative + ' semantic Feature must never depend on Presentation')
  assert.ok(!dependsOn(source, '/design/'), relative + ' semantic Feature must never depend on Design')
  assert.ok(!/#[0-9A-Fa-f]{6}\b/.test(source), relative + ' semantic Feature must not own visual color tokens')
}

assert.ok(!fs.existsSync(path.join(root, 'src/v2/domain')), 'src/v2/domain must not exist; canonical business rules live only in src/domain')
assert.ok(!fs.existsSync(path.join(root, 'src/domain/apps/catalog.js')), 'application labels/icons/routes must not live in Domain')
assert.ok(!fs.existsSync(path.join(root, 'src/v2/features/settings/menu_controller.js')), 'static settings menu must not masquerade as a Feature')

Object.keys(manifest.router.pages || {}).forEach(route => {
  const relative = pageSource(route, manifest.router.pages[route])
  const full = path.join(root, relative)
  assert.ok(fs.existsSync(full), 'missing routed page: ' + relative)
  const source = fs.readFileSync(full, 'utf8')
  assert.ok(dependsOn(source, '/v2/'), relative + ' must enter the V2 application architecture')
  assert.ok(!dependsOn(source, '/common/'), relative + ' must not depend on legacy common code modules')
  assert.ok(!dependsOn(source, '/presentation/'), relative + ' must not depend on legacy Presentation; active UI belongs to V2 Design')
  assert.ok(!source.includes('pageViewport') && !source.includes('pageMotion') && !source.includes('watchData'), relative + ' must not regain legacy page/runtime bridges')
  assert.ok(!dependsOn(source, '/capabilities/'), relative + ' Page must not consume Capability directly')
  assert.ok(!dependsOn(source, '@service.'), relative + ' must not access service APIs directly')
  assert.ok(!dependsOn(source, '@system.'), relative + ' must not access system APIs directly; framework boundaries belong to V2 app/runtime')
  validateRelativeImports(full, source)
})

const v2Files = []
walk(path.join(root, 'src/v2'), v2Files)
v2Files.filter(name => name.endsWith('.js')).forEach(full => {
  const relative = path.relative(root, full).replace(/\\/g, '/')
  const source = fs.readFileSync(full, 'utf8')
  assert.ok(!dependsOn(source, '/common/'), relative + ' must not depend on legacy common code modules')
  assert.ok(!dependsOn(source, '/presentation/'), relative + ' must not depend on legacy Presentation')
  assert.ok(!dependsOn(source, '@service.'), relative + ' must not access Vela services directly')
  if (relative !== 'src/v2/app/navigation.js') assert.ok(!dependsOn(source, '@system.'), relative + ' must not access Vela system APIs directly')
  else assert.ok(dependsOn(source, '@system.router'), 'V2 navigation is the sole framework-router boundary')
  validateRelativeImports(full, source)
})

const featureFiles = []
walk(path.join(root, 'src/v2/features'), featureFiles)
featureFiles.filter(name => name.endsWith('.js')).forEach(full => {
  const relative = path.relative(root, full).replace(/\\/g, '/')
  const source = fs.readFileSync(full, 'utf8')
  assert.ok(!dependsOn(source, '/pages/') && !dependsOn(source, '/components/'), relative + ' Feature must never depend on Page or Component')
  assert.ok(!dependsOn(source, '/presentation/'), relative + ' Feature must never depend on Presentation')
  assert.ok(!dependsOn(source, '/design/'), relative + ' Feature must never depend upward on Design')
  const shapeBranch = /\b(isCircle|isPill|isRect)\b|\bformFactor\s*===|===\s*['"](?:circle|pill|rect)['"]|\bshape\s*===\s*['"](?:circle|pill|rect)['"]/
  assert.ok(!shapeBranch.test(source), relative + ' Feature must not branch on screen shape; screen differences belong to Design')
})

;[
  'src/v2/features/activity/controller.js',
  'src/v2/features/health/controller.js',
  'src/v2/features/history/controller.js',
  'src/v2/features/today/controller.js',
  'src/v2/features/clock/controller.js',
  'src/v2/features/watchface/controller.js',
  'src/v2/features/workout/controller.js',
  'src/v2/features/workout/selection.js',
  'src/v2/features/workout/history_controller.js',
  'src/v2/features/launcher/controller.js',
  'src/v2/features/notification/controller.js',
  'src/v2/features/settings/brightness_controller.js',
  'src/v2/features/settings/vibration_controller.js',
  'src/v2/features/settings/motion_controller.js',
  'src/v2/features/settings/diagnostics_controller.js',
  'src/v2/features/sync/controller.js'
].forEach(assertSemanticFeature)

const domainFiles = []
walk(path.join(root, 'src/domain'), domainFiles)
domainFiles.filter(name => name.endsWith('.js')).forEach(full => {
  const relative = path.relative(root, full).replace(/\\/g, '/')
  const source = fs.readFileSync(full, 'utf8')
  assert.ok(!dependsOn(source, '/v2/features/') && !dependsOn(source, '/v2/design/') && !dependsOn(source, '/pages/') && !dependsOn(source, '/components/'), relative + ' Domain must not depend upward on Feature, Design or UI')
})

const calendarDomain = read('src/domain/calendar/index.js')
assert.ok(!calendarDomain.includes('textColor') && !calendarDomain.includes('backgroundColor'), 'Calendar Domain must expose date semantics only')
assert.ok(!/#[0-9A-Fa-f]{6}\b/.test(calendarDomain), 'Calendar Domain must never own UI colors')

const watchfaceDomain = read('src/domain/watchface/catalog.js')
assert.ok(!/\b(background|accent|borderColor)\b/.test(watchfaceDomain), 'Watchface Domain catalog must contain semantic metadata only')
assert.ok(!/#[0-9A-Fa-f]{6}\b/.test(watchfaceDomain), 'Watchface Domain catalog must never own visual colors')

const settingsDomain = read('src/domain/settings/store.js')
assert.ok(!settingsDomain.includes('lastSyncText') && !settingsDomain.includes('vibrationLevelText') && !settingsDomain.includes('vibrationPatternText') && !settingsDomain.includes('syncTimeText'), 'Settings Domain must persist semantic values, not display copy')

const motionDomain = read('src/domain/motion/metrics.js')
assert.ok(!/#[0-9A-Fa-f]{6}\b/.test(motionDomain) && !motionDomain.includes("label:"), 'Motion Domain must expose intensity keys, not visual labels/colors')

const notificationDomain = read('src/domain/notification/factory.js')
assert.ok(!notificationDomain.includes('/common/') && !/#[0-9A-Fa-f]{6}\b/.test(notificationDomain), 'Notification Domain must contain message semantics only')

const workoutDistance = read('src/domain/workout/distance.js')
assert.ok(workoutDistance.includes('acceptedSegment') && workoutDistance.includes('meters >= 2 && meters <= 200'), 'Workout distance acceptance must remain a Domain rule')

const watchfaceDir = path.join(root, 'src/components/watchfaces')
fs.readdirSync(watchfaceDir).filter(name => name.endsWith('.ux')).forEach(name => {
  const source = fs.readFileSync(path.join(watchfaceDir, name), 'utf8')
  assert.ok(!dependsOn(source, '@system.router'), name + ' must be a presentation component, not a navigation owner')
  assert.ok(!dependsOn(source, '/common/health_metrics'), name + ' must not depend on legacy presentation bridges')
  validateRelativeImports(path.join(watchfaceDir, name), source)
})

const pageRuntime = read('src/v2/app/page_runtime.js')
const scene = read('src/v2/design/scene.js')
const geometry = read('src/v2/design/geometry.js')
const deviceProfile = read('src/v2/system/device_profile.js')
const clock = read('src/pages/clock/clock.ux')
const clockFeature = read('src/v2/features/clock/controller.js')
const clockDesign = read('src/v2/design/specs/clock.js')
const notification = read('src/pages/notification_demo/notification_demo.ux')
const workout = read('src/pages/workout/workout.ux')
const workoutFeature = read('src/v2/features/workout/controller.js')
const workoutSelection = read('src/pages/workout_select/workout_select.ux')
const workoutHistory = read('src/pages/workout_history/workout_history.ux')
const launcher = read('src/pages/applist/applist.ux')
const launcherFeature = read('src/v2/features/launcher/controller.js')
const selector = read('src/pages/watchface/index.ux')
const settings = read('src/pages/settings/settings/settings.ux')

assert.ok(pageRuntime.includes("../system/device_profile"), 'V2 runtime must resolve its own device profile')
assert.ok(pageRuntime.includes('../design/scene'), 'all pages must share the Host Scene contract')
assert.ok(!pageRuntime.includes('applyDesign') && !pageRuntime.includes('layoutRuntime'), 'V2 runtime must never depend on legacy viewport/layout bridges')
assert.ok(pageRuntime.includes("page.viewportTop = '0px'"), 'V2 runtime must paint from the physical top edge')
assert.ok(scene.includes("require('./geometry')"), 'V2 scene must own wearable geometry')
assert.ok(scene.includes('coverageHeight') && scene.includes('hostTop: 0'), 'V2 Host Scene must be a full-bleed logical canvas')
assert.ok(scene.includes('globalSafe.top') && !scene.includes('globalSafe.top - host.hostTop'), 'safe geometry must remain global inside the full-bleed Host Scene')
assert.ok(geometry.includes('PILL_GESTURE_BAR = 36') && geometry.includes('capsuleInset'), 'V2 geometry must model pill caps and gesture area')
assert.ok(deviceProfile.includes("../../capabilities/device"), 'V2 device profile must consume the device capability gateway')

assert.ok(clock.includes("../../v2/features/clock/controller"), 'Clock must be a thin V2 page')
assert.ok(clock.includes("../../v2/design/specs/clock") && clock.includes("../../v2/design/views/clock"), 'Clock must bind Feature state through Design')
assert.ok(clock.includes("../../v2/design/views/notification"), 'Clock and notification demo must share notification Design projection')
assert.ok(clock.includes('configureFaces(plan.faceIds)'), 'Clock page must inject the Design-selected face set into the Feature')
assert.ok(!dependsOn(clockFeature, '/design/') && !clockFeature.includes('analog') && !clockFeature.includes('batteryColor'), 'Clock Feature must remain presentation-free')
assert.ok(clockDesign.includes("faceIds = ['sport', 'simple', 'dashboard', 'mechanical']") && clockDesign.includes("faceIds = ['sport', 'simple', 'dashboard', 'alpine']"), 'Clock Design must own shape-specific face availability')
assert.ok(!clock.includes('notificationManager') && !clock.includes('deviceSettings') && !clock.includes('faceRegistry'), 'Clock must not regain legacy orchestration')

assert.ok(notification.includes("../../v2/features/notification/controller") && notification.includes("../../v2/design/views/notification"), 'notification demo must share semantic Feature and Design projection with Clock')
assert.ok(workout.includes("../../v2/features/workout/controller") && workout.includes("../../v2/design/views/workout"), 'Workout Page must bind semantic Feature state through Design View')
assert.ok(workout.includes("this.sessionStatus === 'running'"), 'Workout interaction must branch on semantic status, never button copy')
assert.ok(!workoutFeature.includes('typeName') && !workoutFeature.includes('durationText') && !workoutFeature.includes('distanceText'), 'Workout Feature must not regain presentation formatting')
assert.ok(workoutSelection.includes("../../v2/design/specs/workout_select") && workoutSelection.includes("../../v2/design/views/workout_selection"), 'Workout Selection must be Design Engine driven')
assert.ok(workoutHistory.includes("../../v2/design/views/workout_history"), 'Workout History must format records in Design View')

assert.ok(launcher.includes("../../v2/features/launcher/controller") && launcher.includes("../../v2/design/views/launcher") && launcher.includes("../../v2/design/engines/honeycomb"), 'Launcher must use semantic Feature plus V2 Design View/Engine')
assert.ok(launcher.includes("../../v2/app/app_routes"), 'Launcher routing belongs to Application layer')
assert.ok(!launcherFeature.includes('appCatalog') && !launcherFeature.includes('pageText') && !launcherFeature.includes('progress:'), 'Launcher Feature must only paginate semantic app ids')
assert.ok(selector.includes("../../v2/features/watchface/controller") && selector.includes("../../v2/design/views/watchface_selector"), 'Watchface selection must separate semantic Feature and visual Design View')
assert.ok(settings.includes("../../../v2/design/specs/settings_menu") && settings.includes("../../../v2/design/views/settings_menu"), 'Settings menu must be a pure L1 Design surface')
assert.ok(!settings.includes('/features/settings/menu_controller'), 'Settings menu must not depend on a presentation pseudo Feature')

assert.ok(fs.existsSync(path.join(root, 'src/v2/design/engines/honeycomb.js')), 'Honeycomb must live inside V2 Design Engine')

const capabilityEvent = read('src/capabilities/system_event.js')
const capabilityInterconnect = read('src/capabilities/interconnect.js')
assert.ok(capabilityEvent.includes('subscribe: subscribe') && capabilityEvent.includes('unsubscribe: unsubscribe'), 'system-event gateway must own lazy subscription lifecycle')
assert.ok(capabilityInterconnect.includes('consumerCount'), 'interconnect gateway must release native listeners after the final consumer')

console.log('V2 architecture verified: Capability → Domain → semantic Feature → Design → Page with Application-owned routing')
