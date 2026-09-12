# V2 稳定基线

本文记录进入下一阶段功能与体验优化之前的稳定版本，用于后续回归、分支管理和比赛版本追溯。

## 基线信息

- 日期：2026-09-04
- 基线来源分支：`rewrite/vela-design-engine-v2`
- 稳定代码提交：`742b2c25672cd0d9dd6c5992bdfbc33a00db7b42`
- 项目版本：`vela_band@2.0.0`
- 目标主分支：`dev-ai-contest-2026`
- 验收状态：维护者已在当前 Vela 工程环境完成完整 `npm run check`，全部通过；关键胶囊屏、圆屏和矩形屏流程完成交互复测。

本基线的目的不是宣称所有 Vela 设备均已生产级认证，而是冻结一个**当前已验证、可继续演进的比赛开发基线**。

## 稳定架构

当前 V2 主链路：

```text
Vela APIs
  → Capability Runtime
  → Domain / State Machines
  → V2 Feature Controllers
  → V2 Design Specs + Design Views
  → V2 Design Scene
  → Pages
```

规范文档：

- [V2 架构](REWRITE_V2_ARCHITECTURE.md)
- [Design Engine / L1-L2-L3](DESIGN_ENGINE.md)
- [兼容性说明](COMPATIBILITY.md)

`src/common`、旧 `src/presentation` 等目录仍可能作为历史实现、兼容参考或资源位置存在，但 V2 页面不得重新依赖 legacy common 代码模块。新的产品能力应优先沿 Capability → Domain → Feature → Design → Page 链路扩展。

## 已冻结的显示与交互保证

### Host Scene / 多屏

- V2 Design Scene 从 `(0, 0)` 开始覆盖完整逻辑/物理投影高度。
- 不再把 `100%` 一类百分比字符串误解析成像素高度。
- Full-bleed 背景与前景安全区域分离：背景可以铺满屏幕，文字和控件按 safe/chord geometry 排布。
- 圆屏不再通过整体裁成内接矩形来保证安全。
- 胶囊屏顶部/底部不应因软件 viewport、遮罩或裁剪产生额外黑带。

### Clock / 表盘

- Clock 是表盘导航手势的单一 owner。
- 原生 swipe 与 beta runtime 所需 raw-touch fallback 可以在同一 owner 内共存，避免上滑退化成滚动。
- 圆形机械表盘采用确定性布局，首次挂载与再次切回应保持一致。
- Alpine 等 full-face 背景层覆盖完整 Scene，不通过 Clock 软件裁剪隐藏边缘。
- 表盘选择页的 Circle/Pill/Rect surface 都必须具有明确的 full-scene 尺寸，避免绝对定位子节点导致父容器 0 高黑屏。

### 应用启动器

- Pill/Rect launcher surface 显式占满 Scene，避免进入应用列表后黑屏。
- Circle launcher 使用独立 Honeycomb 交互模型。
- 表盘上滑进入应用列表、列表返回等关键导航路径已复测。

### Health

- Circle Health 使用完整圆屏 scroll canvas，并通过 chord-aware 布局避让圆弧。
- 心率主卡内部数值、图表、footer 不应因卡片高度不足而截断。
- 健康订阅仅在需要的前台生命周期保持活动。

### History / 趋势

- 已删除显示不稳定、且与趋势摘要重复的“每日记录”展示层。
- Pill 为 L2 `vertical-comparative-trend`：左侧星期/今天，中间短粗横向比较柱，右侧完整步数。
- Circle 使用紧凑 tracked bars 与圆屏友好的摘要布局。
- Rect 使用 dashboard 组合。

### Settings / Vibration

- Circle Settings 使用固定 chord-aware frame，标题和分页控制不贴圆弧。
- Settings 支持左右 swipe，并保留可点击分页箭头。
- Vibration 卡片和轻/中/强控制使用 shape-aware 明确尺寸，避免脆弱百分比布局造成控件塌缩。

## 质量门禁

稳定分支的标准门禁是：

```bash
npm ci
npm run check
```

`npm run check` 当前覆盖：

- lint
- V2 Scene
- V2 Architecture
- V2 Runtime
- V2 Visual Contracts
- V2 Interaction Contracts
- V2 Design Views
- Capability Runtime
- Power logic/runtime
- Health logic
- Activity persistence
- Settings store
- Motion logic
- Haptics logic/runtime
- Calendar logic
- Analog logic
- Honeycomb logic
- Markdown local-link check

静态检查通过后，涉及 Scene、手势、绝对定位、表盘或 shape-specific composition 的改动仍必须做模拟器/真机 smoke test。

## 建议 smoke test

每次较大 UI/Runtime 变更至少验证：

1. 冷启动进入 Clock，首次布局正确。
2. Clock 左右切表盘、长按表盘库、上滑应用列表。
3. 应用列表进入与返回，多次重复不黑屏。
4. Circle/Pill 表盘库可打开、切换并持久化。
5. Health 首屏与滚动无明显裁切。
6. History 三种 form factor 使用各自正确构图。
7. Settings 左右分页与箭头分页一致。
8. Vibration 两页布局和控制均正常。
9. Workout pause/resume 后 timer/location 生命周期正确。
10. 页面连续进入/退出与应用重启后的状态恢复正常。

## 已知的非生产级边界

- 同步模块仍以模拟 transport 为主，不代表真实 BLE 产品链路。
- 健康系统能力不可用时允许明确标识的演示数据回退；本项目不是医疗软件。
- 部分行为依赖 Vela/模拟器镜像提供的 feature，设备差异参见 [COMPATIBILITY.md](COMPATIBILITY.md)。
- GitHub 仓库当前没有为本基线提供等价于本地 `npm run check` 的完整 Actions CI；本次稳定验收以维护者本地检查和模拟器交互验证为准。

## 后续开发规则

将本基线合入 `dev-ai-contest-2026` 后：

- 主分支作为当前稳定恢复点；
- 后续功能和体验优化从主分支新建独立分支；
- 不在稳定 PR 中继续塞入 V2.1 新功能；
- 每个较大阶段再次维护文档并形成新的可回退 checkpoint；
- 下一阶段优先建设 L2 Design System v2.1，而不是再次大范围重写底层 Scene/Runtime。
