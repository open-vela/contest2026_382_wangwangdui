# Adaptive Layout Architecture

> 核心原则：复用语义与能力，不强迫复用视觉构图。默认自动适配；设计差异足够大时使用 Composition Override；坐标型交互使用专用 Engine。

## 1. 为什么不是一个万能 scale()

Vela 可穿戴设备同时存在圆屏、矩形屏与胶囊屏。`manifest.config.designWidth` 提供统一逻辑宽度，屏幕 `shape` 和安全区几何提供底层条件，但它们不能替代产品设计。

单纯把 192×490 胶囊页面等比塞入圆屏会造成：

- 内容严重缩小；
- 圆弧安全区浪费或裁切；
- 纵向信息架构不适合圆屏；
- 为了“代码相同”牺牲设计质量。

因此本项目的最终模型不是 `source UI -> scale -> target UI`，而是：

```text
Domain / Semantic Model
        ↓
Reusable Components
        ↓
Composition Resolver
        ↓
Adaptive Layout Adapter
        ↓
Viewport + Safe Geometry
        ↓
Circle / Rect / Pill
```

## 2. 三种布局模式

### 2.1 AUTO_STACK

适合普通页面、设置、简单详情、控制页、标准数据页。

开发者只声明语义区域及理想尺寸：

```js
{
  mode: 'auto-stack',
  minScale: 0.78,
  gap: 6,
  regions: [
    { id: 'header', width: 120, height: 24 },
    { id: 'content', width: 156, height: 120 },
    { id: 'actions', width: 120, height: 32 }
  ]
}
```

Adapter 负责：

1. 根据 profile 获取 logical viewport；
2. 根据每个 region 的宽度计算圆/胶囊安全纵向区间；
3. 从最大可读比例向下寻找可行 scale；
4. 自动放置纵向区域；
5. 产生 Layout Plan；
6. 如果低于 `minScale` 仍放不下，返回 `needsOverride=true`。

Adapter **禁止**为了“能显示”无限缩小。

### 2.2 FIXED_COMPOSITION

用于设计师有明确不同构图的页面。

同一个页面仍共用：

- Domain；
- Store；
- semantic component ids；
- events/actions；
- component implementation / variants。

不同屏幕只覆盖 Composition：

```js
compositions: {
  circle: {
    mode: 'fixed-composition',
    regions: [
      { id: 'chart', left: 22, top: 35, width: 148, height: 82, variant: 'compact' },
      { id: 'insights', left: 36, top: 121, width: 120, height: 34, variant: 'compact' }
    ]
  }
}
```

Adapter 不擅自改变设计师的排序和大小关系，只负责：

- 投影；
- shape 选择；
- 安全区验证；
- 输出 violations。

如果 Composition 本身越界，也返回 `needsOverride=true`，而不是静默裁切。

### 2.3 EXTERNAL_ENGINE

适合：

- 蜂巢应用列表；
- 模拟表盘；
- Canvas / 坐标游戏；
- 传感器驱动的空间交互。

Adapter 只提供：

```text
viewport
safe geometry
scale context
shape / device profile
```

具体坐标由专用 Engine 计算。

当前 `honeycomb_layout` 应归入此类，不能强迫变成普通纵向 Stack。

## 3. Layout Plan 是统一输出

所有模式最终输出：

```js
{
  id,
  shape,
  mode,
  composition,
  scale,
  safeBounds,
  regions,
  violations,
  needsOverride,
  reason
}
```

`needsOverride` 是重要的架构信号：

> 自动适配失败不是运行时灾难，而是设计阶段应该处理的显式状态。

未来 Refactor 工具、测试和 CI 都应能基于此信号判断页面是否需要人工设计。

## 4. 页面不再拥有安全区数学

最终禁止普通页面继续新增如下代码：

```text
padding-top: 21px
circleBandForWidth(...)
compact ? 58 : 84
if (isCircle) width = ...
```

这些分别应进入：

```text
Layout Spec
Composition
Component Variant
External Engine
```

旧 `@media (shape: circle)` 在迁移期保留作为 Golden Reference，但目标是逐页减少。

## 5. 页面迁移分类

### Class A — 可直接 AUTO_STACK

这些页面的语义顺序在不同形态上没有本质变化，主要差异是空间：

- `detail`
- `notification_demo` 的演示按钮页
- Settings 子页面（Bluetooth / Vibration / Brightness / Diagnostics / Motion）
- `workout_history`（标题 + 摘要 + list）
- `workout_select`（标题 + 模式卡 + resume）

