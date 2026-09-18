/*
 * design-studio / schema.js
 * ---------------------------------------------------------------------------
 * Single source of truth for the document model, the component palette and
 * the exported "prompt JSON" shape.
 *
 * The document model is deliberately flat-friendly (a tree with parentId) and
 * every element carries an absolute box inside its artboard, the way a
 * PowerPoint / canvas tool works. Nothing here touches the DOM so the module is
 * unit-testable and usable from the export pipeline.
 */

export const SCHEMA_VERSION = 'designstudio/v1'
export const APP_ID = 'design-studio'

/** Colour values that used to be the palette defaults. Kept so old documents
 *  can be migrated to the current light-on-dark defaults without guessing. */
export const LEGACY_DEFAULTS = {
  pageBackground: '#0B0D12',
  text: '#F7F8FB',
  muted: '#98A2B3',
  /* Hardcoded palette fills authored for the dark artboard. */
  fills: {
    '#1F2632': '#F3F4F8',
    '#171C26': '#F5F5F7',
    '#222833': '#E6E6EB',
    '#1D2430': '#EFEFF4',
    '#3A4252': '#D8D9DF',
    '#242B39': '#E2E3E9',
    '#2B3341': '#D8D9DF',
    '#333C4B': '#C7C9D2'
  },
  tokens: {
    surface: '#0B0D12',
    surfaceMuted: '#151922',
    primary: '#FF8A3D',
    primaryDeep: '#F26A1B',
    accent: '#5EC8FF',
    textPrimary: '#F7F8FB',
    textMuted: '#98A2B3',
    border: '#252B38'
  }
}

/* ---------------------------------------------------------------- devices */

/** Artboard sizes are expressed in design pixels (unit = px, designWidth). */
export const DEVICES = [
  {
    id: 'rect',
    name: '方屏 / Rect',
    short: '方屏',
    shape: 'rect',
    width: 192,
    height: 228,
    radius: 22,
    safeTop: 12,
    safeBottom: 12,
    physical: { width: 432, height: 514 },
    note: '矩形表盘（432×514 物理像素），竖向信息列的主场景。'
  },
  {
    id: 'circle',
    name: '圆表 / Circle',
    short: '圆表',
    shape: 'circle',
    width: 192,
    height: 192,
    radius: 96,
    safeTop: 24,
    safeBottom: 24,
    physical: { width: 466, height: 466 },
    note: '圆形表盘（466×466 物理像素），必须满足弦宽约束。'
  },
  {
    id: 'pill',
    name: '手环 / Pill',
    short: '手环',
    shape: 'pill',
    width: 192,
    height: 320,
    radius: 44,
    safeTop: 18,
    safeBottom: 18,
    physical: { width: 212, height: 520 },
    note: '窄长手环（212×520 物理像素），单列纵向滚动。'
  },
  {
    id: 'phone',
    name: '手机 / Phone',
    short: '手机',
    shape: 'rect',
    width: 375,
    height: 812,
    radius: 26,
    safeTop: 44,
    safeBottom: 24,
    physical: { width: 1125, height: 2436 },
    note: '手机画板（375×812 逻辑像素），用于跨端页面草稿。'
  }
]

export function getDevice(id) {
  return DEVICES.find((device) => device.id === id) || DEVICES[0]
}

/* ----------------------------------------------------------- design tokens */

export const DEFAULT_TOKENS = {
  colors: {
    surface: '#FFFFFF',
    surfaceMuted: '#F2F3F7',
    primary: '#FF7A45',
    primaryDeep: '#F2612B',
    accent: '#0A7CFF',
    success: '#57D9A3',
    textPrimary: '#1D1D1F',
    textMuted: '#6E6E76',
    border: '#E3E4E9'
  },
  typography: {
    fontFamily: 'system-ui',
    scale: { display: 34, title: 18, body: 12, caption: 9 }
  },
  radius: { sm: 6, md: 12, lg: 20, pill: 999 },
  spacing: [2, 4, 6, 8, 12, 16, 20, 28]
}

/* ------------------------------------------------------------- components */

/**
 * Palette entries. `create()` returns the default element body. Sizes are
 * chosen so a freshly dropped component already looks intentional on a 192px
 * artboard (Vela design width).
 */
