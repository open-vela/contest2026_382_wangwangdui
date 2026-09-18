/*
 * design-studio / app.js
 * ---------------------------------------------------------------------------
 * Boot + wiring. Everything else is a module; this file owns the DOM handles,
 * the render loop and the keyboard map.
 */

import { createStore } from './store.js'
import { createInteraction } from './interact.js'
import { createInspector } from './inspector.js'
import { createPanels } from './panels.js'
import { createPreview } from './preview.js'
import { createExportUI } from './exportui.js'
import { renderTree, applyArtboard, nodeForId } from './render.js'
import { boundingBox } from './geometry.js'
import { newId } from './schema.js'

const dom = {
  app: document.getElementById('app'),
  docName: document.getElementById('docName'),
  docMeta: document.getElementById('docMeta'),
  saveState: document.getElementById('saveState'),
  undoBtn: document.getElementById('undoBtn'),
  redoBtn: document.getElementById('redoBtn'),
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  zoomReadout: document.getElementById('zoomReadout'),
  fitBtn: document.getElementById('fitBtn'),
  resetZoomBtn: document.getElementById('resetZoomBtn'),
  gridToggle: document.getElementById('gridToggle'),
  safeToggle: document.getElementById('safeToggle'),
  snapToggle: document.getElementById('snapToggle'),
  groupBtn: document.getElementById('groupBtn'),
  ungroupBtn: document.getElementById('ungroupBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  duplicateBtn: document.getElementById('duplicateBtn'),
  importBtn: document.getElementById('importBtn'),
  newDocBtn: document.getElementById('newDocBtn'),
  previewBtn: document.getElementById('previewBtn'),
  exportBtn: document.getElementById('exportBtn'),
  panelHost: document.getElementById('panelHost'),
  panelBody: document.getElementById('panelBody'),
  panelEyebrow: document.getElementById('panelEyebrow'),
  panelTitle: document.getElementById('panelTitle'),
  panelCollapse: document.getElementById('panelCollapse'),
  inspectorBody: document.getElementById('inspectorBody'),
  inspectorTitle: document.getElementById('inspectorTitle'),
  viewport: document.getElementById('viewport'),
  viewportPan: document.getElementById('viewportPan'),
  stage: document.getElementById('stage'),
  artboard: document.getElementById('artboard'),
  safeLayer: document.getElementById('safeLayer'),
  guideLayer: document.getElementById('guideLayer'),
  overlayLayer: document.getElementById('overlayLayer'),
  marquee: document.getElementById('marquee'),
  hintText: document.getElementById('hintText'),
  deviceLabel: document.getElementById('deviceLabel'),
  selectionLabel: document.getElementById('selectionLabel'),
  pageTabs: document.getElementById('pageTabs'),
  addPageBtn: document.getElementById('addPageBtn'),
  flowCount: document.getElementById('flowCount'),
  elementCount: document.getElementById('elementCount'),
  previewOverlay: document.getElementById('previewOverlay'),
  previewTitle: document.getElementById('previewTitle'),
  previewStage: document.getElementById('previewStage'),
  closePreview: document.getElementById('closePreview'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  modalTabs: document.getElementById('modalTabs'),
  modalBody: document.getElementById('modalBody'),
  modalFoot: document.getElementById('modalFoot'),
  modalClose: document.getElementById('modalClose'),
  toastStack: document.getElementById('toastStack'),
  shortcutsBtn: document.getElementById('shortcutsBtn'),
  themeToggle: document.getElementById('themeToggle'),
  tooltip: document.getElementById('tooltip')
}

const store = createStore()
const overlayNodes = new Map()
let overlayFrame = null
let editingId = null
let contextMenu = null

const interaction = createInteraction({
  store,
  viewport: dom.viewport,
  panLayer: dom.viewportPan,
  stage: dom.stage,
  artboard: dom.artboard,
  overlay: dom.overlayLayer,
  guideLayer: dom.guideLayer,
  marqueeEl: dom.marquee,
  requestRender,
  refreshOverlay: scheduleOverlay,
  beginTextEdit,
  openContextMenu
})

const panels = createPanels({
  store,
  host: dom.panelBody,
  eyebrowEl: dom.panelEyebrow,
  titleEl: dom.panelTitle,
  interaction,
  toast,
  setActiveRail
})

const inspector = createInspector({
  store,
  host: dom.inspectorBody,
  titleEl: dom.inspectorTitle,
  toast,
  liveGeometry: (id) => {
    const element = store.elementById(id)
    if (!element) return
    requestRender()
    scheduleOverlay()
  },
  forceRender: () => requestRender(),
  onSelectionState: (enabled) => {
    dom.deleteBtn.disabled = !enabled
    dom.duplicateBtn.disabled = !enabled
  }
})

const preview = createPreview({
  store,
  overlay: dom.previewOverlay,
  stage: dom.previewStage,
  titleEl: dom.previewTitle
})

const exportUI = createExportUI({
  store,
  modal: dom.modal,
  modalTitle: dom.modalTitle,
  modalTabs: dom.modalTabs,
  modalBody: dom.modalBody,
  modalFoot: dom.modalFoot,
  toast
})

/* --------------------------------------------------------------- rendering */

function requestRender() {
  const page = store.page()
  applyArtboard(dom.artboard, store.device(), page, { grid: store.getState().showGrid })
  renderTree(dom.artboard, page.children || [], { editingId })
  scheduleOverlay()
  updateSafeArea()
}

function updateSafeArea() {
  const device = store.device()
  const visible = store.getState().showSafeArea
  dom.safeLayer.hidden = !visible
  if (!visible) return
  dom.safeLayer.innerHTML = `<div class="safe-frame"></div><span class="safe-caption">SAFE ${device.safeTop}/${device.safeBottom}</span>`
}

function zoomScale() {
  return store.getState().zoom
}

function scheduleOverlay() {
  if (overlayFrame) return
  overlayFrame = requestAnimationFrame(() => {
    overlayFrame = null
    paintOverlay()
  })
}

function paintOverlay() {
  const state = store.getState()
  const scale = zoomScale()
  const wanted = new Set()

  function acquire(key, className) {
    wanted.add(key)
    let node = overlayNodes.get(key)
    if (!node) {
      node = document.createElement('div')
      node.className = className
      dom.overlayLayer.appendChild(node)
      overlayNodes.set(key, node)
    }
    return node
  }

  const selected = store.selectedElements()
  selected.forEach((element) => {
    const box = boundingBox(element)
    const node = acquire(`sel:${element.id}`, 'ov-box')
    node.style.left = `${box.x}px`
    node.style.top = `${box.y}px`
    node.style.width = `${box.w}px`
    node.style.height = `${box.h}px`
    node.style.transform = element.rotation ? `rotate(${element.rotation}deg)` : ''
    if (selected.length > 1) node.classList.add('is-multi')
    const labelKey = `label:${element.id}`
    if (selected.length === 1) {
      const label = acquire(labelKey, 'ov-label')
      label.textContent = `${element.name} · ${Math.round(element.w)}×${Math.round(element.h)}`
      label.style.left = `${box.x}px`
      label.style.top = `${box.y}px`
    }
    if (element.type === 'group' && selected.length === 1) {
      ;(element.children || []).forEach((child, index) => {
        const childBox = boundingBox(child)
        const childNode = acquire(`child:${element.id}:${index}`, 'ov-child')
        childNode.style.left = `${childBox.x}px`
        childNode.style.top = `${childBox.y}px`
        childNode.style.width = `${childBox.w}px`
        childNode.style.height = `${childBox.h}px`
      })
    }
  })

  // resize handles for a single selection
  if (selected.length === 1 && !store.getState().marquee) {
    const box = boundingBox(selected[0])
    const scaleStep = Math.max(1, Math.round(9 / scale))
    const half = scaleStep / 2
    const handlePoints = [
      ['nw', box.x, box.y],
      ['n', box.x + box.w / 2, box.y],
      ['ne', box.x + box.w, box.y],
      ['e', box.x + box.w, box.y + box.h / 2],
      ['se', box.x + box.w, box.y + box.h],
      ['s', box.x + box.w / 2, box.y + box.h],
      ['sw', box.x, box.y + box.h],
      ['w', box.x, box.y + box.h / 2]
    ]
    handlePoints.forEach(([handle, x, y]) => {
      const node = acquire(`handle:${handle}`, 'ov-handle')
      node.dataset.handle = handle
      node.style.left = `${x}px`
      node.style.top = `${y}px`
      node.style.width = `${scaleStep}px`
      node.style.height = `${scaleStep}px`
      node.style.margin = `${-half}px 0 0 ${-half}px`
      if (!node.__bound) {
        node.__bound = true
        node.addEventListener('pointerdown', (event) => {
          event.preventDefault()
          event.stopPropagation()
          const boxStart = boundingBox(store.selectedElements()[0])
          startResizeFromHandle(event, handle, boxStart)
        })
      }
    })
  }

  const guides = state.guides || []
  guides.forEach((guide, index) => {
    const node = acquire(`guide:${index}`, `guide axis-${guide.axis}${guide.kind === 'center' ? ' is-center' : ''}`)
    if (guide.axis === 'x') {
      node.style.left = `${guide.value}px`
      node.style.top = '0px'
      node.style.height = `${store.device().height}px`
      node.style.width = `${Math.max(1, 1 / scale)}px`
    } else {
      node.style.top = `${guide.value}px`
      node.style.left = '0px'
      node.style.width = `${store.device().width}px`
      node.style.height = `${Math.max(1, 1 / scale)}px`
    }
  })

  if (state.marquee) {
    const box = state.marquee
    dom.marquee.hidden = false
    dom.marquee.style.left = `${box.x}px`
    dom.marquee.style.top = `${box.y}px`
    dom.marquee.style.width = `${box.w}px`
    dom.marquee.style.height = `${box.h}px`
  } else {
    dom.marquee.hidden = true
  }

  overlayNodes.forEach((node, key) => {
    if (wanted.has(key)) return
    node.remove()
    overlayNodes.delete(key)
  })
}

/*
 * Resize handles live in the overlay, but the gesture math lives in the
 * interaction module. This bridges them without duplicating the logic.
 */
let handleBridge = null
function startResizeFromHandle(event, handle, box) {
  if (!handleBridge) return
  handleBridge(event, handle, box)
}

/* -------------------------------------------------------------- status UI */

function updateStatus() {
  const state = store.getState()
  const device = store.device()
  const page = store.page()
  const selected = store.selectedElements()
  dom.deviceLabel.textContent = `${device.name} · ${device.width}×${device.height}`
  dom.selectionLabel.textContent = selected.length
    ? selected.length === 1
      ? `${selected[0].name} · ${Math.round(selected[0].x)}, ${Math.round(selected[0].y)}`
      : `${selected.length} 个元素`
    : '未选中'
  dom.zoomReadout.textContent = `${Math.round(state.zoom * 100)}%`
  dom.docName.value = state.doc.name
  dom.docMeta.textContent = `${state.doc.pages.length} 个页面 · ${countAll(state.doc)} 个元素`
  const pageCount = countIn(page.children)
  const total = countAll(state.doc)
  dom.elementCount.textContent = pageCount === total ? `${total} 个元素` : `本页 ${pageCount} / 共 ${total}`
  dom.elementCount.title = `本页 ${pageCount} 个元素，整个设计共 ${total} 个元素`
  dom.flowCount.textContent = `${countFlows(state.doc)} 个跳转`
  dom.gridToggle.setAttribute('aria-pressed', String(state.showGrid))
  dom.safeToggle.setAttribute('aria-pressed', String(state.showSafeArea))
  dom.snapToggle.setAttribute('aria-pressed', String(state.snapEnabled))
  const history = store.historyState()
  dom.undoBtn.disabled = !history.canUndo
  dom.redoBtn.disabled = !history.canRedo
  dom.undoBtn.title = history.canUndo ? `撤销 ${history.undoLabel} (Ctrl+Z)` : '撤销 (Ctrl+Z)'
  dom.redoBtn.title = history.canRedo ? `重做 ${history.redoLabel} (Ctrl+Shift+Z)` : '重做 (Ctrl+Shift+Z)'
  dom.saveState.textContent = state.dirty ? '未保存' : '已保存'
  dom.saveState.dataset.state = state.dirty ? 'dirty' : 'saved'
  dom.hintText.textContent = hintFor(page, selected)
  void history
}

function hintFor(page, selected) {
  if (selected.length === 1) {
    const element = selected[0]
    if (element.type === 'group') return '组合已选中：右侧可填写备注说明它的用途，备注会写进导出 JSON'
    return '拖动移动 · 拖角缩放 · 双击改文字 · 右键更多操作'
  }
  if (selected.length > 1) return `已选中 ${selected.length} 个元素 · Ctrl+G 组合并添加备注`
  if (!(page.children || []).length) return '空白画板：从左侧拖入组件，或双击画板插入文本'
  return '从左侧拖入组件，或点选画板上的元素开始编辑'
}

function countAll(doc) {
  let count = 0
  const walk = (elements) => {
    elements.forEach((element) => {
      count += 1
      if (element.children && element.children.length) walk(element.children)
    })
  }
  doc.pages.forEach((page) => walk(page.children || []))
  return count
}

function countIn(elements) {
  let count = 0
  const walk = (list) => {
    ;(list || []).forEach((element) => {
      count += 1
      if (element.children && element.children.length) walk(element.children)
    })
  }
  walk(elements)
  return count
}

function countFlows(doc) {
  let count = 0
  const walk = (elements) => {
    ;(elements || []).forEach((element) => {
      count += (element.interactions || []).length
      if (element.children && element.children.length) walk(element.children)
    })
  }
  ;(doc.pages || []).forEach((page) => {
    count += (page.interactions || []).length
    walk(page.children || [])
  })
  return count
}

function renderTabs() {
  const doc = store.getState().doc
  const pageId = store.getState().pageId
  dom.pageTabs.innerHTML = ''
  doc.pages.forEach((page, index) => {
    const deviceMetric = store.getState().doc.pages[index]
    const button = document.createElement('button')
    button.className = `page-tab${page.id === pageId ? ' is-active' : ''}`
    button.dataset.shape = shapeOf(deviceMetric.device)
    button.title = `${page.name} · ${countFlows(page)} 跳转`
    button.innerHTML = `<span class="tab-shape"></span><span>${escapeHtml(page.name)}</span>`
    button.addEventListener('click', () => store.setPage(page.id))
    button.addEventListener('dblclick', () => {
      const label = button.lastElementChild
      const input = document.createElement('input')
      input.className = 'tab-rename'
      input.value = page.name
      label.replaceWith(input)
      input.focus()
      input.select()
      const finish = () => {
        const value = input.value.trim()
        if (value && value !== page.name) store.updatePage(page.id, { name: value }, '重命名页面')
        else renderTabs()
      }
      input.addEventListener('blur', finish)
      input.addEventListener('keydown', (event) => {
        event.stopPropagation()
        if (event.key === 'Enter') input.blur()
        if (event.key === 'Escape') {
          input.value = page.name
          input.blur()
        }
      })
    })
    dom.pageTabs.appendChild(button)
  })
}

function shapeOf(deviceId) {
  return (
    {
      circle: 'circle',
      pill: 'pill',
      rect: 'rect',
      phone: 'rect'
    }[deviceId] || 'rect'
  )
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function setActiveRail(panel) {
  document.querySelectorAll('.rail-btn').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.panel === panel)
  })
}

