#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

const root = path.resolve(process.argv[2] || process.cwd())
const jsonMode = process.argv.includes('--json')
const srcRoot = path.join(root, 'src')
const manifestPath = path.join(srcRoot, 'manifest.json')

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch (_) { return null }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'build', 'dist', '.git'].includes(entry.name)) continue
      walk(full, out)
    } else out.push(full)
  }
  return out
}

function rel(file) { return path.relative(root, file).replace(/\\/g, '/') }

function extractNativeImports(source) {
  const found = new Set()
  const patterns = [
    /\bfrom\s+['"]@([^'"]+)['"]/g,
    /\brequire\(\s*['"]@([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]@([^'"]+)['"]/g
  ]
  for (const re of patterns) {
    let match
    while ((match = re.exec(source))) found.add(match[1])
  }
  return [...found]
}

function styleStats(source) {
  const styles = [...source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n')
  return {
    styleBlocks: styles ? (source.match(/<style(?:\s[^>]*)?>/gi) || []).length : 0,
    classSelectors: (styles.match(/\.[A-Za-z_][\w-]*/g) || []).length,
    idSelectors: (styles.match(/#[A-Za-z_][\w-]*/g) || []).length,
    colorLiterals: (styles.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length
  }
}

if (!fs.existsSync(srcRoot)) {
  console.error(`project src directory not found: ${srcRoot}`)
  process.exit(1)
}

const manifest = readJson(manifestPath) || {}
const files = walk(srcRoot)
const codeFiles = files.filter(f => /\.(?:js|mjs|cjs|ux)$/.test(f))
const uxFiles = files.filter(f => f.endsWith('.ux'))
const jsFiles = files.filter(f => /\.(?:js|mjs|cjs)$/.test(f))
const assetFiles = files.filter(f => /\.(?:png|jpg|jpeg|webp|gif|svg|ttf|otf|woff2?)$/i.test(f))

const nativeUsage = new Map()
for (const file of codeFiles) {
  const source = fs.readFileSync(file, 'utf8')
  for (const moduleName of extractNativeImports(source)) {
    if (!nativeUsage.has(moduleName)) nativeUsage.set(moduleName, [])
    nativeUsage.get(moduleName).push(rel(file))
  }
}

const stateMachines = files.filter(f => /state[_-]?machine\.(?:js|mjs|cjs)$/i.test(path.basename(f)))
const repositories = files.filter(f => /repository\.(?:js|mjs|cjs)$/i.test(path.basename(f)))
const stores = files.filter(f => /store\.(?:js|mjs|cjs)$/i.test(path.basename(f)))
const capabilityDirs = files.filter(f => /(?:^|[/\\])capabilities?[/\\]/i.test(f) && /\.(?:js|mjs|cjs)$/.test(f))
const layoutFiles = files.filter(f => /(?:^|[/\\])layout\.(?:js|mjs|cjs)$/i.test(f))
const likelyTests = walk(root).filter(f => /(?:^|[/\\])tests?[/\\]/i.test(f) || /\.test\.(?:js|mjs|cjs)$/i.test(f))

const routes = manifest.router && manifest.router.pages ? Object.keys(manifest.router.pages) : []
const features = (Array.isArray(manifest.features) ? manifest.features : []).map(x => typeof x === 'string' ? x : x && x.name).filter(Boolean)
const permissions = (Array.isArray(manifest.permissions) ? manifest.permissions : []).map(x => typeof x === 'string' ? x : x && x.name).filter(Boolean)

const uiFiles = uxFiles.map(file => {
  const source = fs.readFileSync(file, 'utf8')
  const stats = styleStats(source)
  return {
    file: rel(file),
    templateBytes: Buffer.byteLength(source, 'utf8'),
    ...stats,
    hasScroll: /<\s*(?:list|scroll|swiper)\b/i.test(source),
    hasTouchGesture: /on(?:touch|swipe|click|longpress)/i.test(source)
  }
})

const summary = {
  projectRoot: root,
  manifest: {
    package: manifest.package || null,
    versionName: manifest.versionName || null,
    versionCode: manifest.versionCode ?? null,
    minAPILevel: manifest.minAPILevel ?? null,
    designWidth: manifest.config && manifest.config.designWidth,
    entry: manifest.router && manifest.router.entry,
    routes,
    features,
    permissions
  },
  counts: {
    files: files.length,
    ux: uxFiles.length,
    js: jsFiles.length,
    assets: assetFiles.length,
    routes: routes.length,
    stateMachines: stateMachines.length,
    repositories: repositories.length,
    stores: stores.length,
    capabilityFiles: capabilityDirs.length,
    layoutFiles: layoutFiles.length,
    tests: likelyTests.length
  },
  architecture: {
    stateMachines: stateMachines.map(rel),
    repositories: repositories.map(rel),
    stores: stores.map(rel),
    capabilities: capabilityDirs.map(rel),
    layouts: layoutFiles.map(rel)
  },
  nativeModules: [...nativeUsage.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, usedBy]) => ({ name, usedBy })),
  uiBaseline: {
    assets: assetFiles.map(rel),
    files: uiFiles
  },
  refactorQuestions: [
    'Visual mode selected: Preserve UI / Light Refresh / Redesign?',
    'Which state machine/store/repository is canonical for each business fact?',
    'Which native resources currently have more than one runtime owner?',
    'Which storage keys must remain backward compatible?',
    'Which visible defects are bugs rather than product intent?',
    'What simulator/device evidence exists for the current UI baseline?'
  ]
}

if (jsonMode) {
  console.log(JSON.stringify(summary, null, 2))
  process.exit(0)
}

console.log('openvela existing-app refactor inventory')
console.log(`- project: ${root}`)
console.log(`- package: ${summary.manifest.package || '(unknown)'}`)
console.log(`- routes: ${summary.counts.routes}`)
console.log(`- UI files: ${summary.counts.ux}`)
console.log(`- assets: ${summary.counts.assets}`)
console.log(`- native modules: ${summary.nativeModules.map(x => '@' + x.name).join(', ') || '(none)'}`)
console.log(`- state machines: ${summary.counts.stateMachines}`)
console.log(`- repositories/stores: ${summary.counts.repositories + summary.counts.stores}`)
console.log(`- capability files: ${summary.counts.capabilityFiles}`)
console.log(`- layout files: ${summary.counts.layoutFiles}`)
console.log(`- tests discovered: ${summary.counts.tests}`)

console.log('\nUI preservation candidates')
for (const item of uiFiles) {
  console.log(`- ${item.file}: ${item.templateBytes} bytes, ${item.styleBlocks} style block(s), scroll=${item.hasScroll}, gestures=${item.hasTouchGesture}`)
}

console.log('\nRefactor questions')
for (const question of summary.refactorQuestions) console.log(`- ${question}`)