const PALETTE = [
  {
    group: '基础形状',
    icon: 'shape',
    items: [
      {
        id: 'rect',
        label: '矩形',
        type: 'rect',
        hint: '容器 / 卡片底 / 分割块',
        create: () => ({
          w: 120,
          h: 48,
          sizeMode: 'fixed',
          style: { fill: { type: 'solid', color: '#F3F4F8' }, radius: 12, opacity: 1 }
        })
      },
      {
        id: 'ellipse',
        label: '圆形',
        type: 'ellipse',
        hint: '圆形按钮 / 进度点 / 头像位',
        create: () => ({
          w: 44,
          h: 44,
          sizeMode: 'fixed',
          style: { fill: { type: 'solid', color: '#FF8A3D' }, radius: 999, opacity: 1 }
        })
      },
      {
        id: 'line',
        label: '直线',
        type: 'line',
        hint: '分隔线 / 强调线',
        create: () => ({
          w: 120,
          h: 2,
          sizeMode: 'fixed',
          style: { fill: { type: 'solid', color: '#D8D9DF' }, radius: 2, opacity: 1 }
        })
      },
      {
        id: 'ring',
        label: '圆环',
        type: 'ring',
        hint: '进度环 / 计时轮廓',
        create: () => ({
          w: 96,
          h: 96,
          sizeMode: 'fixed',
          style: {
            fill: { type: 'none' },
            stroke: { color: '#FF8A3D', width: 4 },
            radius: 999,
            opacity: 1
          }
        })
      }
    ]
  },
  {
    group: '文本',
    icon: 'text',
    items: [
      {
        id: 'title',
        label: '标题',
        type: 'text',
        hint: '页面主标题',
        create: () => ({
          w: 140,
          h: 24,
          text: '标题文本',
          sizeMode: 'hug',
          style: {
            fill: { type: 'none' },
            color: '#1D1D1F',
            fontSize: 18,
            fontWeight: 600,
            align: 'left',
            lineHeight: 1.3,
            opacity: 1
          }
        })
      },
      {
        id: 'label',
        label: '正文',
        type: 'text',
        hint: '说明 / 数值 / 标签',
        create: () => ({
          w: 120,
          h: 16,
          text: '正文内容',
          sizeMode: 'hug',
          style: {
            fill: { type: 'none' },
            color: '#6E6E76',
            fontSize: 12,
            fontWeight: 400,
            align: 'left',
            lineHeight: 1.4,
            opacity: 1
          }
        })
      },
      {
        id: 'metric',
        label: '大数值',
        type: 'text',
        hint: '计时 / 步数等主数值',
        create: () => ({
          w: 140,
          h: 44,
          text: '25:00',
          sizeMode: 'hug',
          style: {
            fill: { type: 'none' },
            color: '#1D1D1F',
            fontSize: 34,
            fontWeight: 700,
            align: 'center',
            lineHeight: 1.15,
            opacity: 1
          }
        })
      }
    ]
  },
  {
    group: '容器与组合',
    icon: 'frame',
    items: [
      {
        id: 'card',
        label: '卡片',
        type: 'container',
        hint: '带内边距的内容容器',
        create: () => ({
          w: 152,
          h: 72,
          sizeMode: 'fixed',
          padding: 10,
          style: {
            fill: { type: 'solid', color: '#F5F5F7' },
            radius: 16,
            stroke: { color: '#E2E3E9', width: 1 },
            opacity: 1
          }
        })
      },
      {
        id: 'stack',
        label: '纵向堆叠',
        type: 'container',
        hint: '自动排列子元素（间距可调）',
        create: () => ({
          w: 152,
          h: 96,
          sizeMode: 'fixed',
          direction: 'column',
          gap: 6,
          padding: 8,
          style: { fill: { type: 'none' }, radius: 0, opacity: 1 }
        })
      },
      {
        id: 'grid',
        label: '网格',
        type: 'container',
        hint: '蜂窝 / 九宫格排布',
        create: () => ({
          w: 152,
          h: 96,
          sizeMode: 'fixed',
          direction: 'grid',
          columns: 3,
          gap: 6,
          padding: 6,
          style: { fill: { type: 'none' }, radius: 0, opacity: 1 }
        })
      },
      {
        id: 'honeycomb',
        label: '蜂窝启动器',
        type: 'honeycomb',
        hint: '圆屏应用图标矩阵（可拖动惯性）',
        create: () => ({
          w: 150,
          h: 150,
          sizeMode: 'fixed',
          gap: 8,
          iconSize: 40,
          style: { fill: { type: 'none' }, radius: 0, opacity: 1 }
        })
      }
    ]
  },
  {
    group: '交互部件',
    icon: 'interaction',
    items: [
      {
        id: 'button',
        label: '按钮',
        type: 'button',
        hint: '主操作，可绑定跳转',
        create: () => ({
          w: 96,
          h: 34,
          text: '开始',
          sizeMode: 'fixed',
          style: {
            fill: { type: 'solid', color: '#FF8A3D' },
            radius: 999,
            color: '#12151C',
            fontSize: 13,
            fontWeight: 600,
            align: 'center',
            opacity: 1
          }
        })
      },
      {
        id: 'iconButton',
        label: '圆形按钮',
        type: 'button',
        hint: '表盘上的主操作点',
        create: () => ({
          w: 40,
          h: 40,
          text: '▶',
          sizeMode: 'fixed',
          style: {
            fill: { type: 'solid', color: '#FF8A3D' },
            radius: 999,
            color: '#12151C',
            fontSize: 15,
            fontWeight: 700,
            align: 'center',
            opacity: 1
          }
        })
      },
      {
        id: 'progress',
        label: '进度条',
        type: 'progress',
        hint: '带进度的条 / 环',
        create: () => ({
          w: 140,
          h: 6,
          sizeMode: 'fixed',
          progress: 0.62,
          style: {
            fill: { type: 'solid', color: '#E6E6EB' },
            radius: 999,
            barColor: '#FF8A3D',
            opacity: 1
          }
        })
      },
      {
        id: 'iconSlot',
        label: '图标位',
        type: 'iconSlot',
        hint: '矢量图标占位（可换 name）',
        create: () => ({
          w: 30,
          h: 30,
          sizeMode: 'fixed',
          icon: 'heart',
          style: {
            fill: { type: 'solid', color: '#EFEFF4' },
            radius: 999,
            color: '#FF8A3D',
            opacity: 1
          }
        })
      },
      {
        id: 'listRow',
        label: '列表项',
        type: 'listRow',
        hint: '设置页一行（图标 + 文案 + 箭头）',
        create: () => ({
          w: 152,
          h: 36,
          text: '设置项',
          sizeMode: 'fixed',
          style: {
            fill: { type: 'solid', color: '#F5F5F7' },
            radius: 12,
            color: '#F7F8FB',
            mutedColor: '#98A2B3',
            fontSize: 12,
            opacity: 1
          }
        })
      },
      {
        id: 'chart',
        label: '趋势柱',
        type: 'chart',
        hint: '7 日 / 24 小时趋势',
        create: () => ({
          w: 152,
          h: 60,
          sizeMode: 'fixed',
          values: [0.4, 0.7, 0.35, 0.9, 0.55, 0.8, 0.6],
          style: {
            fill: { type: 'solid', color: '#F5F5F7' },
            radius: 14,
            barColor: '#5EC8FF',
            opacity: 1
          }
        })
      }
    ]
  }
]