/* ------------------------------------------------------------ text editing */

function beginTextEdit(id) {
  const element = store.elementById(id)
  if (!element) return
  if (element.type !== 'text' && element.type !== 'button' && element.type !== 'listRow') return
  const node = nodeForId(id)
  if (!node) return
  const target = node.querySelector('[data-role="text"]') || node.querySelector('.row-label')
  if (!target) return
  editingId = id
  node.classList.add('is-editing')
  target.contentEditable = 'true'
  if (element.type === 'listRow') {
    target.textContent = element.text === undefined ? element.name : element.text
  }
  target.focus()
  const range = document.createRange()
  range.selectNodeContents(target)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)

  const finish = (commit) => {
    target.contentEditable = 'false'
    node.classList.remove('is-editing')
    const value = target.textContent
    editingId = null
    if (commit && value !== (element.text === undefined ? element.name : element.text)) {
      store.updateElements([id], { text: value }, '修改文本')
    } else {
      requestRender()
    }
    requestRender()
    inspector.render(true)
  }
  target.addEventListener('blur', () => finish(true), { once: true })
  target.addEventListener('keydown', (event) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      finish(false)
    }
    if (event.key === 'Enter' && !event.shiftKey && element.type !== 'text') {
      event.preventDefault()
      finish(true)
    }
  })
}

