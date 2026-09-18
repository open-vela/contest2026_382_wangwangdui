/*
 * design-studio / inspector.js
 * ---------------------------------------------------------------------------
 * The property editor. It rebuilds its DOM only when the *selection* changes,
 * and pushes live values into existing inputs while the user drags things on
 * the canvas. Numeric fields scrub when you drag their label, the way a design
 * tool should feel.
 */

import { iconList, iconSvg } from './icons.js'

const TRIGGERS = [
  { id: 'tap', label: '点击' },
  { id: 'doubleTap', label: '双击' },
  { id: 'longPress', label: '长按' },
  { id: 'swipe', label: '滑动' },
  { id: 'enter', label: '进入页面' },
  { id: 'timer', label: '定时器' }
]

const DIRECTIONS = [
  { id: 'up', label: '上滑' },
  { id: 'down', label: '下滑' },
  { id: 'left', label: '左滑' },
  { id: 'right', label: '右滑' }
]

const SNAP_STEPS = [1, 2, 4, 6, 8]

export function createInspector(context) {
  const { store, host, titleEl } = context
  let signature = ''
  let refs = {}

  function render(force) {
    const selection = store.getState().selection
    const elements = store.selectedElements()
    const nextSignature = selection.join('|') + `#${store.getState().pageId}#${store.historyState().canUndo}`
    if (!force && nextSignature === signature) {
      refreshValues(elements)
      return
    }
    signature = nextSignature
    refs = {}
    host.innerHTML = ''

    if (!elements.length) {
      titleEl.textContent = '未选中元素'
      host.appendChild(renderEmptyState())
      updateHeaderActions(false)
      return
    }
    if (elements.length > 1) {
      titleEl.textContent = `已选中 ${elements.length} 个元素`
      host.appendChild(renderMulti(elements))
      updateHeaderActions(true)
      return
    }
    const element = elements[0]
    if (element.type === 'group') titleEl.textContent = `组合 · ${element.name}`
    else titleEl.textContent = element.name
    host.appendChild(renderSingle(element))
    updateHeaderActions(true)
    refreshValues(elements)
  }

  function updateHeaderActions(enabled) {
    if (context.onSelectionState) context.onSelectionState(enabled)
  }

  /* ------------------------------------------------------------ primitives */

  function block(titleText, action) {
    const wrap = document.createElement('div')
    wrap.className = 'inspector-block'
    const head = document.createElement('div')
    head.className = 'block-title'
    const label = document.createElement('span')
    label.textContent = titleText
    head.appendChild(label)
    if (action) {
      const button = document.createElement('button')
      button.className = 'block-action'
      button.textContent = action.label
      button.addEventListener('click', action.onClick)
      head.appendChild(button)
    }
    wrap.appendChild(head)
    return wrap
  }

  function field(labelText) {
    const row = document.createElement('div')
    row.className = 'field'
    const label = document.createElement('label')
    label.textContent = labelText
    row.appendChild(label)
    return row
  }

  function numberInput(options) {
    const input = document.createElement('input')
    input.className = 'num-input'
    input.type = 'text'
    input.inputMode = 'decimal'
    input.autocomplete = 'off'
    input.value = formatNumber(options.value)
    if (options.min !== undefined) input.dataset.min = String(options.min)
    if (options.max !== undefined) input.dataset.max = String(options.max)
    const commit = (raw) => {
      const parsed = Number(raw)
      if (!isFinite(parsed)) {
        input.value = formatNumber(options.value)
        return
      }
      const clamped = clamp(parsed, options.min, options.max)
      options.onCommit(clamped)
      input.value = formatNumber(clamped)
    }
    input.addEventListener('input', () => {
      const parsed = Number(input.value)
      if (!isFinite(parsed)) return
      options.onLive(clamp(parsed, options.min, options.max))
    })
    input.addEventListener('blur', () => commit(input.value))
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        commit(input.value)
        input.blur()
        return
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        const step = event.shiftKey ? 10 : options.step || 1
        const current = Number(input.value) || 0
        commit(current + (event.key === 'ArrowUp' ? step : -step))
      }
      event.stopPropagation()
    })
    if (options.scrub !== false) attachScrub(input, options)
    if (options.register) refs[options.register] = input
    return input
  }

  function attachScrub(input, options) {
    let dragging = null
    const onDown = (event) => {
      if (event.button !== 0) return
      dragging = { startX: event.clientX, startValue: Number(options.value) || 0, moved: false }
      input.setPointerCapture(event.pointerId)
      event.preventDefault()
    }
    const onMove = (event) => {
      if (!dragging) return
      const dx = event.clientX - dragging.startX
      if (!dragging.moved && Math.abs(dx) < 3) return
      dragging.moved = true
      input.classList.add('is-scrubbing')
      const step = event.shiftKey ? (options.step || 1) * 0.1 : options.step || 1
      const next = clamp(dragging.startValue + dx * step, options.min, options.max)
      input.value = formatNumber(next)
      options.onLive(round2(next))
    }
    const onUp = (event) => {
      if (!dragging) return
      const moved = dragging.moved
      dragging = null
      input.classList.remove('is-scrubbing')
      try {
        input.releasePointerCapture(event.pointerId)
      } catch (error) {
        void error
      }
      if (moved) options.onCommit(round2(Number(input.value) || 0))
      else input.focus()
    }
    input.addEventListener('pointerdown', onDown)
    input.addEventListener('pointermove', onMove)
    input.addEventListener('pointerup', onUp)
    input.addEventListener('pointercancel', onUp)
  }

  function textInput(options) {
    const input = document.createElement('input')
    input.className = 'text-input'
    input.value = options.value === undefined ? '' : options.value
    input.spellcheck = false
    if (options.placeholder) input.placeholder = options.placeholder
    input.addEventListener('input', () => options.onLive && options.onLive(input.value))
    input.addEventListener('blur', () => options.onCommit(input.value))
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        input.blur()
      }
      event.stopPropagation()
    })
    if (options.register) refs[options.register] = input
    return input
  }

  function textarea(options) {
    const input = document.createElement('textarea')
    input.className = 'textarea-input'
    input.value = options.value === undefined ? '' : options.value
    if (options.placeholder) input.placeholder = options.placeholder
    input.addEventListener('input', () => options.onLive && options.onLive(input.value))
    input.addEventListener('blur', () => options.onCommit(input.value))
    input.addEventListener('keydown', (event) => event.stopPropagation())
    if (options.register) refs[options.register] = input
    return input
  }

  function selectInput(options) {
    const select = document.createElement('select')
    select.className = 'select-input'
    options.options.forEach((option) => {
      const node = document.createElement('option')
      node.value = option.id
      node.textContent = option.label
      if (String(option.id) === String(options.value)) node.selected = true
      select.appendChild(node)
    })
    select.addEventListener('change', () => options.onCommit(select.value))
    select.addEventListener('pointerdown', (event) => event.stopPropagation())
    if (options.register) refs[options.register] = select
    return select
  }

  function segmented(options) {
    const wrap = document.createElement('div')
    wrap.className = `segmented${options.icon ? ' icons' : ''}`
    options.items.forEach((item) => {
      const button = document.createElement('button')
      button.textContent = item.label
      button.title = item.title || item.label
      button.dataset.value = String(item.id)
      if (String(item.id) === String(options.value)) button.classList.add('is-active')
      button.addEventListener('click', () => {
        [...wrap.children].forEach((child) => child.classList.remove('is-active'))
        button.classList.add('is-active')
        options.onCommit(item.id)
      })
      wrap.appendChild(button)
    })
    if (options.register) refs[options.register] = wrap
    return wrap
  }

  function colorField(options) {
    const wrap = document.createElement('div')
    wrap.className = 'color-field'
    const picker = document.createElement('input')
    picker.type = 'color'
    picker.value = normalizeHex(options.value)
    const text = document.createElement('input')
    text.className = 'text-input'
    text.value = (options.value || '').toUpperCase()
    text.spellcheck = false
    const commit = (value) => {
      const hex = normalizeHex(value)
      picker.value = hex
      text.value = hex.toUpperCase()
      options.onCommit(hex)
    }
    picker.addEventListener('input', () => options.onLive(picker.value))
    picker.addEventListener('change', () => options.onCommit(picker.value))
    text.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(text.value)) options.onLive(text.value)
    })
    text.addEventListener('blur', () => commit(text.value))
    text.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') text.blur()
      event.stopPropagation()
    })
    wrap.appendChild(picker)
    wrap.appendChild(text)
    if (options.register) {
      refs[`${options.register}:picker`] = picker
      refs[`${options.register}:text`] = text
    }
    return wrap
  }

  function rangeField(options) {
    const wrap = document.createElement('div')
    wrap.className = 'range-row'
    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(options.min)
    input.max = String(options.max)
    input.step = String(options.step || 1)
    input.value = String(options.value)
    const readout = document.createElement('span')
    readout.className = 'range-value'
    readout.textContent = options.format ? options.format(options.value) : String(options.value)
    input.addEventListener('input', () => {
      readout.textContent = options.format ? options.format(Number(input.value)) : input.value
      options.onLive(Number(input.value))
    })
    input.addEventListener('change', () => options.onCommit(Number(input.value)))
    wrap.appendChild(input)
    wrap.appendChild(readout)
    if (options.register) refs[options.register] = input
    return wrap
  }

  function switchField(options) {
    const button = document.createElement('button')
    button.className = 'switch'
    button.setAttribute('role', 'switch')
    button.setAttribute('aria-checked', String(!!options.value))
    button.addEventListener('click', () => {
      const next = button.getAttribute('aria-checked') !== 'true'
      button.setAttribute('aria-checked', String(next))
      options.onCommit(next)
    })
    if (options.register) refs[options.register] = button
    return button
  }

  function toggleRow(labelText, options) {
    const row = field(labelText)
    row.appendChild(switchField(options))
    return row
  }

  /* --------------------------------------------------------- single element */

  function renderSingle(element) {
    const fragment = document.createDocumentFragment()
    const style = element.style || {}

    /* --- identity --- */
    const identity = block('元素')
    const nameRow = field('名称')
    nameRow.appendChild(
      textInput({
        value: element.name,
        register: 'name',
        onCommit: (value) => store.updateElements([element.id], { name: value.trim() || element.type }, '重命名元素')
      })
    )
    identity.appendChild(nameRow)
    const typeRow = field('类型')
    const typeLabel = document.createElement('div')
    typeLabel.style.cssText = 'flex:1;font-size:11px;color:var(--c-text-2)'
    typeLabel.textContent = `${element.type}${element.paletteId ? ` · ${element.paletteId}` : ''}`
    typeRow.appendChild(typeLabel)
    identity.appendChild(typeRow)
    fragment.appendChild(identity)

    /* --- geometry --- */
    const geometry = block('位置与尺寸')
    const grid = document.createElement('div')
    grid.className = 'field-grid'
    const makeNumber = (label, key, min, max) => {
      const row = field(label)
      row.appendChild(
        numberInput({
          value: element[key],
          min,
          max,
          register: key,
          onLive: (value) => {
            element[key] = value
            context.liveGeometry(element.id)
          },
          onCommit: (value) => store.updateElements([element.id], { [key]: value }, '调整位置')
        })
      )
      return row
    }
    grid.appendChild(makeNumber('X', 'x', -2000, 4000))
    grid.appendChild(makeNumber('Y', 'y', -2000, 4000))
    grid.appendChild(makeNumber('W', 'w', 2, 4000))
    grid.appendChild(makeNumber('H', 'h', 2, 4000))
    geometry.appendChild(grid)

    const rotationRow = field('旋转')
    rotationRow.appendChild(
      numberInput({
        value: element.rotation || 0,
        min: -360,
        max: 360,
        step: 1,
        register: 'rotation',
        onLive: (value) => {
          element.rotation = value
          context.liveGeometry(element.id)
        },
        onCommit: (value) => store.updateElements([element.id], { rotation: value }, '旋转元素')
      })
    )
    const quick = document.createElement('div')
    quick.className = 'segmented'
    ;[-15, 0, 15, 90].forEach((angle) => {
      const button = document.createElement('button')
      button.textContent = angle === 0 ? '0°' : `${angle}°`
      button.addEventListener('click', () => store.updateElements([element.id], { rotation: angle }, '旋转元素'))
      quick.appendChild(button)
    })
    rotationRow.appendChild(quick)
    geometry.appendChild(rotationRow)

    const opacityRow = field('不透明度')
    opacityRow.appendChild(
      rangeField({
        value: Math.round((typeof element.opacity === 'number' ? element.opacity : 1) * 100),
        min: 0,
        max: 100,
        register: 'opacity',
        format: (value) => `${Math.round(value)}%`,
        onLive: (value) => {
          element.opacity = value / 100
          context.liveGeometry(element.id)
        },
        onCommit: (value) => store.updateElements([element.id], { opacity: value / 100 }, '调整透明度')
      })
    )
    geometry.appendChild(opacityRow)
    geometry.appendChild(
      toggleRow('锁定', {
        value: !!element.locked,
        register: 'locked',
        onCommit: (value) => store.updateElements([element.id], { locked: value }, value ? '锁定元素' : '解锁元素')
      })
    )
    geometry.appendChild(
      toggleRow('可见', {
        value: element.visible !== false,
        register: 'visible',
        onCommit: (value) => store.updateElements([element.id], { visible: value }, value ? '显示元素' : '隐藏元素')
      })
    )
    fragment.appendChild(geometry)

    /* --- appearance --- */
    const appearance = block('外观')
    appearance.appendChild(
      field('填充')
    ).lastChild.appendChild(
      colorField({
        value: style.fill && style.fill.type !== 'none' ? style.fill.color : '#000000',
        register: 'fill',
        onLive: (value) => {
          style.fill = { type: 'solid', color: value }
          context.liveGeometry(element.id)
        },
        onCommit: (value) => store.updateElements([element.id], { style: { fill: { type: 'solid', color: value } } }, '修改填充')
      })
    )
    const fillOffRow = document.createElement('div')
    fillOffRow.className = 'field'
    fillOffRow.appendChild(document.createElement('label'))
    const noFill = document.createElement('button')
    noFill.className = 'btn ghost'
    noFill.style.cssText = 'height:24px;padding:0 10px;font-size:10.5px'
    noFill.textContent = '无填充'
    noFill.addEventListener('click', () => store.updateElements([element.id], { style: { fill: { type: 'none' } } }, '取消填充'))
    fillOffRow.appendChild(noFill)
    appearance.appendChild(fillOffRow)

    const strokeRow = field('描边')
    strokeRow.appendChild(
      colorField({
        value: style.stroke ? style.stroke.color : '#252B38',
        register: 'stroke',
        onLive: (value) => {
          style.stroke = { color: value, width: style.stroke ? style.stroke.width : 1 }
          context.liveGeometry(element.id)
        },
        onCommit: (value) =>
          store.updateElements([element.id], { style: { stroke: { color: value, width: style.stroke ? style.stroke.width : 1 } } }, '修改描边')
      })
    )
    const strokeWidth = document.createElement('input')
    strokeWidth.className = 'num-input'
    strokeWidth.style.width = '42px'
    strokeWidth.value = String(style.stroke ? style.stroke.width : 0)
    strokeWidth.addEventListener('blur', () => {
      const width = Math.max(0, Number(strokeWidth.value) || 0)
      if (width === 0) store.updateElements([element.id], { style: { stroke: null } }, '取消描边')
      else store.updateElements([element.id], { style: { stroke: { color: style.stroke ? style.stroke.color : '#252B38', width } } }, '修改描边宽度')
    })
    strokeWidth.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') strokeWidth.blur()
      event.stopPropagation()
    })
    strokeRow.appendChild(strokeWidth)
    appearance.appendChild(strokeRow)

    const radiusRow = field('圆角')
    radiusRow.appendChild(
      numberInput({
        value: style.radius === undefined ? 0 : style.radius,
        min: 0,
        max: 999,
        register: 'radius',
        onLive: (value) => {
          style.radius = value
          context.liveGeometry(element.id)
        },
        onCommit: (value) => store.updateElements([element.id], { style: { radius: value } }, '修改圆角')
      })
    )
    const radiusQuick = document.createElement('div')
    radiusQuick.className = 'segmented'
    ;[0, 8, 16, 999].forEach((value) => {
      const button = document.createElement('button')
      button.textContent = value === 999 ? '全圆' : String(value)
      button.addEventListener('click', () => store.updateElements([element.id], { style: { radius: value } }, '修改圆角'))
      radiusQuick.appendChild(button)
    })
    radiusRow.appendChild(radiusQuick)
    appearance.appendChild(radiusRow)
    fragment.appendChild(appearance)

    /* --- type specific --- */
    const content = renderContent(element, style)
    if (content) fragment.appendChild(content)

    /* --- layout for containers --- */
    if (element.type === 'container' || element.type === 'honeycomb') {
      fragment.appendChild(renderContainerLayout(element))
    }

    /* --- notes, interactions --- */
    fragment.appendChild(renderNotes(element))
    fragment.appendChild(renderInteractions(element, 'element'))
    return fragment
  }

  function renderContent(element, style) {
    if (element.type === 'text' || element.type === 'button' || element.type === 'listRow') {
      const content = block('内容')
      const textRow = field('文本')
      textRow.appendChild(
        textarea({
          value: element.text === undefined ? element.name : element.text,
          register: 'text',
          onCommit: (value) => store.updateElements([element.id], { text: value }, '修改文本')
        })
      )
      content.appendChild(textRow)

      const sizeRow = field('字号')
      sizeRow.appendChild(
        numberInput({
          value: style.fontSize || 12,
          min: 6,
          max: 72,
          register: 'fontSize',
          onLive: (value) => {
            style.fontSize = value
            context.forceRender()
          },
          onCommit: (value) => store.updateElements([element.id], { style: { fontSize: value } }, '修改字号')
        })
      )
      content.appendChild(sizeRow)

      const weightRow = field('字重')
      weightRow.appendChild(
        segmented({
          value: style.fontWeight || 400,
          items: [
            { id: 300, label: '细' },
            { id: 400, label: '常规' },
            { id: 600, label: '中黑' },
            { id: 700, label: '粗' }
          ],
          onCommit: (value) => store.updateElements([element.id], { style: { fontWeight: Number(value) } }, '修改字重')
        })
      )
      content.appendChild(weightRow)

      const alignRow = field('对齐')
      alignRow.appendChild(
        segmented({
          value: style.align || 'left',
          items: [
            { id: 'left', label: '⯇', title: '左对齐' },
            { id: 'center', label: '≡', title: '居中' },
            { id: 'right', label: '⯈', title: '右对齐' }
          ],
          onCommit: (value) => store.updateElements([element.id], { style: { align: value } }, '修改对齐')
        })
      )
      content.appendChild(alignRow)

      const colorRow = field('文字色')
      colorRow.appendChild(
        colorField({
          value: style.color || '#FFFFFF',
          register: 'color',
          onLive: (value) => {
            style.color = value
            context.forceRender()
          },
          onCommit: (value) => store.updateElements([element.id], { style: { color: value } }, '修改文字颜色')
        })
      )
      content.appendChild(colorRow)
      return content
    }

    if (element.type === 'progress') {
      const content = block('进度')
      const valueRow = field('进度')
      valueRow.appendChild(
        rangeField({
          value: Math.round((element.progress || 0) * 100),
          min: 0,
          max: 100,
          register: 'progress',
          format: (value) => `${Math.round(value)}%`,
          onLive: (value) => {
            element.progress = value / 100
            context.forceRender()
          },
          onCommit: (value) => store.updateElements([element.id], { progress: value / 100 }, '修改进度')
        })
      )
      content.appendChild(valueRow)
      const barRow = field('进度色')
      barRow.appendChild(
        colorField({
          value: style.barColor || '#FF8A3D',
          register: 'barColor',
          onLive: (value) => {
            style.barColor = value
            context.forceRender()
          },
          onCommit: (value) => store.updateElements([element.id], { style: { barColor: value } }, '修改进度色')
        })
      )
      content.appendChild(barRow)
      return content
    }

    if (element.type === 'chart') {
      const content = block('数据')
      const valueRow = field('数值')
      const input = textInput({
        value: (element.values || []).join(', '),
        register: 'values',
        onCommit: (value) => {
          const values = value
            .split(/[,，\s]+/)
            .map((item) => Number(item))
            .filter((item) => isFinite(item))
            .map((item) => Math.max(0, Math.min(1, item)))
          store.updateElements([element.id], { values }, '修改数据')
        }
      })
      valueRow.appendChild(input)
      content.appendChild(valueRow)
      const hint = document.createElement('div')
      hint.className = 'note-card'
      hint.innerHTML = '<strong>提示</strong>用 0–1 之间的小数表示每根柱子的相对高度，例如 <code>0.4, 0.8, 0.6</code>。'
      content.appendChild(hint)
      const barRow = field('柱色')
      barRow.appendChild(
        colorField({
          value: style.barColor || '#5EC8FF',
          register: 'barColor',
          onLive: (value) => {
            style.barColor = value
            context.forceRender()
          },
          onCommit: (value) => store.updateElements([element.id], { style: { barColor: value } }, '修改柱色')
        })
      )
      content.appendChild(barRow)
      return content
    }

    if (element.type === 'iconSlot') {
      const content = block('图标')
      const iconRow = field('图形')
      iconRow.appendChild(
        selectInput({
          value: element.icon || 'heart',
          options: iconList().map((name) => ({ id: name, label: name })),
          onCommit: (value) => store.updateElements([element.id], { icon: value }, '更换图标')
        })
      )
      content.appendChild(iconRow)
      const preview = document.createElement('div')
      preview.style.cssText =
        'display:grid;place-items:center;height:52px;border-radius:12px;background:#0b0d13;border:1px solid var(--c-line);color:' +
        (style.color || '#FF8A3D')
      preview.innerHTML = `<div style="width:26px;height:26px">${iconSvg(element.icon || 'heart')}</div>`
      content.appendChild(preview)
      const colorRow = field('颜色')
      colorRow.appendChild(
        colorField({
          value: style.color || '#FF8A3D',
          register: 'color',
          onLive: (value) => {
            style.color = value
            context.forceRender()
          },
          onCommit: (value) => store.updateElements([element.id], { style: { color: value } }, '修改图标颜色')
        })
      )
      content.appendChild(colorRow)
      return content
    }

    if (element.type === 'honeycomb') {
      const content = block('蜂窝')
      const sizeRow = field('图标尺寸')
      sizeRow.appendChild(
        numberInput({
          value: element.iconSize || 40,
          min: 8,
          max: 120,
          register: 'iconSize',
          onLive: (value) => {
            element.iconSize = value
            context.forceRender()
          },
          onCommit: (value) => store.updateElements([element.id], { iconSize: value }, '修改图标尺寸')
        })
      )
      content.appendChild(sizeRow)
      const gapRow = field('间距')
      gapRow.appendChild(
        numberInput({
          value: element.gap === undefined ? 8 : element.gap,
          min: 0,
          max: 60,
          register: 'gap',
          onLive: (value) => {
            element.gap = value
            context.forceRender()
          },
          onCommit: (value) => store.updateElements([element.id], { gap: value }, '修改蜂窝间距')
        })
      )
      content.appendChild(gapRow)
      const hint = document.createElement('div')
      hint.className = 'note-card'
      hint.innerHTML = '<strong>圆屏约束</strong>蜂窝矩阵在圆表上要满足弦宽，导出 JSON 时会带上 <code>device.shape</code>，方便 agent 生成可用的启动器布局。'
      content.appendChild(hint)
      return content
    }
    return null
  }

  function renderContainerLayout(element) {
    const wrap = block('容器布局')
    const directionRow = field('排列')
    directionRow.appendChild(
      segmented({
        value: element.direction || 'column',
        items: [
          { id: 'free', label: '自由' },
          { id: 'column', label: '纵向' },
          { id: 'row', label: '横向' },
          { id: 'grid', label: '网格' }
        ],
        onCommit: (value) => store.updateElements([element.id], { direction: value }, '修改排列方式')
      })
    )
    wrap.appendChild(directionRow)
    if ((element.direction || 'column') === 'grid') {
      const columnRow = field('列数')
      columnRow.appendChild(
        numberInput({
          value: element.columns || 2,
          min: 1,
          max: 8,
          register: 'columns',
          onCommit: (value) => store.updateElements([element.id], { columns: Math.round(value) }, '修改列数')
        })
      )
      wrap.appendChild(columnRow)
    }
    const paddingRow = field('内边距')
    paddingRow.appendChild(
      numberInput({
        value: element.padding === undefined ? 0 : element.padding,
        min: 0,
        max: 80,
        register: 'padding',
        onLive: (value) => {
          element.padding = value
          context.forceRender()
        },
        onCommit: (value) => store.updateElements([element.id], { padding: value }, '修改内边距')
      })
    )
    wrap.appendChild(paddingRow)
    const gapRow = field('元素间距')
    gapRow.appendChild(
      numberInput({
        value: element.gap === undefined ? 0 : element.gap,
        min: 0,
        max: 80,
        register: 'gap',
        onLive: (value) => {
          element.gap = value
          context.forceRender()
        },
        onCommit: (value) => store.updateElements([element.id], { gap: value }, '修改元素间距')
      })
    )
    wrap.appendChild(gapRow)
    return wrap
  }

  function renderNotes(element) {
    const wrap = block('语义备注', { label: '清空', onClick: () => store.updateElements([element.id], { note: '' }, '清空备注') })
    const row = field('用途')
    row.classList.add('notes-field')
    row.appendChild(
      textarea({
        value: element.note || '',
        register: 'note',
        placeholder: '说明这个元素/组合是干什么的、有什么作用。会写入导出 JSON 的 note 字段。',
        onCommit: (value) => store.updateElements([element.id], { note: value }, '修改备注')
      })
    )
    wrap.appendChild(row)
    return wrap
  }

  /* ----------------------------------------------------------- interactions */

  function renderInteractions(target, kind) {
    const list = target.interactions || []
    const wrap = block('交互 / 跳转', {
      label: '+ 添加',
      onClick: () => {
        const pages = store.getState().doc.pages
        const fallback = pages.find((page) => page.id !== store.getState().pageId) || pages[0]
        store.addInteraction(
          kind === 'page' ? { type: 'page', id: target.id } : { id: target.id },
          { trigger: 'tap', action: 'navigate', target: fallback.id, animation: 'slide-left' }
        )
        render(true)
      }
    })
    if (!list.length) {
      const empty = document.createElement('div')
      empty.className = 'note-card'
      empty.textContent = kind === 'page'
        ? '还没有页面级交互。可以定义「进入页面时」自动跳转，或定时器触发的动作。'
        : '还没有交互。添加后可以定义点击 / 长按 / 滑动 / 定时器触发什么跳转。'
      wrap.appendChild(empty)
      return wrap
    }
    list.forEach((interaction) => {
      const card = document.createElement('div')
      card.className = 'note-card'
      card.style.marginBottom = '7px'

      const triggerRow = field('触发')
      triggerRow.appendChild(
        selectInput({
          value: interaction.trigger || 'tap',
          options: TRIGGERS,
          onCommit: (value) => {
            store.updateInteraction(target.id, interaction.id, { trigger: value })
            render(true)
          }
        })
      )
      card.appendChild(triggerRow)

      if ((interaction.trigger || 'tap') === 'swipe') {
        const directionRow = field('方向')
        directionRow.appendChild(
          selectInput({
            value: interaction.direction || 'up',
            options: DIRECTIONS,
            onCommit: (value) => store.updateInteraction(target.id, interaction.id, { direction: value })
          })
        )
        card.appendChild(directionRow)
      }

      const actionRow = field('动作')
      actionRow.appendChild(
        selectInput({
          value: interaction.action || 'navigate',
          options: [
            { id: 'navigate', label: '跳转到页面' },
            { id: 'back', label: '返回上一页' },
            { id: 'none', label: '无（占位）' }
          ],
          onCommit: (value) => {
            store.updateInteraction(target.id, interaction.id, { action: value })
            render(true)
          }
        })
      )
      card.appendChild(actionRow)

      if ((interaction.action || 'navigate') === 'navigate') {
        const targetRow = field('目标页')
        targetRow.appendChild(
          selectInput({
            value: interaction.target || '',
            options: store
              .getState()
              .doc.pages.filter((page) => page.id !== store.getState().pageId)
              .map((page) => ({ id: page.id, label: page.name })),
            onCommit: (value) => store.updateInteraction(target.id, interaction.id, { target: value })
          })
        )
        card.appendChild(targetRow)

        const animRow = field('过场')
        animRow.appendChild(
          selectInput({
            value: interaction.animation || 'slide-left',
            options: [
              { id: 'slide-left', label: '左滑进入' },
              { id: 'slide-up', label: '上滑进入' },
              { id: 'fade', label: '淡入' },
              { id: 'none', label: '无动画' }
            ],
            onCommit: (value) => store.updateInteraction(target.id, interaction.id, { animation: value })
          })
        )
        card.appendChild(animRow)
      }

      if ((interaction.trigger || 'tap') === 'timer') {
        const delayRow = field('延迟 ms')
        delayRow.appendChild(
          numberInput({
            value: interaction.delay === undefined || interaction.delay === null ? 3000 : interaction.delay,
            min: 0,
            max: 600000,
            step: 100,
            onCommit: (value) => store.updateInteraction(target.id, interaction.id, { delay: Math.round(value) })
          })
        )
        card.appendChild(delayRow)
      }

      const removeRow = document.createElement('div')
      removeRow.className = 'field'
      removeRow.appendChild(document.createElement('label'))
      const remove = document.createElement('button')
      remove.className = 'btn danger'
      remove.style.cssText = 'height:24px;padding:0 10px;font-size:10.5px'
      remove.textContent = '删除这条交互'
      remove.addEventListener('click', () => {
        store.removeInteraction(target.id, interaction.id)
        render(true)
      })
      removeRow.appendChild(remove)
      card.appendChild(removeRow)

      wrap.appendChild(card)
    })
    return wrap
  }

  /* -------------------------------------------------------- multi selection */

  function renderMulti(elements) {
    const fragment = document.createDocumentFragment()
    const geometry = block('批量几何')
    const box = store.selectionBox()
    const info = document.createElement('div')
    info.className = 'note-card'
    info.innerHTML = `<strong>选区</strong>位置 ${Math.round(box.x)}, ${Math.round(box.y)} · 尺寸 ${Math.round(box.w)} × ${Math.round(box.h)}`
    geometry.appendChild(info)

    const sizeGrid = document.createElement('div')
    sizeGrid.className = 'field-grid'
    const widthField = field('W')
    widthField.appendChild(
      numberInput({
        value: Math.round(box.w),
        min: 2,
        max: 4000,
        register: 'multiW',
        onCommit: (value) => {
          const scale = value / (box.w || 1)
          store.transaction('批量调整尺寸', () => {
            elements.forEach((element) => {
              element.w = Math.max(2, Math.round(element.w * scale))
            })
          })
        }
      })
    )
    sizeGrid.appendChild(widthField)
    const heightField = field('H')
    heightField.appendChild(
      numberInput({
        value: Math.round(box.h),
        min: 2,
        max: 4000,
        register: 'multiH',
        onCommit: (value) => {
          const scale = value / (box.h || 1)
          store.transaction('批量调整尺寸', () => {
            elements.forEach((element) => {
              element.h = Math.max(2, Math.round(element.h * scale))
            })
          })
        }
      })
    )
    sizeGrid.appendChild(heightField)
    geometry.appendChild(sizeGrid)

    const actionRow = document.createElement('div')
    actionRow.className = 'field'
    actionRow.appendChild(document.createElement('label'))
    const groupButton = document.createElement('button')
    groupButton.className = 'btn primary'
    groupButton.style.cssText = 'height:26px;font-size:11px'
    groupButton.textContent = '组合并添加备注'
    groupButton.addEventListener('click', () => {
      store.groupElements(elements.map((element) => element.id))
      render(true)
    })
    actionRow.appendChild(groupButton)
    geometry.appendChild(actionRow)
    fragment.appendChild(geometry)

    const common = block('共同修改')
    common.appendChild(
      field('填充')
    ).lastChild.appendChild(
      colorField({
        value: pickFirstFill(elements) || '#1F2632',
        register: 'fill',
        onCommit: (value) =>
          store.updateElements(
            elements.map((element) => element.id),
            { style: { fill: { type: 'solid', color: value } } },
            '批量修改填充'
          )
      })
    )
    common.appendChild(
      field('圆角')
    ).lastChild.appendChild(
      numberInput({
        value: pickFirstRadius(elements),
        min: 0,
        max: 999,
        register: 'radius',
        onCommit: (value) =>
          store.updateElements(elements.map((element) => element.id), { style: { radius: value } }, '批量修改圆角')
      })
    )
    fragment.appendChild(common)

    const list = block('元素清单')
    elements.slice(0, 40).forEach((element) => {
      const row = document.createElement('div')
      row.className = 'flow-row'
      row.innerHTML = `<span class="flow-trigger">${element.type}</span><span class="flow-text">${escapeHtml(element.name)}</span>`
      list.appendChild(row)
    })
    if (elements.length > 40) {
      const more = document.createElement('div')
      more.className = 'panel-hint'
      more.textContent = `还有 ${elements.length - 40} 个元素未列出。`
      list.appendChild(more)
    }
    fragment.appendChild(list)
    return fragment
  }

  function pickFirstFill(elements) {
    const found = elements.find((element) => element.style && element.style.fill && element.style.fill.type !== 'none')
    return found ? found.style.fill.color : null
  }

  function pickFirstRadius(elements) {
    const found = elements.find((element) => element.style && element.style.radius)
    return found ? found.style.radius : 0
  }

  /* -------------------------------------------------------------- empty */

  function renderEmptyState() {
    const wrap = document.createElement('div')
    wrap.className = 'empty-state'
    wrap.innerHTML = `
      <strong>还没有选中元素</strong>
      从左侧组件库拖一个到画板，或直接点选画板上的元素开始编辑。<br>
      双击画板空白处可以快速插入文本。
    `
    const shortcuts = document.createElement('div')
    shortcuts.className = 'note-card'
    shortcuts.style.marginTop = '14px'
    shortcuts.innerHTML = `
      <strong>快捷键</strong>
      Ctrl+Z / Ctrl+Shift+Z 撤销重做<br>
      Ctrl+G / Ctrl+Shift+G 组合 / 解组<br>
      Ctrl+D 复制 · Delete 删除<br>
      Ctrl+E 导出 JSON · P 预览<br>
      方向键 1px · Shift+方向键 10px
    `
    wrap.appendChild(shortcuts)
    return wrap
  }

  /* --------------------------------------------------- live value syncing */

  function refreshValues(elements) {
    if (elements.length !== 1) return
    const element = elements[0]
    setValue('x', element.x)
    setValue('y', element.y)
    setValue('w', element.w)
    setValue('h', element.h)
    setValue('rotation', element.rotation || 0)
    setValue('radius', element.style ? element.style.radius : 0)
    setValue('opacity', Math.round((typeof element.opacity === 'number' ? element.opacity : 1) * 100))
    setValue('fontSize', element.style ? element.style.fontSize : undefined)
    setValue('iconSize', element.iconSize)
    setValue('gap', element.gap)
    setValue('padding', element.padding)
    setValue('progress', element.progress === undefined ? undefined : Math.round(element.progress * 100))
    setChecked('locked', !!element.locked)
    setChecked('visible', element.visible !== false)
  }

  function setValue(key, value) {
    const node = refs[key]
    if (!node) return
    if (document.activeElement === node) return
    if (value === undefined || value === null) return
    if (node.tagName === 'INPUT' && node.type === 'range') {
      if (Number(node.value) !== Number(value)) node.value = String(value)
      const readout = node.parentElement && node.parentElement.querySelector('.range-value')
      if (readout) readout.textContent = `${Math.round(value)}%`
      return
    }
    const formatted = formatNumber(value)
    if (node.value !== formatted) node.value = formatted
  }

  function setChecked(key, value) {
    const node = refs[key]
    if (!node || !node.setAttribute) return
    node.setAttribute('aria-checked', String(!!value))
  }

  return { render, refreshValues, TRIGGERS, SNAP_STEPS }
}

/* ---------------------------------------------------------------- helpers */

function clamp(value, min, max) {
  let next = value
  if (typeof min === 'number') next = Math.max(min, next)
  if (typeof max === 'number') next = Math.min(max, next)
  return next
}

function round2(value) {
  return Math.round(value * 100) / 100
}

function formatNumber(value) {
  if (value === undefined || value === null || value === '') return ''
  const rounded = Math.round(Number(value) * 100) / 100
  return String(rounded)
}

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