迁移策略：保持组件顺序，Adapter 负责安全区和尺度；必要时使用组件 compact variant。

### Class B — 需要先组件化，再 AUTO_STACK

页面总体语义一致，但当前 CSS 已把组件尺寸/位置写死在页面：

- `workout`
- `heartrate`
- `steps`
- Settings 主页面
- `today` 的“今日摘要”部分

先提取 semantic regions/components，再交给 Adapter。

例如 Workout：

```text
WorkoutHeader
DurationHero
GpsStatus
MetricGrid
WorkoutActions
```

不是继续让 `.workout-header/.duration/.metric-grid` 各自知道 circle safe area。

### Class C — DESIGN DECISION REQUIRED（不能直接自动迁移）

以下页面当前不同形态已经不是“尺寸不同”，而是产品/交互构图不同。迁移前必须确认希望保留哪些差异。

#### C1. `applist`

当前：

- Pill：分页列表；
- Circle/Rect：蜂巢空间导航。

建议：**保留差异。**

统一语义：`AppEntry[] + openApp()`。

Composition：

- Pill → paged list/grid；
- Circle → `EXTERNAL_ENGINE(honeycomb)`；
- Rect → 可选择 honeycomb 或 grid（需要产品决定）。

#### C2. `watchface/index`

当前：

- Pill：卡片 + 两页分页；
- Circle/Rect：Swiper 大预览。

建议：**保留两种不同交互。** 表盘选择本身是高度视觉化页面，不应该为了复用做成同一种列表。

统一语义：`FaceCatalog + selectedFace + selectFace()`。

#### C3. `clock` / Watchfaces

当前表盘本身已经是不同设计：

- `sport.ux` vs `sport_circle.ux`
- `simple.ux` vs `simple_circle.ux`
- `dashboard.ux` vs `dashboard_circle.ux`
- Pill 第 4 款是 Alpine；Circle 第 4 款是 Mechanical。

建议：**绝对不要用 Adapter 强行统一模板。**

应改造成：

```text
Face Semantic Model
       ↓
Face Components / data bindings
       ↓
Pill Composition / Circle Composition
```

表盘是证明“设计差异大，但业务代码不复制”的最佳案例。

#### C4. `today`

当前 Circle 有第二页月历，Pill 没有相同交互。

需要决定：

A. 保留“圆屏独有月历”（形态能力差异）；
B. 让所有形态都提供月历，但使用不同 Composition；
C. 月历拆成独立页面，Today 所有形态只显示摘要。

在决定前，Adapter 只迁移 Today Summary，不触碰月历产品逻辑。

#### C5. `history`

历史数据本身统一，但圆屏的信息密度和 Pill 差别很大。

建议：

- Pill/Rect：完整 Summary + Chart + Insights + Records；
- Circle：Chart + compact insights 作为首屏，详细 records 作为纵向滚动后续内容或第二 Composition region。

这是 `FIXED_COMPOSITION` 的第一验证案例，不建议单纯 AUTO_STACK。

## 6. 推荐迁移顺序

1. `detail`：验证最小 AUTO_STACK API；
2. `workout`：验证真实复杂页面 AUTO_STACK + variants；
3. `history`：验证 FIXED_COMPOSITION；
4. Settings：验证列表型页面批量复用；
5. `today summary`：验证同组件不同尺寸；
6. `heartrate / steps`；
7. `applist`：接入 EXTERNAL_ENGINE；
8. Watchface selector；
9. Clock / Watchfaces 最后迁移。

## 7. 设计自由规则

1. Adapter 解决“空间约束”，不是替设计师做所有构图决策。
2. 默认布局必须能够自动运行在新屏幕上。
3. Designer Override 优先于自动结果。
4. Override 只能修改 Presentation / Composition，不能复制 Domain。
5. 自动适配低于最低可读比例时必须失败并要求 Override。
6. 形态特例不能进入 Domain。
7. 设备兼容 bug 不能进入页面 Composition，应进入 viewport compatibility。
8. EXTERNAL_ENGINE 只能拥有几何/交互算法，不能拥有业务数据。

## 8. 当前实现文件

```text
src/presentation/layout/
├── adapter.js       # Layout Plan 求解
├── composition.js   # default + shape override 合并
├── constraints.js   # shape-safe region validation
└── runtime.js       # 页面绑定入口
```

下一阶段才开始逐页迁移；Class C 页面必须先完成产品确认。