/* ------------------------------------------------------------ context menu */

function openContextMenu(event, element) {
  closeContextMenu()
  const menu = document.createElement('div')
  menu.className = 'modal'
  menu.style.background = 'transparent'
  menu.style.backdropFilter = 'none'
  menu.style.placeItems = 'start'
  const card = document.createElement('div')
  card.style.cssText = `position:fixed;left:${Math.min(event.clientX, window.innerWidth - 220)}px;top:${Math.min(event.clientY, window.innerHeight - 280)}px;width:212px;padding:6px;border:1px solid var(--c-line-strong);border-radius:12px;background:#171a22;box-shadow:var(--shadow-lg);z-index:95`
  const items = element
    ? [
        ['编辑文本', () => beginTextEdit(element.id), ['text', 'button', 'listRow'].includes(element.type)],
        ['复制', () => store.duplicateElements([element.id])],
        ['置于顶层', () => store.moveInOrder([element.id], 'front')],
        ['置于底层', () => store.moveInOrder([element.id], 'back')],
        ['上移一层', () => store.moveInOrder([element.id], 'up')],
        ['下移一层', () => store.moveInOrder([element.id], 'down')],
        ['锁定 / 解锁', () => store.updateElements([element.id], { locked: !element.locked }, '切换锁定')],
        ['删除', () => store.deleteElements([element.id])]
      ]
    : [
        ['粘贴', () => pasteClipboard()],
        ['全选', () => store.selectAll()],
        ['新建页面', () => store.addPage({ device: store.page().device })],
        ['清空本页', () => clearPage()]
      ]
  items.forEach(([label, action, allowed]) => {
    if (allowed === false) return
    const button = document.createElement('button')
    button.className = 'layer-row'
    button.style.cssText = 'width:100%;justify-content:flex-start;height:28px;border:0;background:none'
    button.textContent = label
    button.addEventListener('click', () => {
      action()
      closeContextMenu()
      requestRender()
      inspector.render(true)
      panels.render()
      renderTabs()
    })
    card.appendChild(button)
  })
  menu.appendChild(card)
  menu.addEventListener('pointerdown', (event2) => {
    if (event2.target === menu) closeContextMenu()
  })
  document.body.appendChild(menu)
  contextMenu = menu
}

