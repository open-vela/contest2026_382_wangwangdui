'use strict'

const { clone, setPath, deletePath } = require('./object')

function applyChanges(layout, shape, changes) {
  const result = clone(layout || {})
  if (!result[shape] || typeof result[shape] !== 'object') result[shape] = {}
  Object.keys(changes || {}).forEach(path => {
    const value = changes[path]
    if (value === null) deletePath(result[shape], path)
    else setPath(result[shape], path, value)
  })
  return result
}

function findShapeRange(source, shape) {
  const re = new RegExp('(^|\\n)([ \\t]*)' + shape.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '\\s*:\\s*\\{', 'm')
  const match = re.exec(source)
  if (!match) throw new Error('找不到 ' + shape + ' 配置块')
  const open = source.indexOf('{', match.index + match[0].lastIndexOf('{'))
  let depth = 0
  let quote = null
  let lineComment = false
  let blockComment = false
  let escaped = false
  for (let i = open; i < source.length; i++) {
    const ch = source[i]
    const next = source[i + 1]
    if (lineComment) { if (ch === '\n') lineComment = false; continue }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i++ }; continue }
    if (quote) {
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === quote) quote = null
      continue
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue }
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return { start: open, end: i + 1, indent: match[2] }
    }
  }
  throw new Error(shape + ' 配置块括号不完整')
}

function keyText(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
}

function stringText(value) {
  return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'"
}

function serialize(value, indent) {
  const level = indent || 0
  const pad = '  '.repeat(level)
  const next = '  '.repeat(level + 1)
  if (value === null) return 'null'
  if (typeof value === 'string') return stringText(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    if (value.every(item => item === null || ['string', 'number', 'boolean'].includes(typeof item))) return '[' + value.map(item => serialize(item, 0)).join(', ') + ']'
    return '[\n' + value.map(item => next + serialize(item, level + 1)).join(',\n') + '\n' + pad + ']'
  }
  const keys = Object.keys(value || {})
  if (!keys.length) return '{}'
  const simple = keys.length <= 3 && keys.every(key => {
    const item = value[key]
    return item === null || ['string', 'number', 'boolean'].includes(typeof item)
  })
  if (simple) return '{ ' + keys.map(key => keyText(key) + ': ' + serialize(value[key], 0)).join(', ') + ' }'
  return '{\n' + keys.map(key => next + keyText(key) + ': ' + serialize(value[key], level + 1)).join(',\n') + '\n' + pad + '}'
}

function rewriteShapeBlock(source, shape, shapeValue) {
  const range = findShapeRange(source, shape)
  const serialized = serialize(shapeValue || {}, Math.floor(range.indent.length / 2))
  return source.slice(0, range.start) + serialized + source.slice(range.end)
}

module.exports = { applyChanges, findShapeRange, rewriteShapeBlock, serialize }
