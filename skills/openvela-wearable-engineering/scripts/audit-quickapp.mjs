#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

const root = path.resolve(process.argv[2] || process.cwd())
const srcRoot = path.join(root, 'src')
const manifestPath = path.join(srcRoot, 'manifest.json')

const errors = []
const warnings = []
const info = []

function report(list, code, message, file) {
  list.push({ code, message, file: file ? path.relative(root, file) : null })
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    report(errors, 'JSON_PARSE', `${error.message}`, file)
    return null
  }
}

function walk(dir, output = []) {
  if (!fs.existsSync(dir)) return output
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'build', 'dist', '.git'].includes(entry.name)) continue
      walk(full, output)
    } else {
      output.push(full)
    }
  }
  return output
}

if (!fs.existsSync(manifestPath)) {
  console.error(`[ERROR] MANIFEST_MISSING: ${path.relative(process.cwd(), manifestPath)}`)
  process.exit(1)
}

const manifest = readJson(manifestPath)
if (!manifest) process.exit(1)

const declaredFeatures = new Set(
  (Array.isArray(manifest.features) ? manifest.features : [])
    .map(item => typeof item === 'string' ? item : item && item.name)
    .filter(Boolean)
)
const declaredPermissions = new Set(
  (Array.isArray(manifest.permissions) ? manifest.permissions : [])
    .map(item => typeof item === 'string' ? item : item && item.name)
    .filter(Boolean)
)

const runtimeFiles = walk(srcRoot).filter(file => /\.(?:js|ux)$/.test(file))
const nativeModules = new Map()
const nodeBuiltins = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns',
  'events', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'perf_hooks',
  'process', 'readline', 'stream', 'string_decoder', 'timers', 'tls', 'tty',
  'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib'
])
const browserPatterns = [
  [/\bdocument\s*\./, 'document'],
  [/\bwindow\s*\./, 'window'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bsessionStorage\b/, 'sessionStorage'],
  [/\bnavigator\s*\./, 'navigator']
]

function rememberNative(moduleName, file) {
  if (!nativeModules.has(moduleName)) nativeModules.set(moduleName, new Set())
  nativeModules.get(moduleName).add(path.relative(root, file))
}

