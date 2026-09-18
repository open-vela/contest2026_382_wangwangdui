# Vela Band 架构重构 · Phase 1 开发文档

> 目标：在**保持当前功能、交互、视觉不变**的前提下，完成结构性重构，为 Phase 2（圆屏/方屏/胶囊屏多形态适配）建立健康架构。
> 当前版本是 **Golden Reference**：Before ≈ After。
>
> 分支：`feat/velaclaw-aiot` · 评估日期：2026-08-31

## 状态图例

| 标记 | 含义 |
| ---- | ---- |
| ✅ | 已完成 |
| 🟡 | 进行中 / 半完成（文档内注明已完成部分与未完成部分） |
| ⬜ | 未开始 |
| ⛔ | 本阶段明确不动 |
| ❗ | 已确认缺陷（属修复，不计入重构） |

---

## 一、Current Architecture Assessment

### 1.1 当前工程结构

```
src/
├── app.ux                  # 空壳，仅日志
├── manifest.json           # 20 页面路由，入口 pages/clock_guard，designWidth=192
├── pages/                  # 20 个页面（8221 LOC）
│   ├── clock / clock_guard # 主表盘宿主 + 启动守卫
│   ├── today / heartrate / steps / history / index / detail   # 健康域
│   ├── workout / workout_select / workout_history               # 运动域
│   ├── watchface / applist / notification_demo                  # 导航/表盘/通知
│   └── settings/{settings,bluetooth,vibration,brightness,diagnostics,motion}
├── common/                 # 30 个共享模块（4087 LOC）
│   ├── 数据服务: watch_data, workout_manager, health_sample_service,
│   │            health_metrics, device_settings, notification_manager,
│   │            sync_protocol, face_registry, launcher_apps, storage_adapter
│   ├── 设备能力: power_manager, gps_tracker, ble_sync, haptic_feedback
│   ├── 屏幕适配(在制品): screen_profile, page_viewport, safe_area,
│   │            viewport_math, honeycomb_layout, swipe_back
│   └── 工具/导航: utils, lifecycle_manager, page_motion, navigation_guard,
│                fixed_pager, calendar_utils, analog_face, face_scope,
│                motion_metrics, page_viewport
├── components/watchfaces/  # 8 个表盘组件（1642 LOC）
│   └── simple / dashboard / sport 各有 pill 与 _circle 双版本；
│       alpine 仅 pill，mechanical 仅 circle（face_scope 控制）
└── i18n/, config-watch.json
test/                       # 11 个纯逻辑测试（530 LOC）
scripts/                    # lint + UI/逻辑检查脚本
```

**依赖方向（现状）**：页面 → common 服务 → 系统 API；页面不直接读写 storage（唯一例外是 diagnostics 的能力探测，合理）。这是已经做对的部分。

### 1.2 业务逻辑与 UI 混合（按严重度排序）

| 页面 | 混合内容 |
| ---- | ---- |
| `heartrate.ux` (585) | 最重：区间计算、柱高/颜色映射、状态→中文文案/建议的状态机（L98-126、L255-297）全部内联 |
| `clock.ux` (1005) | 时间脏检查、手势方向状态机、300ms 防抖、电量→颜色映射、alpine 布局 px 计算（L204-218、L312-320、L338-349、L660-676） |
| `applist.ux` (768) | ~450 行蜂巢几何/缓动/吸附（L58-526），`honeycomb_layout.js` 已抽出但页面未接入，双份实现 |
| `steps.ux` (345) | makeBars 归一化、formatNumber 千分位、趋势合成内联（L41-109）；模块级可变 `chartH` 有副作用风险 |
| `workout_history.ux` (368) | 累计步数聚合、同步/距离文案格式化内联（L93-96） |
| `bluetooth.ux` (490) | 同步编排的进度文案拼装内联（L183-201）；协议与传输本身已分层 |
| `vibration.ux` (335) | refreshView 手工展开 4 模式×（背景/文案/颜色）25 行（L151-175） |

**正面范本**（委托模式已成型，不动）：`workout.ux` → workout_manager/gps_tracker；`notification_demo.ux` → notification_manager；`settings/motion.ux` → motion_metrics。

### 1.3 重复业务逻辑

