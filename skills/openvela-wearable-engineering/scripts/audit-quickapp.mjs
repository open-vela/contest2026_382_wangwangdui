#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(process.argv[2] || process.cwd())
const srcRoot = path.join(root, 'src')
const manifestPath = path.join(srcRoot, 'manifest.json')
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const catalogPath = path.resolve(scriptDir, '../references/vela-api-catalog.json')

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
    report(errors, 'JSON_PARSE', error.message, file)
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function maskNonCode(source) {
  let out = ''
  let quote = null
  let lineComment = false
  let blockComment = false
  let escaped = false

  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    const next = source[i + 1]

    if (lineComment) {
      if (ch === '\n') { lineComment = false; out += '\n' } else out += ' '
      continue
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { out += '  '; blockComment = false; i++ }
      else out += ch === '\n' ? '\n' : ' '
      continue
    }
    if (quote) {
      if (escaped) { escaped = false; out += ' '; continue }
      if (ch === '\\') { escaped = true; out += ' '; continue }
      if (ch === quote) { quote = null; out += ' ' }
      else out += ch === '\n' ? '\n' : ' '
      continue
    }
    if (ch === '/' && next === '/') { lineComment = true; out += '  '; i++; continue }
    if (ch === '/' && next === '*') { blockComment = true; out += '  '; i++; continue }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; out += ' '; continue }
    out += ch
  }
  return out
}

if (!fs.existsSync(manifestPath)) {
  console.error(`[ERROR] MANIFEST_MISSING: ${path.relative(process.cwd(), manifestPath)}`)
  process.exit(1)
}
if (!fs.existsSync(catalogPath)) {
  console.error(`[ERROR] API_CATALOG_MISSING: ${catalogPath}`)
  process.exit(1)
}

const manifest = readJson(manifestPath)
const catalog = readJson(catalogPath)
if (!manifest || !catalog) process.exit(1)

const modules = catalog.modules || {}
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
const manifestMinApi = Math.max(1, Number(manifest.minAPILevel) || 1)

const runtimeFiles = walk(srcRoot).filter(file => /\.(?:js|ux)$/.test(file))
const nativeModules = new Map()
const moduleUsage = new Map()
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

function rememberMember(moduleName, member, file) {
  if (!moduleUsage.has(moduleName)) moduleUsage.set(moduleName, new Map())
  const members = moduleUsage.get(moduleName)
  if (!members.has(member)) members.set(member, new Set())
  members.get(member).add(path.relative(root, file))
}

