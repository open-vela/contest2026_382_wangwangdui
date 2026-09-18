# vela_band

[English](docs/README_EN.md) | **简体中文**

`vela_band` 是面向 Xiaomi Vela Quick App 的智能手环/手表参考应用。当前版本以 **V2 Design Engine + Capability Runtime** 为主架构，在同一 RPK 中支持胶囊、圆形与矩形 wearable form factor，覆盖表盘、应用启动器、健康、趋势、运动、日历、通知、同步、低功耗和设置等演示能力。

> 本项目用于比赛演示、架构验证和可穿戴 UI 探索，不是医疗软件或生产级设备固件。系统健康能力不可用时可能使用明确标识的演示数据，不能用于健康判断。

当前可回退稳定版本见 [V2 稳定基线](docs/STABLE_BASELINE_V2.md)。

## 当前状态

- 项目版本：`vela_band@2.0.0`
- Node.js：18+
- 稳定主架构：Capability → Domain → V2 Feature → V2 Design → Page
- 目标形态：Pill / Circle / Rect
- 稳定基线已完成维护者本地 `npm run check` 全量验收，并完成关键多屏交互 smoke test。

## 功能概览

| 模块 | 当前能力 |
| --- | --- |
| 表盘 | 多表盘切换、持久化、圆屏机械表盘、胶囊 Alpine 表盘、表盘库 |
| 应用启动器 | Circle 蜂巢、Pill 分页列表、Rect 网格 |
| 健康 | 心率、血氧、压力、窗口趋势与系统能力降级 |
| 活动趋势 | 7 日趋势；Circle/Pill/Rect 使用不同 L2 构图 |
| 运动 | 步行/跑步、暂停/继续、运动历史、可用时使用位置能力 |
| 今日日历 | 日期、农历、健康摘要、圆屏月历交互 |
| 通知 | 本地/事件演示的来电、短信和应用通知 |
| 同步 | 协议、分包、ACK、进度与模拟 transport |
| 低功耗 | ACTIVE / DIM / SLEEP、抬腕唤醒演示 |
| 设置 | 同步、震动、亮度、动作诊断、设备自检与分页导航 |

## 快速开始

安装锁定依赖并运行完整质量门禁：

```bash
npm ci
npm run check
```

构建启用 JSC 的调试 RPK：

```bash
npm run build
```

默认产物：

```text
dist/com.application.watch.demo.debug.1.0.0.rpk
```

开发 watch 模式：

```bash
npm run start
```

也可以使用项目脚本：

```bash
# Windows
build.bat

# macOS / Linux
sh build.sh
```

应用安装、模拟器选择和设备调试仍由 AIoT-IDE 或兼容工具完成。兼容性与已知镜像差异参见 [COMPATIBILITY.md](docs/COMPATIBILITY.md)。

## V2 架构

```text
Vela Native APIs
      ↓
Capability Runtime
      ↓
Domain / State Machines
      ↓
V2 Feature Controllers
      ↓
V2 Design Specs + Design Views
      ↓
Full-bleed Design Scene
      ↓
Pages
```

主要目录：

```text
src/
├── capabilities/          # 原生 Vela 能力网关
├── domain/                # 业务状态、持久化与状态机
├── v2/
│   ├── app/               # 页面 Runtime、导航、路由
│   ├── features/          # 应用级 Controller
│   ├── design/            # Scene、Geometry、Spec、View、Engine
│   └── system/            # 设备 Profile 与系统 facade
├── components/watchfaces/# 表盘组件
└── pages/                 # Vela 页面、生命周期和事件绑定
```

`src/common`、旧 `src/presentation` 等目录仍可能作为历史实现、兼容参考或资源位置保留，但**新的 V2 页面不得重新依赖 legacy common 代码模块**。架构测试会约束实际代码依赖。

详细说明：

- [V2 Stable Architecture](docs/REWRITE_V2_ARCHITECTURE.md)
- [Wearable Design Engine](docs/DESIGN_ENGINE.md)
- [V2 稳定基线](docs/STABLE_BASELINE_V2.md)
- [兼容性说明](docs/COMPATIBILITY.md)

## Design Engine：不是统一缩放

V2 将 UI 自由度分为：