- `pad2` × 6 份：`utils.js:21`（已导出但无人用）、`watch_data.js:78`、`workout_manager.js:67`、`calendar_utils.js:103`、`health_sample_service.js:43`、`clock.ux:207`
- 日期/时间格式化 × 4 套：`watch_data.formatDate` / `workout_manager.formatDateTime` / `health_sample_service.formatTime` / `utils.formatShortDate`（无人用）
- clamp/夹取 × 3+：`utils.clamp`（无人用）、`watch_data.clampPercent`、`clock.ux` 手写、各模块 `toNumber` 变体 × 8
- 健康订阅 + `lastXxxUpdatedAt` 脏检查模式：`clock` / `today` / `heartrate` 三页雷同
- 柱状图归一化 × 3：`steps.makeBars` / `heartrate.makeMetricBars` / `watch_data` 内部
- 设置页两页导航（`previousPage/nextPage/handleSwipe`）：settings/vibration/diagnostics/motion 四处逐字重复
- 表盘组件 `router.push` 跳转与 props：8 个 watchface 文件脚本近乎 100% 复制

### 1.4 重复 UI 元素（语义判断）

| 元素 | 出现处 | 语义相同? | 结论 |
| ---- | ---- | ---- | ---- |
| 标题栏（top-row + page-title） | 12 页 | ✅ 是 | 抽 `PageHeader` 组件 |
| 分页器（‹ 页码 › / 圆点） | 5+ 页，CSS 逐字复制 | ✅ 是 | 抽 `PagerBar`，与 fixed_pager 合并 |
| 健康指标块（值+单位+标签） | heartrate/today/workout/4 表盘 | ✅ 是 | 抽 `MetricCell`（variant 参数化） |
| 线性进度条（track+fill） | 5+ 处 | ✅ 是 | 抽 `LinearProgress` |
| 表盘选择卡 | watchface 4 卡逐字雷同 | ✅ 是 | for 循环化 |
| 卡片容器（圆角/底色） | 多种卡片 | ❌ 仅外观相似 | 共享 CSS token，不抽组件 |
| 开关 / 空状态 | 各仅 1 处 | — | 暂不抽 |

### 1.5 Magic Number 分类（只分类，不批量替换）

| 类别 | 代表 | 位置 |
| ---- | ---- | ---- |
| 设备/屏幕常量（唯一合法处） | 192 / 490 | `manifest.json:57`、`screen_profile.js:89-121`、`safe_area.js:25`、`viewport_math.js:9` |
| 泄漏点 ❗ | `clock.ux:315` 内联 `*192/`；`simple_circle.ux:59`、`dashboard_circle.ux:63` 写死 192px 画布 | 应收敛到 screen_profile |
| 布局尺寸高频值 | 148px×39、164px×25、168px | heartrate / bluetooth / today / watchface / motion / diagnostics |
| 视觉 token 缺失 | font-size 7/8/9/10/11/12/13px 分档极碎（7px×47、10px×42…）；radius 8px×24、2px×19 | 待建 token，不批量替换 |
| 动画/手势参数 | FRAME_MS=16（page_motion 与 applist 双份）、手势阈值 36/30、8000/15000ms | 部分可提常量 |
| 业务参数 | stepsGoal=6000、caloriesGoal=300、standGoal=12、演示心率 88 | `watch_data.js:26-30` |
| 传感器阈值 | 心率 60/100/140、压力 30/60/80（函数内裸数字）、GPS 超时 6000ms | `health_metrics.js:10-22`、`gps_tracker.js:99` |

### 1.6 生命周期风险

整体健康：**23/24 ≈ 96% 资源正确配对释放**，所有含资源页面均在 `onHide` 暂停（页面栈常驻场景安全），重复创建有防护。

