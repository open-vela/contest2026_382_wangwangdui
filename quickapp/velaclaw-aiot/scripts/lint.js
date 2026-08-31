const fs = require('fs')
const path = require('path')
const { ESLint } = require('eslint')

const supportedExtensions = new Set(['.js', '.ux'])

function collectFiles(target, result) {
  if (!fs.existsSync(target)) return
  const stat = fs.statSync(target)
  if (stat.isDirectory()) {
    fs.readdirSync(target).forEach(function (name) {
      collectFiles(path.join(target, name), result)
    })
    return
  }
  if (supportedExtensions.has(path.extname(target))) {
    result.push(target)
  }
}

function extractSources(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  if (path.extname(filePath) === '.js') {
    return [{ code: source, lineOffset: 0 }]
  }

  const scripts = []
  const scriptPattern = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi
  let match
  while ((match = scriptPattern.exec(source)) !== null) {
    const contentStart = match.index + match[0].indexOf(match[1])
    const lineOffset = (source.slice(0, contentStart).match(/\n/g) || []).length
    scripts.push({ code: match[1], lineOffset: lineOffset })
  }
  return scripts
}

function lintVelaUx(filePath) {
  if (path.extname(filePath) !== '.ux') return []
  const source = fs.readFileSync(filePath, 'utf8')
  const checks = [
    {
      pattern: /<slider\b[^>]*\benabled\s*=/gi,
      message: 'slider does not support the enabled attribute'
    },
    {
      pattern: /border-(?:left|right|top|bottom)\s*:/gi,
      message: 'directional border shorthand is not supported by Vela'
    },
    {
      pattern: /\.\$page\.setTitleBar\s*\(/g,
      message: '$page.setTitleBar is not available on the watch runtime'
    }
  ]
  const issues = []
  checks.forEach(function (check) {
    let match
    while ((match = check.pattern.exec(source)) !== null) {
      const prefix = source.slice(0, match.index)
      const line = (prefix.match(/\n/g) || []).length + 1
      const lineStart = prefix.lastIndexOf('\n') + 1
      issues.push({
        line: line,
        column: match.index - lineStart + 1,
        message: check.message
      })
    }
  })
  return issues
}

async function main() {
  const targets = process.argv.length > 2 ? process.argv.slice(2) : ['src']
  const files = []
  targets.forEach(function (target) {
    collectFiles(path.resolve(target), files)
  })
  files.sort()

  const eslint = new ESLint({
    useEslintrc: false,
    baseConfig: {
      env: {
        browser: true,
        node: true,
        es2022: true
      },
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest'
      },
      rules: {
        'no-undef': 'error',
        'no-unused-vars': 'warn',
        'no-unreachable': 'error',
        'no-dupe-keys': 'error',
        'valid-typeof': 'error'
      }
    }
  })

  let errorCount = 0
  let warningCount = 0
  for (const filePath of files) {
    const velaIssues = lintVelaUx(filePath)
    velaIssues.forEach(function (issue) {
      errorCount++
      const relativePath = path.relative(process.cwd(), filePath)
      console.log(relativePath + ':' + issue.line + ':' + issue.column + ' error ' + issue.message + ' (vela-runtime)')
    })
    const sources = extractSources(filePath)
    for (const source of sources) {
      const results = await eslint.lintText(source.code, { filePath: filePath + '.js' })
      results.forEach(function (result) {
        result.messages.forEach(function (message) {
          const severity = message.severity === 2 ? 'error' : 'warning'
          if (message.severity === 2) errorCount++
          else warningCount++
          const relativePath = path.relative(process.cwd(), filePath)
          const line = message.line + source.lineOffset
          const rule = message.ruleId ? ' (' + message.ruleId + ')' : ''
          console.log(relativePath + ':' + line + ':' + message.column + ' ' + severity + ' ' + message.message + rule)
        })
      })
    }
  }

  console.log('Checked ' + files.length + ' files: ' + errorCount + ' errors, ' + warningCount + ' warnings')
  if (errorCount > 0) process.exitCode = 1
}

main().catch(function (error) {
  console.error(error && error.stack ? error.stack : error)
  process.exitCode = 1
})
