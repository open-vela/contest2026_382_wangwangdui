#!/usr/bin/env node

import assert from 'assert'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const validator = path.join(here, 'validate-skill-suite.mjs')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vela-skill-suite-'))

function writeSkill(name, skillMd, script = null) {
  const dir = path.join(root, name)
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'SKILL.md'), skillMd)
  if (script) fs.writeFileSync(path.join(dir, 'scripts', 'test-fixture.mjs'), script)
  return dir
}

writeSkill('good-skill', `---\nname: good-skill\ndescription: Fixture skill used to validate the validator.\n---\n\n# Good Skill\n\nRead \`references/rules.md\`.\n`, `console.log('fixture self-test passed')\n`)
fs.writeFileSync(path.join(root, 'good-skill', 'references', 'rules.md'), '# Rules\n')

let run = spawnSync(process.execPath, [validator, '--root', root], { encoding: 'utf8' })
assert.equal(run.status, 0, `good fixture should pass: ${run.stdout}\n${run.stderr}`)

writeSkill('bad-skill', `---\nname: wrong-name\ndescription: Broken fixture.\nlicense: unexpected\n---\n\n# Bad Skill\n\nRead \`references/missing.md\`.\n`)
run = spawnSync(process.execPath, [validator, '--root', root, '--skip-tests'], { encoding: 'utf8' })
assert.equal(run.status, 1, 'broken fixture should fail validation')
assert.match(run.stdout, /NAME_DIRECTORY_MISMATCH/)
assert.match(run.stdout, /FRONTMATTER_EXTRA_FIELDS/)
assert.match(run.stdout, /BROKEN_LOCAL_REFERENCE/)

fs.rmSync(root, { recursive: true, force: true })
console.log('openvela skill suite validator self-test passed')
