/*
 * design-studio / store.js
 * ---------------------------------------------------------------------------
 * The editor's single source of truth. All mutations go through `commit()`,
 * which keeps history, dirty-state and listeners consistent. Listeners are
 * notified with a small payload so views can avoid full re-renders:
 *
 *   { type: 'doc'   , doc }
 *   { type: 'select', selection }
 *   { type: 'meta'  , meta }          // zoom / mode / dirty / guides
 *   { type: 'pages' }
 *   { type: 'tree'  }                  // layer list changed
 */

import {
  SCHEMA_VERSION,
  LEGACY_DEFAULTS,
  DEFAULT_TOKENS,
  LIMITS,
  createDocument,
  createPage,
  createElementFromPalette,
  getDevice,
  newId
} from './schema.js'
import { boundingBox, containsPoint, unionBox, clampToArtboard } from './geometry.js'
import { nodeForId } from './render.js'

const STORAGE_KEY = 'design-studio:document:v1'

export function createStore(initialDoc) {
  const doc = normalizeDocument(initialDoc || loadLocal() || createDocument())
  const state = {
    doc,
    pageId: doc.pages[0].id,
    selection: [],
    zoom: fitZoom(getDevice(doc.pages[0].device)),
    mode: 'edit',
    dirty: false,
    savedAt: null,
    guides: [],
    marquee: null,
    snapEnabled: true,
    showGrid: false,
    showSafeArea: true
  }

  const history = { past: [], future: [] }
  const listeners = new Set()
  /*
   * Notifications are batched into one animation frame, but the *kinds* of
   * change are accumulated rather than overwritten. Overwriting would let a
   * `select` that follows a `doc` mutation cancel the re-render, which is
   * exactly the class of bug that makes an editor feel broken.
   */
  const pending = new Map()
  let flushHandle = null
  const meta = { lastCheckpointAt: Date.now(), saveTimer: null, suppress: false }
  /** Set to skip `confirm()` prompts. Automation flips this so a modal dialog
   *  can never block a scripted run. */
  let confirmationsEnabled = true

  function emit(payload) {
    pending.set(payload.type, payload)
    if (flushHandle) return
    flushHandle = requestFrame(() => {
      flushHandle = null
      const batch = [...pending.values()]
      pending.clear()
      listeners.forEach((listener) => batch.forEach((payload) => listener(payload)))
    })
  }

  function page() {
    return state.doc.pages.find((item) => item.id === state.pageId) || state.doc.pages[0]
  }

  function device() {
    return getDevice(page().device)
  }

  function artboard() {
    const spec = device()
    return { width: spec.width, height: spec.height }
  }

  function walk(elements, visit, parent) {
    elements.forEach((element) => {
      visit(element, parent)
      if (element.children && element.children.length) walk(element.children, visit, element)
    })
  }

  function allElements() {
    const result = []
    walk(page().children || [], (element) => result.push(element))
    return result
  }

  function findElement(id) {
    let found = null
    const search = (list, parent) => {
      for (const element of list) {
        if (element.id === id) {
          found = { element, list, parent }
          return true
        }
        if (element.children && element.children.length && search(element.children, element)) return true
      }
      return false
    }
    search(page().children || [], null)
    return found
  }

  function elementById(id) {
    const found = findElement(id)
    return found ? found.element : null
  }

  /* ------------------------------------------------------------- history */

  function snapshot() {
    return JSON.stringify({ doc: state.doc, pageId: state.pageId, selection: state.selection })
  }

  function restore(serialized) {
    const data = JSON.parse(serialized)
    state.doc = data.doc
    state.pageId = data.pageId
    state.selection = data.selection
    state.dirty = true
    emit({ type: 'doc', doc: state.doc })
    emit({ type: 'pages' })
    emit({ type: 'tree' })
    emit({ type: 'select', selection: state.selection })
  }

  /**
   * Commit a mutation. `mutator` receives the live document; return `false` to
   * abort the commit (nothing is recorded).
   */
  function commit(label, mutator, options = {}) {
    if (meta.suppress) {
      mutator(state.doc)
      return true
    }
    const before = snapshot()
    const result = mutator(state.doc)
    if (result === false) return false
    history.past.push({ label, before, at: Date.now() })
    if (history.past.length > LIMITS.historyDepth) history.past.shift()
    history.future.length = 0
    state.dirty = true
    emit(options.payload || { type: 'doc', doc: state.doc })
    if (options.tree !== false) emit({ type: 'tree' })
    scheduleSave()
    return true
  }

  function undo() {
    const entry = history.past.pop()
    if (!entry) return false
    history.future.push({ label: entry.label, after: snapshot(), at: Date.now() })
    restore(entry.before)
    scheduleSave()
    return true
  }

  function redo() {
    const entry = history.future.pop()
    if (!entry) return false
    history.past.push({ label: entry.label, before: snapshot(), at: Date.now() })
    restore(entry.after)
    scheduleSave()
    return true
  }

  function historyState() {
    return {
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      undoLabel: history.past.length ? history.past[history.past.length - 1].label : '',
      redoLabel: history.future.length ? history.future[history.future.length - 1].label : ''
    }
  }

  /* ----------------------------------------------------------- persistence */

  function scheduleSave() {
    if (meta.saveTimer) clearTimeout(meta.saveTimer)
    meta.saveTimer = setTimeout(() => {
      meta.saveTimer = null
      saveLocal()
    }, 700)
  }

  function saveLocal() {
    try {
      const payload = JSON.stringify({ schema: SCHEMA_VERSION, savedAt: Date.now(), doc: state.doc })
      globalThis.localStorage.setItem(STORAGE_KEY, payload)
      state.dirty = false
      state.savedAt = Date.now()
      emit({ type: 'meta', meta: { dirty: false, savedAt: state.savedAt } })
    } catch (error) {
      emit({ type: 'meta', meta: { dirty: true, saveError: String(error && error.message) } })
    }
  }

  function loadLocal() {
    try {
      const raw = globalThis.localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed && parsed.doc ? parsed.doc : null
    } catch (error) {
      return null
    }
  }

  /* ------------------------------------------------------------ selectors */

  function select(ids, options = {}) {
    const list = Array.isArray(ids) ? ids : [ids]
    const next = list.filter(Boolean)
    if (!options.add) {
      state.selection = next
    } else {
      const merged = new Set(state.selection)
      next.forEach((id) => {
        if (merged.has(id)) merged.delete(id)
        else merged.add(id)
      })
      state.selection = [...merged]
    }
    emit({ type: 'select', selection: state.selection })
  }

  function selectAll() {
    select(page().children.map((element) => element.id))
  }

  function clearSelection() {
    select([])
  }

  function selectedElements() {
    return state.selection.map((id) => elementById(id)).filter(Boolean)
  }

  function selectionBox() {
    const elements = selectedElements()
    if (!elements.length) return null
    return unionBox(elements.map(boundingBox))
  }

  function pointInElement(element, point) {
    if (!element.visible) return false
    if (point.x < element.x || point.x > element.x + element.w) return false
    if (point.y < element.y || point.y > element.y + element.h) return false
    let local = point
    if (element.rotation) {
      const cx = element.x + element.w / 2
      const cy = element.y + element.h / 2
      const rad = (-element.rotation * Math.PI) / 180
      const dx = point.x - cx
      const dy = point.y - cy
      local = { x: cx + dx * Math.cos(rad) - dy * Math.sin(rad), y: cy + dx * Math.sin(rad) + dy * Math.cos(rad) }
    }
    // A rotated shape falls back to its axis-aligned box; only true circles get
    // the elliptical test so a round button does not swallow its neighbours.
    const isCircle = element.type === 'ellipse' || element.type === 'ring' || (element.style && element.style.radius >= 999)
    if (!isCircle || element.rotation) {
      return containsPoint({ x: element.x, y: element.y, w: element.w, h: element.h }, local)
    }
    const rx = element.w / 2
    const ry = element.h / 2
    const nx = (local.x - (element.x + rx)) / (rx || 1)
    const ny = (local.y - (element.y + ry)) / (ry || 1)
    return nx * nx + ny * ny <= 1
  }

  /**
   * Topmost element under the pointer. `options.deep` also searches inside
   * groups, which is what double-click drill-down uses.
   */
  function hitTest(point, options = {}) {
    const deep = options.deep === true
    const search = (list, parent) => {
      for (let index = list.length - 1; index >= 0; index -= 1) {
        const element = list[index]
        if (!element.visible) continue
        if (deep && element.children && element.children.length) {
          const inner = search(element.children, element)
          if (inner) return inner
        }
        if (pointInElement(element, point)) return { element, parent }
      }
      return null
    }
    return search(page().children || [], null)
  }

  /* ------------------------------------------------------------ mutations */

  function addElement(paletteId, point, options = {}) {
    const parentId = options.parentId || null
    const element = createElementFromPalette(paletteId, point, options)
    makeTextReadable(element, page().background)
    commit(`添加${element.name}`, () => {
      if (parentId) {
        const parent = elementById(parentId)
        if (parent) {
          const local = {
            x: point.x - parent.x,
            y: point.y - parent.y
          }
          element.x = Math.round(local.x - element.w / 2)
          element.y = Math.round(local.y - element.h / 2)
          element.parentId = parent.id
          parent.children.push(element)
          return
        }
      }
      if (state.doc.pages && LIMITS.maxElements) {
        const total = allElements().length
        if (total >= LIMITS.maxElements) return false
      }
      page().children.push(element)
    })
    select(element.id)
    return element
  }

  function updateElements(ids, patch, label) {
    const list = Array.isArray(ids) ? ids : [ids]
    const targets = list.map((id) => elementById(id)).filter(Boolean)
    if (!targets.length) return false
    return commit(label || '修改元素', () => {
      targets.forEach((element) => applyPatch(element, patch))
    })
  }

  function applyPatch(element, patch) {
    Object.keys(patch).forEach((key) => {
      const value = patch[key]
      if (key === 'style') {
        element.style = Object.assign({}, element.style, value)
        if (value.fill && typeof value.fill === 'object') element.style.fill = Object.assign({}, element.style.fill, value.fill)
        if (value.stroke === null) delete element.style.stroke
        else if (value.stroke && typeof value.stroke === 'object') element.style.stroke = Object.assign({}, element.style.stroke, value.stroke)
        return
      }
      if (value === undefined) return
      element[key] = value
    })
  }

  function deleteElements(ids) {
    const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean)
    if (!list.length) return false
    return commit('删除元素', () => {
      list.forEach((id) => {
        const found = findElement(id)
        if (!found) return
        const holder = found.parent ? found.parent.children : page().children
        const index = holder.indexOf(found.element)
        if (index >= 0) holder.splice(index, 1)
      })
      state.selection = state.selection.filter((id) => !list.includes(id))
    })
  }

  function duplicateElements(ids, offset = 8) {
    const list = Array.isArray(ids) ? ids : [ids]
    const created = []
    commit('复制元素', () => {
      list.forEach((id) => {
        const found = findElement(id)
        if (!found) return
        const clone = deepClone(found.element)
        reassignIds(clone)
        clone.x += offset
        clone.y += offset
        clone.name = `${found.element.name} 副本`
        found.list.push(clone)
        created.push(clone.id)
      })
    })
    if (created.length) select(created)
    return created
  }

  function groupElements(ids) {
    const list = (ids && ids.length ? ids : state.selection).filter(Boolean)
    if (list.length < 1) return null
    const elements = list.map((id) => findElement(id)).filter(Boolean)
    const box = unionBox(elements.map((item) => boundingBox(item.element)))
    const group = {
      id: newId('group'),
      name: '组合',
      type: 'group',
      paletteId: 'group',
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      layout: 'free',
      note: '',
      interactions: [],
      style: { fill: { type: 'none' }, radius: 0, opacity: 1 },
      children: []
    }
    /*
     * Children are stored relative to their group. That keeps "move the group"
     * a single coordinate change, and it lets the Vela export emit an inner
     * stack with its own origin instead of doubled absolute coordinates.
     */
    const originX = box.x
    const originY = box.y
    commit('组合元素', () => {
      const topList = page().children
      // Keep paint order: children are appended in their original order.
      elements
        .slice()
        .sort((a, b) => topList.indexOf(a.element) - topList.indexOf(b.element))
        .forEach((item) => {
          const parent = item.parent
          const holder = parent ? parent.children : topList
          const index = holder.indexOf(item.element)
          if (index >= 0) holder.splice(index, 1)
          item.element.parentId = group.id
          item.element.x -= originX
          item.element.y -= originY
          group.children.push(item.element)
        })
      const insertAt = Math.max(0, Math.min(topList.length, topList.length))
      topList.splice(insertAt, 0, group)
    })
    select(group.id)
    return group
  }

  function ungroupElements(ids) {
    const list = (ids && ids.length ? ids : state.selection).filter(Boolean)
    const groups = list.map((id) => findElement(id)).filter((found) => found && found.element.type === 'group')
    if (!groups.length) return false
    const released = []
    commit('解除组合', () => {
      groups.forEach((found) => {
        const group = found.element
        const holder = found.parent ? found.parent.children : page().children
        const index = holder.indexOf(group)
        const children = group.children.slice()
        children.forEach((child) => {
          delete child.parentId
          child.x += group.x
          child.y += group.y
          released.push(child.id)
        })
        holder.splice(index, 1, ...children)
      })
      state.selection = released
    })
    return true
  }

  /**
   * Move an element into another element (a group, or a free-layout container)
   * while keeping its on-screen position. Coordinates are local to the parent,
   * so re-parenting means subtracting the new parent's origin.
   */
  function reparentElement(elementId, parentId) {
    if (!elementId || !parentId || elementId === parentId) return false
    const found = findElement(elementId)
    const parentFound = findElement(parentId)
    if (!found || !parentFound) return false
    const parent = parentFound.element
    if (parent.type !== 'group' && parent.type !== 'container') return false
    if (found.parent && found.parent.id === parentId) return false
    // A node can never be moved inside itself or one of its own descendants.
    let cursor = parent
    while (cursor) {
      if (cursor.id === found.element.id) return false
      const next = findElement(cursor.parentId)
      cursor = next ? next.element : null
    }
    const element = found.element
    return commit('移动进组合', () => {
      const holder = found.parent ? found.parent.children : page().children
      const index = holder.indexOf(element)
      if (index >= 0) holder.splice(index, 1)
      element.x -= parent.x
      element.y -= parent.y
      element.parentId = parent.id
      parent.children.push(element)
    })
  }

  function moveInOrder(ids, direction) {
    const list = (ids && ids.length ? ids : state.selection).filter(Boolean)
    if (!list.length) return false
    const label = direction === 'front' ? '置于顶层' : direction === 'back' ? '置于底层' : '调整层级'
    return commit(label, () => {
      const holder = page().children
      const targets = holder.filter((element) => list.includes(element.id))
      targets.forEach((element) => {
        const index = holder.indexOf(element)
        holder.splice(index, 1)
        if (direction === 'front') holder.push(element)
        else if (direction === 'back') holder.unshift(element)
        else if (direction === 'up') holder.splice(Math.min(holder.length, index + 1), 0, element)
        else holder.splice(Math.max(0, index - 1), 0, element)
      })
    })
  }

  function align(ids, mode) {
    const list = (ids && ids.length ? ids : state.selection).filter(Boolean)
    if (list.length < 2) return false
    const art = artboard()
    const elements = list.map((id) => elementById(id)).filter(Boolean)
    const box = unionBox(elements.map(boundingBox))
    return commit('对齐元素', () => {
      elements.forEach((element) => {
        switch (mode) {
          case 'left': element.x = box.x; break
          case 'centerX': element.x = box.x + box.w / 2 - element.w / 2; break
          case 'right': element.x = box.x + box.w - element.w; break
          case 'top': element.y = box.y; break
          case 'centerY': element.y = box.y + box.h / 2 - element.h / 2; break
          case 'bottom': element.y = box.y + box.h - element.h; break
          case 'artCenterX': element.x = art.width / 2 - element.w / 2; break
          case 'artCenterY': element.y = art.height / 2 - element.h / 2; break
          case 'distributeX': break
          case 'distributeY': break
          default: break
        }
        element.x = Math.round(element.x)
        element.y = Math.round(element.y)
      })
      if (mode === 'distributeX' && elements.length > 2) {
        const sorted = elements.slice().sort((a, b) => a.x - b.x)
        const gap = (box.w - sorted.reduce((sum, element) => sum + element.w, 0)) / (sorted.length - 1)
        let cursor = box.x
        sorted.forEach((element) => {
          element.x = Math.round(cursor)
          cursor += element.w + gap
        })
      }
      if (mode === 'distributeY' && elements.length > 2) {
        const sorted = elements.slice().sort((a, b) => a.y - b.y)
        const gap = (box.h - sorted.reduce((sum, element) => sum + element.h, 0)) / (sorted.length - 1)
        let cursor = box.y
        sorted.forEach((element) => {
          element.y = Math.round(cursor)
          cursor += element.h + gap
        })
      }
    })
  }

  function nudge(ids, dx, dy) {
    const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean)
    if (!list.length) return false
    return commit('微调位置', () => {
      list.forEach((id) => {
        const element = elementById(id)
        if (!element) return
        element.x = Math.round(element.x + dx)
        element.y = Math.round(element.y + dy)
      })
    })
  }

  function clampSelectionToArtboard(ids) {
    const list = (ids && ids.length ? ids : state.selection).filter(Boolean)
    if (!list.length) return false
    const art = artboard()
    return commit('限制在画板内', () => {
      list.forEach((id) => {
        const element = elementById(id)
        if (!element) return
        const point = clampToArtboard({ x: element.x, y: element.y, w: element.w, h: element.h }, art)
        element.x = point.x
        element.y = point.y
      })
    })
  }

  /* ---------------------------------------------------------------- pages */

  function addPage(options = {}) {
    const spec = getDevice(options.device || state.doc.device)
    const pageModel = createPage({
      name: options.name || `页面 ${state.doc.pages.length + 1}`,
      device: spec.id,
      background: options.background || page().background
    })
    commit('新建页面', () => {
      state.doc.pages.push(pageModel)
    })
    setPage(pageModel.id)
    return pageModel
  }

  function duplicatePage(id) {
    const source = state.doc.pages.find((item) => item.id === id)
    if (!source) return null
    const clone = JSON.parse(JSON.stringify(source))
    clone.id = newId('page')
    clone.name = `${source.name} 副本`
    reassignIds(clone)
    commit('复制页面', () => {
      state.doc.pages.push(clone)
    })
    setPage(clone.id)
    return clone
  }

  function removePage(id) {
    if (state.doc.pages.length <= 1) return false
    const ok = commit('删除页面', () => {
      state.doc.pages = state.doc.pages.filter((item) => item.id !== id)
    })
    if (ok && state.pageId === id) setPage(state.doc.pages[0].id)
    return ok
  }

  function setPage(id) {
    if (!state.doc.pages.some((item) => item.id === id)) return
    state.pageId = id
    state.selection = []
    state.zoom = fitZoom(getDevice(page().device))
    emit({ type: 'doc', doc: state.doc })
    emit({ type: 'pages' })
    emit({ type: 'tree' })
    emit({ type: 'select', selection: [] })
    emit({ type: 'meta', meta: { zoom: state.zoom } })
  }

  function updatePage(id, patch, label) {
    const target = state.doc.pages.find((item) => item.id === id)
    if (!target) return false
    return commit(label || '修改页面', () => {
      Object.keys(patch).forEach((key) => {
        target[key] = patch[key]
      })
      // Repainting the background can silently kill contrast for the whole
      // page, so text colours follow the background's luminance.
      if (patch.background) syncTextContrast(target)
    }, { payload: { type: 'pages' }, tree: false })
  }

  function movePage(id, delta) {
    const index = state.doc.pages.findIndex((item) => item.id === id)
    if (index < 0) return false
    const nextIndex = index + delta
    if (nextIndex < 0 || nextIndex >= state.doc.pages.length) return false
    return commit('调整页面顺序', () => {
      const [pageModel] = state.doc.pages.splice(index, 1)
      state.doc.pages.splice(nextIndex, 0, pageModel)
    }, { payload: { type: 'pages' }, tree: false })
  }

  function reorderPage(id, beforeId) {
    const index = state.doc.pages.findIndex((item) => item.id === id)
    const target = state.doc.pages.findIndex((item) => item.id === beforeId)
    if (index < 0 || target < 0 || index === target) return false
    return commit('调整页面顺序', () => {
      const [pageModel] = state.doc.pages.splice(index, 1)
      const insert = state.doc.pages.findIndex((item) => item.id === beforeId)
      state.doc.pages.splice(insert < 0 ? state.doc.pages.length : insert, 0, pageModel)
    }, { payload: { type: 'pages' }, tree: false })
  }

  function setDocumentDevice(deviceId) {
    return commit('切换设备', () => {
      state.doc.device = deviceId
    })
  }

  function setDocumentName(name) {
    return commit('重命名设计', () => {
      state.doc.name = name
    }, { payload: { type: 'meta' }, tree: false })
  }

  function updateTokens(patch) {
    return commit('修改设计令牌', () => {
      state.doc.tokens = Object.assign({}, state.doc.tokens, patch)
      if (patch.colors) state.doc.tokens.colors = Object.assign({}, state.doc.tokens.colors, patch.colors)
      if (patch.radius) state.doc.tokens.radius = Object.assign({}, state.doc.tokens.radius, patch.radius)
      if (patch.typography) state.doc.tokens.typography = Object.assign({}, state.doc.tokens.typography, patch.typography)
    }, { payload: { type: 'tokens' }, tree: false })
  }

  /* ----------------------------------------------------------- notes / links */

  function addNote(point, text) {
    const note = { id: newId('note'), x: Math.round(point.x), y: Math.round(point.y), text: text || '', color: '#FFD166' }
    commit('添加备注', () => {
      state.doc.notes.push(note)
    })
    return note
  }

  function updateNote(id, patch) {
    const note = state.doc.notes.find((item) => item.id === id)
    if (!note) return false
    return commit('修改备注', () => {
      Object.assign(note, patch)
    }, { payload: { type: 'notes' }, tree: false })
  }

  function removeNote(id) {
    return commit('删除备注', () => {
      state.doc.notes = state.doc.notes.filter((item) => item.id !== id)
    }, { payload: { type: 'notes' }, tree: false })
  }

  function addInteraction(target, interaction) {
    const patch = (element) => {
      const list = element.interactions ? element.interactions.slice() : []
      list.push(Object.assign({ id: newId('act') }, interaction))
      element.interactions = list
    }
    if (target.type === 'page') {
      const pageModel = state.doc.pages.find((item) => item.id === target.id)
      if (!pageModel) return false
      const list = (pageModel.interactions || []).slice()
      list.push(Object.assign({ id: newId('act') }, interaction))
      return commit('添加页面交互', () => {
        pageModel.interactions = list
      }, { payload: { type: 'pages' }, tree: false })
    }
    const element = elementById(target.id)
    if (!element) return false
    return commit('添加交互', () => patch(element))
  }

  function updateInteraction(targetId, interactionId, patch) {
    const element = elementById(targetId)
    if (element) {
      return commit('修改交互', () => {
        element.interactions = element.interactions.map((item) => (item.id === interactionId ? Object.assign({}, item, patch) : item))
      })
    }
    const pageModel = state.doc.pages.find((item) => item.id === targetId)
    if (!pageModel) return false
    return commit('修改交互', () => {
      pageModel.interactions = (pageModel.interactions || []).map((item) => (item.id === interactionId ? Object.assign({}, item, patch) : item))
    }, { payload: { type: 'pages' }, tree: false })
  }

  function removeInteraction(targetId, interactionId) {
    const element = elementById(targetId)
    if (element) {
      return commit('删除交互', () => {
        element.interactions = element.interactions.filter((item) => item.id !== interactionId)
      })
    }
    const pageModel = state.doc.pages.find((item) => item.id === targetId)
    if (!pageModel) return false
    return commit('删除交互', () => {
      pageModel.interactions = (pageModel.interactions || []).filter((item) => item.id !== interactionId)
    }, { payload: { type: 'pages' }, tree: false })
  }

  /* ------------------------------------------------------ interaction start */

  function beginTransaction(label) {
    const before = snapshot()
    return {
      commit: () => {
        const after = snapshot()
        if (before === after) return false
        history.past.push({ label, before, at: Date.now() })
        if (history.past.length > LIMITS.historyDepth) history.past.shift()
        history.future.length = 0
        state.dirty = true
        emit({ type: 'doc', doc: state.doc })
        emit({ type: 'tree' })
        scheduleSave()
        return true
      },
      cancel: () => {
        restore(before)
      }
    }
  }

  function transaction(label, fn) {
    const tx = beginTransaction(label)
    fn()
    tx.commit()
  }

  function invertPositions(start) {
    start.forEach((item) => {
      item.element.x = item.x
      item.element.y = item.y
      item.element.w = item.w
      item.element.h = item.h
      const node = nodeForId(item.element.id)
      if (node) {
        node.style.left = `${item.x}px`
        node.style.top = `${item.y}px`
        node.style.width = `${item.w}px`
        node.style.height = `${item.h}px`
      }
    })
  }

  function commitPositions(start, label) {
    const after = start.map((item) => ({ id: item.element.id, x: item.element.x, y: item.element.y, w: item.element.w, h: item.element.h }))
    const changed = after.some((entry, index) => {
      const item = start[index]
      return entry.x !== item.x || entry.y !== item.y || entry.w !== item.w || entry.h !== item.h
    })
    if (!changed) return false
    // Rewind to the drag's starting geometry, snapshot that as the history
    // entry, then re-apply the user's result. This keeps one undo step per drag
    // without cloning the document on every pointermove.
    invertPositions(start)
    const baseline = JSON.stringify({ doc: state.doc, pageId: state.pageId, selection: state.selection })
    history.past.push({ label, before: baseline, at: Date.now() })
    if (history.past.length > LIMITS.historyDepth) history.past.shift()
    history.future.length = 0
    after.forEach((entry) => {
      const element = elementById(entry.id)
      if (!element) return
      element.x = entry.x
      element.y = entry.y
      element.w = entry.w
      element.h = entry.h
    })
    state.dirty = true
    emit({ type: 'tree' })
    scheduleSave()
    return true
  }

  function replaceDocument(nextDoc, options = {}) {
    const normalized = normalizeDocument(nextDoc)
    history.past.length = 0
    history.future.length = 0
    state.doc = normalized
    state.pageId = normalized.pages[0].id
    state.selection = []
    state.zoom = fitZoom(getDevice(normalized.pages[0].device))
    state.dirty = true
    emit({ type: 'doc', doc: state.doc })
    emit({ type: 'pages' })
    emit({ type: 'tree' })
    emit({ type: 'select', selection: [] })
    scheduleSave()
    if (options.reason) emit({ type: 'toast', message: options.reason })
    return true
  }

  function reset(options = {}) {
    return replaceDocument(createDocument(options), { reason: '已新建空白设计' })
  }

  /* ------------------------------------------------------------- view meta */

  function setZoom(value) {
    state.zoom = Math.min(4, Math.max(0.25, value))
    emit({ type: 'meta', meta: { zoom: state.zoom } })
  }

  function zoomBy(factor) {
    setZoom(state.zoom * factor)
  }

  function fitView() {
    setZoom(fitZoom(device()))
  }

  function setMode(mode) {
    state.mode = mode
    emit({ type: 'meta', meta: { mode: state.mode } })
  }

  function setViewOption(key, value) {
    if (!(key in state)) return
    state[key] = value
    emit({ type: 'meta', meta: { [key]: value } })
  }

  function setGuides(guides) {
    state.guides = guides || []
    emit({ type: 'meta', meta: { guides: state.guides } })
  }

  function setMarquee(marquee) {
    state.marquee = marquee
    emit({ type: 'meta', meta: { marquee: state.marquee } })
  }

  /* -------------------------------------------------------------- plumbing */

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function getState() {
    return state
  }

  function resize() {
    emit({ type: 'meta', meta: {} })
  }

  return {
    // reads
    getState,
    subscribe,
    page,
    device,
    artboard,
    allElements,
    elementById,
    findElement,
    selectedElements,
    selectionBox,
    hitTest,
    historyState,
    // element mutations
    addElement,
    updateElements,
    deleteElements,
    duplicateElements,
    groupElements,
    ungroupElements,
    moveInOrder,
    align,
    clampSelectionToArtboard,
    nudge,
    reparentElement,
    // selection
    select,
    selectAll,
    clearSelection,
    // pages / doc
    addPage,
    duplicatePage,
    removePage,
    setPage,
    updatePage,
    movePage,
    reorderPage,
    setDocumentDevice,
    setDocumentName,
    updateTokens,
    addNote,
    updateNote,
    removeNote,
    addInteraction,
    updateInteraction,
    removeInteraction,
    // history / io
    undo,
    redo,
    beginTransaction,
    transaction,
    commitPositions,
    replaceDocument,
    reset,
    saveLocal,
    scheduleSave,
    // view
    setZoom,
    zoomBy,
    fitView,
    setMode,
    setViewOption,
    setConfirmations(enabled) {
      confirmationsEnabled = !!enabled
    },
    confirmationsEnabled: () => confirmationsEnabled,
    setGuides,
    setMarquee,
    resize,
    // constants
    STORAGE_KEY
  }
}

