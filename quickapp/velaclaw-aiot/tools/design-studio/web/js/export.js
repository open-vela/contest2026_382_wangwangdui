/*
 * design-studio / export.js
 * ---------------------------------------------------------------------------
 * Turns the editor document into the artefact the whole tool exists for: a
 * self-describing JSON prompt that an agent (or a human) can read and turn back
 * into code. Three projections are produced from the same model:
 *
 *   1. `buildPromptJson`  — the canonical machine + agent contract
 *   2. `buildVelaCode`    — a Vela / Quick App scaffold (ux + recipe + manifest)
 *   3. `buildSummary`     — a plain-language description of intent
 */

import { SCHEMA_VERSION, getDevice } from './schema.js'

export function buildPromptJson(doc, options = {}) {
  const pages = doc.pages.map((page, index) => pageToJson(page, index, doc))
  const flows = pages.flatMap((page) => page.flows.length ? [{ from: page.id, fromName: page.name, steps: page.flows }] : [])
  return {
    schema: SCHEMA_VERSION,
    kind: 'design-prompt',
    generator: 'design-studio',
    generatedAt: options.generatedAt || new Date().toISOString(),
    design: {
      name: doc.name,
      brief: options.brief || '',
      defaultDevice: doc.device,
      pageCount: pages.length
    },
    designTokens: doc.tokens,
    devices: uniqueDevices(doc).map((device) => ({
      id: device.id,
      shape: device.shape,
      artboard: { width: device.width, height: device.height, unit: 'px', designWidth: device.width },
      physical: device.physical,
      cornerRadius: device.radius,
      safeArea: { top: device.safeTop, bottom: device.safeBottom, left: 0, right: 0 },
      note: device.note
    })),
    pages,
    flows,
    groups: collectGroups(pages),
    notes: (doc.notes || []).map((note) => ({ id: note.id, text: note.text, at: { x: note.x, y: note.y } })),
    summary: buildSummary(doc, pages, flows),
    agentInstructions: [
      '每个 page.children 中的元素使用画板绝对坐标 {x, y, w, h}，单位与 page.device.artboard 一致。',
      'type=group 的节点是一个语义单元，必须作为一个整体实现；group.note 说明了它的用途。',
      'group 与自由容器的子元素坐标相对父级左上角；需要绝对坐标时用 child.box + parent.box 相加。',
      'style.fill / style.stroke 为 null 表示无填充 / 无描边；style.radius >= 999 表示完全圆角。',
      'pages[].flows 与元素 interactions 描述了跳转与手势触发，target 指向 pages[].id。',
      '优先复用 designTokens 中的颜色与圆角，不要自行发明色值。',
      'sizeMode=hug 表示尺寸由内容决定；sizeMode=fill 表示跟随父容器。'
    ]
  }
}

function uniqueDevices(doc) {
  const seen = new Map()
  doc.pages.forEach((page) => {
    const device = getDevice(page.device)
    if (!seen.has(device.id)) seen.set(device.id, device)
  })
  return [...seen.values()]
}

function pageToJson(page, index, doc) {
  const device = getDevice(page.device)
  const elements = (page.children || []).map((element) => elementToJson(element, doc))
  const flows = collectFlows(doc, page)
  const pageFlows = (page.interactions || []).map((interaction) => flowToJson(interaction, doc, null))
  return {
    id: page.id,
    name: page.name,
    index,
    device: {
      id: device.id,
      shape: device.shape,
      artboard: { width: device.width, height: device.height, unit: 'px' },
      cornerRadius: device.radius,
      safeArea: { top: device.safeTop, bottom: device.safeBottom }
    },
    background: page.background,
    scroll: page.scroll || 'none',
    note: page.notes || '',
    elementCount: elements.length,
    interactions: pageFlows,
    flows,
    children: elements
  }
}

