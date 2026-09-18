# pomodoro — openvela Quick App

一个多页番茄钟快应用，演示可穿戴设备上的完整交互与工程约束：

- 同一份代码适配圆屏与矩形屏，两种形态使用各自的原生构图；
- 计时、设置与统计分别由状态机、持久化层与投影层负责，页面只做生命周期绑定；
- 定时器、震动与存储都有明确的 owner 与释放路径，能力缺失时在界面上明确降级。

## 功能

| 页面 | 内容 |
|---|---|
| `pages/focus` | 圆形进度环 + 剩余时间（25:00 起）、开始/暂停/继续、重置、阶段切换（专注 ↔ 休息）、到时震动、今日完成数（矩形屏） |
| `pages/settings` | 专注时长（15/25/45）、休息时长（5/10/15）、自动开始开关，全部持久化 |
| `pages/stats` | 今日 / 累计完成数 + 最近 7 天列表 |

## 分层（`Capability → Domain → Feature → Design → Page`）

```text
src/
├── capabilities/   @system.* 边界：device_profile / storage / haptics（不可用则明确降级，不伪造）
├── domain/         纯逻辑：timer_state_machine / settings_model / stats_model / date_key / repository（唯一持久化 owner）
├── features/       focus_session.js —— 倒计时间隔的唯一生命周期 owner（suspend/resume/dispose）
├── design/         timer_layout.js —— 纯几何，**两种 composition**：circle-ring / rect-column
├── pages/          focus / settings / stats，只做生命周期绑定与渲染投影
└── common/         page_navigation.js（@system.router 边界）
```

设计空间约定与 `velaclaw-aiot` 一致：`designWidth = 192`，设备按 `logicalHeight = screenHeight * 192 / screenWidth` 折算，
圆形屏取 `logicalHeight = 192`。因此同一份几何在 336x480 手环与 466x466 圆表上都成立（见下）。

**两种形态不是"一套布局换数字"，而是两份 composition**（对应 `wearable-design.md` 的 L2 Assisted）：

| | circle-ring（圆屏） | rect-column（手环/胶囊） |
|---|---|---|
| 主体 | 环就是界面本体（`ringSize = 0.86 × 边长`） | 竖向节奏列，**不画环** |
| 信息顺序 | phase → time → hint → bar → **圆形主按钮** → controls | status(+今日) → value → bar → **今日完成** → **整宽主按钮** → controls |
| 主操作位置 | 环内圆形按钮（36×36 设计像素） | 整宽色条按钮（168×34 设计像素） |
| 密度 | 不要数据卡 | 保留 "今日完成 N 个番茄" |
| 约束 | 底部控制行过 **chord 检查**（按圆弦宽算预算） | 竖向堆叠，按可用高度居中 |

## 命令

```bash
npm install                # 安装 aiot-toolkit（^2.0.5）
npm run test               # 30 条纯逻辑用例
npm run audit              # 运行时契约静态审计（源文件 / manifest / 原生模块）
npm run inventory          # 存量清点与保持性基线
npm run build              # 产出 dist/com.application.pomodoro.debug.1.0.0.rpk
npm run icon               # 由 design-assets/app-icon.svg 重新生成 192x192 运行时图标
```

## 运行时证据

| 设备 | 物理分辨率 | 设计空间 | composition | 结果 |
|---|---|---|---|---|
| `Vela_Virtual_Device`（band / rect） | 336x480 | 192x274 | `rect-column: status@12+14,value@63+52,bar@123+4,count@137+16,action@163+34,controls@236+26` | 页面 ready/show，列式布局 |
| `watch4`（watch / circle） | 466x466 | 192x192 | `circle-ring: phase@28+14,time@46+40,hint@90+10,bar@104+3,primary@112+36,controls@152+22` | 页面 ready/show，环式布局 |

上面两行来自设备日志，证明设备上运行的确实是这份 composition。设计预览由 `timer_layout.js` 的同一份 plan 渲染，用于形状对照，不是设备截图。

安装方式（设备端）：

```bash
adb -s <serial> push dist/com.application.pomodoro.debug.1.0.0.rpk /tmp/pomodoro.rpk
adb -s <serial> shell pm install /tmp/pomodoro.rpk
adb -s <serial> shell am start com.application.pomodoro
```

图标与包内资源的核对方式见 [docs/ICON_FIX_20260917.md](docs/ICON_FIX_20260917.md)。

## 已知边界

- **不发送系统通知**：阶段结束只用 `@system.vibrator` 与页面状态提示，不申请额外的系统权限。
- **推理/思考过程不落盘**：与 Codex 日志采集无关，指本应用不保存任何推理内容。
- 震动、存储均为"能力不可用则降级"，页面上不会把降级结果说成真实反馈。
- **两形态差异由测试守护**：`test/timer_layout.test.js` 断言块集合/顺序/无重叠/圆屏 chord 预算，
  以及"两形态必须结构不同"；改坏这份差异会直接让 `npm run test` 失败。

## 许可

Apache-2.0，与仓库主许可一致。图标 `src/common/pomodoro-icon.png` 由本仓库 `tools/render_icon.py` 从 `design-assets/app-icon.svg` 生成（无第三方素材）。