/* ------------------------------------------------------------------ helper */

function requestFrame(fn) {
  if (typeof globalThis.requestAnimationFrame === 'function') return globalThis.requestAnimationFrame(fn)
  return setTimeout(fn, 16)
}

function fitZoom(device) {
  const available = typeof globalThis.innerHeight === 'number' ? globalThis.innerHeight : 900
  const target = Math.max(200, available - 240)
  const zoom = target / device.height
  return Math.min(2, Math.max(0.4, Math.round(zoom * 100) / 100))
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

/* ---------------------------------------------------------- colour helpers */

/** Relative luminance of #rgb / #rrggbb, 0 (black) → 1 (white). */
export function hexLuminance(hex) {
  const value = normalizeHex(hex)
  if (!value) return 1
  const channels = [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16) / 255)
  const linear = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

export function isLightBackground(hex) {
  return hexLuminance(hex) > 0.55
}

function normalizeHex(hex) {
  if (typeof hex !== 'string') return null
  const trimmed = hex.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
  }
  return null
}

const LIGHT_TEXT = '#1D1D1F'
const PREVIOUS_LIGHT_TEXT = '#F7F8FB'
const LIGHT_MUTED = '#6E6E76'
const PREVIOUS_LIGHT_MUTED = '#98A2B3'
const DARK_TEXT = '#F7F8FB'
const DARK_MUTED = '#98A2B3'