function elementToJson(element, doc) {
  const node = {
    id: element.id,
    name: element.name,
    type: element.type,
    box: {
      x: round(element.x),
      y: round(element.y),
      w: round(element.w),
      h: round(element.h)
    },
    z: undefined,
    rotation: element.rotation || 0,
    opacity: typeof element.opacity === 'number' ? element.opacity : 1,
    visible: element.visible !== false,
    sizeMode: element.sizeMode || 'fixed',
    style: styleToJson(element.style)
  }
  if (element.visible === false) node.visible = false
  if (element.text !== undefined) node.text = element.text
  if (element.icon !== undefined) node.icon = element.icon
  if (element.padding !== undefined) node.padding = element.padding
  if (element.direction !== undefined) node.direction = element.direction
  if (element.columns !== undefined) node.columns = element.columns
  if (element.gap !== undefined) node.gap = element.gap
  if (element.iconSize !== undefined) node.iconSize = element.iconSize
  if (element.progress !== undefined) node.progress = element.progress
  if (element.values !== undefined) node.values = element.values.slice()
  if (element.overflow !== undefined) node.overflow = element.overflow
  if (element.note) node.note = element.note
  if (element.locked) node.locked = true
  if (element.layout && element.type === 'group') node.layout = element.layout
  if (element.interactions && element.interactions.length) {
    node.interactions = element.interactions.map((interaction) => interactionToJson(interaction, doc))
  }
  if (element.children && element.children.length) {
    // Children are stored relative to their group / free container, so the
    // exported tree keeps the same local origin as the editor model. Add the
    // parent's origin if you need absolute placement.
    if (element.type === 'group' || element.type === 'container') node.coordinateSpace = 'parent-relative'
    node.children = element.children.map((child) => elementToJson(child, doc))
  }
  delete node.z
  return node
}

function styleToJson(style = {}) {
  const fill = style.fill && style.fill.type !== 'none' && style.fill.color ? style.fill.color : null
  const result = {
    fill,
    fillType: style.fill ? style.fill.type || 'none' : 'none'
  }
  if (style.stroke) {
    result.stroke = { color: style.stroke.color, width: style.stroke.width === undefined ? 1 : style.stroke.width }
  } else {
    result.stroke = null
  }
  result.radius = style.radius === undefined ? 0 : style.radius
  if (typeof style.color === 'string') result.color = style.color
  if (typeof style.mutedColor === 'string') result.mutedColor = style.mutedColor
  if (typeof style.barColor === 'string') result.barColor = style.barColor
  if (typeof style.fontSize === 'number') result.fontSize = style.fontSize
  if (typeof style.fontWeight === 'number') result.fontWeight = style.fontWeight
  if (style.align) result.align = style.align
  if (typeof style.lineHeight === 'number') result.lineHeight = style.lineHeight
  if (typeof style.opacity === 'number' && style.opacity !== 1) result.opacity = style.opacity
  return result
}

function interactionToJson(interaction, doc) {
  return flowToJson(interaction, doc, null)
}

function flowToJson(interaction, doc, elementName) {
  if (!interaction) return null
  const target = (doc.pages || []).find((page) => page.id === interaction.target)
  return {
    id: interaction.id,
    trigger: interaction.trigger || 'tap',
    direction: interaction.direction || null,
    action: interaction.action || 'navigate',
    target: interaction.target || null,
    targetName: target ? target.name : null,
    element: elementName || null,
    delay: interaction.delay === undefined ? null : interaction.delay,
    animation: interaction.animation || null,
    description: describeInteraction(interaction, target)
  }
}

function describeInteraction(interaction, target) {
  const triggerLabel = {
    tap: '点击',
    doubleTap: '双击',
    longPress: '长按',
    swipe: '滑动',
    enter: '进入页面时',
    timer: '定时器触发'
  }[interaction.trigger || 'tap']
  const suffix = interaction.direction ? `(${interaction.direction})` : ''
  const action = interaction.action || 'navigate'
  if (action === 'back') return `${triggerLabel}${suffix} → 返回上一页`
  if (action === 'none') return `${triggerLabel}${suffix} → 无动作`
  const name = target ? target.name : interaction.target || '未指定页面'
  return `${triggerLabel}${suffix} → 跳转到「${name}」`
}

/**
 * Flatten every interaction on a page into one readable jump list. This runs on
 * the *document* nodes rather than the serialized ones, because the serialized
 * steps no longer carry the element name and the target's display name.
 */
