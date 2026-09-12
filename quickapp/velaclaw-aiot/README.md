# vela_band

[English](docs/README_EN.md) | **简体中文**

`vela_band` 是面向 Xiaomi Vela Quick App 的可穿戴参考应用。V2.5 延续 V2.4 的工程基础，重点优化多形态设计、系统能力接入、运行时生命周期、真实数据边界与开发工具链，在同一应用中覆盖胶囊、圆形和矩形屏幕。

项目面向比赛演示、可穿戴交互研究和工程实践，不是医疗软件。健康数据只在系统能力提供可信样本时进入对应界面；能力不可用或样本尚未到达时，界面应明确等待或降级，不把兼容值包装成真实健康结果。

## 开发理念

`vela_band` 的演进目标不是追求更大的重构，而是在 Vela 可穿戴运行时的真实约束下持续得到更可靠、更容易验证、也更容易维护的结果。架构和设计只有在解决具体问题时才有价值；如果一个问题可以通过明确 owner、收紧数据边界或调整某个形态的 Design Spec 解决，就不为追求形式上的统一去重写整条链路。

项目遵循以下原则：

- **真实问题优先**：先确认问题来自布局、运行时、系统能力、生命周期还是数据来源，再选择最小而完整的修复范围。
- **最小充分抽象**：只有能减少重复、保护不变量或明确所有权的抽象才进入长期架构；不为了目录整齐、版本命名或概念完整而搬迁源码。
- **语义共享，形态原生**：业务事实尽量共享，Circle、Pill、Rect 可以拥有不同构图和交互，不把统一缩放当成多屏设计。
- **数据必须可追溯**：真实系统样本、确定性估算、兼容值和模拟链路必须保持边界；不能用视觉完整性换取数据真实性。
- **生命周期就是功能的一部分**：订阅、定位、计时器、传感器和触觉资源都必须有单一 owner，并与页面和业务状态一起启停。
- **运行时事实高于静态假设**：Node.js 测试负责保护逻辑与架构契约，Vela 模拟器和设备负责证明几何、手势、原生能力和生命周期行为，两类证据不互相替代。
- **增量演进优于激进重写**：V2.5 在 V2.4 可工作的基础上继续收敛边界、修复已知问题和固化经验，避免让大规模重构本身成为新的风险源。
- **文档描述当前事实**：README 和长期技术文档服务于使用、维护和评审，不保存临时阶段叙事，也不把尚未验证的能力写成既成事实。

这些原则共同指向一个目标：在资源有限、形态差异明显、平台能力并不完全一致的可穿戴环境中，让每一次优化都能解释、能验证，也能安全地继续演进。

## 开发者友好

开发者友好不是额外的工具包装，而是项目结构本身必须让作者能够看懂、修改和验证设计意图。V2.5 保留这一原则，并把它落在现有的 Design Spec、布局配置和 Layout Studio 工作流上。

- **真源可读**：布局意图集中在 `src/v2/design` 与 `src/v2/design/apps/<app>/layout.js`，页面不再承担第二套布局算法。开发者应能从源码直接理解某个形态为什么这样布局。
- **小改动对应小 diff**：共享值放在 base，Circle、Pill、Rect 只保存需要的差异。调整某个形态的尺寸、间距或构图，不应复制整份布局，也不应牵动无关设备。
- **工具与运行时共享语义**：Layout Studio 复用项目已有的 Scene 与 Adapter 规则，不维护一套只在浏览器里成立的布局系统。预览用于缩短反馈循环，设备运行结果仍由同一套设计语义约束。
- **现有能力优先复用**：当现有 primitive、Design Spec 和 Design View 足以表达需求时，新增页面或调整表盘不要求先改通用运行时。只有真实表达能力缺失时才扩展底层。
- **错误尽量提前暴露**：lint、设计契约、Studio 检查、文本适配和 bundle 审计尽可能在提交前发现问题，而不是依赖运行时静默修正或设备端偶然暴露。
- **运行时不替作者偷偷重新设计**：安全区、设备 Profile 和 Adapter 可以约束合法几何，但不应把一个明显不适合目标形态的设计在运行时自动改造成另一种构图。重要差异应显式写在设计层，能够被 review。
- **设计与业务解耦**：开发者调整视觉层级、尺寸、密度或某个形态的布局时，不需要同时理解和修改健康、运动、存储等业务实现；修改业务语义时，也不应顺手改变设计结果。
- **可审阅、可回退**：一次正常设计调整应留下清晰的源码 diff，并能通过 Git 独立 review 和回退。工具生成的结果不能成为第二种不可逆格式。

因此，项目追求的不是“让框架自动做更多”，而是**让开发者需要理解和修改的东西更少、更明确、更接近最终设计意图**。自动化负责消除重复和提前发现错误，设计决策仍由作者显式拥有。

## Vibe Coding 友好

V2.5 的开发友好也直接降低了 AI 辅助编码的成本。这里的 Vibe Coding 不是让模型绕过架构或凭感觉改运行时，而是把高频迭代收敛为一条可控闭环：**描述意图 → 修改小而显式的设计面 → 使用同一套运行语义预览 → 运行契约检查 → review Git diff → 必要时回退**。