/**
 * Give a freshly dropped element readable text for the page it lands on. Only
 * the palette defaults are touched — anything the user authored is left alone.
 */
function makeTextReadable(element, background) {
  const light = isLightBackground(background)
  const style = element.style || {}
  if (typeof style.color === 'string' && (style.color === PREVIOUS_LIGHT_TEXT || style.color === DARK_TEXT)) {
    style.color = light ? LIGHT_TEXT : DARK_TEXT
  }
  if (typeof style.mutedColor === 'string' && (style.mutedColor === PREVIOUS_LIGHT_MUTED || style.mutedColor === DARK_MUTED)) {
    style.mutedColor = light ? LIGHT_MUTED : DARK_MUTED
  }
  if (element.type === 'button') {
    const fill = style.fill && style.fill.color
    style.color = fill && !isLightBackground(fill) ? '#FFFFFF' : '#1A1208'
  }
  ;(element.children || []).forEach((child) => makeTextReadable(child, background))
}

/** Keep a whole page readable after its background changes. */
function syncTextContrast(pageModel) {
  const light = isLightBackground(pageModel.background)
  const walk = (elements) => {
    ;(elements || []).forEach((element) => {
      const style = element.style || {}
      if (typeof style.color === 'string') {
        const wasLight = style.color === LIGHT_TEXT || style.color === PREVIOUS_LIGHT_TEXT
        const wasDark = style.color === DARK_TEXT
        if (wasLight || wasDark) style.color = light ? LIGHT_TEXT : DARK_TEXT
      }
      if (typeof style.mutedColor === 'string') {
        const wasLight = style.mutedColor === LIGHT_MUTED || style.mutedColor === PREVIOUS_LIGHT_MUTED
        const wasDark = style.mutedColor === DARK_MUTED
        if (wasLight || wasDark) style.mutedColor = light ? LIGHT_MUTED : DARK_MUTED
      }
      if (element.children && element.children.length) walk(element.children)
    })
  }
  walk(pageModel.children)
}