| 问题 | 位置 | 级别 |
| ---- | ---- | ---- |
| ~~❗ clock 通知失效 bug：onShow 重入时 `addSubscription('notification')` 触发旧 unsubscribe 执行 `destroy()`，拆掉事件/互联监听 → 表盘 hide→show 后通知失效~~ **已修复（P0-1，待设备回归）**：`notification_manager.init()` 改引用计数；`clock.ux` onChange 每次重绑、init/订阅一次性；`notification_demo.ux` destroy 仅在 onDestroy | `clock.ux` initNotificationManager / `notification_manager.js` | ~~功能性缺陷~~ ✅ |
| ~~⚠️ 无 `onDestroy`，resumeTimer 仅 onHide 清理~~ **已修复（P0-2）**：补 `onDestroy` 清理 resumeTimer 并复位守卫标志 | `clock_guard.ux` | 已闭环 ✅ |
| ⚠️ `latestHealthSample` 退出不清空 | `clock.ux` | 极低 |
| ℹ️ `lifecycle_manager` 仅 2/20 页使用（clock、workout），其余手工配对 | 全局 | 风格不统一，非泄漏 |

### 1.7 依赖方向违规（业务层感知屏幕形状）

- ❗ `watch_data.js:136-143`：`cloneHeartRateData()` 预算 `barHeight`(pill) 与 `circleBarHeight`(circle) —— 数据层感知形状，需移回视图层
- 可接受的形态配置：`launcher_apps.js` 的 PILL/CIRCLE_APP_IDS、`face_registry.js` 的 circleOnly/pillOnly（这是注册表职责）
- 形状判断在 JS 中已集中到 `screen_profile`（各页读 isCircle/isPill）；但 `@media (shape: circle)` 块散在 16 个文件，且存在逐字重复（如 `.pager-row` 152→132px 在 vibration 与 motion 双份）

### 1.8 模块处置决策

**适合先动**：`utils`（收敛重复工具）、`watch_data`（拆职责+去形状）、`applist`（接入 honeycomb_layout）、`heartrate`（状态机下沉）、`lifecycle_manager`（扩大使用面）、设置页导航收敛。

**⛔ 暂时不动**：`notification_manager`（先修 clock 侧误用）、`ble_sync`/`sync_protocol`（模拟链路，稳定）、`power_manager`（三档状态机复杂且仅 clock 使用）、`page_motion` 转场动画、`calendar_utils` 农历算法、所有 `<style>` 视觉层、manifest 路由结构、表盘组件的样式差异（那是真实的形状差异，不是重复）。

---

## 二、Baseline 记录（Golden Reference）

### 2.1 页面基线（20 页）

| 页面 | LOC | 进入方式 | 关键资源 | 清理状态 |
| ---- | --- | -------- | -------- | -------- |
| clock_guard | 119 | manifest 入口 | 50ms setTimeout | ⚠️ 缺 onDestroy |
| clock | 1005 | clock_guard push | 3×interval、health 订阅、battery、加速度计(抬腕)、通知 | ✅（有重入 bug❗） |
| today | 276 | alpine/mechanical 表盘、applist | health 订阅 | ✅ |
| heartrate | 585 | 表盘点心率区、applist | health 订阅 | ✅ |
| steps | 345 | 表盘点步数区、applist | 仅快照读 | ✅ |
| history | 505 | steps、applist | 仅快照读 | ✅ |
| workout | 521 | workout_select | 1s interval、GPS（经 lifecycle_manager 托管） | ✅ 最规范 |
| workout_select | 332 | applist | 无 | ✅ |
| workout_history | 368 | workout_select | 无 | ✅ |
| watchface | 850 | clock 长按 | 无 | ✅ |
| applist | 768 | clock 上滑 | 蜂巢动画 timer | ✅ |
| notification_demo | 251 | applist | 全委托 notification_manager | ✅ 范本 |
| settings | 322 | applist | 无 | ✅ |
| bluetooth | 490 | settings | BLE 模拟（经 manager） | ✅ |
| vibration | 335 | settings | 1s timer、vibrator | ✅ |
| brightness | 424 | settings | @system.brightness | ✅ |
| diagnostics | 254 | settings | 仅能力探测 | ✅ |
| motion | 346 | settings | 加速度计、100ms interval | ✅ |
| index / detail | 72/53 | 仅 manifest 登记（模板页） | 无 | ✅ |

### 2.2 Storage Key 清单（全部经 storage_adapter）

