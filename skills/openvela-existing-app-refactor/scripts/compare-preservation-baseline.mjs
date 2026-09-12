#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { captureProject } from './capture-preservation-baseline.mjs'

function set(value) { return new Set(Array.isArray(value) ? value : []) }
function difference(a, b) { return [...set(a)].filter(value => !set(b).has(value)).sort() }

function severityFor(mode, kind) {
  if (mode === 'redesign') return 'info'
  if (mode === 'light') return kind === 'route' || kind === 'handler' ? 'error' : 'warning'
  if (kind === 'hash') return 'warning'
  return 'error'
}

function push(findings, severity, code, message, file) {
  findings.push({ severity, code, message, file: file || null })
}

export function compareBaseline(baseline, current, mode = 'preserve') {
  const findings = []
  const selectedMode = ['preserve', 'light', 'redesign'].includes(mode) ? mode : 'preserve'

  if ((baseline.project && baseline.project.entry) !== (current.project && current.project.entry)) {
    push(findings, severityFor(selectedMode, 'route'), 'ENTRY_CHANGED', `entry changed from '${baseline.project?.entry}' to '${current.project?.entry}'`)
  }

  for (const route of difference(baseline.project?.routes, current.project?.routes)) {
    push(findings, severityFor(selectedMode, 'route'), 'ROUTE_REMOVED', `route removed: ${route}`)
  }

  const currentByFile = new Map((current.ui || []).map(item => [item.file, item]))
  for (const before of baseline.ui || []) {
    const after = currentByFile.get(before.file)
    if (!after) {
      push(findings, severityFor(selectedMode, 'route'), 'UI_FILE_REMOVED', 'UI file removed', before.file)
      continue
    }

    for (const text of difference(before.staticText, after.staticText)) {
      push(findings, severityFor(selectedMode, 'content'), 'STATIC_TEXT_REMOVED', `static visible text removed or changed: ${JSON.stringify(text)}`, before.file)
    }
    for (const asset of difference(before.assets, after.assets)) {
      push(findings, severityFor(selectedMode, 'content'), 'ASSET_REMOVED', `referenced asset removed or changed: ${asset}`, before.file)
    }
    for (const handler of difference(before.handlers, after.handlers)) {
      push(findings, severityFor(selectedMode, 'handler'), 'HANDLER_REMOVED', `interaction binding removed or changed: ${handler}`, before.file)
    }
    for (const shape of difference(before.shapeMarkers, after.shapeMarkers)) {
      push(findings, severityFor(selectedMode, 'content'), 'SHAPE_BRANCH_REMOVED', `shape marker removed: ${shape}`, before.file)
    }

    if (before.structureHash !== after.structureHash) {
      push(findings, severityFor(selectedMode, 'hash'), 'STRUCTURE_DRIFT', 'template tag structure changed; verify rendered equivalence', before.file)
    }
    if (before.templateHash !== after.templateHash) {
      push(findings, severityFor(selectedMode, 'hash'), 'TEMPLATE_DRIFT', 'template source changed; static comparison cannot prove visual equivalence', before.file)
    }
    if (before.styleHash !== after.styleHash) {
      push(findings, severityFor(selectedMode, 'hash'), 'STYLE_DRIFT', 'style source changed; verify simulator/device rendering', before.file)
    }
  }

  return {
    mode: selectedMode,
    errors: findings.filter(item => item.severity === 'error'),
    warnings: findings.filter(item => item.severity === 'warning'),
    info: findings.filter(item => item.severity === 'info'),
    findings
  }
}

function parseArgs(argv) {
  const args = argv.slice(2)
  if (!args[0]) throw new Error('usage: compare-preservation-baseline.mjs <baseline.json> <project-root> [--mode preserve|light|redesign] [--json]')
  const baselinePath = args[0]
  let root = args[1] && !args[1].startsWith('--') ? args[1] : process.cwd()
  let mode = 'preserve'
  let json = false
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--mode') mode = args[++i]
    if (args[i] === '--json') json = true
  }
  return { baselinePath, root, mode, json }
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (invoked) {
  try {
    const { baselinePath, root, mode, json } = parseArgs(process.argv)
    const baseline = JSON.parse(fs.readFileSync(path.resolve(baselinePath), 'utf8'))
    const current = captureProject(root)
    const result = compareBaseline(baseline, current, mode)

    if (json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`openvela preservation comparison (${result.mode})`)
      console.log(`- errors: ${result.errors.length}`)
      console.log(`- warnings: ${result.warnings.length}`)
      console.log(`- info: ${result.info.length}`)
      for (const item of result.findings) console.log(`- [${item.severity}] ${item.code}${item.file ? ` [${item.file}]` : ''}: ${item.message}`)
      if (!result.findings.length) console.log('- no static UI drift detected')
    }

    process.exit(result.errors.length ? 1 : 0)
  } catch (error) {
    console.error(`compare failed: ${error.message}`)
    process.exit(1)
  }
}
