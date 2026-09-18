/*
 * design-studio / render.js
 * ---------------------------------------------------------------------------
 * DOM rendering for the artboard. Two rules keep this fast enough to stay
 * smooth with hundreds of elements:
 *
 *   1. `syncElements` only creates DOM for new ids and only writes a style
 *      property when its value actually changed.
 *   2. Geometry (`left/top/width/height`) is written on the transform-free
 *      element box, while rotation/opacity ride on the `transform` property so
 *      dragging never forces a reflow of the subtree.
 */

import { iconSvg } from './icons.js'

const cache = new WeakMap()

export function renderTree(container, elements, options = {}) {
  const wanted = new Set()
  syncList(container, elements, options, wanted)
  removeStale(container, wanted)
  return wanted
}

function syncList(container, elements, options, wanted) {
  elements.forEach((element, index) => {
    wanted.add(element.id)
    let record = cache.get(element)
    let node
    if (!record || record.node.dataset.variant !== variantOf(element)) {
      node = createNode(element)
      if (record && record.node.parentNode) record.node.replaceWith(node)
      else insertAt(container, node, index)
      record = { node, variant: variantOf(element), props: {}, children: new Map() }
      cache.set(element, record)
    }
    node = record.node
    if (node.parentNode !== container) insertAt(container, node, index)
    else if (container.children[index] !== node) insertAt(container, node, index)
    registerElementNode(element.id, node)
    applyElement(node, element, record, options)
    if (element.type === 'group') {
      const host = node.querySelector('.el-body')
      renderTree(host, element.children || [], options)
    } else if (element.type === 'container' && element.direction === 'free') {
      const host = node.querySelector('.el-body')
      renderTree(host, element.children || [], options)
    }
  })
}

function removeStale(container, wanted) {
  Array.from(container.children).forEach((child) => {
    if (child.dataset && child.dataset.elId && !wanted.has(child.dataset.elId)) {
      registerElementNode(child.dataset.elId, null)
      child.remove()
    }
  })
}

function insertAt(container, node, index) {
  const reference = container.children[index] || null
  if (reference === node) return
  if (reference) container.insertBefore(node, reference)
  else container.appendChild(node)
}

function variantOf(element) {
  return `${element.type}:${element.paletteId || ''}`
}

function createNode(element) {
  const node = document.createElement('div')
  node.className = 'el'
  node.dataset.elId = element.id
  node.dataset.variant = variantOf(element)
  const body = document.createElement('div')
  body.className = 'el-body'
  node.appendChild(body)

  switch (element.type) {
    case 'text':
    case 'button': {
      const text = document.createElement('div')
      text.className = 'el-text'
      text.dataset.role = 'text'
      body.appendChild(text)
      break
    }
    case 'progress': {
      const track = document.createElement('div')
      track.className = 'el-progress-track'
      const fill = document.createElement('div')
      fill.className = 'el-progress-fill'
      track.appendChild(fill)
      body.appendChild(track)
      break
    }
    case 'chart': {
      const chart = document.createElement('div')
      chart.className = 'el-chart'
      chart.dataset.role = 'chart'
      body.appendChild(chart)
      break
    }
    case 'iconSlot': {
      const icon = document.createElement('div')
      icon.className = 'el-icon'
      icon.dataset.role = 'icon'
      body.appendChild(icon)
      break
    }
    case 'listRow': {
      const row = document.createElement('div')
      row.className = 'el-listrow'
      row.innerHTML = '<span class="row-dot"></span><span class="row-label"></span><span class="row-arrow">›</span>'
      body.appendChild(row)
      break
    }
    case 'honeycomb': {
      const honey = document.createElement('div')
      honey.className = 'el-honeycomb'
      honey.dataset.role = 'honeycomb'
      body.appendChild(honey)
      break
    }
    case 'group': {
      const hint = document.createElement('div')
      hint.className = 'el-group-hint'
      hint.dataset.role = 'group-hint'
      body.appendChild(hint)
      break
    }
    case 'line':
    case 'ring':
    case 'ellipse':
    case 'rect':
    case 'container':
    default:
      break
  }
  return node
}