- **低上下文修改面**：大量视觉调整可以优先落在 `src/v2/design/apps/<app>/layout.js`、Design Spec 或 Design View，而不要求 AI 同时理解页面生命周期、健康数据、存储和原生能力实现。
- **结构显式，机器容易理解**：布局使用命名字段、`base` 与 `circle` / `pill` / `rect` override 表达设计意图。AI 可以针对具体字段做局部修改，而不是在大段模板和样式代码中猜测真实控制点。
- **修改边界受约束**：Layout Studio 只接受已登记的可编辑字段和受支持的标量类型，未知字段、非法类型与非有限数字会在写回前被拒绝，减少 AI 误改任意源码的空间。
- **预览与运行时同源**：Studio 直接复用项目的 Scene 与 Adapter，并从真实 `layout.js` 生成预览；AI 辅助调整看到的反馈与设备侧设计语义来自同一条解析链，而不是另一套 mock layout。
- **形态改动天然局部化**：Adapter 以 `base + 当前 shape override` 合并配置，Studio 保存时只重写当前形态配置块。针对 Pill 的调参不需要复制 Circle 或 Rect 的整套设计。
- **契约是 AI 的护栏**：`npm run check`、设计与交互契约、文本适配以及 bundle audit 为 AI 生成的修改提供机器可执行的反例。通过静态门禁不等于设备验证完成，但可以在进入 Runtime 前拦住一批确定性错误。
- **Git diff 就是审阅接口**：Vibe Coding 的产物仍然是普通源码和局部 diff，没有隐藏的 AI 状态或不可逆工程格式；人类可以逐行 review、挑选、修改和回退。
- **业务真实性不能被绕过**：Vibe Coding 不能把模拟健康值包装成真实样本，也不能跳过生命周期 owner、系统能力和设备验证。AI 加快实现与探索，但不改变项目的数据与运行时不变量。

因此，本项目所说的 Vibe Coding 友好，本质是**让 AI 更容易在正确的层做小而可验证的改动，同时让人类保留产品意图、真实性边界和最终验收权**。它不是一个自然语言应用生成器，也不宣称 AI 可以替代 Vela Runtime 和实机验证。

## 产品能力

| 领域 | 实现 |
| --- | --- |
| 表盘 | 多表盘切换与持久化，机械表盘、运动表盘、简洁表盘与形态专用构图 |
| 应用启动器 | Circle 与 Rect 使用蜂巢交互，Pill 使用纵向分页列表 |
| 健康 | 心率、血氧、压力等系统健康数据接入，来源状态与等待状态可见 |
| 活动与趋势 | 步数、热量、站立等日常指标，七日趋势使用真实持久化记录 |
| 运动 | 步行与跑步、暂停继续、会话恢复、位置距离、官方心率与历史记录 |
| 今日 | 日期、日历、健康摘要，并按屏幕形态调整信息密度 |
| 通知 | 来电、短信和应用通知的界面演示与事件入口 |
| 同步 | 业务 payload、分包、ACK、进度管理和可替换的传输边界 |
| 设置 | 亮度、震动、动作诊断、同步入口和设备信息 |
| 功耗 | ACTIVE、DIM、SLEEP 状态及资源释放策略 |

`src/manifest.json` 注册 20 个页面路由，并声明 router、device、battery、brightness、sensor、geolocation、vibrator、event、interconnect、storage 和 health 等系统能力。

## V2.5 架构

```text
Vela Native APIs
      ↓
Capability Adapters
      ↓
Domain State and Persistence
      ↓
Feature Controllers
      ↓
Design Specs and Design Views
      ↓
Shape-aware Scene and Adapter
      ↓
Vela Pages
```

V2.5 没有为版本名称做无意义的源码搬迁，因此核心目录仍保留 `src/v2`。这一目录承载应用运行时、Feature、Design 与设备系统抽象；顶层 `src/capabilities` 和 `src/domain` 分别负责原生能力边界与业务状态。

核心原则是让业务语义共享，让形态差异停留在设计层：

- **Capability** 只负责系统 API 与明确降级。
- **Domain** 保存与设备形态无关的业务事实。
- **Feature** 管理页面级状态、生命周期与资源所有权。
- **Design** 决定 Circle、Pill、Rect 的构图、几何和显示语义。
- **Page** 负责 Vela 生命周期与事件绑定，不重复业务计算。

详细说明见 [架构](docs/ARCHITECTURE.md)。

## 多形态设计

V2.5 不把可穿戴适配理解为统一缩放，而是把界面差异分成三个自由度：

- **L1 Auto**：普通设置、简单列表和常规控件，由设计规则自动解析安全尺寸与节奏。
- **L2 Assisted**：健康、趋势、运动等共享业务语义，但允许不同形态采用不同信息构图。
- **L3 Free**：表盘与蜂巢启动器等高视觉、高交互界面，允许形态拥有独立 Surface。

