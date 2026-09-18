'use strict'

const { getPath } = require('./object')

function block(source, tag) {
  const match = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i').exec(source || '')
  return match ? match[1].trim() : ''
}

function flattenPlan(plan, scene, safe, mock) {
  const shape = plan && plan.shape ? plan.shape : 'rect'
  const values = Object.assign({
    ready: true,
    pageVisible: true,
    faceMounted: true,
    isCircle: shape === 'circle',
    isPill: shape === 'pill',
    isRect: shape === 'rect',
    sceneWidth: scene && scene.width || 192,
    sceneHeight: scene && scene.height || 192,
    viewportClass: '', viewportPosition: 'relative', viewportLeft: '0px', viewportTop: '0px', viewportWidth: '100%', viewportHeight: '100%'
  }, mock || {})
  Object.keys(plan || {}).forEach(key => {
    const value = plan[key]
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value) || Array.isArray(value)) values[key] = value
    if (value && typeof value === 'object' && ['left', 'top', 'width', 'height'].every(name => typeof value[name] === 'number')) {
      values[key + 'Left'] = value.left
      values[key + 'Top'] = value.top
      values[key + 'Width'] = value.width
      values[key + 'Height'] = value.height
    }
  })
  if (safe) {
    values.safeLeft = safe.left; values.safeTop = safe.top; values.safeWidth = safe.width; values.safeHeight = safe.height
  }
  return values
}

function stripBinding(value) {
  const text = String(value == null ? '' : value).trim()
  const match = /^\{\{\s*([\s\S]*?)\s*\}\}$/.exec(text)
  return match ? match[1].trim() : text
}

function findLogical(source, operator) {
  let quote = null
  let depth = 0
  for (let i = 0; i <= source.length - operator.length; i++) {
    const ch = source[i]
    if (quote) {
      if (ch === quote && source[i - 1] !== '\\') quote = null
      continue
    }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === '(') { depth++; continue }
    if (ch === ')') { depth = Math.max(0, depth - 1); continue }
    if (depth === 0 && source.slice(i, i + operator.length) === operator) return i
  }
  return -1
}

function evaluate(expression, values) {
  let expr = stripBinding(expression)
  if (!expr) return undefined
  while (expr[0] === '(' && expr[expr.length - 1] === ')') expr = expr.slice(1, -1).trim()

  let index = findLogical(expr, '||')
  if (index >= 0) return !!evaluate(expr.slice(0, index), values) || !!evaluate(expr.slice(index + 2), values)
  index = findLogical(expr, '&&')
  if (index >= 0) return !!evaluate(expr.slice(0, index), values) && !!evaluate(expr.slice(index + 2), values)

  const comparison = /^(.*?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.*?)$/.exec(expr)
  if (comparison) {
    const left = evaluate(comparison[1], values)
    const right = evaluate(comparison[3], values)
    switch (comparison[2]) {
      case '===': return left === right
      case '!==': return left !== right
      case '==': return left == right // eslint-disable-line eqeqeq
      case '!=': return left != right // eslint-disable-line eqeqeq
      case '>=': return Number(left) >= Number(right)
      case '<=': return Number(left) <= Number(right)
      case '>': return Number(left) > Number(right)
      case '<': return Number(left) < Number(right)
    }
  }

  if (expr[0] === '!') return !evaluate(expr.slice(1), values)
  if ((expr[0] === '"' && expr[expr.length - 1] === '"') || (expr[0] === "'" && expr[expr.length - 1] === "'")) return expr.slice(1, -1)
  if (/^-?\d+(?:\.\d+)?$/.test(expr)) return Number(expr)
  if (expr === 'true') return true
  if (expr === 'false') return false
  if (expr === 'null') return null
  if (expr === 'undefined') return undefined
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(expr)) return getPath(values, expr)
  return undefined
}

function replaceBindings(text, values) {
  return String(text || '').replace(/\{\{\s*([^{}]+?)\s*\}\}/g, function (_, expression) {
    const value = evaluate(expression, values)
    return value === undefined || value === null ? '' : String(value)
  })
}

