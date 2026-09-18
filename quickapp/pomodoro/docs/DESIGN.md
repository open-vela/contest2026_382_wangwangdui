# pomodoro 设计说明

## 1. 目标与判据

这个应用的目的是把可穿戴应用的工程约束落到一个可运行的完整例子里：

1. 分层清晰：`Capability → Domain → Feature → Design → Page`；
2. 两种屏形态（circle / rect）走各自的原生几何，而不是等比缩放；
3. 资源（定时器、震动、存储）有唯一 owner 与释放路径；
4. 状态与持久化只有一个事实来源；
5. 上述每一点都能被静态审计脚本与设备日志证明。

## 2. 事实分类

| 事实 | 分类 | owner |
|---|---|---|
| 阶段（专注/休息）、剩余秒数、运行状态、已完成个数 | runtime truth | `domain/timer_state_machine.js`（纯函数） |
| 专注/休息时长、自动开始 | persistent truth | `domain/settings_model.js` + `domain/repository.js`（键 `pomodoro.settings.v1`） |
| 每日完成计数、累计 | persistent truth | `domain/stats_model.js` + `repository.js`（键 `pomodoro.stats.v1`） |
| 进度环宽度、当前时间文本、按钮文案 | derived view state | 页面在渲染时投影，不落盘 |

机器状态机不持有 `setInterval`：定时器只在 `features/focus_session.js` 里创建，且只有它能创建。

## 3. 生命周期

```text
focus.onInit   -> 载入 settings/stats + 设备 profile，建 layout plan
focus.onShow   -> bind(onChange, onPhaseComplete) + resume()
focus.onHide   -> unbind() + suspend()      // 释放 interval，保留剩余时间
focus.onDestroy-> focusSession.release()    // dispose：清 interval + stop 震动
```

- 会话对象位于 module scope，因此**进入设置页再返回不会重置计时**；
- 隐藏/后台一定释放 interval，恢复时按 `STATUS_RUNNING` 重建；
- `dispose()` 之后的 `onTick` 直接返回，不会作用于已销毁的页面。

## 4. Shape-native 组合（L2 Assisted）

`design/timer_layout.js` 是唯一的几何来源，输出**两份不同的 composition**，而不是一套布局换数字：

### circle-ring（圆屏）

- 环是界面本体：`ringSize = 0.86 × 边长`，描边加粗到 3 设计像素；
- 中央带依次放 phase / time / hint，进度条横穿环内中段；
- 主操作是**环内的圆形按钮**（36×36 设计像素，直径约 0.19×边长）；
- 底部控制行先算**弦宽预算**（`safeRowWidth(side, top, height)`）再决定 pill 宽度，避免贴到圆边；
- 刻意不画数据卡：圆屏上"值"才是主体。

### rect-column（手环 / 胶囊）

- 竖向节奏列，**完全不画环**；
- 顺序：`status(+今日)` → `value(大号时间)` → `bar(整宽进度)` → `count(今日完成)` → `action(整宽主按钮)` → `controls`；
- 主操作是**整宽色条按钮**（168×34 设计像素），与圆屏的圆形按钮形成明确的分工差异；
- 竖向按可用空间居中，短屏时**先丢掉 count**（渐进披露），保住"值 + 操作"。

实测（同一份代码，设备日志）：

| 设备 | 设计空间 | composition | blocks |
|---|---|---|---|
| 336x480 band | 192x274 | `rect-column` | `status@12+14,value@63+52,bar@123+4,count@137+16,action@163+34,controls@236+26` |
| 466x466 watch | 192x192 | `circle-ring` | `phase@28+14,time@46+40,hint@90+10,bar@104+3,primary@112+36,controls@152+22` |

### 结构契约

`test/timer_layout.test.js` 把"必须真的不同"变成可判定条件：

1. 所有块有序、在界内、**互不重叠**（`findOverlaps`）；
2. circle 必须持有环、必须是圆形主按钮、必须没有数据卡；
3. rect 必须不画环、主按钮必须整宽（`actionWidth == listWidth` 且宽高比 > 4）；
4. 两形态块集合不同、密度不同、ring 归属不同、主操作宽度差 3 倍以上；
5. 圆屏底部控制行必须落在弦宽预算内；短屏必须丢 count 而不丢 value。

### 列表页（settings / stats）也必须按形状推导

第一版只有 focus 页做了弦宽约束，列表页照搬矩形几何，结果在圆屏上：
标题越出顶部窄弦被裁、行内容整体左移（左 17 / 右 46.5）、返回按钮超出底部弦预算 23px。
现在 `computeListLayout()` 对三类元素各自取**自身垂直区间的弦宽**做预算并居中：

```text
circle: title [30,27,133]  list [37,51,119,93]  back [40,152,112,22]   chordViolations=[]
rect  : title [12,12,168]  list [12,36,168,192] back [12,236,168,26]   chordViolations=[]
```

另外把行/卡片上的 padding 改为子元素 margin：`width` 是几何来源，不应受 box-sizing 影响。
契约测试现在遍历**每种形状 × 每个页面**，任何一个块越出自己区间的弦都会让 `npm run test` 失败。

## 5. 降级策略

- `capabilities/storage.js`：不可用/抛异常 → 返回 `{ ok:false, reason }`，上层用内存态继续，不假装已保存；
- `capabilities/haptics.js`：无振动器 → `{ ok:false, reason:'unavailable' }`，页面不宣称有反馈；
- `capabilities/device_profile.js`：`getInfo` 失败 → 明确 fallback（192x490 rect），并在日志里保留 `source`。

## 6. 未采用的能力及原因

- **通知**：本应用不需要跨应用提醒，避免为此申请额外权限，故未实现；
- **事件总线（`@system.event`，minAPILevel 4）**：本应用不需要跨页广播，避免为一个 demo 抬高 API 门槛；
- **屏幕常亮（`@system.brightness`）**：与"最小正确层改动"原则无关，未引入。
