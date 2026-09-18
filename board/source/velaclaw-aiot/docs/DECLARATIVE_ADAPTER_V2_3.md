# Declarative Adapter v2.3

V2.3 把多形态适配从“算法猜设计”收敛成“配置声明设计，Adapter 只做必要计算”。

核心原则：

> 人决定比例，算法保证合法。

## 为什么进入 v2.3

V2.2 证明了一个问题：圆弦、动态高度、字体缩放、padding 修正等算法不断叠加后，虽然可以自动避开一部分裁切，却会让最终界面越来越难预测。修一个截图时新增的公式还可能改变另一个组件的比例。

V2.3 因此删除这类审美启发式。开发者直接声明希望的尺寸、间距和局部表达；Adapter 只负责合并配置、放置区域、网格宽度、Vela content-box 换算和边界保护。

## 目录

每个 App 都拥有独立设计子目录：

```text
src/v2/design/apps/
  steps/
    layout.js
    index.js
    view.js
  heart/
    layout.js
    index.js
    view.js
  history/
    layout.js
    index.js
    view.js
  workout/
    layout.js
    index.js
    view.js
    selection_layout.js
    selection.js
    selection_view.js
    history_layout.js
    history.js
    history_view.js
  launcher/
  clock/
  faces/
  settings/
  sync/
  brightness/
  vibration/
  motion/
  diagnostics/
  notification/
  today/
```

`layout.js` 是 JSON 形状的纯对象，不包含函数。项目继续使用 `.js` 而不是原生 `.json`，是为了保持当前 Vela Quick App 模块加载方式稳定；从开发者视角它仍然是声明式配置。

旧的 `design/specs/*` 与 `design/views/*` 仅保留为无逻辑兼容入口，避免一次性改动所有现有页面。新代码应直接引用 `design/apps/<app>`。

## L1 / L2 / L3

### L1：几何配置

同一组件树、同一功能、同一交互，只修改空间参数：

```js
module.exports = {
  base: {
    contentWidth: 164,
    cardGap: 6,
    heroOuterHeight: 92
  },
  circle: {
    contentWidth: 136,
    cardGap: 5,
    heroOuterHeight: 82
  },
  pill: {
    contentWidth: 168,
    heroOuterHeight: 116
  }
}
```

允许声明宽、高、top、对齐、gap、padding、字号、圆角、列数。Health、Settings、Bluetooth、Brightness、Vibration 等都应优先使用 L1。

### L2：局部表达配置

页面 Shell 仍然共享，仅局部 renderer 不同。例如 History：

```js
circle: {
  trend: { mode: 'compact-column', outerHeight: 68 }
},
pill: {
  trend: { mode: 'comparative-row', outerHeight: 190 }
}
```

业务数据、Header、摘要和洞察仍然是一套。Workout 也保持一个页面，由 recipe 配置不同形态的区域，而不创建三个页面。

### L3：独立 Surface

只有交互模型本身不同才使用 L3：

- Circle Launcher：Honeycomb；
- Pill Launcher：Paged List；
- Rect Launcher：Grid；
- Watchface / Watchface Selector：形态独立 Surface。

即使是 L3，Catalog、Feature、Route 和 Capability 仍然共享。

## Adapter 只保留什么

`src/v2/design/adapter.js` v2.3 只保留：

- `select / merge`：合并 `base + shape` recipe；
- `contentWidth`：读取声明宽度；
- `region / placeBand`：按 recipe 放置并限制在 Host Scene / Safe Region；
- `circleChordWidth / circleBandWidth`：仅在 recipe 显式要求 `circleFit` 时做圆弦安全校验；
- `grid`：计算等列宽度；
- `contentBox`：把“期望外部尺寸”换算成 Vela padding 下的 CSS content box；
- `createPlan`：附加 v2.3、L1/L2/L3 元数据。

删除：

- `heightScale`；
- `fitTop`；
- `fitBand`；
- `availableBandWidth`；
- 为截图自动扫描最佳位置的循环；
- `assisted.js` 中的旧 L2 Design Engine helper；
- `paged_stack.js` 的动态 Settings 高度猜测；
- 未使用的 `simple_center.js`。

Adapter 不再决定“什么比例最好看”。

## Box Model 规则

Recipe 声明的是组件希望占据的外部尺寸。例如：

```js
heroOuterHeight: 82,
cardPaddingX: 7,
cardPaddingY: 6
```

Adapter 用 `contentBox()` 反算真正写入 UX 元素的 width / height，保证 padding 不会再次把卡片撑大。

因此页面不需要重复处理 Vela 的 padding 盒模型。

## App 归属

- `steps`：L1 goal progress；
- `heart`：L1 Health；
- `history`：L2，仅 Trend renderer 分叉；
- `workout`：L2，同一页面 + 声明式区域；
- `settings/sync/brightness/vibration/motion/diagnostics/notification`：L1；
- `today`：L2；
- `launcher/clock/faces`：L3。

## 开发规则

开发一个普通新 App 时：

1. 写一个页面组件树；
2. 在自己的 `design/apps/<app>/layout.js` 写 recipe；
3. `index.js` 把 recipe 交给 Adapter；
4. 只有局部数据表达真的不同才增加 L2 renderer；
5. 只有交互模型不同才建立 L3 Surface。

不要为了一个截图往 Adapter 增加新的缩放函数或自动搜索算法。如果某种设备需要更好的比例，直接修改该 App recipe。

## 验证

```bash
cd quickapp/velaclaw-aiot
npm run v2:declarative
npm run v2:design-system
npm run v2:visual
npm run check
```

真机 / 模拟器仍需检查 Circle / Pill / Rect，重点确认 Health、History、Workout、Settings 以及 Launcher/Watchface 的 L3 行为。