function reassignIds(node) {
  if (Array.isArray(node)) {
    node.forEach(reassignIds)
    return
  }
  if (node && typeof node === 'object') {
    if (typeof node.id === 'string') node.id = newId(node.type === 'group' ? 'group' : 'el')
    Object.keys(node).forEach((key) => {
      if (key === 'children' || key === 'interactions' || key === 'notes') reassignIds(node[key])
    })
  }
}

/**
 * Guard against hand-edited / outdated documents: fill in missing fields so the
 * renderer never has to defend against undefined.
 */
export function normalizeDocument(input) {
  const base = createDocument()
  const wasLegacy = isLegacyDocument(input)
  const doc = deepClone(input || base)
  doc.schema = doc.schema || SCHEMA_VERSION
  doc.name = doc.name || base.name
  doc.device = doc.device || base.device
  doc.tokens = Object.assign({}, base.tokens, doc.tokens || {})
  doc.tokens.colors = Object.assign({}, base.tokens.colors, (doc.tokens && doc.tokens.colors) || {})
  doc.notes = Array.isArray(doc.notes) ? doc.notes : []
  if (!Array.isArray(doc.pages) || !doc.pages.length) doc.pages = [createPage({ device: doc.device })]
  doc.pages = doc.pages.map((pageModel, index) => {
    const next = Object.assign({}, pageModel)
    next.id = next.id || newId('page')
    next.name = next.name || `页面 ${index + 1}`
    next.device = getDevice(next.device).id
    next.background = next.background || '#0B0D12'
    next.interactions = Array.isArray(next.interactions) ? next.interactions : []
    next.notes = next.notes || ''
    next.children = normalizeElements(next.children || [])
    return next
  })
  if (wasLegacy) migrateLegacy(doc)
  return doc
}

