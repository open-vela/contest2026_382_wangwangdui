/*
 * design-studio / exportui.js
 * The export / import modal. Tabs switch between the agent-facing prompt JSON,
 * a human summary, the Vela scaffold and the raw document.
 */

import { buildPromptJson, buildSummary, buildVelaCode, toJsonString } from './export.js'

export function createExportUI(context) {
  const { store, modal, modalTitle, modalTabs, modalBody, modalFoot, toast } = context
  let activeTab = 'prompt'
  let payloadCache = null

  const TABS = [
    { id: 'prompt', label: 'Agent 提示词 JSON' },
    { id: 'summary', label: '人类可读摘要' },
    { id: 'vela', label: 'Vela 脚手架' },
    { id: 'schema', label: '字段说明' },
    { id: 'document', label: '原始文档' }
  ]

  function open(tab) {
    activeTab = tab || 'prompt'
    payloadCache = buildPayload()
    modal.hidden = false
    render()
  }

  function close() {
    modal.hidden = true
  }

  function isOpen() {
    return !modal.hidden
  }

  function buildPayload() {
    const doc = store.getState().doc
    return {
      prompt: buildPromptJson(doc),
      summary: buildSummary(doc, buildPromptJson(doc).pages, buildPromptJson(doc).flows),
      vela: buildVelaCode(doc),
      document: doc
    }
  }

  function invalidate() {
    payloadCache = null
  }

  function render() {
    if (!payloadCache) payloadCache = buildPayload()
    modalTitle.textContent = '导出 · ' + store.getState().doc.name
    modalTabs.innerHTML = ''
    TABS.forEach((tab) => {
      const button = document.createElement('button')
      button.className = `modal-tab${tab.id === activeTab ? ' is-active' : ''}`
      button.textContent = tab.label
      button.addEventListener('click', () => {
        activeTab = tab.id
        render()
      })
      modalTabs.appendChild(button)
    })

    modalBody.innerHTML = ''
    if (activeTab === 'summary') {
      const pre = document.createElement('pre')
      pre.textContent = payloadCache.summary
      modalBody.appendChild(pre)
      const note = document.createElement('div')
      note.className = 'note-card'
      note.style.marginTop = '12px'
      note.innerHTML =
        '<strong>怎么用</strong>把这段摘要连同 JSON 一起发给 agent，它能先建立整体理解，再按页面和组合逐个实现。'
      modalBody.appendChild(note)
    } else if (activeTab === 'vela') {
      const wrap = document.createElement('div')
      payloadCache.vela.forEach((item) => {
        const head = document.createElement('div')
        head.className = 'panel-section-title'
        head.style.marginTop = '6px'
        head.innerHTML = `<span>${item.page}</span><span style="font-family:var(--mono);font-size:10px">${item.file}</span>`
        wrap.appendChild(head)
        const pre = document.createElement('pre')
        pre.textContent = item.ux
        wrap.appendChild(pre)
      })
      modalBody.appendChild(wrap)
    } else if (activeTab === 'schema') {
      const pre = document.createElement('pre')
      pre.textContent = SCHEMA_HELP
      modalBody.appendChild(pre)
    } else if (activeTab === 'document') {
      const pre = document.createElement('pre')
      pre.textContent = toJsonString(payloadCache.document)
      modalBody.appendChild(pre)
    } else {
      const pre = document.createElement('pre')
      pre.textContent = toJsonString(payloadCache.prompt)
      modalBody.appendChild(pre)
      const stats = document.createElement('div')
      stats.className = 'note-card'
      stats.style.marginTop = '12px'
      const bytes = new Blob([toJsonString(payloadCache.prompt)]).size
      stats.innerHTML = `<strong>体积</strong>${formatBytes(bytes)} · ${payloadCache.prompt.pages.length} 个页面 · ${payloadCache.prompt.flows.length} 条跳转`
      modalBody.appendChild(stats)
    }

    modalFoot.innerHTML = ''
    const note = document.createElement('span')
    note.className = 'foot-note'
    note.textContent = '导出内容只描述设计与交互意图，不包含任何编辑器内部状态。'
    modalFoot.appendChild(note)

    const actions = document.createElement('div')
    actions.className = 'foot-actions'

    const copyButton = document.createElement('button')
    copyButton.className = 'btn ghost'
    copyButton.textContent = '复制到剪贴板'
    copyButton.addEventListener('click', () => copyCurrent())
    actions.appendChild(copyButton)

    const downloadButton = document.createElement('button')
    downloadButton.className = 'btn primary'
    downloadButton.textContent = '下载 JSON 文件'
    downloadButton.addEventListener('click', () => downloadCurrent())
    actions.appendChild(downloadButton)

    modalFoot.appendChild(actions)
  }

  function currentText() {
    if (!payloadCache) payloadCache = buildPayload()
    if (activeTab === 'summary') return payloadCache.summary
    if (activeTab === 'schema') return SCHEMA_HELP
    if (activeTab === 'document') return toJsonString(payloadCache.document)
    if (activeTab === 'vela') return payloadCache.vela.map((item) => `/* ${item.file} */\n${item.ux}`).join('\n\n')
    return toJsonString(payloadCache.prompt)
  }

  function currentFileName() {
    const name = store.getState().doc.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    if (activeTab === 'document') return `${name}.document.json`
    if (activeTab === 'summary') return `${name}.summary.txt`
    return `${name}.prompt.json`
  }

  async function copyCurrent() {
    const text = currentText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const area = document.createElement('textarea')
        area.value = text
        area.style.cssText = 'position:fixed;opacity:0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        area.remove()
      }
      toast('已复制到剪贴板', 'ok')
    } catch (error) {
      toast('复制失败，请手动选择文本', 'error')
      void error
    }
  }

  function downloadCurrent() {
    const blob = new Blob([currentText()], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = currentFileName()
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    toast(`已下载 ${link.download}`, 'ok')
  }

  return { open, close, isOpen, invalidate }
}