function collectFlows(doc, page) {
  const result = []
  const walk = (elements) => {
    ;(elements || []).forEach((element) => {
      ;(element.interactions || []).forEach((interaction) => {
        const target = (doc.pages || []).find((item) => item.id === interaction.target)
        result.push({
          trigger: interaction.trigger || 'tap',
          direction: interaction.direction || null,
          action: interaction.action || 'navigate',
          target: interaction.target || null,
          targetName: target ? target.name : null,
          element: element.name,
          elementId: element.id,
          animation: interaction.animation || null,
          delay: interaction.delay === undefined ? null : interaction.delay,
          description: describeInteraction(interaction, target)
        })
      })
      if (element.children && element.children.length) walk(element.children)
    })
  }
  walk(page.children)
  ;(page.interactions || []).forEach((interaction) => {
    const target = (doc.pages || []).find((item) => item.id === interaction.target)
    result.push({
      trigger: interaction.trigger || 'enter',
      direction: interaction.direction || null,
      action: interaction.action || 'navigate',
      target: interaction.target || null,
      targetName: target ? target.name : null,
      element: null,
      elementId: page.id,
      scope: 'page',
      animation: interaction.animation || null,
      delay: interaction.delay === undefined ? null : interaction.delay,
      description: describeInteraction(interaction, target)
    })
  })
  return result
}

function collectGroups(pages) {
  const groups = []
  const walk = (elements, page) => {
    ;(elements || []).forEach((element) => {
      if (element.type === 'group') {
        groups.push({
          id: element.id,
          name: element.name,
          page: page.name,
          pageId: page.id,
          box: element.box,
          layout: element.layout || 'free',
          note: element.note || '',
          memberCount: (element.children || []).length,
          members: (element.children || []).map((child) => ({
            id: child.id,
            name: child.name,
            type: child.type,
            note: child.note || '',
            role: child.note || child.name
          }))
        })
      }
      if (element.children && element.children.length) walk(element.children, page)
    })
  }
  pages.forEach((page) => walk(page.children, page))
  return groups
}

/* ------------------------------------------------------------------ summary */

export function buildSummary(doc, pages, flows) {
  const lines = []
  lines.push(`「${doc.name}」共 ${pages.length} 个页面。`)
  pages.forEach((page) => {
    const device = page.device
    const types = countTypes(page.children)
    const composition = Object.keys(types)
      .map((type) => `${type}×${types[type]}`)
      .join('、')
    lines.push(
      `- 页面「${page.name}」：${device.artboard.width}×${device.artboard.height}(${device.shape})，包含 ${composition || '空白'}。${
        page.note ? `说明：${page.note}` : ''
      }`
    )
  })
  if (flows.length) {
    lines.push('交互流程：')
    flows.forEach((flow) => {
      const steps = flow.steps || []
      steps.forEach((step) => {
        if (step.description) lines.push(`- ${flow.fromName}：${step.description}`)
      })
    })
  } else {
    lines.push('交互流程：暂无跳转，页面之间相互独立。')
  }
  const groups = collectGroups(pages)
  if (groups.length) {
    lines.push('语义组合：')
    groups.forEach((group) => {
      lines.push(`- 「${group.name}」(${group.page})：${group.note || '未填写用途'}`)
    })
  }
  return lines.join('\n')
}

function countTypes(elements) {
  const counts = {}
  const walk = (list) => {
    ;(list || []).forEach((element) => {
      counts[element.type] = (counts[element.type] || 0) + 1
      if (element.children && element.children.length) walk(element.children)
    })
  }
  walk(elements)
  return counts
}

/* -------------------------------------------------------------- Vela codegen */

const VELA_TEXT_TYPES = new Set(['text', 'button', 'listRow'])

export function buildVelaCode(doc) {
  return doc.pages.map((page) => {
    const device = getDevice(page.device)
    return {
      page: page.name,
      file: `src/pages/${slug(page.name)}/${slug(page.name)}.ux`,
      recipe: buildRecipe(page, device),
      ux: buildUx(page, device)
    }
  })
}

