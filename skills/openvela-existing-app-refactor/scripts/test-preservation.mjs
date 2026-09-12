#!/usr/bin/env node

import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { captureProject } from './capture-preservation-baseline.mjs'
import { compareBaseline } from './compare-preservation-baseline.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vela-refactor-preserve-'))
const src = path.join(root, 'src')
fs.mkdirSync(path.join(src, 'pages', 'home'), { recursive: true })

fs.writeFileSync(path.join(src, 'manifest.json'), JSON.stringify({
  package: 'com.example.fixture',
  minAPILevel: 4,
  config: { designWidth: 192 },
  router: { entry: 'pages/home', pages: { 'pages/home': { component: 'home' } } }
}, null, 2))

const uxPath = path.join(src, 'pages', 'home', 'home.ux')
function writeUx(label = 'Start', handler = 'open', style = 'color: #ffffff;', extraScript = '') {
  fs.writeFileSync(uxPath, `<template>\n  <div class="page" onclick="${handler}">\n    <image src="/common/logo.png"></image>\n    <text>${label}</text>\n  </div>\n</template>\n<script>\nexport default { open () {}, ${extraScript} }\n</script>\n<style>\n.page { ${style} }\n</style>\n`)
}

writeUx()
const baseline = captureProject(root)

writeUx('Start', 'open', 'color: #ffffff;', 'internalOnly () { return 1 }')
let result = compareBaseline(baseline, captureProject(root), 'preserve')
assert.equal(result.errors.length, 0, 'script-only internal refactor must not fail preservation')
assert.equal(result.warnings.length, 0, 'script-only internal refactor must not create UI drift warning')

writeUx('Go', 'open', 'color: #ffffff;')
result = compareBaseline(baseline, captureProject(root), 'preserve')
assert.ok(result.errors.some(item => item.code === 'STATIC_TEXT_REMOVED'), 'visible copy change must fail Preserve UI')

writeUx('Start', 'renamedOpen', 'color: #ffffff;')
result = compareBaseline(baseline, captureProject(root), 'preserve')
assert.ok(result.errors.some(item => item.code === 'HANDLER_REMOVED'), 'interaction binding change must fail Preserve UI')

writeUx('Start', 'open', 'color: #00ff00;')
result = compareBaseline(baseline, captureProject(root), 'preserve')
assert.equal(result.errors.length, 0, 'style source drift requires runtime verification rather than deterministic failure')
assert.ok(result.warnings.some(item => item.code === 'STYLE_DRIFT'), 'style drift must be visible as a warning')

result = compareBaseline(baseline, captureProject(root), 'redesign')
assert.equal(result.errors.length, 0, 'Redesign mode must not reject intentional UI changes')

fs.rmSync(root, { recursive: true, force: true })
console.log('openvela preservation baseline self-test passed')