| Key | 归属 |
| --- | ---- |
| `selected_face_id` / `right_face_transition` | watch_data（表盘偏好） |
| `health_history_7d` / `hourly_heart_rate_24h` | watch_data（健康仓储） |
| `active_workout_v1` / `workout_records_v1` | workout_manager |
| `device_settings_v1` | device_settings（振动/亮度/抬腕/低功耗/蓝牙态/同步时间） |

### 2.3 指标基线（Before Refactor）

```
总 LOC（src）          ≈ 13,950
pages LOC               8,221（20 页）
common LOC              4,087（30 模块）
components LOC          1,642（8 表盘）
tests LOC                 530（11 个）
重复工具函数             pad2×6 · 日期格式×4 · clamp×3 · 柱归一化×3
资源释放正确率           23/24 ≈ 96%
形状判断泄漏             数据层 1 处（watch_data）· CSS 16 文件 @media
lifecycle_manager 覆盖  2/20 页
```

### 2.4 未提交在制品（working tree，重构前已存在的多屏适配工作）

- 已修改：`screen_profile.js` 及 20+ 页面
- 新增未跟踪：`page_viewport.js`（已被 ~20 页引用，收敛视口样板）、`safe_area.js`、`swipe_back.js`（5 页使用）、`honeycomb_layout.js`（**applist 未接入，双份实现**）、对应测试与检查脚本

---

## 三、Refactor Plan

> 原则：每次只改一个模块 → 构建 → 自检 → 再下一步。发现行为变化优先修复，不带病推进。

### P0 —— 立即执行（风险最低 / 缺陷修复）

| # | 事项 | 目的 | 涉及文件 | 风险 | 影响 UI | 验证方式 | 状态 |
| - | ---- | ---- | -------- | ---- | ------- | -------- | ---- |
| P0-1 | ❗ 修复 clock 通知重入失效 | 修缺陷：hide→show 后通知不再丢失 | `clock.ux`、`notification_manager.js`、`notification_demo.ux` | 低（仅改初始化时序） | 否 | 表盘→上滑 applist→返回，触发演示通知 | ✅ 完成（2026-08-31 设备回归通过） |
| P0-2 | clock_guard 补 onDestroy | 消除 timer 残留窗口 | `clock_guard.ux` | 极低 | 否 | 启动链路回归 | ✅ 完成（2026-08-31 本地验证通过） |
| P0-3 | utils 收敛：6 处 pad2、4 套日期格式、3 处 clamp → `utils.js` | Stage 1 完成 | `utils/watch_data/workout_manager/calendar_utils/health_sample_service/clock.ux` | 极低（纯函数等价替换） | 否 | `npm run check` + 各页时间显示比对 | ✅ 完成（2026-08-31 本地验证通过） |
| P0-4 | watch_data 去形状：`barHeight/circleBarHeight` 移回视图层 | 业务层不感知屏幕 | `watch_data.js`、`heartrate.ux`、`clock.ux` | 低 | 否（柱高数值不变） | `health:logic` + 心率/表盘页目视 | ⬜ |

### P1 —— 结构收敛（单模块逐个推进）

| # | 事项 | 目的 | 涉及文件 | 风险 | 影响 UI | 验证方式 |
| - | ---- | ---- | -------- | ---- | ------- | -------- |
| P1-1 | applist 接入 `honeycomb_layout.js`，删除页内手工副本 | 消除双份实现（~450 行） | `applist.ux` | 中（几何等价需证明） | 否 | `multiscreen:check` + 圆屏蜂巢拖拽目视 |
| P1-2 | lifecycle_manager 扩大覆盖：applist / clock_guard / vibration / motion 的裸 timer 接入 | Stage 3 完成 | 上述 4 页 | 低 | 否 | 页面进出后无残留 timer（日志/断点） |
| P1-3 | 健康订阅模式收敛：`clock/today/heartrate` 三处脏检查抽为 health_sample_service 的 onChange 通知 | 消除三页雷同 | 3 页 + `health_sample_service.js` | 低 | 否 | 三页实时数值刷新行为比对 |
| P1-4 | heartrate 状态机下沉：区间/文案/颜色映射 → `health_metrics.js` 扩展 | Stage 4（最重页面减负） | `heartrate.ux`、`health_metrics.js` + 测试 | 中 | 否 | 新增纯逻辑测试 + 页面目视 |
| P1-5 | watch_data 拆职责：通知工厂 → notification_manager；表盘偏好 → face_registry | 单一职责 | `watch_data/notification_manager/face_registry` 及调用方 | 中 | 否 | 通知演示 + 表盘切换/右滑过渡回归 |
| P1-6 | 设置页两页导航收敛（4 处逐字重复 → 共享模块） | 消重 | 4 个设置页 | 低 | 否 | 设置域 5 页翻页/右滑回归 |
| P1-7 | 返回手势收敛：watchface 自写滑动判定 → `swipe_back` | 导航行为统一 | `watchface/index.ux` | 中（手势语义需对齐） | 否 | 表盘选择页右滑返回回归 |