function buildRecipe(page, device) {
  return `module.exports = {
  base: {
    surface: 'free',
    artboard: { width: ${device.width}, height: ${device.height} },
    safeArea: { top: ${device.safeTop}, bottom: ${device.safeBottom} },
    background: '${page.background}',
    // 由 design-studio 导出的绝对几何，可直接作为自由画布的数据源
    elements: ${JSON.stringify(
      (page.children || []).map((element) => ({
        id: element.id,
        name: element.name,
        type: element.type,
        x: round(element.x),
        y: round(element.y),
        w: round(element.w),
        h: round(element.h)
      })),
      null,
      2
    ).replace(/\n/g, '\n    ')}
  }
}
`
}

function buildUx(page, device) {
  const style = `.page { position: relative; width: 100%; height: 100%; background-color: ${page.background}; }`
  const body = (page.children || []).map((element) => renderElement(element, 6)).join('\n')
  return `<template>
  <stack class="page">
${body || '    <!-- 来自 design-studio 的空页面 -->'}
  </stack>
</template>

<style>
${style}
</style>

<script>
export default {
  // ${device.name} · 画板 ${device.width}x${device.height}
  // 本文件由 design-studio 生成的 JSON 转换而来，跳转与手势见页面 interactions
  onInit() {}
}
</script>
`
}

function renderElement(element, indent) {
  const pad = ' '.repeat(indent)
  if (element.type === 'group') {
    const children = (element.children || []).map((child) => renderElement(child, indent + 2)).join('\n')
    return `${pad}<stack class="group ${slug(element.name)}" style="position: absolute; left: ${round(element.x)}px; top: ${round(element.y)}px; width: ${round(
      element.w
    )}px; height: ${round(element.h)}px;">\n${children}\n${pad}</stack>`
  }
  const styles = [`left: ${round(element.x)}px`, `top: ${round(element.y)}px`]
  if (element.sizeMode !== 'hug') styles.push(`width: ${round(element.w)}px`)
  if (element.sizeMode !== 'hug') styles.push(`height: ${round(element.h)}px`)
  const fill = element.style && element.style.fill && element.style.fill.type !== 'none' ? element.style.fill.color : null
  if (fill) styles.push(`background-color: ${fill}`)
  const radius = element.style && element.style.radius ? element.style.radius : 0
  if (radius) styles.push(`border-radius: ${radius >= 999 ? round(Math.min(element.w, element.h) / 2) : radius}px`)
  if (element.opacity !== undefined && element.opacity !== 1) styles.push(`opacity: ${element.opacity}`)
  if (element.style && element.style.stroke) styles.push(`border-width: ${element.style.stroke.width || 1}px`, `border-color: ${element.style.stroke.color}`)
  const styleAttr = styles.join('; ')
  if (VELA_TEXT_TYPES.has(element.type)) {
    const textStyles = [styleAttr, `font-size: ${element.style.fontSize || 12}px`, `color: ${element.style.color || '#FFFFFF'}`]
    if (element.style.align) textStyles.push(`text-align: ${element.style.align}`)
    return `${pad}<text style="${textStyles.join('; ')}">${escapeText(element.text || element.name)}</text>`
  }
  if (element.type === 'line') return `${pad}<div class="line" style="${styleAttr}"></div>`
  if (element.type === 'progress') {
    const bar = element.style.barColor || '#FF8A3D'
    return `${pad}<div style="${styleAttr}"><div style="width: ${Math.round((element.progress || 0) * 100)}%; height: 100%; background-color: ${bar}; border-radius: inherit;"></div></div>`
  }
  if (element.type === 'honeycomb') {
    return `${pad}<stack class="honeycomb" style="${styleAttr}"><!-- 蜂窝启动器：${element.iconSize || 40}px 图标，间距 ${element.gap || 8}px --></stack>`
  }
  return `${pad}<div style="${styleAttr}"></div>`
}

function slug(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'page'
}

function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

/* ---------------------------------------------------------------- clipboard */

export function toJsonString(json) {
  return JSON.stringify(json, null, 2)
}
