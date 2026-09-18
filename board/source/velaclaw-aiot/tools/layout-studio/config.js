'use strict'

const PROFILES = {
  circle: { id: 'circle', name: '圆屏 192', shortName: '圆屏', formFactor: 'circle', logicalHeight: 192, screenWidth: 466, screenHeight: 466 },
  pill: { id: 'pill', name: '手环 Pill', shortName: '手环', formFactor: 'pill', logicalHeight: 471, screenWidth: 212, screenHeight: 520 },
  rect: { id: 'rect', name: '方屏 228', shortName: '方屏', formFactor: 'rect', logicalHeight: 228, screenWidth: 432, screenHeight: 514 }
}

function number(path, label, options) {
  return Object.assign({ path, label, type: 'number', step: 1, min: 0, max: 600, unit: 'px' }, options || {})
}

function group(id, label, hint, fields, planKey, geometry) {
  return { id, label, hint, fields, planKey: planKey || null, geometry: geometry || null }
}

const APPS = {
  heart: {
    id: 'heart', name: '健康', level: 'L1', page: 'src/pages/heartrate/heartrate.ux', appDir: 'src/v2/design/apps/heart',
    mock: { heartRate: 76, spo2: 98, stress: 22, heartStatus: '正常', spo2Status: '良好', stressStatus: '放松', summaryText: '状态平稳', sourceText: '系统健康数据', updatedAtText: '16:48', heartTrendText: '近5次', spo2TrendText: '近5次', stressTrendText: '近5次', heartRangeText: '本次 70–82 bpm', spo2RangeText: '本次 97–99%', stressRangeText: '本次 18–25 · 均 22' },
    groups: [
      group('stream', '内容区域', '控制整页内容的宽度和顶部起点。左右位置由 Adapter 自动居中。', [number('contentWidth', '内容宽度', { min: 80, max: 192 }), number('streamTop', '顶部偏移', { min: 0, max: 120 })], 'stream', { top: 'streamTop', width: 'contentWidth' }),
      group('header', '页头', '标题与状态摘要区域。蓝框对应实际 UX 页头盒。', [number('headerWidth', '页头宽度', { min: 60, max: 192 }), number('headerHeight', '页头高度', { min: 12, max: 80 }), number('titleSize', '标题字号', { min: 5, max: 40 }), number('subtitleSize', '副标题字号', { min: 4, max: 30 })], 'headerBox', { width: 'headerWidth', height: 'headerHeight' }),
      group('hero', '心率主卡', '心率主卡的高度、间距与内边距。蓝框对应 Vela 实际元素尺寸。', [number('heroOuterHeight', '设计高度', { min: 30, max: 180 }), number('cardGap', '卡片间距', { min: 0, max: 40 }), number('cardRadius', '圆角', { min: 0, max: 60 }), number('cardPaddingX', '左右内边距', { min: 0, max: 30 }), number('cardPaddingY', '上下内边距', { min: 0, max: 30 }), number('valueSize', '主数字字号', { min: 8, max: 60 })], 'heroBox', { height: 'heroOuterHeight' }),
      group('mini', '血氧 / 压力卡', '两张小卡共用这些尺寸；蓝框覆盖整行小卡区域。', [number('miniOuterHeight', '设计高度', { min: 24, max: 160 }), number('miniValueSize', '小卡数字字号', { min: 6, max: 50 }), number('labelSize', '标签字号', { min: 4, max: 30 })], 'miniBox', { height: 'miniOuterHeight' }),
      group('detail', '趋势详情卡', '血氧与压力趋势卡共用的高度和图表参数。详情卡位于纵向滚动内容中。', [number('detailOuterHeight', '设计高度', { min: 28, max: 220 }), number('chartHeight', '图表高度', { min: 6, max: 120 }), number('trendMinHeight', '柱形最小高度', { min: 2, max: 60 }), number('scrollPaddingBottom', '底部留白', { min: 0, max: 100 })])
    ]
  },
  history: {
    id: 'history', name: '历史趋势', level: 'L2', page: 'src/pages/history/history.ux', appDir: 'src/v2/design/apps/history',
    mock: { goalText: '目标 8,000', summarySteps: '6,420', summaryCalories: '286', trendCaption: '近 7 天', trendMode: 'compact-column' },
    groups: [
      group('stream', '内容区域', '控制历史页的整体宽度和起始位置。', [number('contentWidth', '内容宽度', { min: 80, max: 192 }), number('streamTop', '顶部偏移', { min: 0, max: 120 })], 'stream', { top: 'streamTop', width: 'contentWidth' }),
      group('header', '页头', '标题、目标与副标题。', [number('headerWidth', '页头宽度', { min: 60, max: 192 }), number('headerHeight', '页头高度', { min: 12, max: 80 }), number('titleWidth', '标题区域宽度', { min: 20, max: 160 }), number('goalWidth', '目标区域宽度', { min: 20, max: 160 }), number('titleSize', '标题字号', { min: 5, max: 40 })]),
      group('summary', '摘要卡', '步数、热量等摘要卡。', [number('summaryOuterHeight', '卡片总高度', { min: 20, max: 160 }), number('summaryPaddingX', '左右内边距', { min: 0, max: 30 }), number('summaryPaddingY', '上下内边距', { min: 0, max: 30 }), number('summaryValueSize', '数值字号', { min: 5, max: 50 })]),
      group('insight', '洞察卡', '三个小型洞察卡的公共尺寸。', [number('insightOuterHeight', '卡片总高度', { min: 20, max: 140 }), number('insightPadding', '内边距', { min: 0, max: 30 }), number('insightValueSize', '数值字号', { min: 4, max: 40 }), number('cardGap', '卡片间距', { min: 0, max: 30 })]),
      group('trend', '趋势表达', 'L2 局部表达区域。这里调整尺寸；表现形式由当前 shape 的 renderer 配置决定。', [number('trend.outerWidth', '趋势区宽度', { min: 50, max: 192 }), number('trend.outerHeight', '趋势区高度', { min: 30, max: 300 }), number('trend.paddingX', '左右内边距', { min: 0, max: 30 }), number('trend.paddingY', '上下内边距', { min: 0, max: 30 }), number('trend.chartHeight', '图表高度', { min: 5, max: 160 }), number('trend.barWidth', '柱宽', { min: 1, max: 30 })])
    ]
  },
  workout: {
    id: 'workout', name: '运动中', level: 'L2', page: 'src/pages/workout/workout.ux', appDir: 'src/v2/design/apps/workout',
    mock: { modeName: '户外跑', statusText: '运动中', durationText: '18:42', durationLabelText: '运动时长', stepsText: '2,840', caloriesText: '168', distanceText: '2.31 km', heartRateText: '132', heartRateLabel: '心率 bpm', gpsText: 'GPS 已定位', pauseButtonText: '暂停' },
    groups: [
      group('header', '页头', '运动名称和状态。上下拖动可快速改 top。', [number('header.top', '顶部位置', { min: 0, max: 430 }), number('header.width', '宽度', { min: 40, max: 192 }), number('header.height', '高度', { min: 10, max: 100 }), number('titleSize', '标题字号', { min: 5, max: 40 }), number('statusSize', '状态字号', { min: 4, max: 30 })], 'header', { top: 'header.top', width: 'header.width', height: 'header.height' }),
      group('hero', '计时主区', '运动计时与 GPS 状态区域。', [number('hero.top', '顶部位置', { min: 0, max: 430 }), number('hero.width', '宽度', { min: 40, max: 192 }), number('hero.height', '高度', { min: 20, max: 220 }), number('durationSize', '计时字号', { min: 10, max: 80 }), number('durationLineHeight', '计时行高', { min: 10, max: 100 })], 'hero', { top: 'hero.top', width: 'hero.width', height: 'hero.height' }),
      group('metrics', '运动指标', '步数、热量、距离、心率的指标区域。', [number('metrics.top', '顶部位置', { min: 0, max: 430 }), number('metrics.width', '宽度', { min: 40, max: 192 }), number('metrics.height', '高度', { min: 20, max: 260 }), number('metricGap', '指标间距', { min: 0, max: 30 }), number('metricHeight', '单项高度', { min: 10, max: 120 }), number('metricValueSize', '指标数值字号', { min: 5, max: 50 })], 'metrics', { top: 'metrics.top', width: 'metrics.width', height: 'metrics.height' }),
      group('actions', '操作按钮', '暂停与结束按钮区域。', [number('actions.top', '顶部位置', { min: 0, max: 430 }), number('actions.width', '宽度', { min: 40, max: 192 }), number('actions.height', '高度', { min: 16, max: 120 }), number('actionGap', '按钮间距', { min: 0, max: 30 }), number('actionSize', '按钮字号', { min: 5, max: 40 })], 'actions', { top: 'actions.top', width: 'actions.width', height: 'actions.height' })
    ]
  },
  settings: {
    id: 'settings', name: '设置', level: 'L1', page: 'src/pages/settings/settings/settings.ux', appDir: 'src/v2/design/apps/settings',
    mock: { pageText: '1 / 3' },
    groups: [
      group('header', '页头', '设置页标题区域。', [number('header.top', '顶部偏移', { min: 0, max: 430 }), number('header.width', '宽度', { min: 40, max: 192 }), number('header.height', '高度', { min: 10, max: 80 }), number('titleSize', '标题字号', { min: 5, max: 40 })], 'capacity.header', { top: 'header.top', width: 'header.width', height: 'header.height' }),
      group('list', '设置列表', '列表可用区域与单项尺寸。', [number('list.top', '顶部偏移', { min: 0, max: 430 }), number('list.width', '列表宽度', { min: 40, max: 192 }), number('list.height', '列表高度', { min: 30, max: 420 }), number('itemHeight', '单项高度', { min: 20, max: 160 }), number('itemGap', '单项间距', { min: 0, max: 40 }), number('itemRadius', '卡片圆角', { min: 0, max: 60 })], 'capacity.list', { top: 'list.top', width: 'list.width', height: 'list.height' }),
      group('footer', '分页提示', '底部分页提示区域。', [number('footer.top', '顶部偏移', { min: 0, max: 450 }), number('footer.width', '宽度', { min: 30, max: 192 }), number('footer.height', '高度', { min: 8, max: 80 })], 'capacity.footer', { top: 'footer.top', width: 'footer.width', height: 'footer.height' }),
      group('item', '列表文字与图标', '设置卡片内部的视觉参数。', [number('itemPadding', '卡片内边距', { min: 0, max: 30 }), number('iconSize', '图标尺寸', { min: 8, max: 80 }), number('itemNameSize', '名称字号', { min: 4, max: 40 }), number('itemDescSize', '说明字号', { min: 4, max: 30 }), number('arrowSize', '箭头字号', { min: 4, max: 40 })])
    ]
  },
  faces: {
    id: 'faces', name: '表盘库', level: 'L3', page: 'src/pages/watchface/index.ux', appDir: 'src/v2/design/apps/faces',
    mock: { selectedName: '活力数字', previewName: '活力数字', pageText: '1 / 2' },
    groups: [
      group('header', '页头', '不同形态可以拥有独立 Surface，但位置仍可快速调节。', [number('header.top', '顶部偏移', { min: 0, max: 430 }), number('header.width', '宽度', { min: 30, max: 192 }), number('header.height', '高度', { min: 10, max: 100 }), number('titleSize', '标题字号', { min: 5, max: 40 })], 'header', { top: 'header.top', width: 'header.width', height: 'header.height' }),
      group('preview', '圆屏预览', '圆屏表盘预览区域；其他形态无此区域时会自动隐藏框。', [number('preview.top', '顶部偏移', { min: 0, max: 430 }), number('preview.width', '宽度', { min: 30, max: 192 }), number('preview.height', '高度', { min: 30, max: 240 }), number('previewRadius', '预览圆角', { min: 0, max: 100 }), number('previewTimeSize', '时间字号', { min: 6, max: 70 })], 'preview', { top: 'preview.top', width: 'preview.width', height: 'preview.height' }),
      group('content', '卡片 / 网格区域', 'Pill 与 Rect 的主内容区域。', [number('content.top', '顶部偏移', { min: 0, max: 430 }), number('content.width', '宽度', { min: 30, max: 192 }), number('cardHeight', '卡片高度', { min: 20, max: 220 }), number('cardGap', '卡片间距', { min: 0, max: 40 }), number('nameSize', '名称字号', { min: 4, max: 40 })], 'content', { top: 'content.top', width: 'content.width' }),
      group('pager', '分页区域', 'Pill 分页操作区域。', [number('pager.width', '宽度', { min: 30, max: 192 }), number('pager.height', '高度', { min: 10, max: 100 })], 'pager', { width: 'pager.width', height: 'pager.height' })
    ]
  },
  launcher: {
    id: 'launcher', name: '应用列表', level: 'L3', page: 'src/pages/applist/applist.ux', appDir: 'src/v2/design/apps/launcher', mock: {}, groups: []
  },
  today: {
    id: 'today', name: '今日 / 日历', level: 'L2', page: 'src/pages/today/today.ux', appDir: 'src/v2/design/apps/today', mock: {},
    groups: [
      group('frame', '圆屏固定框', 'Circle 的明确设计框。Rect/Pill 若无此项则使用各自 Surface。', [number('circleFrame.left', '左侧位置', { min: 0, max: 192 }), number('circleFrame.top', '顶部位置', { min: 0, max: 192 }), number('circleFrame.width', '宽度', { min: 20, max: 192 }), number('circleFrame.height', '高度', { min: 20, max: 192 })], 'circleFrame', { top: 'circleFrame.top', width: 'circleFrame.width', height: 'circleFrame.height' })
    ]
  },
  steps: {
    id: 'steps', name: '活动', level: 'L1', page: 'src/pages/steps/steps.ux', appDir: 'src/v2/design/apps/steps', mock: {}, groups: []
  }
}

module.exports = { PROFILES, APPS, number, group }
