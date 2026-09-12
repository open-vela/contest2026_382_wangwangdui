#!/usr/bin/env node

import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const inventory = path.join(here, 'inventory-existing-app.mjs')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vela-refactor-skill-'))

function write(rel, content) {
  const file = path.join(tmp, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

try {
  write('src/manifest.json', JSON.stringify({
    package: 'com.example.refactor',
    versionName: '1.0.0',
    minAPILevel: 4,
    config: { designWidth: 192 },
    features: [{ name: 'system.router' }],
    router: { entry: 'pages/home', pages: { 'pages/home': { component: 'home' } } }
  }))
  write('src/pages/home.ux', `<template><div class="page" onclick="open"><text>Legacy</text></div></template>\n<script>import router from '@system.router'\nexport default { open(){ router.push({uri:'/pages/home'}) } }</script>\n<style>.page { background-color:#000000; }</style>`)
  write('src/domain/workout/state_machine.js', `module.exports = {}`)
  write('src/domain/workout/repository.js', `module.exports = {}`)
  write('src/capabilities/router.js', `export default {}`)
  write('src/v2/design/apps/home/layout.js', `module.exports = { base: {} }`)
  write('src/common/logo.png', 'fixture')
  write('test/home.test.js', `console.log('fixture')`)

  const result = spawnSync(process.execPath, [inventory, tmp, '--json'], { encoding: 'utf8' })
  assert.strictEqual(result.status, 0, result.stderr)
  const data = JSON.parse(result.stdout)
  assert.strictEqual(data.manifest.package, 'com.example.refactor')
  assert.strictEqual(data.counts.routes, 1)
  assert.strictEqual(data.counts.ux, 1)
  assert.strictEqual(data.counts.assets, 1)
  assert.strictEqual(data.counts.stateMachines, 1)
  assert.strictEqual(data.counts.repositories, 1)
  assert.strictEqual(data.counts.capabilityFiles, 1)
  assert.strictEqual(data.counts.layoutFiles, 1)
  assert.ok(data.nativeModules.some(item => item.name === 'system.router'))
  assert.strictEqual(data.uiBaseline.files[0].hasTouchGesture, true)
  assert.ok(data.refactorQuestions[0].includes('Preserve UI'))

  console.log('openvela existing-app refactor inventory self-test passed')
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
