# 维护者指南

本文面向 `vela_band` 的维护、评审和发布工作。当前规范以 [V2 Stable Architecture](REWRITE_V2_ARCHITECTURE.md)、[Design Engine](DESIGN_ENGINE.md) 和 [V2 稳定基线](STABLE_BASELINE_V2.md) 为准。

## 维护目标

每次改动都应尽量保持：

1. 同一 RPK 在 Pill / Circle / Rect 目标形态上保持可用。
2. 页面首次进入、重复进入和返回结果一致，不出现 0 高 surface、黑屏或首次挂载偏移。
3. 页面离开后不残留无意义 timer、location、health、motion、event 或异步 UI 更新。
4. Domain/Feature 行为与 UI 构图分离；页面不重新承载业务状态机。
5. 文档明确区分真实系统能力、模拟能力和产品降级。
6. `npm run check` 始终是合并前的最低质量门槛。

## 事实来源优先级

发生文档与实现冲突时，按以下顺序核对：

1. `src/manifest.json`：包名、feature、权限、路由。
2. `package.json` / `package-lock.json`：命令与依赖版本。
3. `src/capabilities/*`：原生 Vela 能力边界。
4. `src/domain/*`：业务模型、持久化和状态机。
5. `src/v2/features/*`：应用级 orchestration 与资源生命周期。
6. `src/v2/design/*`：Scene、Geometry、Design Spec/View 和 shape composition。
7. `src/pages/*`：生命周期、事件与最终渲染绑定。
8. [COMPATIBILITY.md](COMPATIBILITY.md)：特定镜像/设备差异。

`src/common`、旧 `src/presentation` 等目录可能仍保留历史实现、资源或参考代码，但它们不是新的 V2 扩展入口。V2 页面不得重新导入 legacy common 代码模块。

## V2 模块所有权

| 关注点 | 当前入口 |
| --- | --- |
| 包配置、权限、路由 | `src/manifest.json` |
| 设备/形态识别 | `src/v2/system/device_profile.js` |
| Full-bleed Scene 与 Safe Geometry | `src/v2/design/scene.js`、`src/v2/design/geometry.js` |
| 页面 Runtime | `src/v2/app/page_runtime.js` |
| 路由 | `src/v2/app/navigation.js`、`src/v2/app/app_routes.js` |
| 原生能力 | `src/capabilities/*` |
| Domain | `src/domain/*` |
| Feature Controller | `src/v2/features/*` |
| Design Spec / View | `src/v2/design/specs/*`、`src/v2/design/views/*` |
| 表盘 UI | `src/components/watchfaces/*`、`src/pages/clock/clock.ux` |
| 表盘库 | `src/pages/watchface/index.ux` |
| 应用启动器 | `src/pages/applist/applist.ux` |
| 健康 | `src/pages/heartrate/heartrate.ux` 与对应 V2 feature/design |
| 趋势 | `src/pages/history/history.ux` 与对应 V2 feature/design |
| 设置 | `src/pages/settings/*` 与对应 V2 feature/design |
| 运动 | `src/pages/workout/*` 与对应 Domain/Feature |

如果需要新增路径，优先问“它属于 Capability、Domain、Feature、Design 还是 Page”，不要直接把公共逻辑堆回页面或 `common`。

## 关键不变量

### Scene 与布局

- Design Scene 从 `(0, 0)` 覆盖完整逻辑/物理投影，不以 beta host inset 作为产品画布高度。
- 百分比字符串不能被当成像素高度解析。
- 背景 full-bleed 与前景 safe geometry 分离。
- Circle 使用 chord-aware placement，不把整页压成小内接矩形。
- 只有绝对定位子节点的 full-page wrapper 必须显式设置 Scene width/height，否则 Vela 可能把父容器折叠成 0 高。
- `overflow:hidden` 只能用于明确的视觉裁剪，不能拿来掩盖 Scene 或 safe-area 错误。
- 小型 wearable 控件若百分比尺寸在运行时不稳定，应由 Design Spec 解析为明确 px 几何。

### Design Freedom

- L1：普通列表、设置、简单详情，尽量由 Design Spec 自动解决。
- L2：共享语义、形态专用构图。Health / History / Workout 是主要参考。
- L3：表盘、蜂巢等强视觉/交互 surface。
- 如果 L1 只能靠不断缩字体才能塞下，优先升级为 L2，不要继续压缩。

### 生命周期

