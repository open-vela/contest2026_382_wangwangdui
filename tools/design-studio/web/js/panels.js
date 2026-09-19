/*
 * design-studio / panels.js
 * The four left-hand panels: INSERT (component library), LAYERS, PAGES and
 * TOKENS. Each panel renders into the shared host and subscribes to the
 * document so it stays truthful after undo/redo.
 */

import { PALETTE_GROUPS, DEVICES, getDevice } from './schema.js'
import { iconSvg } from './icons.js'

export function createPanels(context) {
  const { store, host, eyebrowEl, titleEl, interaction, toast } = context
  let current = 'insert'
  let searchTerm = ''
  const META = {
    insert: { eyebrow: 'INSERT', title: '组件库' },
    layers: { eyebrow: 'LAYERS', title: '图层' },
    pages: { eyebrow: 'PAGES', title: '页面与跳转' },
    tokens: { eyebrow: 'TOKENS', title: '设计令牌' }
  }

  function show(panel) {
    if (!META[panel]) return
    current = panel
    const meta = META[panel]
    eyebrowEl.textContent = meta.eyebrow
    titleEl.textContent = meta.title
    context.setActiveRail(panel)
    render()
  }

  function render() {
    host.innerHTML = ''
    if (current === 'insert') host.appendChild(renderInsert())
    else if (current === 'layers') host.appendChild(renderLayers())
    else if (current === 'pages') host.appendChild(renderPages())
    else host.appendChild(renderTokens())
  }

  /* ------------------------------------------------------------- INSERT */

  function renderInsert() {
    const wrap = document.createDocumentFragment()
    const search = document.createElement('div')
    search.className = 'palette-search'
    const input = document.createElement('input')
    input.type = 'search'
    input.placeholder = '搜索组件…'
    input.value = searchTerm
    input.addEventListener('input', () => {
      searchTerm = input.value.trim().toLowerCase()
      const scrollTop = host.scrollTop
      render()
      host.scrollTop = scrollTop
      const next = host.querySelector('.palette-search input')
      if (next) {
        next.focus()
        next.setSelectionRange(next.value.length, next.value.length)
      }
    })
    search.appendChild(input)
    search.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.6-4.6"/></svg>')
    wrap.appendChild(search)

    const hint = document.createElement('div')
    hint.className = 'panel-hint'
    hint.textContent = '拖到画板上放置，或在画板中心点一下组件直接插入。所有组件都可以后续改尺寸、颜色和备注。'
    wrap.appendChild(hint)

    let matches = 0
    PALETTE_GROUPS.forEach((group) => {
      const items = group.items.filter((item) => {
        if (!searchTerm) return true
        return (
          item.label.toLowerCase().includes(searchTerm) ||
          item.id.toLowerCase().includes(searchTerm) ||
          (item.hint || '').toLowerCase().includes(searchTerm) ||
          group.group.toLowerCase().includes(searchTerm)
        )
      })
      if (!items.length) return
      matches += items.length
      const section = document.createElement('div')
      section.className = 'palette-group'
      const head = document.createElement('div')
      head.className = 'palette-group-title'
      head.innerHTML = `<span>${group.group}</span><span>${items.length}</span>`
      section.appendChild(head)
      const grid = document.createElement('div')
      grid.className = 'palette-grid'
      items.forEach((item) => grid.appendChild(renderPaletteItem(item)))
      section.appendChild(grid)
      wrap.appendChild(section)
    })
    if (!matches) {
      const empty = document.createElement('div')
      empty.className = 'panel-empty'
      empty.textContent = `没有匹配「${searchTerm}」的组件。`
      wrap.appendChild(empty)
    }
    return wrap
  }

  function renderPaletteItem(item) {
    const button = document.createElement('button')
    button.className = 'palette-item'
    button.dataset.item = item.id
    button.draggable = true
    button.title = `${item.label} · ${item.hint}`
    button.innerHTML = `
      <span class="palette-preview"><span></span></span>
      <span class="palette-name">${item.label}</span>
      <span class="palette-hint">${item.hint}</span>
    `
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData(interaction.PALETTE_MIME, item.id)
      event.dataTransfer.setData('text/plain', item.label)
      event.dataTransfer.effectAllowed = 'copy'
      button.classList.add('is-dragging')
    })
    button.addEventListener('dragend', () => button.classList.remove('is-dragging'))
    button.addEventListener('click', () => {
      const device = store.device()
      const point = { x: device.width / 2, y: device.height / 2 }
      const element = store.addElement(item.id, point, { name: item.label })
      toast(`已添加「${item.label}」`, 'ok')
      void element
    })
    return button
  }

  /* ------------------------------------------------------------- LAYERS */

  function renderLayers() {
    const wrap = document.createDocumentFragment()
    const page = store.page()
    const list = page.children || []
    if (!list.length) {
      const empty = document.createElement('div')
      empty.className = 'panel-empty'
      empty.innerHTML = '这个页面还没有元素。<br>从「组件」面板拖一个进来吧。'
      wrap.appendChild(empty)
      return wrap
    }
    const hint = document.createElement('div')
    hint.className = 'panel-hint'
    hint.textContent = '列表自上而下对应画板从前到后的层级。把元素拖到组合上可以放进组合里。'
    wrap.appendChild(hint)

    const tree = document.createElement('div')
    tree.className = 'layer-tree'
    ;[...list].reverse().forEach((element) => tree.appendChild(renderLayerRow(element, 0)))
    wrap.appendChild(tree)
    return wrap
  }

  function renderLayerRow(element, depth) {
    const container = document.createDocumentFragment()
    const row = document.createElement('div')
    row.className = 'layer-row'
    if (element.type === 'group') row.classList.add('is-group')
    if (element.visible === false) row.classList.add('is-hidden')
    const selection = store.getState().selection
    if (selection.includes(element.id)) row.classList.add('is-selected')
    row.dataset.layerId = element.id
    row.draggable = true
    row.style.marginLeft = `${depth * 6}px`

    const type = document.createElement('span')
    type.className = 'layer-type'
    type.textContent = typeGlyph(element.type)
    row.appendChild(type)

    const name = document.createElement('span')
    name.className = 'layer-name'
    name.textContent = element.name
    let renameClicks = 0
    let renameTimer = null
    name.addEventListener('click', () => {
      renameClicks += 1
      clearTimeout(renameTimer)
      renameTimer = setTimeout(() => {
        renameClicks = 0
      }, 320)
      if (renameClicks >= 2) {
        renameClicks = 0
        startRename(name, element)
      }
    })
    row.appendChild(name)

    if (element.note) {
      const flag = document.createElement('span')
      flag.className = 'layer-flag'
      flag.textContent = '备注'
      flag.title = element.note
      row.appendChild(flag)
    }
    if (element.locked) {
      const flag = document.createElement('span')
      flag.className = 'layer-flag'
      flag.textContent = '锁'
      row.appendChild(flag)
    }

    const actions = document.createElement('span')
    actions.className = 'layer-actions'
    actions.appendChild(miniButton(element.visible === false ? '◌' : '◉', element.visible === false ? '显示' : '隐藏', (event) => {
      event.stopPropagation()
      store.updateElements([element.id], { visible: element.visible === false }, '切换可见性')
      render()
    }))
    actions.appendChild(miniButton(element.locked ? '⊘' : '⊙', element.locked ? '解锁' : '锁定', (event) => {
      event.stopPropagation()
      store.updateElements([element.id], { locked: !element.locked }, '切换锁定')
      render()
    }))
    actions.appendChild(miniButton('✕', '删除', (event) => {
      event.stopPropagation()
      store.deleteElements([element.id])
      render()
    }))
    row.appendChild(actions)

    row.addEventListener('click', (event) => {
      store.select([element.id], { add: event.shiftKey || event.metaKey || event.ctrlKey })
    })
    row.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/x-layer-id', element.id)
      event.dataTransfer.effectAllowed = 'move'
    })
    row.addEventListener('dragover', (event) => {
      const dragId = readDragId(event)
      if (!dragId || dragId === element.id) return
      if (!canHost(element)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      row.style.borderColor = 'var(--c-accent-line)'
    })
    row.addEventListener('dragleave', () => {
      row.style.borderColor = ''
    })
    row.addEventListener('drop', (event) => {
      const dragId = readDragId(event)
      row.style.borderColor = ''
      if (!dragId || dragId === element.id) return
      event.preventDefault()
      store.reparentElement(dragId, element.id)
      render()
    })

    container.appendChild(row)
    if (element.children && element.children.length) {
      const children = document.createElement('div')
      children.className = 'layer-children'
      ;[...element.children].reverse().forEach((child) => children.appendChild(renderLayerRow(child, depth + 1)))
      container.appendChild(children)
    }
    return container
  }

  function canHost(element) {
    return element.type === 'group' || element.type === 'container'
  }

  function readDragId(event) {
    if (!event.dataTransfer) return ''
    return event.dataTransfer.getData('text/x-layer-id') || ''
  }

  function miniButton(glyph, title, handler) {
    const button = document.createElement('button')
    button.className = 'layer-mini'
    button.textContent = glyph
    button.title = title
    button.addEventListener('click', handler)
    return button
  }

  function startRename(labelNode, element) {
    const input = document.createElement('input')
    input.className = 'text-input'
    input.value = element.name
    input.style.height = '22px'
    input.style.fontSize = '11px'
    labelNode.replaceWith(input)
    input.focus()
    input.select()
    const finish = () => {
      const value = input.value.trim() || element.type
      store.updateElements([element.id], { name: value }, '重命名元素')
      render()
    }
    input.addEventListener('blur', finish)
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') input.blur()
      if (event.key === 'Escape') {
        input.value = element.name
        input.blur()
      }
      event.stopPropagation()
    })
  }

  /* -------------------------------------------------------------- PAGES */

  function renderPages() {
    const wrap = document.createDocumentFragment()
    const doc = store.getState().doc
    const hint = document.createElement('div')
    hint.className = 'panel-hint'
    hint.textContent = '每个页面是一块独立画板。点击标签切换页面，页面之间的跳转在元素或页面的「交互」里定义。'
    wrap.appendChild(hint)

    doc.pages.forEach((page, index) => {
      const device = getDevice(page.device)
      const card = document.createElement('div')
      card.className = 'page-card'
      card.draggable = true
      if (page.id === store.getState().pageId) card.classList.add('is-active')
      card.dataset.pageId = page.id

      const thumb = document.createElement('div')
      thumb.className = 'page-thumb'
      thumb.dataset.shape = device.shape
      const shape = document.createElement('span')
      const scale = 26 / Math.max(device.width, device.height)
      shape.style.width = `${Math.max(8, Math.round(device.width * scale))}px`
      shape.style.height = `${Math.max(8, Math.round(device.height * scale))}px`
      thumb.appendChild(shape)
      card.appendChild(thumb)

      const info = document.createElement('div')
      info.className = 'page-card-info'
      const name = document.createElement('div')
      name.className = 'page-card-name'
      name.textContent = `${index + 1}. ${page.name}`
      info.appendChild(name)
      const sub = document.createElement('div')
      sub.className = 'page-card-sub'
      const flows = countFlows(page)
      sub.textContent = `${device.short} ${device.width}×${device.height} · ${countElements(page.children)} 元素${flows ? ` · ${flows} 跳转` : ''}`
      info.appendChild(sub)
      card.appendChild(info)

      const actions = document.createElement('div')
      actions.className = 'page-card-actions'
      actions.appendChild(pageMini('⧉', '复制页面', (event) => {
        event.stopPropagation()
        store.duplicatePage(page.id)
      }))
      actions.appendChild(pageMini('↑', '前移', (event) => {
        event.stopPropagation()
        store.movePage(page.id, -1)
      }))
      actions.appendChild(pageMini('↓', '后移', (event) => {
        event.stopPropagation()
        store.movePage(page.id, 1)
      }))
      actions.appendChild(pageMini('✕', '删除页面', (event) => {
        event.stopPropagation()
        if (doc.pages.length <= 1) {
          toast('至少要保留一个页面', 'warn')
          return
        }
        store.removePage(page.id)
      }))
      card.appendChild(actions)

      card.addEventListener('click', () => store.setPage(page.id))
      card.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/x-page-id', page.id)
        event.dataTransfer.effectAllowed = 'move'
      })
      card.addEventListener('dragover', (event) => {
        if (!event.dataTransfer) return
        const dragId = event.dataTransfer.getData('text/x-page-id')
        if (dragId && dragId !== page.id) {
          event.preventDefault()
          card.style.borderColor = 'var(--c-accent-line)'
        }
      })
      card.addEventListener('dragleave', () => {
        card.style.borderColor = ''
      })
      card.addEventListener('drop', (event) => {
        card.style.borderColor = ''
        const dragId = event.dataTransfer && event.dataTransfer.getData('text/x-page-id')
        if (!dragId || dragId === page.id) return
        event.preventDefault()
        store.reorderPage(dragId, page.id)
      })
      wrap.appendChild(card)
    })

    const addButton = document.createElement('button')
    addButton.className = 'tab-add'
    addButton.style.width = '100%'
    addButton.style.height = '30px'
    addButton.textContent = '+ 新建页面（沿用当前设备）'
    addButton.addEventListener('click', () => {
      store.addPage({ device: store.page().device })
      toast('已新建页面', 'ok')
    })
    wrap.appendChild(addButton)

    /* flow overview */
    const flowSection = document.createElement('div')
    flowSection.className = 'panel-section'
    flowSection.style.marginTop = '14px'
    const flowTitle = document.createElement('div')
    flowTitle.className = 'panel-section-title'
    flowTitle.innerHTML = '<span>跳转总览</span>'
    flowSection.appendChild(flowTitle)
    const flows = collectAllFlows(doc)
    if (!flows.length) {
      const empty = document.createElement('div')
      empty.className = 'note-card'
      empty.textContent = '还没有定义跳转。选中一个按钮或元素，在右侧「交互 / 跳转」里添加。'
      flowSection.appendChild(empty)
    } else {
      flows.forEach((flow) => {
        const row = document.createElement('div')
        row.className = 'flow-row'
        row.innerHTML = `<span class="flow-trigger">${flow.triggerLabel}</span><span class="flow-text">${flow.text}</span>`
        flowSection.appendChild(row)
      })
    }
    wrap.appendChild(flowSection)

    /* current page settings */
    const page = store.page()
    const device = getDevice(page.device)
    const settings = document.createElement('div')
    settings.className = 'panel-section'
    settings.innerHTML = '<div class="panel-section-title"><span>当前页面</span></div>'

    const nameRow = document.createElement('div')
    nameRow.className = 'field'
    const nameLabel = document.createElement('label')
    nameLabel.textContent = '页面名'
    nameRow.appendChild(nameLabel)
    const nameInput = document.createElement('input')
    nameInput.className = 'text-input'
    nameInput.value = page.name
    nameInput.addEventListener('blur', () => store.updatePage(page.id, { name: nameInput.value.trim() || '页面' }, '重命名页面'))
    nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') nameInput.blur()
      event.stopPropagation()
    })
    nameRow.appendChild(nameInput)
    settings.appendChild(nameRow)

    const deviceRow = document.createElement('div')
    deviceRow.className = 'field'
    const deviceLabel = document.createElement('label')
    deviceLabel.textContent = '设备'
    deviceRow.appendChild(deviceLabel)
    const deviceSelect = document.createElement('select')
    deviceSelect.className = 'select-input'
    DEVICES.forEach((option) => {
      const node = document.createElement('option')
      node.value = option.id
      node.textContent = `${option.short} ${option.width}×${option.height}`
      if (option.id === device.id) node.selected = true
      deviceSelect.appendChild(node)
    })
    deviceSelect.addEventListener('change', () => {
      store.updatePage(page.id, { device: deviceSelect.value }, '切换设备')
      store.fitView()
    })
    deviceRow.appendChild(deviceSelect)
    settings.appendChild(deviceRow)

    const bgRow = document.createElement('div')
    bgRow.className = 'field'
    const bgLabel = document.createElement('label')
    bgLabel.textContent = '背景'
    bgRow.appendChild(bgLabel)
    const bgWrap = document.createElement('div')
    bgWrap.className = 'color-field'
    const bgPicker = document.createElement('input')
    bgPicker.type = 'color'
    bgPicker.value = normalizeHex(page.background)
    const bgText = document.createElement('input')
    bgText.className = 'text-input'
    bgText.value = (page.background || '').toUpperCase()
    bgPicker.addEventListener('change', () => store.updatePage(page.id, { background: bgPicker.value }, '修改背景'))
    bgText.addEventListener('blur', () => {
      const hex = normalizeHex(bgText.value)
      store.updatePage(page.id, { background: hex }, '修改背景')
      bgText.value = hex.toUpperCase()
    })
    bgText.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') bgText.blur()
      event.stopPropagation()
    })
    bgWrap.appendChild(bgPicker)
    bgWrap.appendChild(bgText)
    bgRow.appendChild(bgWrap)
    settings.appendChild(bgRow)

    const noteRow = document.createElement('div')
    noteRow.className = 'field'
    noteRow.style.alignItems = 'flex-start'
    const noteLabel = document.createElement('label')
    noteLabel.textContent = '页面说明'
    noteRow.appendChild(noteLabel)
    const noteInput = document.createElement('textarea')
    noteInput.className = 'textarea-input'
    noteInput.placeholder = '这个页面负责什么？会写入导出 JSON 的 page.note。'
    noteInput.value = page.notes || ''
    noteInput.addEventListener('blur', () => store.updatePage(page.id, { notes: noteInput.value }, '修改页面说明'))
    noteInput.addEventListener('keydown', (event) => event.stopPropagation())
    noteRow.appendChild(noteInput)
    settings.appendChild(noteRow)
    wrap.appendChild(settings)

    const pageInteractions = document.createElement('div')
    pageInteractions.className = 'panel-section'
    pageInteractions.innerHTML = '<div class="panel-section-title"><span>页面级交互</span></div>'
    const list = page.interactions || []
    if (!list.length) {
      const empty = document.createElement('div')
      empty.className = 'note-card'
      empty.textContent = '没有页面级交互。批量编辑页面级交互请在右侧属性面板切换到页面目标（选中空画板时也会显示）。'
      pageInteractions.appendChild(empty)
    } else {
      list.forEach((item) => {
        const row = document.createElement('div')
        row.className = 'flow-row'
        row.innerHTML = `<span class="flow-trigger">${triggerLabel(item.trigger)}</span><span class="flow-text">${escapeHtml(describeFlow(item, doc))}</span>`
        pageInteractions.appendChild(row)
      })
    }
    wrap.appendChild(pageInteractions)
    return wrap
  }

  function pageMini(glyph, title, handler) {
    const button = document.createElement('button')
    button.className = 'layer-mini'
    button.textContent = glyph
    button.title = title
    button.addEventListener('click', handler)
    return button
  }

  /* ------------------------------------------------------------- TOKENS */

  function renderTokens() {
    const wrap = document.createDocumentFragment()
    const tokens = store.getState().doc.tokens || {}
    const hint = document.createElement('div')
    hint.className = 'panel-hint'
    hint.textContent = '设计令牌是导出 JSON 里的唯一色板与圆角来源。agent 会优先复用这里的值，而不是自己发明颜色。'
    wrap.appendChild(hint)

    const colorSection = document.createElement('div')
    colorSection.className = 'panel-section'
    colorSection.innerHTML = '<div class="panel-section-title"><span>颜色</span></div>'
    Object.entries(tokens.colors || {}).forEach(([key, value]) => {
      const row = document.createElement('div')
      row.className = 'token-row'
      const label = document.createElement('span')
      label.className = 'token-label'
      label.textContent = key
      row.appendChild(label)
      const picker = document.createElement('input')
      picker.type = 'color'
      picker.value = normalizeHex(value)
      const text = document.createElement('input')
      text.type = 'text'
      text.value = String(value).toUpperCase()
      picker.addEventListener('change', () => {
        store.updateTokens({ colors: { [key]: picker.value } })
        text.value = picker.value.toUpperCase()
      })
      text.addEventListener('blur', () => {
        const hex = normalizeHex(text.value)
        store.updateTokens({ colors: { [key]: hex } })
        text.value = hex.toUpperCase()
        picker.value = hex
      })
      text.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') text.blur()
        event.stopPropagation()
      })
      row.appendChild(picker)
      row.appendChild(text)
      colorSection.appendChild(row)
    })
    wrap.appendChild(colorSection)

    const radiusSection = document.createElement('div')
    radiusSection.className = 'panel-section'
    radiusSection.innerHTML = '<div class="panel-section-title"><span>圆角</span></div>'
    Object.entries(tokens.radius || {}).forEach(([key, value]) => {
      const row = document.createElement('div')
      row.className = 'token-row'
      const label = document.createElement('span')
      label.className = 'token-label'
      label.textContent = key
      row.appendChild(label)
      const input = document.createElement('input')
      input.type = 'text'
      input.className = 'text-input'
      input.style.width = '84px'
      input.value = String(value)
      input.addEventListener('blur', () => {
        const next = value === 999 ? Math.round(Number(input.value)) || 0 : Number(input.value)
        if (!isFinite(next)) {
          input.value = String(value)
          return
        }
        store.updateTokens({ radius: { [key]: next } })
      })
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') input.blur()
        event.stopPropagation()
      })
      row.appendChild(input)
      radiusSection.appendChild(row)
    })
    wrap.appendChild(radiusSection)

    const typeSection = document.createElement('div')
    typeSection.className = 'panel-section'
    typeSection.innerHTML = '<div class="panel-section-title"><span>排版</span></div>'
    Object.entries((tokens.typography && tokens.typography.scale) || {}).forEach(([key, value]) => {
      const row = document.createElement('div')
      row.className = 'token-row'
      const label = document.createElement('span')
      label.className = 'token-label'
      label.textContent = key
      row.appendChild(label)
      const input = document.createElement('input')
      input.type = 'text'
      input.className = 'text-input'
      input.style.width = '84px'
      input.value = String(value)
      input.addEventListener('blur', () => {
        const next = Number(input.value)
        if (!isFinite(next) || next <= 0) {
          input.value = String(value)
          return
        }
        store.updateTokens({ typography: { scale: { [key]: next } } })
      })
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') input.blur()
        event.stopPropagation()
      })
      row.appendChild(input)
      typeSection.appendChild(row)
    })
    wrap.appendChild(typeSection)

    const docSection = document.createElement('div')
    docSection.className = 'panel-section'
    docSection.innerHTML = '<div class="panel-section-title"><span>文档</span></div>'
    const applyRow = document.createElement('button')
    applyRow.className = 'btn ghost'
    applyRow.style.width = '100%'
    applyRow.textContent = '把主色应用到所有主按钮'
    applyRow.addEventListener('click', () => {
      const primary = (store.getState().doc.tokens.colors || {}).primary || '#FF8A3D'
      const ids = []
      const walk = (elements) => {
        elements.forEach((element) => {
          if (element.type === 'button') ids.push(element.id)
          if (element.children && element.children.length) walk(element.children)
        })
      }
      walk(store.page().children || [])
      if (!ids.length) {
        toast('当前页面没有按钮', 'warn')
        return
      }
      store.updateElements(ids, { style: { fill: { type: 'solid', color: primary } } }, '应用主色')
      toast(`已把主色应用到 ${ids.length} 个按钮`, 'ok')
    })
    docSection.appendChild(applyRow)
    wrap.appendChild(docSection)
    return wrap
  }

  /* ------------------------------------------------------------- helpers */

  function countElements(elements) {
    let count = 0
    const walk = (list) => {
      list.forEach((element) => {
        count += 1
        if (element.children && element.children.length) walk(element.children)
      })
    }
    walk(elements || [])
    return count
  }

  function countFlows(page) {
    let count = (page.interactions || []).length
    const walk = (elements) => {
      elements.forEach((element) => {
        count += (element.interactions || []).length
        if (element.children && element.children.length) walk(element.children)
      })
    }
    walk(page.children || [])
    return count
  }

  function collectAllFlows(doc) {
    const flows = []
    doc.pages.forEach((page) => {
      const walk = (elements) => {
        elements.forEach((element) => {
          ;(element.interactions || []).forEach((item) => {
            flows.push({ triggerLabel: triggerLabel(item.trigger), text: `${element.name} → ${describeFlow(item, doc)}` })
          })
          if (element.children && element.children.length) walk(element.children)
        })
      }
      walk(page.children || [])
      ;(page.interactions || []).forEach((item) => {
        flows.push({ triggerLabel: triggerLabel(item.trigger), text: `${page.name}（页面）→ ${describeFlow(item, doc)}` })
      })
    })
    return flows
  }

  function describeFlow(item, doc) {
    const action = item.action || 'navigate'
    if (action === 'back') return '返回上一页'
    if (action === 'none') return '无动作'
    const target = doc.pages.find((page) => page.id === item.target)
    return target ? `跳转到「${target.name}」` : '未指定目标页'
  }

  function triggerLabel(trigger) {
    return (
      {
        tap: '点击',
        doubleTap: '双击',
        longPress: '长按',
        swipe: '滑动',
        enter: '进入',
        timer: '定时'
      }[trigger] || '点击'
    )
  }

  function typeGlyph(type) {
    return (
      {
        group: '▣',
        text: 'T',
        button: '⬭',
        container: '▢',
        ellipse: '◯',
        ring: '◎',
        line: '―',
        progress: '▬',
        chart: '▤',
        iconSlot: '✦',
        listRow: '☰',
        honeycomb: '⬡'
      }[type] || '▪'
    )
  }

  return { show, render, getCurrent: () => current }
}

/* ---------------------------------------------------------------- helpers */

function normalizeHex(value) {
  if (typeof value !== 'string') return '#000000'
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase()
  }
  return '#000000'
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function deviceMeta(id) {
  return getDevice(id)
}

export function paletteIconFor() {
  return iconSvg('plus', { strokeWidth: 1.4 })
}