设计系统同时区分完整 Scene 与安全内容区。背景可以铺满物理外形，文字、数值和交互控件则按圆弧、胶囊端部和手势区域约束。这样可以避免为了“安全”把整页缩成小矩形，也减少圆屏黑边和胶囊屏有效空间浪费。

设计规则见 [设计系统](docs/DESIGN_SYSTEM.md)。

## 技术创新

V2.5 的创新点来自代码中已经存在的工程能力，而不是单独增加概念层：

1. **语义共享、形态原生的单应用架构**：同一 Domain 和 Feature 支撑 Circle、Pill、Rect，不强迫三个形态共享一套构图。
2. **设计自由度模型**：L1/L2/L3 把“可自动适配”和“需要产品设计”的边界显式化，避免响应式规则无限膨胀。
3. **Design Spec 与 Design View 分离**：几何计划和显示语义在设计层集中管理，页面保持轻量，降低跨页面复制计算的风险。
4. **开发者友好的设计工作流**：设计真源集中、shape 差异按 delta 保存、正常调整只产生局部 diff；Layout Studio 与运行时共享设计语义，使可视化调参与源码 review 属于同一条工作流。
5. **Vibe Coding 友好的受约束迭代面**：高频视觉修改集中在结构化 Design 配置，Studio 对修改字段做约束，并以真实 Scene/Adapter 预览；AI 生成结果继续经过源码 diff、契约门禁和设备证据，而不是绕开工程边界。
6. **真实运行逻辑驱动的 Layout Studio**：本地设计工具复用项目 Scene 与 Adapter 语义，并把形态差异保存回受控的布局配置，而不是维护第二套预览算法。
7. **数据来源可追踪**：健康与运动心率保留来源语义；没有官方样本时使用等待状态，不把模拟值写成真实结果。
8. **可穿戴生命周期治理**：健康订阅、定位、计时器、动作传感器等资源随页面和运动状态启停，减少后台资源泄漏。
9. **面向约束的质量门禁**：除 lint 外，还覆盖 Scene、架构、交互、设计视图、适配器、健康数据、运动体验、持久化、功耗、触觉、文本适配和页面 bundle 预算。

更多背景和可核验路径见 [创新设计](docs/INNOVATIONS.md)。

## 快速开始

需要 Node.js 18 或更高版本，以及可用的 Xiaomi Vela Quick App 开发环境。

```bash
npm ci
npm run check
npm run build
```

开发模式：

```bash
npm run start
```

发布构建：

```bash
npm run release
```

布局辅助工具：

```bash
npm run studio
```

Studio 的使用方式和安全边界见 [Layout Studio](docs/LAYOUT_STUDIO.md)。

## 质量检查

`npm run check` 汇总项目的静态和纯逻辑门禁，包括：

- JavaScript 与 UX lint；
- Scene、架构、Runtime、视觉和交互契约；
- Design View、Design System 与 Declarative Adapter；
- Capability Runtime、功耗、健康、运动、活动持久化与设置存储；
- Motion、Haptics、Calendar、Analog、Honeycomb；
- 文本适配和 Markdown 本地链接检查。

页面 bundle 可单独审计：

```bash
npm run bundle:audit
```

静态门禁不能替代 Vela Runtime 的模拟器或设备 smoke test。涉及手势、绝对定位、系统能力、资源生命周期和形态专用构图的改动必须补充运行环境验证。

## 项目结构

```text
quickapp/velaclaw-aiot/
├── src/
│   ├── capabilities/       # Vela 系统能力适配
│   ├── domain/             # 业务状态、持久化与状态机
│   ├── v2/
│   │   ├── app/            # 应用运行时与导航
│   │   ├── features/       # Feature Controller
│   │   ├── design/         # Scene、Adapter、Spec、View 与布局配置
│   │   └── system/         # 设备 Profile 与系统抽象
│   ├── pages/              # Vela 页面与生命周期绑定
│   └── components/         # 可复用组件
├── tools/layout-studio/    # 本地布局辅助工具
├── scripts/                # 构建、检查和模拟器辅助脚本
├── test/                   # 契约与纯逻辑测试
├── docs/                   # 长期维护文档
├── package.json
├── LICENSE
└── NOTICE
```

`src/common` 与 `src/presentation` 仍包含历史兼容代码或资源。新增能力应优先沿 Capability → Domain → Feature → Design → Page 链路扩展，避免重新把业务逻辑散回页面或旧公共模块。

## 文档

- [Architecture](docs/ARCHITECTURE.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Innovations](docs/INNOVATIONS.md)
- [Layout Studio](docs/LAYOUT_STUDIO.md)
- [Workout and Sync](docs/WORKOUT_AND_SYNC.md)
- [Compatibility](docs/COMPATIBILITY.md)
- [Contributing](CONTRIBUTING.md)

## 许可证

源代码按 Apache License 2.0 发布，详见 [LICENSE](LICENSE)。第三方素材和生成资源的归属说明见 [NOTICE](NOTICE)。