function parseNativeAliases(source, file) {
  const aliases = new Map()
  const importRe = /\bimport\s+([A-Za-z_$][\w$]*)\s+from\s+['"]@([^'"]+)['"]/g
  const requireRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]@([^'"]+)['"]\s*\)/g
  const bareRe = /\bimport\s+['"]@([^'"]+)['"]/g
  let match

  while ((match = importRe.exec(source))) {
    aliases.set(match[1], match[2])
    rememberNative(match[2], file)
  }
  while ((match = requireRe.exec(source))) {
    aliases.set(match[1], match[2])
    rememberNative(match[2], file)
  }
  while ((match = bareRe.exec(source))) rememberNative(match[1], file)

  return aliases
}

function scanModuleMembers(source, masked, file, aliases) {
  const returnedAliases = new Map()

  for (const [alias, moduleName] of aliases) {
    const entry = modules[moduleName]
    const allowedMethods = new Set(entry ? Object.keys(entry.methods || {}) : [])
    const allowedProperties = new Set(entry && Array.isArray(entry.properties) ? entry.properties : [])
    const memberRe = new RegExp(`\\b${escapeRegExp(alias)}\\.([A-Za-z_$][\\w$]*)`, 'g')
    let match

    while ((match = memberRe.exec(masked))) {
      const member = match[1]
      rememberMember(moduleName, member, file)
      if (!entry) continue
      if (!allowedMethods.has(member) && !allowedProperties.has(member)) {
        report(errors, 'UNKNOWN_NATIVE_MEMBER', `@${moduleName} has no cataloged member '${member}' (${entry.authority})`, file)
      }
    }

    if (!entry) continue
    for (const [method, spec] of Object.entries(entry.methods || {})) {
      if (!spec || !spec.returns || !entry.returned_objects || !entry.returned_objects[spec.returns]) continue
      const direct = new RegExp(`\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${escapeRegExp(alias)}\\.${escapeRegExp(method)}\\s*\\(`, 'g')
      const assign = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*=\\s*${escapeRegExp(alias)}\\.${escapeRegExp(method)}\\s*\\(`, 'g')
      while ((match = direct.exec(masked))) returnedAliases.set(match[1], { moduleName, type: spec.returns })
      while ((match = assign.exec(masked))) returnedAliases.set(match[1], { moduleName, type: spec.returns })
    }
  }

  for (const [alias, binding] of returnedAliases) {
    const entry = modules[binding.moduleName]
    const objectSpec = entry && entry.returned_objects && entry.returned_objects[binding.type]
    if (!objectSpec) continue
    const allowed = new Set([...(objectSpec.methods || []), ...(objectSpec.events || []), ...(objectSpec.properties || [])])
    const memberRe = new RegExp(`\\b${escapeRegExp(alias)}\\.([A-Za-z_$][\\w$]*)`, 'g')
    let match
    while ((match = memberRe.exec(masked))) {
      if (!allowed.has(match[1])) {
        report(errors, 'UNKNOWN_RETURNED_OBJECT_MEMBER', `@${binding.moduleName} ${binding.type} object has no cataloged member '${match[1]}'`, file)
      }
    }
  }
}

function scanImports(source, masked, file) {
  const aliases = parseNativeAliases(source, file)

  const modulePatterns = [
    /\bfrom\s+['"]([^.'/@][^'"]*)['"]/g,
    /\brequire\(\s*['"]([^.'/@][^'"]*)['"]\s*\)/g,
    /\bimport\s+['"]([^.'/@][^'"]*)['"]/g
  ]
  for (const re of modulePatterns) {
    let match
    while ((match = re.exec(source))) {
      const top = match[1].split('/')[0]
      if (nodeBuiltins.has(top)) report(errors, 'NODE_BUILTIN_RUNTIME', `Runtime source imports Node.js builtin '${match[1]}'`, file)
    }
  }

  for (const [re, name] of browserPatterns) {
    if (re.test(masked)) report(errors, 'BROWSER_GLOBAL_RUNTIME', `Runtime source uses browser global '${name}'`, file)
  }

  scanModuleMembers(source, masked, file, aliases)
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
        if (!simple.test(selector)) report(warnings, 'VERIFY_VELA_SELECTOR', `Verify selector '${selector}' against current Vela CSS support`, file)
      }
    }
  }
}

for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const masked = maskNonCode(source)
  scanImports(source, masked, file)
  if (file.endsWith('.ux')) scanStyle(source, file)
}

for (const [moduleName, files] of nativeModules) {
  const entry = modules[moduleName]
  const firstFile = path.join(root, [...files][0])

  if (!entry) {
    report(warnings, 'API_MODULE_NOT_CATALOGED', `@${moduleName} is not in the bundled API catalog; verify it against current official Vela documentation before use`, firstFile)
    continue
  }

  if (entry.authority !== 'xiaomi-official') {
    report(warnings, 'NON_OFFICIAL_API_AUTHORITY', `@${moduleName} is cataloged as '${entry.authority}', not Xiaomi-official; preserve this provenance in claims and review`, firstFile)
  }

  if (entry.feature_declaration === 'required' && !declaredFeatures.has(moduleName)) {
    report(errors, 'FEATURE_NOT_DECLARED', `@${moduleName} requires '${moduleName}' in manifest.features`, manifestPath)
  }

  if (Number(entry.min_api_level) > manifestMinApi) {
    report(errors, 'MIN_API_LEVEL_TOO_LOW', `@${moduleName} requires API Level ${entry.min_api_level} but manifest.minAPILevel is ${manifestMinApi}`, manifestPath)
  }

  const usedMembers = moduleUsage.get(moduleName) || new Map()
  for (const member of usedMembers.keys()) {
    const method = entry.methods && entry.methods[member]
    if (!method) continue
    if (Number(method.min_api_level) > manifestMinApi) {
      report(errors, 'METHOD_MIN_API_LEVEL_TOO_LOW', `@${moduleName}.${member} requires API Level ${method.min_api_level} but manifest.minAPILevel is ${manifestMinApi}`, manifestPath)
    }
    for (const permission of method.permissions || []) {
      if (!declaredPermissions.has(permission)) report(errors, 'PERMISSION_MISSING', `@${moduleName}.${member} requires ${permission}`, manifestPath)
    }
  }

  if (entry.device_support === 'check-current-official-table') {
    info.push(`device support must be checked for @${moduleName} against ${entry.source_url}`)
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

info.unshift(`layout recipe files discovered: ${designLayouts.length}`)
info.unshift(`repository/store files discovered: ${repositories.length}`)
info.unshift(`state-machine files discovered: ${stateMachines.length}`)
info.unshift(`catalog coverage: ${Object.keys(modules).length} native modules (${catalog.scope})`)
info.unshift(`native modules observed: ${[...nativeModules.keys()].sort().map(name => '@' + name).join(', ') || '(none)'}`)
info.unshift(`manifest minAPILevel: ${manifestMinApi}`)
info.unshift(`manifest features: ${[...declaredFeatures].sort().join(', ') || '(none)'}`)
info.unshift(`runtime files scanned: ${runtimeFiles.length}`)
info.unshift(`project: ${root}`)

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