const SCHEMA_HELP = `designstudio/v1 —— 导出 JSON 字段说明

schema            固定为 "designstudio/v1"
kind              "design-prompt"，表示这是给 agent 的设计提示词
design            设计名称、默认设备、页面数量
designTokens      颜色 / 字号 / 圆角 / 间距，agent 应优先复用，不要另造色值
devices[]         本设计用到的设备：画板尺寸(px)、物理像素、圆角、安全区、形态

pages[]           每个页面：
  id / name         页面标识与名称（跳转目标指向 id）
  device            该页使用的设备与画板尺寸
  background        页面底色
  scroll            none | vertical | horizontal | paged
  note              页面用途说明（来自页面设置）
  children[]        元素树，见下
  interactions[]    页面级交互（进入页面 / 定时器 / 滑动）
  flows[]           该页出发的所有跳转，已展开成可读描述

元素节点：
  id / name / type  type ∈ rect|ellipse|line|ring|text|button|container|
                         group|honeycomb|progress|chart|iconSlot|listRow
  box               { x, y, w, h }，画板绝对坐标，单位 px
  rotation          角度
  opacity           0–1
  sizeMode          fixed（固定）| hug（由内容决定）| fill（跟随父级）
  style.fill        颜色或 null（无填充）
  style.stroke      { color, width } 或 null
  style.radius      圆角；>=999 表示完全圆角
  style.fontSize / fontWeight / align / color / lineHeight
  text              文本内容（text / button / listRow）
  note              语义备注：这个元素或组合是干什么的
  children[]        子元素（组合 / 容器内）
  interactions[]    { trigger, direction, action, target, animation, delay }

group.note 与 note 字段是设计意图的主要载体：
agent 应该按组合整体实现，并把 note 当作实现要求而不是注释。

flows[] 是扁平化的跳转图：{ from, fromName, steps[] }，
每个 step 都带有 description，例如 "点击 → 跳转到「统计」"。`

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