export const PALETTE_GROUPS = PALETTE

export function paletteItem(id) {
  for (const group of PALETTE) {
    const found = group.items.find((item) => item.id === id)
    if (found) return found
  }
  return null
}

/* ---------------------------------------------------------------- elements */

let idCounter = 0

export function newId(prefix) {
  idCounter += 1
  const random = Math.random().toString(36).slice(2, 7)
  return `${prefix || 'el'}_${Date.now().toString(36)}${idCounter.toString(36)}${random}`
}

/** Create a fully-formed element from a palette id. */
export function createElementFromPalette(paletteId, point, options = {}) {
  const item = paletteItem(paletteId)
  if (!item) throw new Error(`未知组件：${paletteId}`)
  const body = item.create()
  const width = options.width || body.w || 40
  const height = options.height || body.h || 40
  const style = JSON.parse(JSON.stringify(body.style || { fill: { type: 'none' }, opacity: 1 }))
  const element = {
    id: newId(item.type === 'text' ? 'text' : 'el'),
    name: options.name || item.label,
    type: item.type,
    paletteId: item.id,
    x: Math.round(point.x - width / 2),
    y: Math.round(point.y - height / 2),
    w: width,
    h: height,
    rotation: 0,
    visible: true,
    locked: false,
    opacity: 1,
    sizeMode: body.sizeMode || 'fixed',
    style,
    children: [],
    interactions: [],
    note: ''
  }
  if (body.text !== undefined) element.text = body.text
  if (body.padding !== undefined) element.padding = body.padding
  if (body.direction !== undefined) element.direction = body.direction
  if (body.columns !== undefined) element.columns = body.columns
  if (body.gap !== undefined) element.gap = body.gap
  if (body.iconSize !== undefined) element.iconSize = body.iconSize
  if (body.icon !== undefined) element.icon = body.icon
  if (body.progress !== undefined) element.progress = body.progress
  if (body.values !== undefined) element.values = body.values.slice()
  if (options.parentId) element.parentId = options.parentId
  return element
}

export function createPage(options = {}) {
  return {
    id: newId('page'),
    name: options.name || '页面',
    device: options.device || 'rect',
    background: options.background || '#FFFFFF',
    scroll: options.scroll || 'none',
    notes: options.notes || '',
    interactions: [],
    children: []
  }
}

export function createDocument(options = {}) {
  const firstPage = createPage({ name: '首页', device: options.device || 'rect' })
  return {
    schema: SCHEMA_VERSION,
    name: options.name || '未命名设计',
    device: options.device || 'rect',
    tokens: JSON.parse(JSON.stringify(DEFAULT_TOKENS)),
    notes: [],
    pages: [firstPage]
  }
}

/* ------------------------------------------------------------------ limits */

export const LIMITS = {
  minSize: 4,
  maxElements: 1500,
  maxPages: 40,
  historyDepth: 80
}
