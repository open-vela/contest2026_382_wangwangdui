/**
 * 圆屏 / 胶囊屏安全区回归校验
 *
 * 快应用在 192 设计画布上排版，但圆屏和胶囊屏的四角会被物理外形切掉。以前只能靠
 * 模拟器截图肉眼发现遮挡，改一处布局就要重截一轮。本脚本按页面的纵向流式布局累加
 * 每个子元素的 margin-top / height / margin-bottom，算出它在 192 画布中的真实位置，
 * 再交给 src/common/safe_area.js 的几何模型判断四角是否落在内切圆内。
 *
 * 不依赖模拟器，`npm run check` 就能拦住越界改动。
 *
 * 只描述纵向排布的顶层子元素；行内元素由父容器约束，重复校验会产生噪声。
 */
const fs = require('fs')
const path = require('path')
const safeArea = require('../src/common/safe_area')

const root = path.resolve(__dirname, '..')
const errors = []

/**
 * 去掉 CSS 注释。
 * 规则解析按“上一个右花括号之后的内容即选择器”切分，注释会被并入选择器文本，
 * 导致 `.calendar-page` 这类紧跟在注释后的规则匹配不上而静默退回默认值。
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 取出 .ux 文件里 @media (shape: circle) 区块的内容。 */
function extractCircleBlock(source) {
  const marker = source.indexOf('@media (shape: circle)')
  if (marker < 0) return ''
  let depth = 0
  let started = false
  for (let index = marker; index < source.length; index++) {
    const char = source[index]
    if (char === '{') {
      depth++
      started = true
    } else if (char === '}') {
      depth--
      if (started && depth === 0) return source.slice(marker, index + 1)
    }
  }
  return source.slice(marker)
}

/**
 * 读取某个选择器上的一条数值属性，找不到返回 null。
 *
 * 逐条扫描 `选择器列表 { 声明 }`，因为工程里普遍用逗号分组书写
 * （如 `.device-card, .capability-list { width: 148px }`），
 * 只按单选择器匹配会漏读并静默退回基础样式，得到偏大的错误尺寸。
 * 后出现的规则覆盖先出现的，与层叠顺序一致。
 */
function readNumeric(block, selector, property) {
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g
  const valuePattern = new RegExp('(?:^|;)\\s*' + property + '\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px')
  let result = null
  let rule
  while ((rule = rulePattern.exec(block)) !== null) {
    const selectors = rule[1].split(',').map(function (item) {
      return item.trim()
    })
    if (selectors.indexOf(selector) < 0) continue
    const valueMatch = rule[2].match(valuePattern)
    if (valueMatch) result = Number(valueMatch[1])
  }
  return result
}

/** 圆屏样式优先，回退到基础样式（只在圆屏渲染的容器无需 @media 覆盖）。 */
function readEffective(circleBlock, baseSource, selector, property) {
  const scoped = readNumeric(circleBlock, selector, property)
  if (scoped !== null) return scoped
  return readNumeric(baseSource, selector, property)
}

/** 读取页面根节点的顶部内边距，兼容 padding 简写。 */
function readPaddingTop(circleBlock, baseSource, selector) {
  const explicit = readEffective(circleBlock, baseSource, selector, 'padding-top')
  if (explicit !== null) return explicit
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g
  let result = null
  let rule
  while ((rule = rulePattern.exec(circleBlock || baseSource)) !== null) {
    const selectors = rule[1].split(',').map(function (item) {
      return item.trim()
    })
    if (selectors.indexOf(selector) < 0) continue
    const shorthand = rule[2].match(/(?:^|;)\s*padding\s*:\s*(-?\d+)px/)
    if (shorthand) result = Number(shorthand[1])
  }
  return result === null ? 0 : result
}

/**
 * 各圆屏页面的纵向内容流。
 *
 * children 按模板中的出现顺序排列；只列出参与纵向排布、且声明了高度的顶层元素。
 * 同一时刻只显示其一的分支页（如 settings 的列表与 diagnostics 的两种卡片）
 * 拆成独立条目分别校验。
 *
 * 不包含 applist 的 `.circle-honeycomb`：那是一块铺满画布的拖拽舞台，图标坐标在
 * 运行时按手指位置计算，本来就允许滑出可视圆之外。它的约束是“聚焦态图标与名称板
 * 必须在圆内”，属于运行时不变量，不适合静态盒模型校验。
 */
