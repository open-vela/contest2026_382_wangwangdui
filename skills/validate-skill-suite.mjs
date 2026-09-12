#!/usr/bin/env node

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

function argValue(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

const defaultRoot = path.dirname(fileURLToPath(import.meta.url))
const skillsRoot = path.resolve(argValue('--root') || defaultRoot)
const skipTests = process.argv.includes('--skip-tests')
const errors = []
const warnings = []

function issue(list, skill, code, message, file = null) {
  list.push({ skill, code, message, file })
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

function parseFrontmatter(source) {
  const normalized = source.replace(/\r\n/g, '\n')
  const match = /^---\n([\s\S]*?)\n---\n/.exec(normalized)
  if (!match) return { fields: {}, keys: [], body: normalized }
  const fields = {}
  const keys = []
  for (const line of match[1].split('\n')) {
    const part = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!part) continue
    keys.push(part[1])
    fields[part[1]] = part[2]
  }
  return { fields, keys, body: normalized.slice(match[0].length) }
}

function mentionedLocalPaths(source) {
  const found = new Set()
  const patterns = [
    /`((?:references|scripts)\/[A-Za-z0-9_./-]+)`/g,
    /`(\.\.\/[A-Za-z0-9_./-]+\/SKILL\.md)`/g,
    /\]\(((?:references|scripts)\/[A-Za-z0-9_./-]+)\)/g,
    /\]\((\.\.\/[A-Za-z0-9_./-]+\/SKILL\.md)\)/g
  ]
  for (const re of patterns) {
    let match
    while ((match = re.exec(source))) found.add(match[1])
  }
  return [...found]
}

if (!fs.existsSync(skillsRoot)) {
  console.error(`skills root not found: ${skillsRoot}`)
  process.exit(1)
}

const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')))
  .map(entry => path.join(skillsRoot, entry.name))
  .sort()

for (const dir of skillDirs) {
  const skill = path.basename(dir)
  const skillFile = path.join(dir, 'SKILL.md')
  const source = fs.readFileSync(skillFile, 'utf8')
  const { fields, keys, body } = parseFrontmatter(source)

  if (!fields.name) issue(errors, skill, 'FRONTMATTER_NAME', 'missing name in SKILL.md', skillFile)
  if (!fields.description) issue(errors, skill, 'FRONTMATTER_DESCRIPTION', 'missing description in SKILL.md', skillFile)
  if (fields.name && fields.name !== skill) issue(errors, skill, 'NAME_DIRECTORY_MISMATCH', `name '${fields.name}' does not match directory '${skill}'`, skillFile)

  const extraKeys = keys.filter(key => !['name', 'description'].includes(key))
  if (extraKeys.length) issue(errors, skill, 'FRONTMATTER_EXTRA_FIELDS', `unsupported frontmatter fields: ${extraKeys.join(', ')}`, skillFile)

  const bodyLines = body.split('\n').length
  if (bodyLines > 500) issue(warnings, skill, 'SKILL_TOO_LONG', `SKILL.md body is ${bodyLines} lines; prefer progressive disclosure`, skillFile)

  for (const local of mentionedLocalPaths(source)) {
    const resolved = path.resolve(dir, local)
    if (!fs.existsSync(resolved)) issue(errors, skill, 'BROKEN_LOCAL_REFERENCE', `referenced path does not exist: ${local}`, skillFile)
  }

  const forbidden = ['README.md', 'INSTALLATION_GUIDE.md', 'QUICK_REFERENCE.md', 'CHANGELOG.md']
  for (const file of forbidden) {
    if (fs.existsSync(path.join(dir, file))) issue(warnings, skill, 'EXTRANEOUS_SKILL_DOC', `${file} should not live inside a focused skill package`, path.join(dir, file))
  }

  const scripts = walk(path.join(dir, 'scripts')).filter(file => /\.mjs$/.test(file))
  for (const script of scripts) {
    const check = spawnSync(process.execPath, ['--check', script], { encoding: 'utf8' })
    if (check.status !== 0) issue(errors, skill, 'SCRIPT_SYNTAX', check.stderr.trim() || 'node --check failed', script)
  }

  const tests = scripts.filter(file => /^test-.*\.mjs$/.test(path.basename(file)))
  if (!skipTests) {
    for (const test of tests) {
      const run = spawnSync(process.execPath, [test], { encoding: 'utf8', timeout: 30000 })
      if (run.status !== 0) issue(errors, skill, 'SELF_TEST_FAILED', `${path.basename(test)} failed: ${(run.stderr || run.stdout || '').trim()}`, test)
    }
  }

  if (!tests.length) issue(warnings, skill, 'NO_SELF_TEST', 'no scripts/test-*.mjs self-test found', dir)
}

console.log('openvela skill suite validation')
console.log(`- root: ${skillsRoot}`)
console.log(`- skills: ${skillDirs.length}`)
console.log(`- self-tests: ${skipTests ? 'skipped' : 'enabled'}`)
console.log(`- errors: ${errors.length}`)
console.log(`- warnings: ${warnings.length}`)

for (const item of [...errors, ...warnings]) {
  const rel = item.file ? path.relative(skillsRoot, item.file).replace(/\\/g, '/') : ''
  console.log(`- [${errors.includes(item) ? 'error' : 'warning'}] ${item.skill}/${item.code}${rel ? ` [${rel}]` : ''}: ${item.message}`)
}

if (!errors.length && !warnings.length) console.log('- skill suite is clean')
process.exit(errors.length ? 1 : 0)