- `onShow` 可能重复调用，启动/加载逻辑必须可重复。
- `onHide` / `onDestroy` 必须释放当前页面不再需要的 transient resources。
- Workout pause 必须停止 1Hz tick 和 location。
- Health/motion/event 等订阅必须存在明确停止路径。
- 页面销毁后不得继续写入页面字段。

### 交互

- 一个导航手势域只有一个页面 owner。
- Clock 可在同一 owner 内同时使用 native swipe 与 raw-touch fallback，但不能让嵌套表盘组件再拥有竞争性的页面导航。
- Settings 等分页页的 swipe 与箭头必须更新同一 page state。
- 涉及 raw touch 时，要明确是否需要 `preventDefault` / `stopPropagation`，防止手势退化成滚动。

### 数据与持久化

- 页面不直接复制 Domain 计算。
- 持久化 schema 应保留旧数据 fallback，并明确升级/缺字段行为。
- 展示格式、标签和 shape-specific 视觉值优先由 Design View 输出。
- 模拟数据必须保持可识别，不得伪装成系统实时数据。

### 系统 API

- 新增原生能力优先创建/扩展 `src/capabilities` gateway。
- 必要的 manifest feature/permission 与能力修改同步提交。
- “接口存在”不等于“设备真实提供有效数据”。
- 调用失败必须有可理解的降级。
- 新发现的镜像/设备差异记录到 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 常见修改流程

### 新增功能

1. 明确产品语义和数据所有权。
2. 如涉及原生 API，先定义 Capability gateway。
3. 在 Domain 中放业务状态/持久化。
4. 在 `src/v2/features` 中组织页面需要的 application model/action。
5. 选择 L1 / L2 / L3，并在 Design Spec/View 中解决 presentation。
6. Page 只负责 lifecycle、事件和绑定。
7. 补相应 unit/contract test。
8. 运行 `npm run check`。
9. 对 Pill / Circle / Rect 做必要 smoke test。
10. 更新规范/兼容性/README 文档。

### 新增或重做页面

在写 `.ux` 前先确定：

- 是否需要滚动；
- full-bleed layer 与 safe content 的边界；
- Circle/Pill/Rect 是否应共享 composition；
- 是否有分页/返回/长按等手势冲突；
- 绝对定位 wrapper 是否拥有明确尺寸；
- 首次 mount 是否依赖不稳定测量。

对 L2/L3 页面，先写 shape strategy，再写 CSS。

### 修改表盘

- Clock 保持手势总 owner。
- 表盘组件以显示与局部点击为主，不建立第二套路由手势状态机。
- 精确表盘优先使用稳定、可预测的绝对几何。
- full-face 背景覆盖 Scene，不通过父级裁剪制造安全区。
- 修改后至少回归：冷启动、首次显示、左右切换、切回、长按表盘库、持久化恢复。

### 修改趋势/健康

- 保持 Domain 数据语义共享。
- shape-specific 表达放在 Design Spec/View。
- Circle 检查上下圆弧和中部弦宽。
- Pill 检查纵向节奏和数字完整性。
- Rect 检查 dashboard 横向信息密度。
- 删除信息层时同步删除 dead presentation state，不只用 CSS 隐藏。

## 合并前检查

```bash
npm ci
npm run check
```

然后根据改动范围做至少一次 smoke test。对于 Scene、手势、绝对定位、Watchface、Launcher、Health、History、Settings 等高风险区域，建议覆盖：

1. 冷启动；
2. 首次进入；
3. 返回；
4. 连续进入/退出 5–10 次；
5. 页面切换后状态恢复；
6. Pill / Circle / Rect 代表设备。

静态 contract test 是防回归网，不等价于真实 Vela 渲染验收。

## 分支与稳定点

当前稳定点记录在 [STABLE_BASELINE_V2.md](STABLE_BASELINE_V2.md)。推荐流程：

1. 稳定阶段完成后更新文档；
2. 将稳定实现通过 PR 合入默认分支；
3. 下一阶段从默认分支新建功能分支；
4. 不在稳定 PR 中继续加入未经验收的产品功能；
5. 发生大范围回归时优先回到最近稳定 checkpoint 做最小修复，而不是继续叠加重构。

## 文档维护

修改以下内容时必须同步维护文档：

- Scene / viewport / safe geometry；
- Design Freedom 规则；
- 新 form factor 或设备差异；
- 路由/关键手势；
- 系统能力或 fallback；
- 稳定版本/验收范围；
- 构建与检查命令。

`npm run docs:check` 会验证 Markdown 的本地链接，但不会判断文档语义是否已经过时，因此维护者仍需主动做内容审查。