const CIRCLE_PAGES = [
  {
    page: 'src/pages/today/today.ux',
    root: '.today-page',
    flows: [
      { name: '摘要页', children: ['.summary-page'] },
      { name: '月历页', children: ['.calendar-page'] }
    ]
  },
  {
    page: 'src/pages/settings/settings/settings.ux',
    root: '.settings-page',
    flows: [
      { name: '设置列表', children: ['.top-row', '.settings-list', '.pager-row'] }
    ]
  },
  {
    page: 'src/pages/settings/diagnostics/diagnostics.ux',
    root: '.diagnostics-page',
    flows: [
      { name: '屏幕档案页', children: ['.top-row', '.device-card', '.pager-row'] },
      { name: '能力列表页', children: ['.top-row', '.capability-list', '.pager-row'] }
    ]
  },
  {
    page: 'src/pages/workout/workout.ux',
    root: '.workout-page',
    flows: [
      { name: '运动中', children: ['.workout-header', '.metric-grid', '.action-row'] }
    ]
  },
  {
    page: 'src/pages/workout_history/workout_history.ux',
    root: '.history-page',
    flows: [
      { name: '运动记录', children: ['.top-row', '.summary-row', '.record-scroll'] },
      { name: '空记录态', children: ['.top-row', '.summary-row', '.empty-state'] }
    ]
  }
]

CIRCLE_PAGES.forEach(function (target) {
  const source = stripComments(fs.readFileSync(path.join(root, target.page), 'utf8'))
  const circleBlock = extractCircleBlock(source)
  if (!circleBlock) {
    errors.push(target.page + ' 缺少 @media (shape: circle) 适配区块')
    return
  }
  const baseSource = source.replace(circleBlock, '')

  target.flows.forEach(function (flow) {
    let cursor = readPaddingTop(circleBlock, baseSource, target.root)

    flow.children.forEach(function (selector) {
      const height = readEffective(circleBlock, baseSource, selector, 'height')
      const width = readEffective(circleBlock, baseSource, selector, 'width')
      const marginTop = readEffective(circleBlock, baseSource, selector, 'margin-top') || 0
      const marginBottom = readEffective(circleBlock, baseSource, selector, 'margin-bottom') || 0

      if (height === null || width === null) {
        errors.push(target.page + ' ' + selector + ' 未声明宽高，无法校验圆屏安全区')
        return
      }

      cursor += marginTop
      const left = Math.round((safeArea.DESIGN_WIDTH - width) / 2)
      if (!safeArea.fitsInCircle(safeArea.DESIGN_WIDTH, left, cursor, width, height)) {
        const band = safeArea.circleBandForWidth(safeArea.DESIGN_WIDTH, width)
        errors.push(
          target.page + ' [' + flow.name + '] ' + selector + ' 超出圆屏安全区：' +
          width + '×' + height + ' 落在 y=' + cursor + '..' + (cursor + height) +
          '，该宽度仅有 y=' + band.top + '..' + band.bottom + ' 可用'
        )
      }
      cursor += height + marginBottom
    })
  })
})

// 安全区模型本身的不变量，防止有人调参后破坏几何前提。
if (safeArea.capsuleCapInset(192, 168) !== 50) {
  errors.push('胶囊端帽推导偏离真机校准值 50px，请同步复核 test/safe_area.test.js')
}
if (safeArea.inscribedSquare(192) !== 135) {
  errors.push('圆屏内接正方形不再是 135px，蜂巢画布尺寸需要重新推导')
}

if (errors.length > 0) {
  errors.forEach(function (error) {
    console.error('safe-area error: ' + error)
  })
  process.exitCode = 1
} else {
  const flowCount = CIRCLE_PAGES.reduce(function (total, item) {
    return total + item.flows.length
  }, 0)
  console.log('Checked circle safe-area geometry for ' + flowCount + ' content flows')
}
