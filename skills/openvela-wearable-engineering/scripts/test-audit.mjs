#!/usr/bin/env node

import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const auditPath = path.join(scriptDir, 'audit-quickapp.mjs')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openvela-wearable-audit-'))

function writeProject(name, manifest, files) {
  const root = path.join(tempRoot, name)
  const src = path.join(root, 'src')
  fs.mkdirSync(src, { recursive: true })
  fs.writeFileSync(path.join(src, 'manifest.json'), JSON.stringify(manifest, null, 2))
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(src, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, content)
  }
  return root
}

function run(root) {
  return spawnSync(process.execPath, [auditPath, root], { encoding: 'utf8' })
}

function expectFinding(result, code) {
  assert.match(result.stdout, new RegExp(`\\b${code}\\b`), `expected ${code}\n${result.stdout}\n${result.stderr}`)
}

try {
  const good = writeProject('good', {
    minAPILevel: 4,
    features: [{ name: 'system.geolocation' }],
    permissions: [{ name: 'hapjs.permission.LOCATION' }]
  }, {
    'main.js': "import router from '@system.router'\nimport geo from '@system.geolocation'\nrouter.push({ uri: '/detail' })\ngeo.subscribe({ callback: function () {} })\n"
  })
  let result = run(good)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.doesNotMatch(result.stdout, /FEATURE_NOT_DECLARED/)

  const invented = writeProject('invented-api', {
    minAPILevel: 4,
    features: [],
    permissions: []
  }, {
    'main.js': "import router from '@system.router'\nrouter.teleport({ uri: '/detail' })\n"
  })
  result = run(invented)
  assert.equal(result.status, 1)
  expectFinding(result, 'UNKNOWN_NATIVE_MEMBER')

  const permission = writeProject('permission', {
    minAPILevel: 4,
    features: [{ name: 'system.geolocation' }],
    permissions: []
  }, {
    'main.js': "import geo from '@system.geolocation'\ngeo.subscribe({ callback: function () {} })\n"
  })
  result = run(permission)
  assert.equal(result.status, 1)
  expectFinding(result, 'PERMISSION_MISSING')

  const apiLevel = writeProject('api-level', {
    minAPILevel: 2,
    features: [{ name: 'system.event' }],
    permissions: []
  }, {
    'main.js': "import event from '@system.event'\nevent.subscribe({ eventName: 'demo', callback: function () {} })\n"
  })
  result = run(apiLevel)
  assert.equal(result.status, 1)
  expectFinding(result, 'MIN_API_LEVEL_TOO_LOW')

  const returnedObject = writeProject('returned-object', {
    minAPILevel: 4,
    features: [{ name: 'system.interconnect' }],
    permissions: []
  }, {
    'main.js': "import interconnect from '@system.interconnect'\nvar connection = null\nconnection = interconnect.instance()\nconnection.teleport()\n"
  })
  result = run(returnedObject)
  assert.equal(result.status, 1)
  expectFinding(result, 'UNKNOWN_RETURNED_OBJECT_MEMBER')

  const projectVerified = writeProject('project-verified', {
    minAPILevel: 4,
    features: [{ name: 'service.health' }],
    permissions: [{ name: 'hapjs.permission.HEALTH' }]
  }, {
    'main.js': "import health from '@service.health'\nvar types = health.DATA_TYPES\nhealth.subscribeSample({ dataType: types && types.HEART_RATE })\n"
  })
  result = run(projectVerified)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  expectFinding(result, 'NON_OFFICIAL_API_AUTHORITY')

  const platformLeak = writeProject('platform-leak', {
    minAPILevel: 4,
    features: [],
    permissions: []
  }, {
    'main.js': "import fs from 'fs'\ndocument.title = 'demo'\n"
  })
  result = run(platformLeak)
  assert.equal(result.status, 1)
  expectFinding(result, 'NODE_BUILTIN_RUNTIME')
  expectFinding(result, 'BROWSER_GLOBAL_RUNTIME')

  console.log('openvela wearable audit self-test passed')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
