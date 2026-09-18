# Adapter-first v2.2

V2.2 把多形态适配重新收敛到“开发者友好、少重写代码”的目标。

核心原则：

> 先设计一套跨形态成立的最佳信息结构，再由 Adapter 为每块屏寻找最合适的几何解。

## L1 / L2 / L3

### L1：几何适配

只改变空间，不改变表达与交互：

- 宽度、高度分别计算；
- x / y 可以重新选择；
- gap、圆角、字号、列数可以变化；
- 圆屏可以根据真实圆弦宽度自动重新定位；
- 页面组件树保持一套。

典型页面：健康、设置、震动、蓝牙、亮度、通知等。

L1 的目标不是把同一页面等比缩放，而是让同一组件树在不同可用空间中重新求解几何。文字也属于几何约束：关键标题、状态、单位和底部说明必须拥有显式 line box，不能依赖字体默认测量后再靠截图修补。

### L2：局部表达适配

页面主体仍然是一套，只允许局部组件改变表达方式。

例如七日步数：

- Circle / Rect：参考“历史步数”柱状图，7 根直接柱体，每根柱下方依次显示精确步数、星期和日期；
- 长胶囊：横向比较行 + 完整数值。

Header、摘要、洞察、数据、交互仍然共享。

典型页面：历史趋势、运动中的复杂指标表达。

### L3：独立 Surface

只有当交互模型或页面结构本身不同，才允许独立前端 Surface。

典型例子：

- Circle Launcher Honeycomb；
- Pill Launcher List；
- Rect Launcher Grid；
- 不同形态的 Watchface。

L3 可以拥有独立布局算法、手势和动画，但仍共享 Domain / Feature / Catalog / Route。

## 升级规则

开发新页面时按顺序判断：

1. 改位置、尺寸、列数能解决吗？使用 L1。
2. 只有某个局部组件需要换一种数据表达吗？该组件升级到 L2。
3. 连用户如何操作都不同吗？才允许 L3。

原则是：

> 能 L1 不 L2，能 L2 不 L3。

## Adapter API

`src/v2/design/adapter.js` 提供开发者需要的最小几何能力：

- `contentWidth(profile, overrides)`：形态默认内容宽度，并允许页面声明轻量宽度 override；
- `fitBand(...)`：根据宽高分别计算，圆屏使用真实圆弦宽度，可自动重新选择 y；
- `grid(region, columns, gap)`：统一列宽计算；
- `heightScale(...)`：只按纵向空间生成受限缩放；
- `createPlan(...)`：给 plan 标注 L1/L2/L3 与 v2.2 版本。

Adapter 不生成业务文案，不拥有 Feature，不要求页面复制三套模板。

## 本版本迁移

### L1

- `settings_detail.js`：蓝牙、震动等详情页共享同一套几何 Adapter；
- `vibration.ux`：删除 `applyShape()` 三分支，所有控件尺寸来自同一个 plan；
- `health.js + heartrate.ux`：三套 Circle/Pill/Rect 模板合并成一套健康信息流，形态只改变几何；
- Circle Health 使用同一 L1 结构下的 136px 内容宽度 override、显式文字 line box 和尾部滚动空间，避免圆形遮罩和字体测量造成文字截断；
- `settings_menu.js`：同一分页列表通过 Adapter 调整 Header/List/Footer 的宽度和位置。

### L2

- `history.ux`：原来的三整套页面合并为一个 Shell；
- 只有趋势区保留两种局部表达：`compact-column` 与 `comparative-row`；
- `compact-column` 遵循步数柱状图参考：标题“历史步数”，7 根蓝色柱体，下方显示精确步数、星期、日期，不再使用灰色柱槽替代设计。

### L3

- Launcher Honeycomb/List/Grid 不在本次收敛中合并，因为它们的交互模型确实不同。

## 设计目标

普通开发者新增一个健康/设置类页面时，应只写：

1. 一个 Feature/ViewModel；
2. 一个 `.ux` 组件树；
3. 一个 L1 spec 描述所需区域。

只有局部图表表达需要变化时，再提供 L2 variation。绝大多数 App 不需要理解 L3。