function closeContextMenu() {
  if (contextMenu) {
    contextMenu.remove()
    contextMenu = null
  }
}

/* ------------------------------------------------------------ confirm bar */

let confirmBar = null

/**
 * An in-app replacement for `window.confirm`. Native dialogs block every
 * subsequent interaction until they are answered, which is hostile in a design
 * tool (and impossible to drive from automation), so destructive actions ask
 * through this small bar instead.
 */
function askConfirm(message, options = {}) {
  closeConfirm()
  const bar = document.createElement('div')
  bar.className = 'confirm-bar'
  const text = document.createElement('span')
  text.className = 'confirm-text'
  text.textContent = message
  bar.appendChild(text)
  const actions = document.createElement('div')
  actions.className = 'confirm-actions'
  const cancel = document.createElement('button')
  cancel.className = 'btn ghost'
  cancel.textContent = options.cancelLabel || '取消'
  cancel.addEventListener('click', closeConfirm)
  const accept = document.createElement('button')
  accept.className = 'btn primary'
  accept.textContent = options.acceptLabel || '继续'
  accept.addEventListener('click', () => {
    closeConfirm()
    if (options.onAccept) options.onAccept()
  })
  actions.appendChild(cancel)
  actions.appendChild(accept)
  bar.appendChild(actions)
  dom.app.appendChild(bar)
  confirmBar = bar
  accept.focus()
  window.setTimeout(() => {
    if (confirmBar === bar) closeConfirm()
  }, 8000)
  return true
}