### P2 —— 组件化与规范（依赖 P1 稳定后进行）

| # | 事项 | 目的 | 涉及文件 | 风险 | 影响 UI | 验证方式 |
| - | ---- | ---- | -------- | ---- | ------- | -------- |
| P2-1 | 抽 `PageHeader` 组件（12 页标题栏） | Stage 5 首个组件 | 新组件 + 12 页 | 中（模板迁移逐页做） | 否 | 逐页截图比对 |
| P2-2 | 抽 `PagerBar`（合并 fixed_pager 逻辑 + UI） | 分页器统一 | 5+ 页 | 中 | 否 | 分页交互回归 |
| P2-3 | 抽 `MetricCell`（值+单位+标签，仅实现现有视觉所需 variant） | 最高频原子结构 | heartrate/today/workout/表盘 | 中高 | 否 | 截图比对 |
| P2-4 | 抽 `LinearProgress`（5+ 处） | 消重 | today/dashboard 等 | 低 | 否 | 目视 |
| P2-5 | 表盘组件共享基座（8 文件脚本去重 + 192px 画布常量收敛） | 表盘域维护性 | `components/watchfaces/*` | 中 | 否 | 全部表盘轮播目视 |
| P2-6 | design token 建档（字号/间距/圆角/状态色），仅声明与增量使用，**不批量替换** | 为样式规范铺路 | 新增 token 文件 | 极低 | 否 | `npm run check` |

### ⛔ 明确不动清单

`page_motion` 转场 · `power_manager` 三档状态机 · `ble_sync`/`sync_protocol` · `calendar_utils` 农历 · `notification_demo`/`workout`/`motion` 的委托结构 · 所有页面视觉样式（除确认 bug）· manifest 路由 · 任何三形态最终布局设计（留给 Phase 2）。

---

## 四、步骤跟踪

### Stage 1 — 纯工具函数抽离

- ✅ **基本完成**（P0-3，待最终 `npm run check` 确认）：
  - ✅ `utils.js`：`pad2/clamp/formatShortDate/safeJsonParse/parseStorageValue` + 新增 `formatTimeHM/formatDateKey/formatDateTime`
  - ✅ 已收敛：`watch_data`（pad2/formatDate→formatDateKey）、`workout_manager`（pad2/formatDateTime）、`health_sample_service`（pad2/formatTime→formatTimeHM）、`device_settings`（formatNow→formatTimeHM）、`clock.ux`（pad2 导入、电量夹取→clamp）
  - 🟡 有意例外：`calendar_utils.js` 保留私有 `pad2`（CJS 模块，被 node 测试直接 require，不能混入 ESM import）
  - 说明：`watch_data.clampPercent` 为「相对目标的百分比」语义，与通用 `clamp` 不同，按纪律不合并
- ⬜ 业务/传感器阈值命名常量（心率 60/100/140、压力 30/60/80、GPS 6000ms）——归入 P1-4/P2-6，不批量替换

### Stage 2 — 数据与服务层抽离

- 🟡 **大部分完成**：
  - ✅ 已做：11 个数据服务模块就位；页面 100% 经 `storage_adapter` 访问存储；健康流统一经 `health_sample_service`；运动状态机在 `workout_manager`；通知在 `notification_manager`
  - ❌ 未做：`watch_data` 仍混 4 职责（P1-5）且数据层感知形状（P0-4）；heartrate 状态机（P1-4）；workout_history 聚合/文案、bluetooth 进度文案未下沉