function isLegacyDocument(input) {
  if (!input || input.schemaVersion === 'v1.1') return false
  const colors = (input.tokens && input.tokens.colors) || {}
  if (colors.surface === LEGACY_DEFAULTS.tokens.surface) return true
  return (input.pages || []).some((page) => page.background === LEGACY_DEFAULTS.pageBackground)
}

/**
 * Old documents were authored on the dark artboard. Bring their tokens and the
 * untouched default colours up to the light system, leaving custom colours
 * exactly as the author set them.
 */
function migrateLegacy(doc) {
  doc.schemaVersion = 'v1.1'
  const colors = doc.tokens.colors || {}
  Object.entries(colors).forEach(([key, value]) => {
    const legacy = LEGACY_DEFAULTS.tokens[key]
    if (typeof value === 'string' && legacy && value.toUpperCase() === legacy.toUpperCase()) {
      colors[key] = DEFAULT_TOKENS.colors[key]
    }
  })
  doc.pages.forEach((pageModel) => {
    if (pageModel.background === LEGACY_DEFAULTS.pageBackground) pageModel.background = '#FFFFFF'
    const walk = (elements) => {
      ;(elements || []).forEach((element) => {
        const style = element.style || {}
        if (style.color === LEGACY_DEFAULTS.text) style.color = '#1D1D1F'
        if (style.color === LEGACY_DEFAULTS.muted) style.color = '#6E6E76'
        if (style.mutedColor === LEGACY_DEFAULTS.muted) style.mutedColor = '#6E6E76'
        if (style.fill && typeof style.fill.color === 'string') {
          const replacement = LEGACY_DEFAULTS.fills[style.fill.color.toUpperCase()]
          if (replacement) style.fill.color = replacement
        }
        if (style.stroke && typeof style.stroke.color === 'string') {
          const replacement = LEGACY_DEFAULTS.fills[style.stroke.color.toUpperCase()]
          if (replacement) style.stroke.color = replacement
        }
        if (typeof style.barColor === 'string') {
          const replacement = LEGACY_DEFAULTS.fills[style.barColor.toUpperCase()]
          if (replacement) style.barColor = replacement
        }
        if (element.children && element.children.length) walk(element.children)
      })
    }
    walk(pageModel.children)
  })
}

function normalizeElements(list) {
  return list.map((raw) => {
    const element = Object.assign(
      {
        rotation: 0,
        visible: true,
        locked: false,
        opacity: 1,
        children: [],
        interactions: [],
        style: { fill: { type: 'none' }, opacity: 1 }
      },
      raw
    )
    element.id = element.id || newId('el')
    element.name = element.name || element.type || '元素'
    element.x = Number(element.x) || 0
    element.y = Number(element.y) || 0
    element.w = Math.max(1, Number(element.w) || 40)
    element.h = Math.max(1, Number(element.h) || 40)
    element.style = Object.assign({ fill: { type: 'none' }, opacity: 1 }, element.style || {})
    element.interactions = Array.isArray(element.interactions) ? element.interactions : []
    element.children = Array.isArray(element.children) ? normalizeElements(element.children) : []
    return element
  })
}