function parseAttributes(source) {
  const result = {}
  const pattern = /([:@A-Za-z_][:@\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let match
  while ((match = pattern.exec(source || '')) !== null) result[match[1]] = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : (match[4] !== undefined ? match[4] : true))
  return result
}

function parseTemplate(template) {
  const root = { type: 'root', children: [] }
  const stack = [root]
  const tokens = String(template || '').match(/<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g) || []
  const voidTags = new Set(['image', 'input', 'slider'])
  tokens.forEach(token => {
    if (/^<!--/.test(token)) return
    if (/^<\//.test(token)) {
      if (stack.length > 1) stack.pop()
      return
    }
    if (/^</.test(token)) {
      const nameMatch = /^<\s*([A-Za-z][\w-]*)/.exec(token)
      if (!nameMatch) return
      const tag = nameMatch[1]
      const attrStart = nameMatch[0].length
      const attrText = token.slice(attrStart, token.length - (/\/\s*>$/.test(token) ? 2 : 1))
      const node = { type: 'element', tag, attrs: parseAttributes(attrText), children: [] }
      stack[stack.length - 1].children.push(node)
      if (!/\/\s*>$/.test(token) && !voidTags.has(tag.toLowerCase())) stack.push(node)
      return
    }
    stack[stack.length - 1].children.push({ type: 'text', value: token })
  })
  return root
}

function fallbackCollection(expression, values) {
  const name = stripBinding(expression)
  if (!/Bars$/.test(name)) return []
  const chartHeight = Math.max(8, Number(values.chartHeight) || 24)
  const floor = Math.max(3, Number(values.trendMinHeight) || 5)
  const ratios = [0.42, 0.36, 0.68, 0.76, 0.40, 0.48, 0.62, 0.45, 0.56, 0.72]
  let inactive = '#58606d', active = '#7c9cff'
  if (/^heart/i.test(name)) { inactive = '#7A2436'; active = '#FF375F' }
  else if (/^spo2/i.test(name)) { inactive = '#245566'; active = '#5AC8FA' }
  else if (/^stress/i.test(name)) { inactive = '#542966'; active = '#BF5AF2' }
  return ratios.map((ratio, index) => ({
    height: Math.max(floor, Math.round(chartHeight * ratio)),
    color: index === ratios.length - 1 ? active : inactive,
    index
  }))
}

function mappedTag(tag) {
  const lower = String(tag || '').toLowerCase()
  if (lower === 'text') return { tag: 'span', vela: 'text' }
  if (lower === 'image') return { tag: 'img', vela: 'image' }
  if (lower === 'stack' || lower === 'scroll' || lower === 'swiper' || lower === 'list' || lower === 'list-item') return { tag: 'div', vela: lower }
  if (lower === 'slider') return { tag: 'div', vela: 'slider' }
  return { tag: 'div', vela: lower }
}

function renderAttributes(attrs, values, velaTag) {
  const ignored = new Set(['if', 'elif', 'else', 'for', 'tid', 'show', 'scroll-y', 'scroll-x'])
  const parts = ['data-vela-tag="' + velaTag + '"']
  Object.keys(attrs || {}).forEach(name => {
    if (ignored.has(name) || name[0] === '@') return
    const raw = attrs[name]
    if (raw === true) return
    let value = replaceBindings(raw, values)
    if (name === 'src' && value[0] === '/') value = ''
    if (!value && name === 'src') return
    value = String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    parts.push(name + '="' + value + '"')
  })
  return parts.join(' ')
}

function renderNode(node, values, options) {
  if (!node) return ''
  if (node.type === 'text') return replaceBindings(node.value, values)
  if (node.type !== 'element') return renderChildren(node.children || [], values, options)

  const loop = node.attrs && node.attrs.for
  if (loop && !options.skipFor) {
    let items = evaluate(loop, values)
    if (!Array.isArray(items) || !items.length) items = fallbackCollection(loop, values)
    return items.map((item, index) => renderNode(node, Object.assign({}, values, { $item: item, $idx: index, index }), { skipFor: true })).join('')
  }

  const map = mappedTag(node.tag)
  const attrs = renderAttributes(node.attrs || {}, values, map.vela)
  if (map.vela === 'slider') return '<div ' + attrs + ' class="vela-slider"><div></div></div>'
  if (map.tag === 'img') return '<img ' + attrs + ' />'
  const children = renderChildren(node.children || [], values, options)
  return '<' + map.tag + ' ' + attrs + '>' + children + '</' + map.tag + '>'
}

function renderChildren(children, values, options) {
  let html = ''
  let branchOpen = false
  let branchTaken = false
  ;(children || []).forEach(node => {
    if (node.type !== 'element') {
      html += renderNode(node, values, options)
      return
    }
    const attrs = node.attrs || {}
    if (Object.prototype.hasOwnProperty.call(attrs, 'if')) {
      branchOpen = true
      branchTaken = !!evaluate(attrs.if, values)
      if (branchTaken) html += renderNode(node, values, options)
      return
    }
    if (Object.prototype.hasOwnProperty.call(attrs, 'elif') && branchOpen) {
      const show = !branchTaken && !!evaluate(attrs.elif, values)
      if (show) { branchTaken = true; html += renderNode(node, values, options) }
      return
    }
    if (Object.prototype.hasOwnProperty.call(attrs, 'else') && branchOpen) {
      if (!branchTaken) html += renderNode(node, values, options)
      branchOpen = false; branchTaken = false
      return
    }
    branchOpen = false; branchTaken = false
    if (Object.prototype.hasOwnProperty.call(attrs, 'show') && !evaluate(attrs.show, values)) return
    html += renderNode(node, values, options)
  })
  return html
}

function translateTemplate(template, values) {
  return renderChildren(parseTemplate(template).children, values, {})
}

function translateUx(source, plan, scene, safe, mock) {
  const template = block(source, 'template')
  const values = flattenPlan(plan, scene, safe, mock)
  const velaCompatibility = [
    '*,*::before,*::after{box-sizing:border-box!important;}',
    '[data-vela-tag="text"]{overflow:hidden;text-overflow:clip;}',
    '[data-vela-tag="stack"],[data-vela-tag="scroll"],[data-vela-tag="swiper"],[data-vela-tag="list"],[data-vela-tag="list-item"]{min-width:0;min-height:0;}'
  ].join('\n')
  const css = velaCompatibility + '\n' + replaceBindings(block(source, 'style'), values)
  return {
    html: translateTemplate(template, values),
    css,
    structure: Array.from(template.matchAll(/<([A-Za-z][\w-]*)\b[^>]*class="([^"]+)"/g)).slice(0, 80).map(match => ({ tag: match[1], classes: match[2] }))
  }
}

module.exports = { block, flattenPlan, evaluate, replaceBindings, parseTemplate, translateTemplate, translateUx }