function applyElement(node, element, record, options) {
  const props = record.props
  set(node, 'left', `${round(element.x)}px`, props, 'left')
  set(node, 'top', `${round(element.y)}px`, props, 'top')
  set(node, 'width', `${round(element.w)}px`, props, 'width')
  set(node, 'height', `${round(element.h)}px`, props, 'height')
  const transform = element.rotation ? `rotate(${element.rotation}deg)` : ''
  set(node.style, 'transform', transform, props, 'transform')
  node.dataset.type = element.type
  if (element.direction) node.dataset.direction = element.direction
  if (element.style && element.style.align) node.dataset.align = element.style.align
  node.classList.toggle('is-locked', !!element.locked)
  node.classList.toggle('is-editing', options.editingId === element.id)
  const visibility = element.visible === false ? 'hidden' : 'visible'
  set(node.style, 'visibility', visibility, props, 'visibility')
  set(node.style, 'opacity', String(typeof element.opacity === 'number' ? element.opacity : 1), props, 'opacity')
  const pointer = element.locked || element.visible === false ? 'none' : ''
  set(node.style, 'pointerEvents', pointer, props, 'pointerEvents')

  const body = node.firstChild
  applyBox(body, element)
  applyBodyContent(node, body, element, record, props)
}

function applyBox(body, element) {
  const style = element.style || {}
  const fill = style.fill && style.fill.type !== 'none' ? style.fill.color : ''
  const hasStroke = !!style.stroke
  const radius = style.radius === undefined ? 0 : style.radius
  const css = body.style
  if (css.__fill !== fill) {
    css.background = fill || 'transparent'
    css.__fill = fill
  }
  const radiusValue = radius >= 999 ? '50%' : `${radius}px`
  if (css.__radius !== radiusValue) {
    css.borderRadius = radiusValue
    css.__radius = radiusValue
  }
  const borderValue = hasStroke ? `${style.stroke.width || 1}px solid ${style.stroke.color}` : ''
  if (css.__border !== borderValue) {
    css.border = borderValue
    css.__border = borderValue
  }
  const padding = element.padding === undefined ? '' : `${element.padding}px`
  if (css.__padding !== padding) {
    css.padding = padding
    css.__padding = padding
  }
  const gap = element.gap === undefined ? '' : `${element.gap}px`
  if (css.__gap !== gap) {
    css.gap = gap
    css.__gap = gap
  }
  if (element.direction === 'grid') {
    const columns = `${element.columns || 2}`
    if (css.__columns !== columns) {
      css.gridTemplateColumns = `repeat(${columns}, 1fr)`
      css.__columns = columns
    }
  }
  if (element.type === 'button') {
    const color = style.color || '#ffffff'
    if (css.__color !== color) {
      css.color = color
      css.__color = color
    }
  }
}

