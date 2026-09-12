#!/usr/bin/env node

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

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

function normalize(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function hash(value) {
  return crypto.createHash('sha256').update(normalize(value)).digest('hex')
}

function section(source, name) {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(source)
  return match ? match[1] : ''
}

function unique(values) { return [...new Set(values.filter(Boolean))].sort() }

function extractStaticText(template) {
  const stripped = template
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\{\{[^}]*\}\}/g, ' ')
  return unique(stripped.split(/\n+/).map(value => normalize(value)).filter(value => value && /[^{}]/.test(value)))
}

function extractAssets(source) {
  const values = []
  const patterns = [
    /\bsrc\s*=\s*["']([^"']+)["']/g,
    /\b(?:background|background-image)\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/g
  ]
  for (const re of patterns) {
    let match
    while ((match = re.exec(source))) values.push(match[1])
  }
  return unique(values)
}

function extractHandlers(template) {
  const values = []
  const re = /\b(on(?:click|touchstart|touchmove|touchend|swipe|longpress|key|scroll|change|focus|blur))\s*=\s*["']([^"']+)["']/gi
  let match
  while ((match = re.exec(template))) values.push(`${match[1].toLowerCase()}:${normalize(match[2])}`)
  return unique(values)
}

function extractTags(template) {
  const values = []
  const re = /<\s*([A-Za-z][\w-]*)\b/g
  let match
  while ((match = re.exec(template))) values.push(match[1].toLowerCase())
  return values
}

function extractClasses(template) {
  const values = []
  const re = /\bclass\s*=\s*["']([^"']+)["']/gi
  let match
  while ((match = re.exec(template))) {
    for (const value of match[1].split(/\s+/)) if (value && !/[{}]/.test(value)) values.push(value)
  }
  return unique(values)
}

function extractShapeMarkers(source) {
  const values = []
  for (const shape of ['circle', 'pill', 'rect']) {
    if (new RegExp(`\\b${shape}\\b`, 'i').test(source)) values.push(shape)
  }
  return values
}

export function captureProject(projectRoot) {
  const root = path.resolve(projectRoot)
  const srcRoot = path.join(root, 'src')
  const manifestPath = path.join(srcRoot, 'manifest.json')
  if (!fs.existsSync(srcRoot)) throw new Error(`project src directory not found: ${srcRoot}`)

  let manifest = {}
  if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const pages = manifest.router && manifest.router.pages ? manifest.router.pages : {}
  const uxFiles = walk(srcRoot).filter(file => file.endsWith('.ux')).sort()

  return {
    schemaVersion: 1,
    kind: 'openvela-preservation-baseline',
    project: {
      package: manifest.package || null,
      versionName: manifest.versionName || null,
      minAPILevel: manifest.minAPILevel ?? null,
      designWidth: manifest.config && manifest.config.designWidth,
      entry: manifest.router && manifest.router.entry,
      routes: Object.keys(pages).sort()
    },
    ui: uxFiles.map(file => {
      const source = fs.readFileSync(file, 'utf8')
      const template = section(source, 'template')
      const style = section(source, 'style')
      return {
        file: path.relative(root, file).replace(/\\/g, '/'),
        templateHash: hash(template),
        styleHash: hash(style),
        structureHash: hash(extractTags(template).join('>')),
        staticText: extractStaticText(template),
        assets: extractAssets(source),
        handlers: extractHandlers(template),
        classes: extractClasses(template),
        shapeMarkers: extractShapeMarkers(source)
      }
    })
  }
}

function parseArgs(argv) {
  const args = argv.slice(2)
  let root = process.cwd()
  let out = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') out = args[++i]
    else if (!args[i].startsWith('--')) root = args[i]
  }
  return { root, out }
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (invoked) {
  try {
    const { root, out } = parseArgs(process.argv)
    const baseline = captureProject(root)
    const text = JSON.stringify(baseline, null, 2) + '\n'
    if (out) {
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
      fs.writeFileSync(path.resolve(out), text)
      console.log(`preservation baseline written: ${path.resolve(out)}`)
    } else process.stdout.write(text)
  } catch (error) {
    console.error(`capture failed: ${error.message}`)
    process.exit(1)
  }
}