function closeConfirm() {
  if (confirmBar) {
    confirmBar.remove()
    confirmBar = null
  }
}

function createBlankDocument() {
  store.reset()
  try {
    window.localStorage.removeItem(store.STORAGE_KEY)
    window.localStorage.removeItem('design-studio:document')
  } catch (error) {
    void error
  }
  closeConfirm()
  afterHistory()
  toast('已新建空白设计', 'ok')
}

function clearPage() {
  const ids = (store.page().children || []).map((element) => element.id)
  if (!ids.length) return
  store.deleteElements(ids)
}

/* ---------------------------------------------------------------- clipboard */

let clipboard = []

function copySelection() {
  clipboard = store.selectedElements().map((element) => JSON.parse(JSON.stringify(element)))
  if (clipboard.length) toast(`已复制 ${clipboard.length} 个元素`, 'ok')
}

function pasteClipboard() {
  if (!clipboard.length) return
  const clones = clipboard.map((element) => {
    const copy = JSON.parse(JSON.stringify(element))
    reassign(copy)
    copy.x += 8
    copy.y += 8
    return copy
  })
  store.transaction('粘贴元素', () => {
    store.page().children.push(...clones)
  })
  store.select(clones.map((element) => element.id))
}

function reassign(node) {
  if (Array.isArray(node)) {
    node.forEach(reassign)
    return
  }
  if (node && typeof node === 'object') {
    if (node.id) node.id = newId(node.type === 'group' ? 'group' : 'el')
    if (node.children) node.children.forEach(reassign)
  }
}