- **L1 Auto**：普通设置、简单详情、分页列表；
- **L2 Assisted**：健康、趋势、运动等共享语义但需要形态专用构图的页面；
- **L3 Free**：表盘、蜂巢启动器等强视觉/强交互页面。

稳定的形态语言是：

- **Circle**：使用圆形画布和弦区布局，不把整页裁成小内接矩形；
- **Pill**：利用长纵轴组织信息流，趋势适合横向比较柱；
- **Rect**：利用横向空间做 dashboard / grid。

例如 History：Circle 使用紧凑 tracked bars，Pill 使用纵向 `vertical-comparative-trend`，Rect 使用 dashboard。三者共享同一数据语义，但不强行共享同一图形结构。

## Full-bleed Scene 与安全内容

V2 当前稳定规则：

1. Design Scene 从 `(0, 0)` 开始覆盖完整逻辑/物理投影。
2. 背景/表盘可以 full-bleed 到屏幕边缘。
3. safe geometry 用于文字、控件和可交互内容的位置，不用于把整个页面裁小。
4. Circle 使用 chord-aware 布局；Pill 的上下舒适区不能变成背景黑带。
5. 只有绝对定位子节点的 full-page wrapper 必须显式拥有 Scene 宽高，避免 Vela 上父容器塌成 0 高黑屏。

## 主要交互

| 入口 | 操作 | 结果 |
| --- | --- | --- |
| Clock | 左/右滑 | 切换可用表盘 |
| Clock | 长按 | 打开表盘库 |
| Clock | 上滑 | 打开应用列表 |
| 应用列表 | 点击应用 | 进入对应功能 |
| Settings | 左/右滑或点击箭头 | 切换设置分页 |
| 子页面 | 系统返回 / 页面返回语义 | 返回上一页 |
| Circle Honeycomb | 拖动 / 点击 | 移动焦点并启动应用 |

Clock 是导航手势的单一 owner。为兼容部分 beta Vela runtime，**同一个 owner** 可以同时使用 native swipe 和 raw-touch fallback，以避免纵向手势被错误解释为滚动；嵌套组件不得再创建竞争性的页面导航 owner。

## 生命周期与功耗

V2 将资源生命周期作为稳定契约的一部分：

- 健康订阅只在需要的前台页面/表盘状态保持；
- Workout pause 释放 1Hz tick 和 location 资源；
- 页面 hide/destroy 停止临时 listener、timer 与采样；
- SLEEP 状态可暂停昂贵实时能力，唤醒后恢复。

UI 重排不能改变这些资源释放规则。

## `npm run check`

当前完整检查包括：

- lint
- V2 Scene / Architecture / Runtime / Visual / Interaction / Design Views
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
- Markdown 本地链接检查

涉及 Scene、手势、绝对定位、表盘和 shape-specific layout 的变更，即使静态检查通过，也必须补做模拟器/设备 smoke test。

## 调试提示

Mi Band 10 冷启动后，在 AIoT-IDE 已打开项目、Broker 正常且 RPK 已安装的前提下，可以使用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-emulator.ps1 -Avd mi-band10
```

健康页面的抓图辅助脚本：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/capture-health-visual.ps1 -Device xiaomi_band_10 -Serial emulator-5554
```

不同模拟器镜像提供的 Vela feature 可能不同；接口存在也不等于已经收到真实数据。

## 文档索引

### 当前规范

- [V2 稳定基线](docs/STABLE_BASELINE_V2.md)
- [V2 Stable Architecture](docs/REWRITE_V2_ARCHITECTURE.md)
- [Wearable Design Engine](docs/DESIGN_ENGINE.md)
- [兼容性说明](docs/COMPATIBILITY.md)

### 历史/参考

`REFACTOR_PHASE1.md`、`ADAPTIVE_LAYOUT_ARCHITECTURE.md`、`TECHNICAL.md` 等文件保留早期实现和设计探索。若与当前 V2 测试、稳定架构文档冲突，以当前 V2 规范为准。

## 下一阶段

稳定基线合入主分支后，后续功能/体验优化应从主分支新建独立分支。下一阶段优先推进 **L2 Design System v2.1**：把已经验证的 Circle / Pill / Rect 设计经验固化成可复用的设计 primitive，而不是再次大范围重写 Host Scene 或 Runtime。
