(() => {
  'use strict'

  const state = {
    apps: [], profiles: [], app: 'heart', profile: 'circle', project: null,
    drafts: {}, selectedGroup: null, safeVisible: true, previewTimer: null, drag: null, scale: 1
  }

  const $ = id => document.getElementById(id)
  const elements = {
    appSelect: $('appSelect'), profileSwitch: $('profileSwitch'), safeToggle: $('safeToggle'), saveState: $('saveState'),
    levelChip: $('levelChip'), componentList: $('componentList'), previewTitle: $('previewTitle'), fileBadge: $('fileBadge'), canvasWrap: $('canvasWrap'),
    deviceShell: $('deviceShell'), deviceLogical: $('deviceLogical'), uxFrame: $('uxFrame'), safeArea: $('safeArea'), componentOverlay: $('componentOverlay'),
    warningStrip: $('warningStrip'), inspectorTitle: $('inspectorTitle'), groupHint: $('groupHint'), fieldList: $('fieldList'), resetGroupButton: $('resetGroupButton'),
    changeCount: $('changeCount'), changeHint: $('changeHint'), changeList: $('changeList'), revertButton: $('revertButton'), saveButton: $('saveButton'), toast: $('toast')
  }

  function draftKey() { return state.app + ':' + state.profile }
  function currentChanges() { return state.drafts[draftKey()] || {} }
  function setCurrentChanges(changes) { state.drafts[draftKey()] = changes }

  async function api(url, options) {
    const response = await fetch(url, options)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || '请求失败')
    return data
  }

  function showToast(message, error) {
    elements.toast.textContent = message
    elements.toast.classList.toggle('error', !!error)
    elements.toast.classList.add('show')
    clearTimeout(showToast.timer)
    showToast.timer = setTimeout(() => elements.toast.classList.remove('show'), 2200)
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]))
  }

  function findGroup(id) {
    return state.project && state.project.groups.find(group => group.id === id)
  }

  function findField(path) {
    if (!state.project) return null
    for (const group of state.project.groups) {
      const field = group.fields.find(item => item.path === path)
      if (field) return field
    }
    return null
  }

  function sourceText(source) {
    if (source === 'override') return '当前机型覆盖'
    if (source === 'inherited') return '继承 base'
    return '当前形态未使用'
  }

  async function init() {
    try {
      const meta = await api('/api/apps')
      state.apps = meta.apps
      state.profiles = meta.profiles
      renderToolbar()
      await loadProject(false)
    } catch (error) { showToast(error.message, true) }
  }

  function renderToolbar() {
    elements.appSelect.innerHTML = state.apps.map(app => `<option value="${escapeHtml(app.id)}">${escapeHtml(app.name)} · ${escapeHtml(app.level)}</option>`).join('')
    elements.appSelect.value = state.app
    elements.profileSwitch.innerHTML = state.profiles.map(profile => `<button class="profile-button ${profile.id === state.profile ? 'active' : ''}" data-profile="${profile.id}">${escapeHtml(profile.shortName)}</button>`).join('')
    elements.profileSwitch.querySelectorAll('.profile-button').forEach(button => button.addEventListener('click', async () => {
      if (button.dataset.profile === state.profile) return
      state.profile = button.dataset.profile
      await loadProject(false)
      renderToolbar()
    }))
  }

  async function loadProject(useDraft) {
    const changes = useDraft ? currentChanges() : {}
    if (!useDraft) setCurrentChanges({})
    const query = new URLSearchParams({ app: state.app, profile: state.profile })
    state.project = changes && Object.keys(changes).length
      ? await api('/api/preview', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ app: state.app, profile: state.profile, changes }) })
      : await api('/api/project?' + query.toString())
    if (!state.selectedGroup || !findGroup(state.selectedGroup)) state.selectedGroup = state.project.groups[0] && state.project.groups[0].id
    renderAll()
  }

  function renderAll() {
    if (!state.project) return
    elements.levelChip.textContent = state.project.app.level
    elements.previewTitle.textContent = state.project.app.name + ' · ' + state.project.profile.shortName
    elements.fileBadge.textContent = state.project.files.layout
    renderComponents()
    renderInspector()
    renderPreview()
    renderWarnings()
    renderChanges()
  }

  function renderComponents() {
    const groups = state.project.groups || []
    elements.componentList.innerHTML = groups.map(group => {
      const ownCount = group.fields.filter(field => field.source === 'override').length
      return `<button class="component-button ${group.id === state.selectedGroup ? 'active' : ''}" data-group="${escapeHtml(group.id)}"><strong>${escapeHtml(group.label)}</strong><span>${ownCount ? ownCount + ' 项覆盖' : '继承'}</span></button>`
    }).join('') || '<div class="panel-intro">这个页面暂时没有可编辑组件。</div>'
    elements.componentList.querySelectorAll('.component-button').forEach(button => button.addEventListener('click', () => {
      state.selectedGroup = button.dataset.group
      renderComponents(); renderInspector(); renderPreviewBoxes()
    }))
  }

  function renderInspector() {
    const group = findGroup(state.selectedGroup)
    if (!group) {
      elements.inspectorTitle.textContent = '暂无组件'
      elements.groupHint.textContent = '当前页面暂未开放可视化参数。'
      elements.fieldList.innerHTML = ''
      elements.resetGroupButton.disabled = true
      return
    }
    elements.inspectorTitle.textContent = group.label
    elements.groupHint.textContent = group.hint || '调整参数后会立即预览，点击保存才写入本地文件。'
    elements.resetGroupButton.disabled = !group.fields.some(field => field.source === 'override')
    elements.fieldList.innerHTML = group.fields.map(field => {
      const disabled = field.value === undefined || field.value === null
      const value = disabled ? '' : field.value
      const reset = field.source === 'override' ? `<button class="reset-button" data-reset="${escapeHtml(field.path)}">恢复继承</button>` : '<button class="reset-button placeholder" tabindex="-1">恢复继承</button>'
      return `<div class="field-row ${disabled ? 'disabled' : ''}" data-path="${escapeHtml(field.path)}">
        <div class="field-head"><span class="field-label">${escapeHtml(field.label)}</span><span class="source-chip ${field.source === 'override' ? 'override' : ''}">${escapeHtml(sourceText(field.source))}</span></div>
        <div class="field-controls">
          <button class="step-button" data-step="-1" ${disabled ? 'disabled' : ''}>−</button>
          <input class="field-input" type="number" value="${escapeHtml(value)}" step="${field.step || 1}" min="${field.min ?? 0}" max="${field.max ?? 600}" data-input="${escapeHtml(field.path)}" ${disabled ? 'disabled' : ''}>
          <button class="step-button" data-step="1" ${disabled ? 'disabled' : ''}>＋</button>
          ${reset}
        </div>
        <input class="field-range" type="range" value="${escapeHtml(value || 0)}" step="${field.step || 1}" min="${field.min ?? 0}" max="${field.max ?? 600}" data-range="${escapeHtml(field.path)}" ${disabled ? 'disabled' : ''}>
        <div class="field-foot"><span>${escapeHtml(field.path)}</span><span>${field.unit ? escapeHtml(field.unit) : ''}</span></div>
      </div>`
    }).join('')

    elements.fieldList.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
      const row = button.closest('.field-row'); const path = row.dataset.path; const field = findField(path)
      adjustField(path, Number(field.value) + Number(button.dataset.step) * (field.step || 1))
    }))
    elements.fieldList.querySelectorAll('[data-input]').forEach(input => input.addEventListener('change', () => adjustField(input.dataset.input, Number(input.value))))
    elements.fieldList.querySelectorAll('[data-range]').forEach(input => input.addEventListener('input', () => adjustField(input.dataset.range, Number(input.value), true)))
    elements.fieldList.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => resetField(button.dataset.reset)))
  }

  function clampField(field, value) {
    let next = Number(value)
    if (!Number.isFinite(next)) next = Number(field.value) || 0
    if (field.min !== undefined) next = Math.max(field.min, next)
    if (field.max !== undefined) next = Math.min(field.max, next)
    const step = Number(field.step) || 1
    return Math.round(next / step) * step
  }

  function adjustField(path, value, fast) {
    const field = findField(path)
    if (!field || field.value === undefined) return
    const changes = Object.assign({}, currentChanges())
    changes[path] = clampField(field, value)
    setCurrentChanges(changes)
    markModified()
    schedulePreview(fast ? 80 : 10)
  }

  function resetField(path) {
    const changes = Object.assign({}, currentChanges())
    changes[path] = null
    setCurrentChanges(changes)
    markModified()
    schedulePreview(10)
  }

  function resetGroup() {
    const group = findGroup(state.selectedGroup)
    if (!group) return
    const changes = Object.assign({}, currentChanges())
    group.fields.forEach(field => { if (field.source === 'override') changes[field.path] = null })
    setCurrentChanges(changes)
    markModified()
    schedulePreview(10)
  }

  function schedulePreview(delay) {
    clearTimeout(state.previewTimer)
    state.previewTimer = setTimeout(previewDraft, delay || 60)
  }

  async function previewDraft() {
    try {
      state.project = await api('/api/preview', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ app: state.app, profile: state.profile, changes: currentChanges() }) })
      renderAll()
    } catch (error) { showToast(error.message, true) }
  }

  function markModified() {
    elements.saveState.classList.add('modified')
    elements.saveState.lastElementChild.textContent = '未保存'
  }

  function buildSrcdoc() {
    const project = state.project
    const h = project.scene.height
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;width:192px;height:${h}px;overflow:hidden;background:#000;color:#fff;font-family:"PingFang SC","Microsoft YaHei",sans-serif}
      *{box-sizing:content-box} div{display:flex} [data-vela-tag="stack"]{position:relative} [data-vela-tag="scroll"]{overflow:hidden;flex-direction:column}
      [data-vela-tag="text"]{display:block;white-space:nowrap} .vela-slider{height:5px;border-radius:3px;background:#30343a}.vela-slider div{width:55%;height:100%;border-radius:3px;background:#7c9cff}
      ${project.ux.css || ''}
    </style></head><body>${project.ux.html || '<div style="padding:16px;color:#8993a2">当前 UX 无可预览模板</div>'}</body></html>`
  }

  function renderPreview() {
    const project = state.project
    const sceneHeight = project.scene.height
    const availableHeight = Math.max(300, elements.canvasWrap.clientHeight - 28)
    const availableWidth = Math.max(280, elements.canvasWrap.clientWidth - 40)
    state.scale = Math.min(2.1, availableHeight / sceneHeight, availableWidth / 192)
    if (!Number.isFinite(state.scale) || state.scale <= 0) state.scale = 1
    elements.deviceShell.style.width = (192 * state.scale) + 'px'
    elements.deviceShell.style.height = (sceneHeight * state.scale) + 'px'
    elements.deviceLogical.style.width = '192px'
    elements.deviceLogical.style.height = sceneHeight + 'px'
    elements.deviceLogical.style.transform = `scale(${state.scale})`
    elements.deviceLogical.className = 'device-logical ' + project.profile.formFactor
    elements.uxFrame.style.width = '192px'
    elements.uxFrame.style.height = sceneHeight + 'px'
    elements.uxFrame.srcdoc = buildSrcdoc()
    const safe = project.safe
    Object.assign(elements.safeArea.style, { left:safe.left+'px', top:safe.top+'px', width:safe.width+'px', height:safe.height+'px' })
    elements.safeArea.classList.toggle('hidden', !state.safeVisible)
    renderPreviewBoxes()
  }

  function renderPreviewBoxes() {
    if (!state.project) return
    elements.componentOverlay.innerHTML = (state.project.components || []).map(component => {
      const box = component.box
      const active = component.id === state.selectedGroup
      const canResize = active && component.geometry && (component.geometry.width || component.geometry.height)
      return `<div class="plan-box ${active ? 'active' : ''}" data-box="${escapeHtml(component.id)}" style="left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px"><span class="plan-box-label">${escapeHtml(component.label)}</span>${canResize ? '<i class="resize-handle" data-resize="1"></i>' : ''}</div>`
    }).join('')
    elements.componentOverlay.querySelectorAll('.plan-box').forEach(box => {
      box.addEventListener('pointerdown', pointerStart)
      box.addEventListener('click', event => { event.stopPropagation(); state.selectedGroup = box.dataset.box; renderComponents(); renderInspector(); renderPreviewBoxes() })
    })
  }

  function pointerStart(event) {
    event.preventDefault(); event.stopPropagation()
    const boxEl = event.currentTarget
    const component = state.project.components.find(item => item.id === boxEl.dataset.box)
    if (!component) return
    state.selectedGroup = component.id
    renderComponents(); renderInspector()
    const geometry = component.geometry || {}
    const resizing = !!event.target.dataset.resize
    const values = {}
    Object.values(geometry).forEach(path => { const field = findField(path); if (field && field.value !== undefined) values[path] = Number(field.value) })
    state.drag = { component, geometry, resizing, startX:event.clientX, startY:event.clientY, values }
    boxEl.setPointerCapture(event.pointerId)
    boxEl.addEventListener('pointermove', pointerMove)
    boxEl.addEventListener('pointerup', pointerEnd, { once:true })
    boxEl.addEventListener('pointercancel', pointerEnd, { once:true })
  }

  function pointerMove(event) {
    const drag = state.drag
    if (!drag) return
    const dx = (event.clientX - drag.startX) / state.scale
    const dy = (event.clientY - drag.startY) / state.scale
    const changes = Object.assign({}, currentChanges())
    if (drag.resizing) {
      if (drag.geometry.width && drag.values[drag.geometry.width] !== undefined) {
        const field = findField(drag.geometry.width); changes[drag.geometry.width] = clampField(field, drag.values[drag.geometry.width] + dx * 2)
      }
      if (drag.geometry.height && drag.values[drag.geometry.height] !== undefined) {
        const field = findField(drag.geometry.height); changes[drag.geometry.height] = clampField(field, drag.values[drag.geometry.height] + dy)
      }
    } else if (drag.geometry.top && drag.values[drag.geometry.top] !== undefined) {
      const field = findField(drag.geometry.top); changes[drag.geometry.top] = clampField(field, drag.values[drag.geometry.top] + dy)
    }
    setCurrentChanges(changes); markModified(); schedulePreview(90)
  }

  function pointerEnd(event) {
    const el = event.currentTarget
    el.removeEventListener('pointermove', pointerMove)
    state.drag = null
    schedulePreview(1)
  }

  function renderWarnings() {
    const warning = (state.project.warnings || [])[0]
    elements.warningStrip.className = 'warning-strip ' + (warning ? warning.level : 'ok')
    elements.warningStrip.textContent = warning ? `${warning.component}：${warning.text}` : '安全检查：当前几何未发现越界。'
  }

  function renderChanges() {
    const changes = currentChanges()
    const entries = Object.entries(changes)
    elements.changeCount.textContent = entries.length
    elements.changeHint.textContent = entries.length ? '预览已更新，尚未写入文件' : '当前没有改动'
    elements.changeList.innerHTML = entries.map(([path, value]) => {
      const field = findField(path)
      const label = field ? field.label : path
      const oldValue = field && field.originalValue !== undefined ? field.originalValue : '继承'
      const next = value === null ? '恢复继承' : value
      return `<span class="change-item"><strong>${escapeHtml(label)}</strong> · ${escapeHtml(oldValue)} → ${escapeHtml(next)}</span>`
    }).join('')
    elements.revertButton.disabled = !entries.length
    elements.saveButton.disabled = !entries.length
    elements.saveState.classList.toggle('modified', !!entries.length)
    elements.saveState.lastElementChild.textContent = entries.length ? '未保存' : '已同步'
  }

  async function save() {
    const changes = currentChanges()
    if (!Object.keys(changes).length) return
    elements.saveButton.disabled = true
    elements.saveButton.textContent = '正在保存…'
    try {
      const result = await api('/api/save', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ app:state.app, profile:state.profile, changes }) })
      state.project = result.project
      setCurrentChanges({})
      renderAll()
      showToast('已写入 ' + state.project.files.layout + '，可直接查看 git diff')
    } catch (error) { showToast(error.message, true) }
    finally { elements.saveButton.textContent = '保存到本地'; renderChanges() }
  }

  async function revert() {
    setCurrentChanges({})
    await loadProject(false)
    showToast('已撤销本次未保存改动')
  }

  elements.appSelect.addEventListener('change', async () => {
    state.app = elements.appSelect.value
    state.selectedGroup = null
    await loadProject(false)
    renderToolbar()
  })
  elements.safeToggle.addEventListener('change', () => { state.safeVisible = elements.safeToggle.checked; elements.safeArea.classList.toggle('hidden', !state.safeVisible) })
  elements.resetGroupButton.addEventListener('click', resetGroup)
  elements.saveButton.addEventListener('click', save)
  elements.revertButton.addEventListener('click', revert)
  window.addEventListener('resize', () => { if (state.project) renderPreview() })

  init()
})()
