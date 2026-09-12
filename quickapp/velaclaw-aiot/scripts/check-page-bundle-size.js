const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const candidates = [
  path.join(root, 'build', 'pages'),
  path.join(root, '.temp_velaclaw-aiot', 'build', 'pages')
]
const hardLimit = 1024 * 1024
const softLimit = 900 * 1024
const inlineMapMarker = '//# sourceMappingURL=data:'

function filesUnder(dir, out) {
  out = out || []
  if (!fs.existsSync(dir)) return out
  fs.readdirSync(dir).forEach(function (name) {
    const file = path.join(dir, name)
    const stat = fs.statSync(file)
    if (stat.isDirectory()) filesUnder(file, out)
    else if (/\.js$/.test(name)) out.push({ file: file, size: stat.size })
  })
  return out
}

let pagesRoot = null
let files = []
for (let index = 0; index < candidates.length; index++) {
  const candidateFiles = filesUnder(candidates[index], [])
  if (candidateFiles.length) {
    pagesRoot = candidates[index]
    files = candidateFiles
    break
  }
}

if (!files.length) {
  console.error('V2 page bundle budget: no page JavaScript output found after AIoT build')
  console.error('Checked:')
  candidates.forEach(candidate => console.error('- ' + candidate))
  process.exit(1)
}

files.sort((a, b) => b.size - a.size)
const failures = []
console.log('V2 page JavaScript bundle budget (hard limit 1024 KiB; inline source maps forbidden)')
console.log('Bundle root: ' + pagesRoot)
files.forEach(entry => {
  const relative = path.relative(root, entry.file).split(path.sep).join('/')
  const source = fs.readFileSync(entry.file, 'utf8')
  const inlineIndex = source.lastIndexOf(inlineMapMarker)
  const hasInlineMap = inlineIndex >= 0
  const inlineBytes = hasInlineMap ? Buffer.byteLength(source.slice(inlineIndex), 'utf8') : 0
  const executableBytes = entry.size - inlineBytes
  const kib = (entry.size / 1024).toFixed(1)
  const executableKib = (executableBytes / 1024).toFixed(1)
  const label = (entry.size > hardLimit || hasInlineMap) ? 'FAIL' : (entry.size > softLimit ? 'WARN' : 'OK  ')
  const mapNote = hasInlineMap ? '  inline-map=' + (inlineBytes / 1024).toFixed(1) + ' KiB; executable=' + executableKib + ' KiB' : ''
  console.log(label + '  ' + kib + ' KiB  ' + relative + mapNote)
  if (hasInlineMap) failures.push(relative + ' embeds a base64 inline source map (' + inlineBytes + ' bytes)')
  if (entry.size > hardLimit) failures.push(relative + ' = ' + entry.size + ' bytes')
})

if (failures.length) {
  console.error('\nPage JavaScript bundle violations:')
  failures.forEach(failure => console.error('- ' + failure))
  process.exit(1)
}

console.log('\nPage bundle budget verified: ' + files.length + ' page JS files are <= 1024 KiB and contain no inline source maps')