### Stage 3 — 生命周期资源管理

- 🟡 **半完成**：
  - ✅ 已做：`lifecycle_manager.createContext`（register/dispose/cleanup 语义齐备）；23/24 资源手工配对正确；所有页面 onHide 暂停资源
  - ❌ 未做：仅 2/20 页接入（P1-2）；clock_guard 缺 onDestroy（P0-2）；clock 订阅重入缺陷（P0-1）

### Stage 4 — 页面 Controller 化

- 🟡 **部分完成**：
  - ✅ 已做（范本）：workout → workout_manager+gps_tracker；notification_demo → notification_manager；motion → motion_metrics
  - ❌ 未做：clock(1005)、watchface(850)、applist(768 含 450 行蜂巢)、heartrate(585) 仍重（对应 P1-1/P1-3/P1-4）

### Stage 5 — 共享组件识别

- ✅ 识别完成（见 1.4 语义判断表与候选清单）
- ⬜ 组件实现未开始（P2-1 ~ P2-5）
- ⛔ 本阶段不实现任何现有视觉之外的 variant

### 屏幕适配结构准备（为 Phase 2 铺路，不实现适配本身）

- 🟡 `screen_profile → page_viewport/safe_area/viewport_math` 链路已建，`page_viewport` 已被 ~20 页引用
- ❌ `honeycomb_layout.js` 已抽出但 applist 未接入（P1-1）
- ⬜ REFERENCE_WIDTH/HEIGHT 概念未显式建立（待 P2-6 一并）

---

## 五、VISUAL CHANGE 记录

> 原则：视觉变化 = 不允许。任何主动视觉变化必须在此登记 Before / After / Reason。

（暂无。本阶段所有改动均要求零视觉变化。）

---

## 六、每步自检清单

```
Build 通过 / 页面可进入 / 返回正常 / 数据一致 / 按钮正常 / 滚动正常
动画正常 / Timer 正常 / Sensor 正常 / Storage 正常 / 离开后资源释放
视觉与修改前一致 / npm run check 全绿
```

行为变化 → 优先修复，不推进下一步。

## 七、执行纪律摘要

1. 一次只改一个模块，改完即验证；禁止跨模块大爆炸提交。
2. 修业务逻辑不碰 UI，修 UI 不碰业务逻辑。
3. 至少存在明确重复或明确扩展需求才抽象；禁止 BaseManager/AbstractService 式空抽象。
4. 组件拥有外观，Composition 拥有位置；业务层禁止感知屏幕形状。
5. 当前胶囊屏设计是 Golden Reference，不为未来形态提前牺牲。

---

## 八、执行记录

### P0-1 修复 clock 通知重入失效 · 2026-08-31

**状态**：✅ 完成（2026-08-31 设备回归通过）

**Changed**
- `common/notification_manager.js`：`init()` 由布尔守卫改为引用计数（每次调用 +1，内部 `setupEventListener/setupInterconnect` 本身幂等），与 `destroy()` 的递减逻辑对称。原因：原守卫使重入时 `destroy()` 把计数误减到 0。
- `pages/clock/clock.ux` `initNotificationManager()`：`onChange` 回调提到守卫之前（每次重入都重绑，因为单回调槽会被 notification_demo 覆盖）；`init()` 与 `lifecycle.addSubscription('notification')` 仅在 `notificationReady` 为假时执行一次。原因：根因是重入时 `addSubscription` 先执行旧清理函数，把刚保留的监听拆掉。
- `pages/notification_demo/notification_demo.ux`：移除 `onHide` 中的 `destroy()`，仅保留 `onDestroy`。原因：返回时 onHide+onDestroy 先后触发，双调用会多减一次引用计数、误拆 clock 仍持有的监听。

**Preserved**
- 通知接收行为、覆盖层视觉、振动行为、自动消失/挂断时序均未改动。
- clock 在 onHide 不销毁通知监听的原设计保留（覆盖层属于 clock，页面栈常驻期间保持接收）。
- 圆屏（非 pill）不初始化通知管理器的分支不变。
- 未修改任何 `<template>` / `<style>`。

