/*
 * design-studio / preview.js
 * A runtime view of the design: no selection chrome, real interaction
 * hotspots, page transitions and swipe triggers. It reuses the same renderer
 * as the canvas so what you preview is literally what you designed.
 */

import { renderTree } from './render.js'
import { getDevice } from './schema.js'

export function createPreview(context) {
  const { store, overlay, stage, titleEl } = context
  let pageId = null
  let cleanups = []
  let history = []

  function open(startPageId) {
    pageId = startPageId || store.getState().pageId
    history = []
    overlay.hidden = false
    mount(pageId, 'none')
  }

  function close() {
    overlay.hidden = true
    teardown()
    stage.innerHTML = ''
  }

  function teardown() {
    cleanups.forEach((fn) => {
      try {
        fn()
      } catch (error) {
        void error
      }
    })
    cleanups = []
  }

  function mount(id, animation) {
    teardown()
    const page = store.getState().doc.pages.find((item) => item.id === id)
    if (!page) return
    pageId = id
    const device = getDevice(page.device)
    const available = stage.getBoundingClientRect()
    const scale = Math.max(0.6, Math.min(2.4, Math.min((available.width - 80) / device.width, (available.height - 120) / device.height)))

    const frame = document.createElement('div')
    frame.className = 'preview-frame'
    frame.style.width = `${device.width}px`
    frame.style.height = `${device.height}px`
    frame.style.background = page.background || '#0B0D12'
    frame.style.borderRadius = `${device.radius}px`
    frame.style.transform = `scale(${scale})`
    frame.style.transformOrigin = 'center center'
    frame.style.position = 'relative'

    if (animation && animation !== 'none') {
      frame.animate(
        animation === 'fade'
          ? [{ opacity: 0 }, { opacity: 1 }]
          : animation === 'slide-up'
            ? [{ transform: `scale(${scale}) translateY(28px)`, opacity: 0 }, { transform: `scale(${scale})`, opacity: 1 }]
            : [{ transform: `scale(${scale}) translateX(28px)`, opacity: 0 }, { transform: `scale(${scale})`, opacity: 1 }],
        { duration: 220, easing: 'cubic-bezier(.22,.61,.36,1)' }
      )
    }

    const layer = document.createElement('div')
    layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;border-radius:inherit'
    frame.appendChild(layer)
    renderTree(layer, page.children || [], {})

    const hotzones = document.createElement('div')
    hotzones.style.cssText = 'position:absolute;inset:0'
    frame.appendChild(hotzones)

    const pageInteractions = (page.interactions || []).slice()
    collectElementInteractions(page.children || [], hotzones)

    stage.innerHTML = ''
    const shell = document.createElement('div')
    shell.style.cssText = 'position:relative;display:grid;place-items:center'
    shell.appendChild(frame)
    const badge = document.createElement('div')
    badge.className = 'preview-badge'
    badge.textContent = `${page.name} · ${device.short} ${device.width}×${device.height}`
    shell.appendChild(badge)
    stage.appendChild(shell)

    const backButton = document.createElement('button')
    backButton.className = 'btn ghost'
    backButton.style.cssText = 'position:absolute;left:16px;top:16px;display:none'
    backButton.textContent = '← 返回'
    backButton.addEventListener('click', goBack)
    shell.appendChild(backButton)
    cleanups.push(() => backButton.remove())

    titleEl.textContent = `预览 · ${store.getState().doc.name}`

    // swipes anywhere on the frame
    attachSwipe(frame, page)

    // page-level triggers
    pageInteractions.forEach((item) => {
      if ((item.trigger || 'tap') === 'enter') {
        const timer = setTimeout(() => runInteraction(item), 60)
        cleanups.push(() => clearTimeout(timer))
      }
      if (item.trigger === 'timer') {
        const timer = setTimeout(() => runInteraction(item), item.delay || 3000)
        cleanups.push(() => clearTimeout(timer))
      }
    })

    function goBack() {
      const previous = history.pop()
      if (previous) mount(previous, 'slide-right')
      else close()
    }

    if (history.length) backButton.style.display = ''

    function navigate(targetId, animation) {
      if (!targetId) return
      history.push(pageId)
      mount(targetId, animation || 'slide-left')
    }

    function runInteraction(item) {
      const action = item.action || 'navigate'
      if (action === 'back') goBack()
      else if (action === 'navigate') navigate(item.target, item.animation)
    }

    function collectElementInteractions(elements, host) {
      elements.forEach((element) => {
        if (element.visible === false) return
        if (element.type === 'group' && element.children) {
          // a group with its own interactions acts as one hotspot
          if (element.interactions && element.interactions.length) {
            host.appendChild(makeHotspot(element, element.x, element.y))
            return
          }
          collectElementInteractions(
            element.children.map((child) => Object.assign({}, child, { x: child.x + element.x, y: child.y + element.y })),
            host
          )
          return
        }
        if (element.interactions && element.interactions.length) {
          host.appendChild(makeHotspot(element, element.x, element.y))
        }
      })
    }

    function makeHotspot(element, x, y) {
      const node = document.createElement('div')
      node.className = 'preview-hotspot'
      node.style.left = `${x}px`
      node.style.top = `${y}px`
      node.style.width = `${element.w}px`
      node.style.height = `${element.h}px`
      node.title = element.name
      node.addEventListener('click', (event) => {
        event.stopPropagation()
        const primary = (element.interactions || []).find((item) => (item.trigger || 'tap') === 'tap')
        if (primary) runInteraction(primary)
      })
      return node
    }

    function attachSwipe(target, currentPage) {
      let start = null
      const onDown = (event) => {
        start = { x: event.clientX, y: event.clientY }
      }
      const onUp = (event) => {
        if (!start) return
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        start = null
        if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return
        const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
        const matches = []
        const gather = (elements) => {
          elements.forEach((element) => {
            ;(element.interactions || []).forEach((item) => {
              if (item.trigger === 'swipe' && item.direction === direction) matches.push(item)
            })
            if (element.children && element.children.length) gather(element.children)
          })
        }
        gather(currentPage.children || [])
        ;(currentPage.interactions || []).forEach((item) => {
          if (item.trigger === 'swipe' && item.direction === direction) matches.push(item)
        })
        if (matches.length) runInteraction(matches[0])
      }
      target.addEventListener('pointerdown', onDown)
      target.addEventListener('pointerup', onUp)
      cleanups.push(() => {
        target.removeEventListener('pointerdown', onDown)
        target.removeEventListener('pointerup', onUp)
      })
    }
  }

  return { open, close, isOpen: () => !overlay.hidden }
}
