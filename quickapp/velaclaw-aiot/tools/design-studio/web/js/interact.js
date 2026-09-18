/*
 * design-studio / interact.js
 * ---------------------------------------------------------------------------
 * All direct manipulation: drag to move, eight handles to resize, marquee
 * select, space-drag to pan, wheel to zoom, drag-and-drop from the palette,
 * double-click to drill in / edit text, and a right-click menu.
 *
 * The module owns the *gesture*, the store owns the *document*. During a drag
 * the transform is applied straight to the DOM for immediate feedback, and a
 * single history entry is committed on pointer up.
 */

import { RESIZE_HANDLES, boundingBox, clampToArtboard, screenDeltaToLocal, snapPosition, resizeBox, intersects } from './geometry.js'
import { elementNode } from './render.js'

const PALETTE_MIME = 'application/x-design-studio-palette'

export function createInteraction(options) {
  const { store, viewport, panLayer, artboard, marqueeEl } = options

  let gesture = null
  let spaceDown = false
  let pan = { x: 0, y: 0 }

  /* ------------------------------------------------------------ utilities */

  function zoom() {
    return store.getState().zoom
  }

  function toArtboardPoint(event) {
    const rect = artboard.getBoundingClientRect()
    const scale = zoom()
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    }
  }

  function staticBoxes(excludeIds) {
    const excluded = new Set(excludeIds || [])
    const boxes = []
    const walk = (elements) => {
      elements.forEach((element) => {
        if (excluded.has(element.id) || element.visible === false) return
        boxes.push(boundingBox(element))
        if (element.children && element.children.length) walk(element.children)
      })
    }
    walk(store.page().children || [])
    return boxes
  }

  function paint(element) {
    const node = elementNode(element)
    if (!node) {
      options.requestRender()
      return
    }
    if (element.rotation) node.style.transform = `rotate(${element.rotation}deg)`
    node.style.left = `${element.x}px`
    node.style.top = `${element.y}px`
    node.style.width = `${element.w}px`
    node.style.height = `${element.h}px`
  }

  function paintMany(pairs) {
    pairs.forEach((pair) => paint(pair.element))
  }

  function refreshOverlay() {
    options.refreshOverlay()
  }

  /* --------------------------------------------------------------- select */

  function handleElementPointerDown(event, hit) {
    const element = hit.element
    const additive = event.shiftKey || event.metaKey || event.ctrlKey
    const selected = store.getState().selection.includes(element.id)
    if (!selected || additive) store.select([element.id], { add: additive })
    if (element.locked) return

    const elements = store.selectedElements().filter((item) => !item.locked)
    if (!elements.length) return
    const start = elements.map((item) => ({ element: item, x: item.x, y: item.y, w: item.w, h: item.h, rotation: item.rotation }))
    const origin = toArtboardPoint(event)
    gesture = {
      kind: 'move',
      start,
      origin,
      pointerId: event.pointerId,
      moved: false,
      additive
    }
    capture(event.pointerId)
    event.preventDefault()
  }

  function handleHandlePointerDown(event, handle) {
    const elements = store.selectedElements().filter((item) => !item.locked)
    if (!elements.length) return
    const start = elements.map((item) => ({ element: item, x: item.x, y: item.y, w: item.w, h: item.h, rotation: item.rotation }))
    beginHandleGesture(event, handle, start)
  }

  /** Public entry point: the overlay calls this once a resize handle is grabbed. */
  function beginHandleGesture(event, handle, start) {
    gesture = {
      kind: 'resize',
      handle,
      start,
      origin: toArtboardPoint(event),
      pointerId: event.pointerId,
      moved: false
    }
    capture(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  }

  function capture(pointerId) {
    try {
      viewport.setPointerCapture(pointerId)
    } catch (error) {
      void error
    }
    bindWindowGesture()
  }

  /**
   * Once a gesture starts, listen on the window too: a pointer that briefly
   * leaves the viewport, or a handle that gets re-created mid-drag, still ends
   * the gesture cleanly.
   */
  function bindWindowGesture() {
    if (bindWindowGesture.bound) return
    bindWindowGesture.bound = true
    const move = (event) => {
      if (gesture && gesture.pointerId === event.pointerId) moveGesture(event)
    }
    const up = (event) => {
      if (gesture && gesture.pointerId === event.pointerId) endGesture(event)
    }
    bindWindowGesture.handlers = { move, up }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  function handleSurfacePointerDown(event) {
    if (event.button === 1 || spaceDown || event.altKey) {
      gesture = { kind: 'pan', start: { x: event.clientX, y: event.clientY }, pan: { ...pan }, pointerId: event.pointerId }
      viewport.classList.add('is-panning')
      capture(event.pointerId)
      event.preventDefault()
      return
    }
    if (event.button !== 0) return
    const hit = store.hitTest(toArtboardPoint(event))
    if (hit) {
      handleElementPointerDown(event, hit)
      return
    }
    const origin = toArtboardPoint(event)
    gesture = { kind: 'marquee', origin, pointerId: event.pointerId, additive: event.shiftKey }
    if (!event.shiftKey) store.clearSelection()
    capture(event.pointerId)
    event.preventDefault()
  }

  /* ---------------------------------------------------------------- move */

  function moveGesture(event) {
    const point = toArtboardPoint(event)
    const dx = point.x - gesture.origin.x
    const dy = point.y - gesture.origin.y
    if (!gesture.moved && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
    gesture.moved = true

    if (gesture.kind === 'move') {
      const snap = store.getState().snapEnabled
      const art = store.artboard()
      const primary = gesture.start[0]
      const box = { x: primary.x + dx, y: primary.y + dy, w: primary.w, h: primary.h }
      let snapped = { x: box.x, y: box.y, guides: [] }
      if (snap) {
        const boxes = staticBoxes(gesture.start.map((item) => item.element.id))
        snapped = snapPosition(box, boxes, { artboard: art, threshold: 5 / zoom() })
      }
      const finalDx = snapped.x - primary.x
      const finalDy = snapped.y - primary.y
      paintMany(
        gesture.start.map((item) => {
          item.element.x = Math.round(item.x + finalDx)
          item.element.y = Math.round(item.y + finalDy)
          return item
        })
      )
      store.setGuides(snapped.guides)
      refreshOverlay()
      return
    }

    if (gesture.kind === 'resize') {
      const local = screenDeltaToLocal({ x: dx, y: dy }, gesture.start[0].rotation || 0)
      const art = store.artboard()
      gesture.start.forEach((item) => {
        const next = resizeBox({ x: item.x, y: item.y, w: item.w, h: item.h }, gesture.handle, local)
        item.element.w = Math.max(2, Math.round(next.w))
        item.element.h = Math.max(2, Math.round(next.h))
        item.element.x = Math.round(next.x)
        item.element.y = Math.round(next.y)
        if (store.getState().snapEnabled && gesture.start.length === 1) {
          const clamped = clampToArtboard(
            { x: item.element.x, y: item.element.y, w: item.element.w, h: item.element.h },
            { width: art.width, height: art.height }
          )
          if (gesture.handle.includes('w')) item.element.w += item.element.x - clamped.x
          if (gesture.handle.includes('n')) item.element.h += item.element.y - clamped.y
          item.element.x = clamped.x
          item.element.y = clamped.y
        }
      })
      paintMany(gesture.start)
      refreshOverlay()
      return
    }

    if (gesture.kind === 'marquee') {
      const box = {
        x: Math.min(gesture.origin.x, point.x),
        y: Math.min(gesture.origin.y, point.y),
        w: Math.abs(point.x - gesture.origin.x),
        h: Math.abs(point.y - gesture.origin.y)
      }
      store.setMarquee(box)
      const inside = (store.page().children || [])
        .filter((element) => element.visible !== false && intersects(box, boundingBox(element)))
        .map((element) => element.id)
      store.select(inside, { add: gesture.additive })
      return
    }

    if (gesture.kind === 'pan') {
      pan = { x: gesture.pan.x + (event.clientX - gesture.start.x), y: gesture.pan.y + (event.clientY - gesture.start.y) }
      applyPan()
    }
  }

  function endGesture(event) {
    if (!gesture) return
    const current = gesture
    gesture = null
    viewport.classList.remove('is-panning')
    if (event && viewport.hasPointerCapture && viewport.hasPointerCapture(event.pointerId)) {
      try {
        viewport.releasePointerCapture(event.pointerId)
      } catch (error) {
        void error
      }
    }
    store.setGuides([])
    store.setMarquee(null)
    if (current.kind === 'move' && current.moved) {
      store.commitPositions(current.start, '移动元素')
      refreshOverlay()
      return
    }
    if (current.kind === 'resize' && current.moved) {
      store.commitPositions(current.start, '调整尺寸')
      refreshOverlay()
      return
    }
    if (current.kind === 'marquee') {
      marqueeEl.hidden = true
      return
    }
    if (current.kind === 'pan') applyPan()
  }

  function applyPan() {
    panLayer.style.transform = `translate3d(${Math.round(pan.x)}px, ${Math.round(pan.y)}px, 0)`
    panLayer.dataset.panX = String(Math.round(pan.x))
    panLayer.dataset.panY = String(Math.round(pan.y))
  }

  /* --------------------------------------------------------------- wheel */

  function handleWheel(event) {
    const state = store.getState()
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      const factor = Math.exp(-event.deltaY * 0.0016)
      store.setZoom(state.zoom * factor)
      keepPointStable(event)
      return
    }
    if (event.shiftKey) {
      event.preventDefault()
      pan = { x: pan.x - event.deltaY, y: pan.y }
      applyPan()
      return
    }
    // Plain wheel scrolls the viewport; that keeps the trackpad feel natural.
    pan = { x: pan.x - event.deltaX, y: pan.y - event.deltaY }
    applyPan()
    if (Math.abs(event.deltaX) > 0 || Math.abs(event.deltaY) > 0) event.preventDefault()
  }

  function keepPointStable(event) {
    const rect = viewport.getBoundingClientRect()
    const cx = event.clientX - rect.left - rect.width / 2
    const cy = event.clientY - rect.top - rect.height / 2
    const previous = Number(panLayer.dataset.lastZoom || store.getState().zoom)
    const ratio = store.getState().zoom / (previous || 1)
    pan = { x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio }
    panLayer.dataset.lastZoom = String(store.getState().zoom)
    applyPan()
  }

  /* ---------------------------------------------------- double-click drill */

  function handleDoubleClick(event) {
    const point = toArtboardPoint(event)
    const deep = store.hitTest(point, { deep: true })
    if (!deep) {
      // double-click on empty space drops a text element, like a slide tool
      const element = store.addElement('label', point, { name: '文本' })
      store.select(element.id)
      options.beginTextEdit(element.id)
      return
    }
    if (deep.element.type === 'group') {
      store.select(deep.element.id)
      return
    }
    if (deep.element.type === 'text' || deep.element.type === 'button' || deep.element.type === 'listRow') {
      store.select(deep.element.id)
      options.beginTextEdit(deep.element.id)
      return
    }
    store.select(deep.element.id)
  }

  /* --------------------------------------------------- palette drag & drop */

  function handleDragOver(event) {
    if (!event.dataTransfer) return
    const hasPalette = Array.from(event.dataTransfer.types || []).includes(PALETTE_MIME)
    if (!hasPalette) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(event) {
    const paletteId = event.dataTransfer && event.dataTransfer.getData(PALETTE_MIME)
    if (!paletteId) return
    event.preventDefault()
    const point = toArtboardPoint(event)
    const element = store.addElement(paletteId, point)
    store.select(element.id)
    options.refreshOverlay()
  }

  /* ------------------------------------------------------------ resizing hooks */

  function buildHandles(box, host) {
    RESIZE_HANDLES.forEach((handle) => {
      const node = document.createElement('div')
      node.className = 'ov-handle'
      node.dataset.handle = handle
      const x = handle.includes('w') ? 0 : handle.includes('e') ? box.w : box.w / 2
      const y = handle.includes('n') ? 0 : handle.includes('s') ? box.h : box.h / 2
      node.style.left = `${box.x + x}px`
      node.style.top = `${box.y + y}px`
      node.addEventListener('pointerdown', (event) => handleHandlePointerDown(event, handle))
      host.appendChild(node)
    })
  }

  function attach() {
    viewport.addEventListener('mousedown', (event) => {
      if (event.button === 1) event.preventDefault()
    })
    viewport.addEventListener('pointerdown', handleSurfacePointerDown)
    viewport.addEventListener('pointermove', (event) => {
      if (gesture && gesture.pointerId === event.pointerId) moveGesture(event)
    })
    viewport.addEventListener('pointerup', (event) => {
      if (gesture && gesture.pointerId === event.pointerId) endGesture(event)
    })
    viewport.addEventListener('pointercancel', (event) => {
      if (gesture && gesture.pointerId === event.pointerId) endGesture(event)
    })
    viewport.addEventListener('dblclick', handleDoubleClick)
    viewport.addEventListener('wheel', handleWheel, { passive: false })
    viewport.addEventListener('dragover', handleDragOver)
    viewport.addEventListener('drop', handleDrop)
    viewport.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      const hit = store.hitTest(toArtboardPoint(event))
      if (hit) {
        if (!store.getState().selection.includes(hit.element.id)) store.select(hit.element.id)
        options.openContextMenu(event, hit.element)
      } else {
        options.openContextMenu(event, null)
      }
    })

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space' && !isTypingTarget(event.target)) {
        spaceDown = true
        viewport.style.cursor = 'grab'
        event.preventDefault()
      }
    })
    window.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        spaceDown = false
        viewport.style.cursor = ''
      }
    })
  }

  return {
    attach,
    beginHandleGesture,
    buildHandles,
    applyPan,
    getPan: () => ({ ...pan }),
    setPan: (next) => {
      pan = { ...next }
      applyPan()
    },
    isGesturing: () => !!gesture,
    toArtboardPoint,
    PALETTE_MIME
  }
}

function isTypingTarget(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}
