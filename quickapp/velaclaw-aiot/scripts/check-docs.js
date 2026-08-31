const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const excludedDirectories = new Set([
  '.git',
  '.idea',
  '.codebuddy',
  'build',
  'dist',
  'node_modules',
  'outputs'
])

function collectMarkdownFiles(directory, files) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  entries.forEach(function (entry) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) return
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      collectMarkdownFiles(fullPath, files)
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath)
    }
  })
}

function getLocalTarget(rawTarget) {
  let target = rawTarget.trim()
  if (!target || /^(https?:|mailto:|#)/i.test(target)) return null
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1)
  }
  target = target.split('#')[0]
  if (!target) return null
  try {
    return decodeURIComponent(target)
  } catch (error) {
    return target
  }
}

const markdownFiles = []
const errors = []
collectMarkdownFiles(root, markdownFiles)

markdownFiles.forEach(function (file) {
  const source = fs.readFileSync(file, 'utf8')
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g
  let match
  while ((match = linkPattern.exec(source)) !== null) {
    const target = getLocalTarget(match[1])
    if (!target) continue
    const resolved = path.resolve(path.dirname(file), target)
    if (!fs.existsSync(resolved)) {
      errors.push(path.relative(root, file) + ': missing local link ' + match[1])
    }
  }
})

if (errors.length > 0) {
  errors.forEach(function (error) {
    console.error(error)
  })
  console.error('Checked ' + markdownFiles.length + ' Markdown files: ' + errors.length + ' broken links')
  process.exitCode = 1
} else {
  console.log('Checked ' + markdownFiles.length + ' Markdown files: 0 broken links')
}
