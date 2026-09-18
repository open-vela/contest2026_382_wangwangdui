/*
 * Hard per-file size gate for everything that leaves the build.
 *
 * The device installer rejects a package that contains a file larger than
 * 1 MiB, so a build can look successful and still be uninstallable. That is
 * exactly what happened when the build pipeline started embedding base64
 * inline source maps: build/pages/clock/clock.js reached 1,060,058 bytes and the
 * RPK installed nowhere, while the smallest page bundles stayed fine.
 *
 * This gate walks the build output and the packaged RPK and fails on any entry
 * over the limit, so the failure surfaces at build time with a filename instead
 * of at install time with no explanation.
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const LIMIT = 1024 * 1024
const WEB_EXTENSIONS = ['.js', '.jsc', '.json', '.css', '.png', '.jpg', '.jpeg', '.bin', '.so']

const BUILD_DIRS = [
  path.join(root, 'build'),
  path.join(root, '.temp_velaclaw-aiot', 'build')
]

function filesUnder(dir, out) {
  out = out || []
  if (!fs.existsSync(dir)) return out
  fs.readdirSync(dir).forEach(function (name) {
    const file = path.join(dir, name)
    const stat = fs.statSync(file)
    if (stat.isDirectory()) filesUnder(file, out)
    else out.push({ file: file, size: stat.size })
  })
  return out
}

function newestRpk() {
  const candidates = [path.join(root, 'dist'), path.join(root, '.temp_velaclaw-aiot', 'dist')]
  let best = null
  candidates.forEach(function (dir) {
    if (!fs.existsSync(dir)) return
    fs.readdirSync(dir).forEach(function (name) {
      if (!/\.rpk$/.test(name)) return
      // Update builds also drop `*.diff.rpk` next to the product package; the
      // gate has to inspect the artifact that actually ships.
      if (/\.diff\.rpk$/.test(name)) return
      const file = path.join(dir, name)
      const stat = fs.statSync(file)
      if (!best || stat.mtimeMs > best.mtimeMs) best = { file: file, size: stat.size, mtimeMs: stat.mtimeMs }
    })
  })
  return best
}

/** Parse the ZIP central directory so the check sees what the device sees. */
function zipEntries(file) {
  const buffer = fs.readFileSync(file)
  const entries = []
  for (let index = 0; index < buffer.length - 46; index += 1) {
    if (buffer.readUInt32LE(index) !== 0x02014b50) continue
    const compressed = buffer.readUInt32LE(index + 20)
    const nameLength = buffer.readUInt16LE(index + 28)
    const extraLength = buffer.readUInt16LE(index + 30)
    const commentLength = buffer.readUInt16LE(index + 32)
    const name = buffer.slice(index + 46, index + 46 + nameLength).toString('utf8')
    // The central directory stores the uncompressed size at +24; prefer it, and
    // fall back to the compressed size when a streaming writer leaves it zero.
    const uncompressed = buffer.readUInt32LE(index + 24)
    entries.push({ name: name, size: uncompressed || compressed })
    index += 45 + nameLength + extraLength + commentLength
  }
  return entries
}

const problems = []

const built = []
BUILD_DIRS.forEach(function (dir) {
  filesUnder(dir, built)
})
if (!built.length) {
  console.error('Artifact size gate: no build output found. Run a build first.')
  process.exit(1)
}

built.sort(function (a, b) {
  return b.size - a.size
})
console.log('Artifact size gate (hard limit 1024 KiB per file)')
console.log('Largest build files:')
built.slice(0, 5).forEach(function (entry) {
  console.log('  ' + (entry.size / 1024).toFixed(1) + ' KiB  ' + path.relative(root, entry.file).split(path.sep).join('/'))
})
built.forEach(function (entry) {
  if (entry.size > LIMIT) problems.push(path.relative(root, entry.file).split(path.sep).join('/') + ' = ' + entry.size + ' bytes')
})

const rpk = newestRpk()
if (rpk) {
  const entries = zipEntries(rpk.file).filter(function (entry) {
    return WEB_EXTENSIONS.indexOf(path.extname(entry.name).toLowerCase()) >= 0
  })
  entries.sort(function (a, b) {
    return b.size - a.size
  })
  console.log('Packaged: ' + path.relative(root, rpk.file).split(path.sep).join('/') + ' (' + (rpk.size / 1024).toFixed(1) + ' KiB)')
  entries.slice(0, 5).forEach(function (entry) {
    console.log('  ' + (entry.size / 1024).toFixed(1) + ' KiB  ' + entry.name)
  })
  entries.forEach(function (entry) {
    if (entry.size > LIMIT) problems.push(path.basename(rpk.file) + ' :: ' + entry.name + ' = ' + entry.size + ' bytes')
  })
} else {
  console.log('Packaged: no .rpk found (pre-package check only)')
}

if (problems.length) {
  console.error('\nArtifact size violations (the device cannot install these):')
  problems.forEach(function (problem) {
    console.error('- ' + problem)
  })
  console.error('\nHint: inline source maps are the usual cause. Build with `--devtool false`,')
  console.error('or keep the map out of the shipped bundle, then rebuild.')
  process.exit(1)
}

console.log('\nArtifact size verified: every build and packaged file is <= 1024 KiB')