function scanImports(source, file) {
  const nativePatterns = [
    /\bfrom\s+['"]@([^'"]+)['"]/g,
    /\brequire\(\s*['"]@([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]@([^'"]+)['"]/g
  ]
  for (const re of nativePatterns) {
    let match
    while ((match = re.exec(source))) rememberNative(match[1], file)
  }

  const modulePatterns = [
    /\bfrom\s+['"]([^.'/@][^'"]*)['"]/g,
    /\brequire\(\s*['"]([^.'/@][^'"]*)['"]\s*\)/g,
    /\bimport\s+['"]([^.'/@][^'"]*)['"]/g
  ]
  for (const re of modulePatterns) {
    let match
    while ((match = re.exec(source))) {
      const top = match[1].split('/')[0]
      if (nodeBuiltins.has(top)) {
        report(errors, 'NODE_BUILTIN_RUNTIME', `Runtime source imports Node.js builtin '${match[1]}'`, file)
      }
    }
  }

  for (const [re, name] of browserPatterns) {
    if (re.test(source)) {
      report(errors, 'BROWSER_GLOBAL_RUNTIME', `Runtime source uses browser global '${name}'`, file)
    }
  }
}

function scanStyle(source, file) {
  const blocks = []
  const styleRe = /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi
  let styleMatch
  while ((styleMatch = styleRe.exec(source))) blocks.push(styleMatch[1])

  for (const css of blocks) {
    const selectorRe = /([^{}]+)\{/g
    let match
    while ((match = selectorRe.exec(css))) {
      const raw = match[1].trim()
      if (!raw || raw.startsWith('@')) continue
      for (const selector of raw.split(',').map(value => value.trim()).filter(Boolean)) {
        const simple = /^(?:\.[A-Za-z_][\w-]*|#[A-Za-z_][\w-]*|[A-Za-z][\w-]*)$/
        if (!simple.test(selector)) {
          report(warnings, 'VERIFY_VELA_SELECTOR', `Verify selector '${selector}' against current Vela CSS support`, file)
        }
      }
    }
  }
}

for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8')
  scanImports(source, file)
  if (file.endsWith('.ux')) scanStyle(source, file)
}

for (const [moduleName, files] of nativeModules) {
  const featureName = moduleName
  if (!declaredFeatures.has(featureName)) {
    report(
      warnings,
      'FEATURE_NOT_DECLARED',
      `Native module '@${moduleName}' is used but '${featureName}' is not present in manifest.features; verify whether this interface requires declaration`,
      path.join(root, [...files][0])
    )
  }
}

if (nativeModules.has('system.geolocation') && !declaredPermissions.has('hapjs.permission.LOCATION')) {
  report(errors, 'LOCATION_PERMISSION_MISSING', `system.geolocation requires hapjs.permission.LOCATION for documented location APIs`, manifestPath)
}

const deviceUsers = nativeModules.get('system.device') || new Set()
for (const relative of deviceUsers) {
  const file = path.join(root, relative)
  const source = fs.readFileSync(file, 'utf8')
  if (/\.(?:getDeviceId|getSerial)\s*\(/.test(source) && !declaredPermissions.has('hapjs.permission.DEVICE_INFO')) {
    report(errors, 'DEVICE_INFO_PERMISSION_MISSING', `getDeviceId/getSerial requires hapjs.permission.DEVICE_INFO`, manifestPath)
    break
  }
}

const packageJsonPath = path.join(root, 'package.json')
const lockPath = path.join(root, 'package-lock.json')
if (fs.existsSync(packageJsonPath)) {
  const pkg = readJson(packageJsonPath)
  if (pkg && pkg.version && manifest.versionName && String(pkg.version) !== String(manifest.versionName)) {
    report(warnings, 'VERSION_METADATA_MISMATCH', `package.json version '${pkg.version}' differs from manifest versionName '${manifest.versionName}'`, packageJsonPath)
  }
  if (pkg && fs.existsSync(lockPath)) {
    const lock = readJson(lockPath)
    const lockVersion = lock && lock.packages && lock.packages[''] && lock.packages[''].version
    if (lockVersion && pkg.version && String(lockVersion) !== String(pkg.version)) {
      report(warnings, 'LOCK_ROOT_VERSION_MISMATCH', `package-lock root version '${lockVersion}' differs from package.json '${pkg.version}'`, lockPath)
    }
  }
}

const allProjectFiles = walk(root)
const stateMachines = allProjectFiles.filter(file => /(?:state[_-]?machine|state-machine)\.(?:js|mjs|cjs)$/i.test(path.basename(file)))
const repositories = allProjectFiles.filter(file => /(?:repository|store)\.(?:js|mjs|cjs)$/i.test(path.basename(file)))
const designLayouts = allProjectFiles.filter(file => /(?:^|[/\\])layout\.(?:js|mjs|cjs)$/i.test(file))

info.push(`project: ${root}`)
info.push(`runtime files scanned: ${runtimeFiles.length}`)
info.push(`manifest features: ${[...declaredFeatures].sort().join(', ') || '(none)'}`)
info.push(`native modules observed: ${[...nativeModules.keys()].sort().map(name => '@' + name).join(', ') || '(none)'}`)
info.push(`state-machine files discovered: ${stateMachines.length}`)
info.push(`repository/store files discovered: ${repositories.length}`)
info.push(`layout recipe files discovered: ${designLayouts.length}`)

function print(label, list) {
  if (!list.length) return
  console.log(`\n${label} (${list.length})`)
  for (const item of list) {
    const where = item.file ? ` [${item.file}]` : ''
    console.log(`- ${item.code}: ${item.message}${where}`)
  }
}

console.log('openvela wearable engineering audit')
for (const line of info) console.log(`- ${line}`)
print('ERRORS', errors)
print('WARNINGS', warnings)

if (!errors.length && !warnings.length) console.log('\nNo static guardrail findings.')
else if (!errors.length) console.log('\nStatic audit passed with warnings that require human/platform verification.')
else console.log('\nStatic audit failed. Fix deterministic errors before treating runtime evidence as meaningful.')

process.exit(errors.length ? 1 : 0)