/* ------------------------------------------------------------------ toasts */

function toast(message, kind) {
  const node = document.createElement('div')
  node.className = 'toast'
  node.dataset.kind = kind || 'info'
  node.textContent = message
  dom.toastStack.appendChild(node)
  setTimeout(() => {
    node.classList.add('is-leaving')
    setTimeout(() => node.remove(), 220)
  }, 2200)
}

/* ------------------------------------------------------------------ import */

function importDocument() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json,.json'
  input.addEventListener('change', () => {
    const file = input.files && input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const doc = parsed && parsed.doc ? parsed.doc : parsed
        if (!doc || !Array.isArray(doc.pages)) throw new Error('缺少 pages 数组')
        store.replaceDocument(doc, { reason: `已导入 ${file.name}` })
        requestRender()
        inspector.render(true)
        panels.render()
        renderTabs()
      } catch (error) {
        toast(`导入失败：${error.message}`, 'error')
      }
    }
    reader.readAsText(file)
  })
  input.click()
}

/* --------------------------------------------------------------- shortcuts */

function isTypingTarget(target) {
  if (!target) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable
}

function handleKeydown(event) {
  if (preview.isOpen()) {
    if (event.key === 'Escape') preview.close()
    return
  }
  if (exportUI.isOpen()) {
    if (event.key === 'Escape') exportUI.close()
    return
  }
  if (event.key === 'Escape') {
    closeContextMenu()
    store.clearSelection()
    return
  }
  if (isTypingTarget(event.target)) return
  const meta = event.ctrlKey || event.metaKey
  const selection = store.getState().selection

  if (meta && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) store.redo()
    else store.undo()
    afterHistory()
    return
  }
  if (meta && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    store.redo()
    afterHistory()
    return
  }
  if (meta && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    store.duplicateElements(selection)
    afterHistory()
    return
  }
  if (meta && event.key.toLowerCase() === 'c') {
    event.preventDefault()
    copySelection()
    return
  }
  if (meta && event.key.toLowerCase() === 'v') {
    event.preventDefault()
    pasteClipboard()
    afterHistory()
    return
  }
  if (meta && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    store.selectAll()
    return
  }
  if (meta && event.key.toLowerCase() === 'g') {
    event.preventDefault()
    if (event.shiftKey) store.ungroupElements(selection)
    else store.groupElements(selection)
    afterHistory()
    return
  }
  if (meta && event.key.toLowerCase() === 'e') {
    event.preventDefault()
    exportUI.open('prompt')
    return
  }
  if (meta && event.key === ']') {
    event.preventDefault()
    store.moveInOrder(selection, 'front')
    afterHistory()
    return
  }
  if (meta && event.key === '[') {
    event.preventDefault()
    store.moveInOrder(selection, 'back')
    afterHistory()
    return
  }
  if (meta && event.key === "'") {
    event.preventDefault()
    store.setViewOption('showGrid', !store.getState().showGrid)
    requestRender()
    return
  }
  if (meta && event.key === ';') {
    event.preventDefault()
    if (event.shiftKey) store.setViewOption('snapEnabled', !store.getState().snapEnabled)
    else store.setViewOption('showSafeArea', !store.getState().showSafeArea)
    updateSafeArea()
    updateStatus()
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (!selection.length) return
    event.preventDefault()
    store.deleteElements(selection)
    afterHistory()
    return
  }
  if (event.key === 'p' || event.key === 'P') {
    event.preventDefault()
    preview.open()
    return
  }
  const step = event.shiftKey ? 10 : 1
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    if (!selection.length) return
    event.preventDefault()
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
    store.nudge(selection, dx, dy)
    requestRender()
    scheduleOverlay()
    updateStatus()
  }
}

