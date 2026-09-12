const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  let result = []
  fs.readdirSync(dir).forEach(function (name) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) result = result.concat(walk(full))
    else if (/\.(js|ux)$/.test(name)) result.push(full)
  })
  return result
}

function relative(file) {
  return path.relative(root, file).replace(/\\/g, '/')
}

function fail(message) {
  throw new Error(message)
}

function assertNoRawApi(file, source, layer) {
  ;['@system.', '@service.', '@system/', '@service/'].forEach(function (token) {
    if (source.includes(token)) fail(file + ' leaks raw Vela API into ' + layer + ': ' + token)
  })
}

const domainFiles = walk(path.join(root, 'src', 'domain'))
domainFiles.forEach(function (file) {
  const source = fs.readFileSync(file, 'utf8')
  const name = relative(file)
  assertNoRawApi(name, source, 'domain')
  if (source.includes('platform/vela')) fail(name + ' must consume capabilities, not legacy platform adapters')
  ;['screenWidth', 'screenHeight', 'screenShape', 'isCircle', 'isPill', 'isRect', '@media', 'px;'].forEach(function (token) {
    if (source.includes(token)) fail(name + ' leaks presentation concerns into domain: ' + token)
  })
})

const runtimeFiles = walk(path.join(root, 'src', 'runtime'))
runtimeFiles.forEach(function (file) {
  const source = fs.readFileSync(file, 'utf8')
  const name = relative(file)
  assertNoRawApi(name, source, 'runtime')
  if (source.includes('platform/vela')) fail(name + ' must orchestrate capabilities, not legacy platform adapters')
  ;['@media', 'isCircle', 'isPill', 'isRect', '#30D158', '#FFD60A', '#8E8E93'].forEach(function (token) {
    if (source.includes(token)) fail(name + ' leaks presentation concerns into runtime: ' + token)
  })
})

const presentationFiles = walk(path.join(root, 'src', 'presentation'))
presentationFiles.forEach(function (file) {
  const source = fs.readFileSync(file, 'utf8')
  const name = relative(file)
  assertNoRawApi(name, source, 'presentation')
  if (source.includes('platform/vela')) fail(name + ' must consume capabilities, not legacy platform adapters')
})

// High-cost legacy modules that have already been migrated may never touch raw device APIs again.
;[
  'src/common/power_manager.js',
  'src/common/gps_tracker.js',
  'src/common/haptic_feedback.js',
  'src/common/health_domain.js',
  'src/common/health_sample_service.js'
].forEach(function (name) {
  const source = fs.readFileSync(path.join(root, name), 'utf8')
  assertNoRawApi(name, source, 'migrated legacy module')
})

// platform/vela is now only a temporary import-compatibility location. It must not own APIs.
;['src/platform/vela/device.js', 'src/platform/vela/storage.js'].forEach(function (name) {
  const source = fs.readFileSync(path.join(root, name), 'utf8')
  assertNoRawApi(name, source, 'retired platform adapter')
  const lines = source.split(/\r?\n/).filter(Boolean).length
  if (lines > 2) fail(name + ' must remain a thin compatibility export; lines=' + lines)
})
if (fs.existsSync(path.join(root, 'src/platform/vela/health.js'))) {
  fail('src/platform/vela/health.js must stay deleted; health is split into independent capabilities')
}

const legacyBudgets = {
  'src/common/watch_data.js': 100,
  'src/common/workout_manager.js': 170,
  'src/common/health_domain.js': 60,
  'src/common/health_sample_service.js': 50,
  'src/common/health_metrics.js': 20,
  'src/common/screen_profile.js': 10,
  'src/common/page_viewport.js': 10,
  'src/common/safe_area.js': 10,
  'src/common/viewport_math.js': 10,
  'src/common/storage_adapter.js': 10
}

Object.keys(legacyBudgets).forEach(function (name) {
  const file = path.join(root, name)
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length
  if (lines > legacyBudgets[name]) {
    fail(name + ' compatibility entry grew to ' + lines + ' lines; budget=' + legacyBudgets[name])
  }
})

console.log('Architecture guard passed: capabilities own device APIs; domain/runtime/presentation boundaries stay clean')