function applyBodyContent(node, body, element, record, props) {
  const style = element.style || {}
  switch (element.type) {
    case 'text':
    case 'button': {
      const text = body.querySelector('[data-role="text"]')
      if (text && text.__value !== element.text) {
        if (document.activeElement !== text) text.textContent = element.text === undefined ? '' : element.text
        text.__value = element.text
      }
      if (text) {
        const font = `${style.fontWeight || 400} ${style.fontSize || 12}px/1.3 ${style.fontFamily || 'system-ui, sans-serif'}`
        if (text.style.__font !== font) {
          text.style.font = font
          text.style.__font = font
        }
        const color = style.color || '#ffffff'
        if (text.style.__color !== color) {
          text.style.color = color
          text.style.__color = color
        }
        const align = style.align || 'left'
        if (text.style.__align !== align) {
          text.style.textAlign = align
          text.style.__align = align
        }
      }
      break
    }
    case 'progress': {
      const fill = body.querySelector('.el-progress-fill')
      const width = `${Math.max(0, Math.min(1, element.progress === undefined ? 0 : element.progress)) * 100}%`
      if (fill && fill.__width !== width) {
        fill.style.width = width
        fill.__width = width
      }
      const color = style.barColor || '#FF8A3D'
      if (fill && fill.__color !== color) {
        fill.style.background = color
        fill.__color = color
      }
      break
    }
    case 'chart': {
      const chart = body.querySelector('[data-role="chart"]')
      const values = element.values || []
      const signature = `${values.join(',')}|${style.barColor || ''}`
      if (chart && chart.__signature !== signature) {
        chart.innerHTML = values
          .map((value) => `<i style="height:${Math.round(Math.max(0.04, Math.min(1, value)) * 100)}%;background:${style.barColor || '#5EC8FF'}"></i>`)
          .join('')
        chart.__signature = signature
      }
      break
    }
    case 'iconSlot': {
      const icon = body.querySelector('[data-role="icon"]')
      const signature = `${element.icon}|${style.color || ''}`
      if (icon && icon.__signature !== signature) {
        icon.innerHTML = iconSvg(element.icon || 'heart')
        icon.style.color = style.color || '#ffffff'
        icon.__signature = signature
      }
      break
    }
    case 'listRow': {
      const label = body.querySelector('.row-label')
      const dot = body.querySelector('.row-dot')
      const arrow = body.querySelector('.row-arrow')
      const text = element.text === undefined ? element.name : element.text
      if (label && label.__value !== text) {
        label.textContent = text
        label.__value = text
      }
      if (label) {
        const font = `${style.fontSize || 12}px ${style.fontFamily || 'system-ui, sans-serif'}`
        if (label.style.__font !== font) {
          label.style.font = font
          label.style.__font = font
        }
      }
      if (dot && dot.__color !== style.color) {
        dot.style.color = style.color || '#ffffff'
        dot.__color = style.color
      }
      if (arrow && arrow.__color !== style.mutedColor) {
        arrow.style.color = style.mutedColor || '#98A2B3'
        arrow.__color = style.mutedColor
      }
      break
    }
    case 'honeycomb': {
      const honey = body.querySelector('[data-role="honeycomb"]')
      const size = element.iconSize || 40
      const gap = element.gap === undefined ? 8 : element.gap
      const signature = `${element.w}x${element.h}|${size}|${gap}`
      if (honey && honey.__signature !== signature) {
        const step = size + gap
        const cols = Math.max(1, Math.floor((element.w + gap) / step))
        const rows = Math.max(1, Math.floor((element.h + gap) / step))
        const marks = []
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const offset = row % 2 ? (size + gap) / 2 : 0
            const x = col * step + offset
            const y = row * step
            if (x + size > element.w + 1) continue
            marks.push(
              `<i style="left:${Math.round(x)}px;top:${Math.round(y)}px;width:${size}px;height:${size}px">${row * cols + col + 1}</i>`
            )
          }
        }
        honey.innerHTML = marks.join('')
        honey.__signature = signature
      }
      break
    }
    default:
      break
  }
  void node
  void record
  void props
}

function set(target, key, value, store, cacheKey) {
  if (store[cacheKey] === value) return
  store[cacheKey] = value
  if (target.style) target.style[key] = value
  else target[key] = value
}

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function invalidate(element) {
  if (element) cache.delete(element)
}

export function elementNode(element) {
  const record = cache.get(element)
  return record ? record.node : null
}

/**
 * The interaction layer mutates geometry directly during a drag for immediate
 * feedback. The store asks this registry for the same nodes when it needs to
 * rewind a drag into a history entry.
 */
export function registerElementNode(id, node) {
  if (node) nodeRegistry.set(id, node)
  else nodeRegistry.delete(id)
}

export function nodeForId(id) {
  return nodeRegistry.get(id) || null
}

const nodeRegistry = new Map()

export function applyArtboard(artboard, device, page, options = {}) {
  const stage = artboard.parentElement
  stage.style.width = `${device.width}px`
  stage.style.height = `${device.height}px`
  stage.style.setProperty('--ab-radius', `${device.radius}px`)
  artboard.style.setProperty('--ab-radius', `${device.radius}px`)
  artboard.style.setProperty('--ab-bg', page.background || '#0B0D12')
  artboard.style.background = page.background || '#0B0D12'
  artboard.classList.toggle('has-grid', !!options.grid)
  artboard.style.setProperty('--safe-top', `${device.safeTop}px`)
  artboard.style.setProperty('--safe-bottom', `${device.safeBottom}px`)
}