function afterHistory() {
  requestRender()
  inspector.render(true)
  panels.render()
  renderTabs()
  updateStatus()
}

/* ------------------------------------------------------------------ wiring */

function bindToolbar() {
  document.querySelectorAll('[data-align]').forEach((button) => {
    button.addEventListener('click', () => {
      store.align(store.getState().selection, button.dataset.align)
      afterHistory()
    })
  })
  document.querySelectorAll('[data-order]').forEach((button) => {
    button.addEventListener('click', () => {
      store.moveInOrder(store.getState().selection, button.dataset.order)
      afterHistory()
    })
  })
  document.querySelectorAll('[data-panel]').forEach((button) => {
    button.addEventListener('click', () => panels.show(button.dataset.panel))
  })

  dom.undoBtn.addEventListener('click', () => {
    store.undo()
    afterHistory()
  })
  dom.redoBtn.addEventListener('click', () => {
    store.redo()
    afterHistory()
  })
  dom.zoomInBtn.addEventListener('click', () => {
    store.zoomBy(1.2)
    updateStatus()
    scheduleOverlay()
  })
  dom.zoomOutBtn.addEventListener('click', () => {
    store.zoomBy(1 / 1.2)
    updateStatus()
    scheduleOverlay()
  })
  dom.zoomReadout.addEventListener('click', () => {
    store.fitView()
    updateStatus()
    scheduleOverlay()
  })
  dom.fitBtn.addEventListener('click', () => {
    store.fitView()
    updateStatus()
    scheduleOverlay()
  })
  dom.resetZoomBtn.addEventListener('click', () => {
    store.setZoom(1)
    updateStatus()
    scheduleOverlay()
  })
  dom.gridToggle.addEventListener('click', () => {
    store.setViewOption('showGrid', !store.getState().showGrid)
    requestRender()
    updateStatus()
  })
  dom.safeToggle.addEventListener('click', () => {
    store.setViewOption('showSafeArea', !store.getState().showSafeArea)
    updateSafeArea()
    updateStatus()
  })
  dom.snapToggle.addEventListener('click', () => {
    store.setViewOption('snapEnabled', !store.getState().snapEnabled)
    updateStatus()
  })
  dom.groupBtn.addEventListener('click', () => {
    store.groupElements(store.getState().selection)
    afterHistory()
  })
  dom.ungroupBtn.addEventListener('click', () => {
    store.ungroupElements(store.getState().selection)
    afterHistory()
  })
  dom.deleteBtn.addEventListener('click', () => {
    store.deleteElements(store.getState().selection)
    afterHistory()
  })
  dom.duplicateBtn.addEventListener('click', () => {
    store.duplicateElements(store.getState().selection)
    afterHistory()
  })
  dom.importBtn.addEventListener('click', importDocument)
  dom.newDocBtn.addEventListener('click', () => {
    const hasWork = countAll(store.getState().doc) > 0
    if (!hasWork || !store.confirmationsEnabled()) {
      createBlankDocument()
      return
    }
    askConfirm('新建空白设计会清空当前画布，已自动保存的内容会被替换。', {
      acceptLabel: '新建空白设计',
      onAccept: createBlankDocument
    })
  })
  dom.previewBtn.addEventListener('click', () => preview.open())
  dom.exportBtn.addEventListener('click', () => {
    exportUI.invalidate()
    exportUI.open('prompt')
  })
  dom.addPageBtn.addEventListener('click', () => {
    store.addPage({ device: store.page().device })
    afterHistory()
  })
  dom.panelCollapse.addEventListener('click', () => {
    dom.app.classList.toggle('is-panel-collapsed')
    scheduleOverlay()
  })
  dom.closePreview.addEventListener('click', () => {
    preview.close()
    // The editor canvas keeps its DOM while the preview is open, so repaint on
    // exit: nothing that changed in the meantime should stay invisible.
    requestRender()
    inspector.render(true)
    scheduleOverlay()
  })
  dom.modalClose.addEventListener('click', () => exportUI.close())
  dom.modal.addEventListener('pointerdown', (event) => {
    if (event.target === dom.modal) exportUI.close()
  })
  dom.docName.addEventListener('change', () => store.setDocumentName(dom.docName.value.trim() || '未命名设计'))
  dom.docName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') dom.docName.blur()
    event.stopPropagation()
  })
  dom.shortcutsBtn.addEventListener('click', () => {
    exportUI.invalidate()
    exportUI.open('schema')
  })
  dom.themeToggle.addEventListener('click', () => {
    const root = document.documentElement
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    try {
      window.localStorage.setItem('design-studio:theme', next)
    } catch (error) {
      void error
    }
    toast(next === 'dark' ? '已切换到深色主题' : '已切换到明亮主题', 'info')
  })

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', () => {
    scheduleOverlay()
    updateStatus()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) store.saveLocal()
  })
}