**Risk**
- 低：变更仅涉初始化/释放时序。唯一行为差异是修复目标本身（hide→show 后通知恢复可用）。
- 引用计数使监听存活窗口 = 所有持有页的并集；本应用中仅 clock（长驻）与 demo 两个持有者，语义清晰。

**Validation**
- ✅ `npm run lint`：59 文件 0 错误 0 警告
- ✅ `npm run build`：构建成功（5.2s）
- ✅ 生命周期场景静态推演：clock hide→show / clock→demo→返回 / demo 二次进出 / app 退出 双销毁路径均计数平衡
- ✅ 设备回归（用户验证）：表盘→上滑 applist→返回→通知演示页触发通知→返回表盘仍可接收

**Next**：P0-2（clock_guard 补 onDestroy）。

### P0-2 clock_guard 补 onDestroy · 2026-08-31

**状态**：✅ 完成（2026-08-31 本地验证通过）

**Changed**
- `pages/clock_guard/clock_guard.ux`：新增 `onDestroy()`，清理 `resumeTimer` 并复位 `pageVisible/redirecting`，使定时器回调的守卫在页面销毁后失效。原因：原先仅 `onHide` 清理，页面不经 hide 直接销毁时存在残留窗口。

**Preserved**
- 启动跳转逻辑、右滑回退表盘切换逻辑、`clockOpened` 模块标志行为不变。
- `onHide` 清理保持原样，双钩子清理互不冲突（幂等）。
- 未修改任何 `<template>` / `<style>`。

**Risk**
- 极低：仅新增销毁路径的资源清理。

**Validation**
- ✅ lint / build / `npm run check`（用户本地执行通过）
- 设备回归：应用冷启动→进入表盘链路正常即可（该页生命周期极短）

**Next**：P0-3（utils 收敛 pad2/日期格式/clamp）。

### P0-3 utils 收敛（Stage 1 收尾）· 2026-08-31

**状态**：✅ 完成（2026-08-31 本地 `npm run check` 通过）

**Changed**
- `common/utils.js`：新增 `formatTimeHM`（HH:MM，空值 '--:--'）、`formatDateKey`（YYYY-MM-DD 存储键）、`formatDateTime`（MM/DD HH:MM）。
- `common/watch_data.js`：删除私有 `pad2`、`formatDate`；3 处调用改 `formatDateKey`。
- `common/workout_manager.js`：删除私有 `pad2`、`formatDateTime`，改导入（`formatDuration` 仍用导入的 `pad2`）。
- `common/health_sample_service.js`：删除私有 `pad2`、`formatTime`，改 `formatTimeHM`。
- `common/device_settings.js`：删除私有 `formatNow`，`formatSyncTime` 改 `formatTimeHM(Date.now())`。
- `pages/clock/clock.ux`：删除私有 `pad2` 改导入；`applyBatteryPercent` 手写夹取改 `utils.clamp`。
- 所有替换均为逐字等价的纯函数替换，输出不变。

**Preserved**
- 各页时间/日期显示格式不变；`health_history_7d` 存储键格式（YYYY-MM-DD）不变，历史合并行为不受影响。
- `watch_data.clampPercent`（相对目标百分比）语义独立，未合并。
- `calendar_utils.js` 保持 CJS 与私有 `pad2`（被 node 测试直接 require，有意例外，已注释说明）。
- 未修改任何 `<template>` / `<style>`。

**Risk**
- 极低：纯函数等价替换；已全局自检无残留私有定义、无悬空引用。
- 过程中发现并规避一个真实风险：calendar_utils 若混入 ESM import 会破坏 `npm run calendar:logic`（已回退）。

**Validation**
- ✅ 静态自检：`function pad2|formatNow|formatTime(|formatDateTime(|formatDate(` 全项目仅存于 utils；`pad2(` 调用点均在已导入文件内
- ✅ 确认 `scripts/` 与 `test/` 均不直接 require 被改的 5 个模块（除 calendar_utils 已豁免）
- ✅ 本地 `npm run check`（lint + 全部 check 脚本 + 11 个逻辑测试）通过
- ⏳ 可选设备目视：表盘时间、心率页更新时间、运动记录时间、蓝牙同步时间、今日月历（纯函数等价替换，预期无差异）

**Next**：P0-4（watch_data 去形状）。