/* --------------------------------------------------------------- bootstrap */

function bootstrap() {
  applyTheme(readStoredTheme())
  bindToolbar()
  interaction.attach()

  // The overlay handles need the interaction module's gesture maths; wiring it
  // here keeps both modules free of a circular import.
  handleBridge = (event, handle, box) => {
    const target = store.selectedElements()[0]
    if (!target) return
    const start = {
      element: target,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      rotation: target.rotation || 0
    }
    interaction.beginHandleGesture(event, handle, [start])
  }

  store.subscribe((payload) => {
    try {
      handleStoreEvent(payload)
    } catch (error) {
      // A view-level failure must never take the editor down: report it and
      // keep the document usable.
      console.error('[design-studio] render failure', error)
      toast(`界面刷新出错：${error.message}`, 'error')
    }
  })

  panels.show('insert')
  applyZoom()
  requestRender()
  renderTabs()
  updateStatus()
  inspector.render(true)
  updateSafeArea()
  setTimeout(() => toast('Design Studio 已就绪：拖入组件开始设计', 'ok'), 420)
}

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem('design-studio:theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch (error) {
    void error
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') root.dataset.theme = 'dark'
  else delete root.dataset.theme
}

function handleStoreEvent(payload) {
  {
    switch (payload.type) {
      case 'doc':
        requestRender()
        renderTabs()
        panels.render()
        inspector.render()
        updateStatus()
        invalidateExport()
        break
      case 'tree':
        panels.render()
        inspector.refreshValues(store.selectedElements())
        updateStatus()
        invalidateExport()
        break
      case 'select':
        inspector.render()
        scheduleOverlay()
        updateStatus()
        break
      case 'meta':
        if (payload.meta && payload.meta.zoom !== undefined) {
          applyZoom()
          scheduleOverlay()
        } else {
          scheduleOverlay()
        }
        updateStatus()
        break
      case 'pages':
        renderTabs()
        updateStatus()
        invalidateExport()
        break
      case 'tokens':
        invalidateExport()
        updateStatus()
        break
      case 'toast':
        toast(payload.message, payload.kind)
        break
      default:
        break
    }
  }
}

function applyZoom() {
  const scale = store.getState().zoom
  // `left/top: 50%` plus a -50% translate centres the artboard, then the zoom
  // scale is applied on top. Keeping both in one transform avoids a reflow.
  dom.stage.style.transform = `translate(-50%, -50%) scale(${scale})`
  dom.stage.style.transformOrigin = 'center center'
}

function invalidateExport() {
  exportUI.invalidate()
}

try {
  bootstrap()
} catch (error) {
  console.error('[design-studio] boot failure', error)
  const stack = document.getElementById('toastStack')
  if (stack) {
    const node = document.createElement('div')
    node.className = 'toast'
    node.dataset.kind = 'error'
    node.textContent = `启动失败：${error.message}`
    stack.appendChild(node)
  }
}

/*
 * A deliberately small debug surface: e2e checks and curious humans can poke
 * the document without needing to reverse-engineer the modules.
 */
globalThis.designStudio = {
  store,
  panels,
  inspector,
  preview,
  exportUI,
  requestRender,
  version: '1.0.0'
}
