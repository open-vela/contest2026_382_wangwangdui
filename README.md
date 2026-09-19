# 面向普通用户的 openvela 可穿戴应用创作原型 —— 从可视化草图与自然语言到 AI Agent

> 作品代号 `vela_band`｜队伍：汪汪队｜赛事专属仓：`contest2026_382_wangwangdui`

## 一、作品简介

`vela_band` 是一套「可穿戴应用运行系统 + AI 辅助创作入口」：运行侧让同一份 Quick App 在圆屏（Circle）、胶囊屏（Pill）、矩形屏（Rect）上以各自的形态原生构图运行，覆盖表盘与表盘库、应用启动器、健康与趋势、运动与历史、今日日历、通知演示、同步演示、番茄钟、设置、设备自检与低功耗状态机；创作侧是 Design Studio，用户在设备画板上用基础图形画出界面大概长什么样、用自然语言写下「这块是干什么用的」、再定义页面跳转，工具把这些空间、语义与流程信息导出为结构化的 Agent 提示词 JSON，交给 AI Coding Agent 生成 Vela 工程代码。

它瞄准的是三个具体问题：同一业务语义在三种物理形态上不能靠一套界面等比缩放（圆屏要按弦宽算可用宽度，胶囊屏适合纵向信息流，矩形屏才是真正的方屏）；健康、定位、传感器、存储、振动等系统能力在真机上随时可能不可用，必须 fail soft 而不能 fake success；普通用户已经能说清「我想要什么应用」，却说不清组件、变量和系统 API。亮点在于：以 Capability → Domain → Feature → Design → Page 分层做到语义共享、形态原生，并用 L1/L2/L3 自由度模型区分「能算出来的差异」和「必须设计的差异」；把这些工程经验写成机器可执行的契约与门禁；并且已经落到真实硬件——在 Sifli SF32LB52 黄山派 480×480 圆屏板上通过 NuttShell + `vapp` 启动 Quick App，跑通 LCD `/dev/lcd0` 与触摸 `/dev/input0` 的显示与输入链路。

## 二、选题方向

**手表应用创新（快应用）+ AI 硬件产品创新。**

- **手表应用创新**：作品主体是运行在 openvela wearable 形态上的 Quick App，真实工作量集中在圆屏弦宽与安全区、胶囊端帽、蜂巢启动器拖动与焦点吸附、导航手势 owner、ACTIVE/DIM/SLEEP 低功耗调度、传感器多消费者共享订阅等可穿戴特有问题上，而不是把手机页面缩小。
- **AI 硬件产品创新**：作品把 AI 用在「用户意图 → 代码」这一段。Design Studio 导出的 `designstudio/v1` 结构化提示词 JSON 与 Vela 脚手架，加上两个自定义 Skill，把可穿戴工程规则交给 AI Coding Agent，探索「文字负责语义、草图负责空间、AI 负责实现、平台负责保障运行」的创作范式。
- **未按「新硬件适配」选题**：目标平台是赛事支持范围内的 Sifli SF32LB52 黄山派 / LCKFB 黄山派 openvela/NuttX 配置，作品没有自行设计 PCB，也没有新增 LCD、Touch、IMU、BLE 等驱动。板端工作是既有板级支持之上的 Quick App、Capability Gate、资源预算与低资源 UI 适配，因此不把它当作驱动开发或新平台适配成果。

## 三、目录结构

```text
contest2026_382_wangwangdui/
├── quickapp/
│   ├── velaclaw-aiot/        # 主应用 vela_band（包名 com.application.watch.demo，版本 2.4.0）
│   │   ├── src/              # capabilities / domain / v2(app·features·design·system) / pages / components
│   │   ├── assets/           # 图标与表盘源素材（SVG / JPG）
│   │   ├── scripts/          # lint、文档断链、页面包预算、产物体积、多屏与安全区检查、图标渲染
│   │   ├── test/             # 架构、几何、交互、生命周期、数据来源等契约与纯逻辑测试
│   │   └── docs/             # 架构、设计系统、兼容性、创新点、维护者指南与技术审计
│   └── pomodoro/             # 第二个独立快应用 com.application.pomodoro（圆屏 / 矩形两套 composition）
│       ├── src/              # 同样按 Capability → Domain → Feature → Design → Page 分层
│       ├── test/ docs/       # 纯逻辑用例与设计说明
│       └── design-assets/    # 图标源素材，运行时 PNG 由 tools/render_icon.py 生成
├── board/                    # 板端交付快照（评审用）
│   ├── rpk/                  # 构建好的 debug（614 KiB）与 release（598 KiB）RPK，含 SHA256
│   ├── source/velaclaw-aiot/ # 板端源码快照，含 native feature gate 与 memory/exchange 存储降级
│   └── README.md             # 目标板资料、构建复现、真机验证结论与能力限制
├── skills/                   # 两个自定义 AI Coding Skill
│   ├── openvela-wearable-engineering/   # 多形态设计、能力边界、状态与生命周期、证据门禁
│   ├── openvela-existing-app-refactor/  # 既有应用在 Preserve / Light Refresh / Redesign 授权下的重构
│   └── validate-skill-suite.mjs         # Skill 套件结构与规则自检
├── tools/                    # 仓库根目录的本地辅助工具（不参与打包）
│   ├── design-studio/        # Design Studio：画布设计 → Agent 提示词 JSON / Vela 脚手架
│   ├── emu_capture.py emu_window.py  # 抓取 Vela 模拟器窗口并做基础画面分析
│   ├── png_check.py          # 校验 PNG chunk CRC，避免把坏图当作验证证据
│   └── rewrite_honeycomb.js  # 蜂巢晶格几何的一次性核对脚本
├── logs/                     # AI Coding 日志（logs/<github_login>/<日期>/<tool>__<session>.jsonl）
├── .github/                  # Issue 模板、CLA 流程与 PR 质量门禁（v2-quality-gate.yml）
├── contest2026_382_wangwangdui.xml / openvela.xml   # repo 清单，把本仓 linkfile 进 openvela 源码树
└── README.md                 # 本文件
```

赛事 manifest 将本作品映射到 openvela 源码树中的：

```text
packages/apps/contest2026_382_velaclaw_aiot
```

## 四、运行方式

### 0. 环境准备

- Node.js 18 或更高版本（本次交付实测 Node.js 24.16.0）与 npm；
- Xiaomi AIoT-IDE / `aiot-toolkit` 2.0.5（在工程内执行 `npm ci` 会自动安装）；
- 只查看真机交付物的话，`board/rpk/` 里已经有构建好的 RPK，不必重新编译；
- 要在真机复现：Sifli SF32LB52 黄山派 / LCKFB 黄山派开发板（480×480 圆形 LCD）、USB 转串口，串口参数 1000000 baud、8N1、无流控。

### 1. 编译主应用

```bash
cd quickapp/velaclaw-aiot
npm ci
npm run check      # 29 步质量门禁：lint、架构/几何/交互/生命周期契约、文档断链等
npm run build      # 生成 dist/com.application.watch.demo.debug.2.4.0.rpk
npm run release    # 生成 dist/com.application.watch.demo.release.2.4.0.rpk
```

构建脚本固定关闭内联 source map，并在打包后逐个文件复查体积：设备安装器会拒绝包含单个大于 1 MiB 文件的包，所以「构建成功」和「可安装」由同一条门禁保证。

### 2. 在模拟器 / IDE 中运行

```bash
npm run start      # aiot start --watch，配合 AIoT-IDE 选择 wearable AVD
```

也可以直接按包名安装到已运行的设备或模拟器：

```bash
adb -s <serial> push dist/com.application.watch.demo.debug.2.4.0.rpk /tmp/app.rpk
adb -s <serial> shell pm install /tmp/app.rpk
adb -s <serial> shell am start com.application.watch.demo
```

建议至少覆盖圆屏与矩形（手环）两类 AVD，用来对照 Circle 蜂巢启动器与 Pill 分页列表的差异。`scripts/run-emulator.ps1` 可在 AIoT-IDE 调试会话存在时把调试包装到指定 AVD。

### 3. 在真机（openvela / NuttX + 黄山派圆屏）上运行

1）用串口进入 NuttShell：

```bash
picocom -b 1000000 --noreset --lower-rts --lower-dtr /dev/ttyUSB0
```

2）把 `board/rpk/com.application.watch.demo.release.2.4.0.rpk`（或 debug 包）按目标镜像的应用数据目录方式部署到设备；

3）确认包名与 `src/manifest.json` 一致后启动：

```text
vapp hap://app/com.application.watch.demo &
```

校验交付包：

```bash
sha256sum board/rpk/*.rpk
```

期望的 SHA256、真机验证结论以及当前板端的能力限制（亮度、振动、健康传感器、电量、互联等均按实际暴露的 native feature 保守降级）见 [board/README.md](board/README.md)。

### 4. 运行第二个应用（番茄钟）

```bash
cd quickapp/pomodoro
npm install
npm run test       # 状态机、几何、设置与统计的纯逻辑用例
npm run build      # 生成 dist/com.application.pomodoro.debug.1.0.0.rpk
```

安装方式与主应用相同（`pm install` + `am start com.application.pomodoro`）；它同时出现在主应用启动器的第一项「番茄钟」。

### 5. 打开 Design Studio（设计 → Agent 提示词）

```bash
cd tools/design-studio
node server.js     # http://127.0.0.1:4174
node test/design_studio.test.js
```

在设备画板上拖放组件、给组合写语义备注、定义多页面与跳转，然后导出「Agent 提示词 JSON」交给 AI Coding Agent；完整操作说明见 [tools/design-studio/README.md](tools/design-studio/README.md)。

### 6. 校验 Skill 套件（可选）

```bash
node skills/validate-skill-suite.mjs
```

## 五、AI Coding 使用说明

| 指标 | 情况 |
| --- | --- |
| AI Coding 代码占比 | 约 98% |
| 使用的 AI 工具 | Codex（主力）、ChatGPT |
| MCP | VelaJS MCP、WebSearch |
| Skills | 自建 `openvela-wearable-engineering`、`openvela-existing-app-refactor` |
| Token 使用总量 | 约 2 亿（官方统计口径） |

完整对话日志见 `logs/` 目录，按 `logs/<github_login>/<日期>/<tool>__<session_id>.jsonl` 组织，由赛事归集工具导出，未手工改写。

**各环节如何与 AI 协作**

- **需求拆解 / 方案设计**：遇到一个问题先定位它属于 Capability、Domain、Feature、Design 还是 Page，再让 AI 在正确的层提方案。多形态适配、健康与运动拆分、V2 架构重写都是先定边界再动代码。
- **编码**：可视化调整集中到结构化的 Design Spec 与布局配置，AI 改的是受约束的字段；圆屏弦宽、蜂巢轴坐标、Haversine 距离、功耗状态机这类确定性逻辑要求先写纯函数与契约测试，再接页面。
- **调试**：把日志、manifest、构建产物、设备文件与源码放进同一条问题链分析。例如「番茄钟图标在设备上看不见」最后定位到源码、build、RPK 与设备端资源不同步，由此固定了 source → build → RPK → device → runtime 的排查顺序；黄山派适配阶段又用它追 NuttX 构建、`vapp` 启动、LCD/Touch 设备节点以及 native feature 暴露范围的差异。
- **文档**：架构文档、兼容性说明、审计报告与 README 由 AI 起草并归入仓库既有主题，`npm run check` 中的文档断链与结构检查负责兜底。

**实际带来的帮助**

- 跨模块分析：一个显示异常可能同时牵涉 Device Profile、Safe Geometry、Design Spec、Feature 状态和 Capability 返回值，AI 能一次把调用链摊开，省掉逐文件追踪的时间。
- 重复性工程操作自动化：测试、几何检查、交互检查、包体积门禁与构建脚本大多由 AI 补齐，规则从「靠人记」变成 `npm run check` 里的可执行条目，回归由门禁而不是人工 review 发现。
- 经验复用：两名成员的会话并不共享上下文，因此把稳定经验沉淀成仓库内的文档、测试与两个 Skill，让新会话和后续开发者读到同一套规则。

**AI 开发中暴露的问题与对策**

- 局部正确、整体破坏架构：AI 倾向修改离问题最近的文件，早期出现过页面重新依赖 legacy common、页面越过 Feature 直接访问 Capability 的倾向，后来由架构契约测试拦住。
- 把模拟器假设当成真机事实：manifest 声明某个能力不等于板端真的具备，因此 Capability Runtime 以 `available / live / fallback / persisted / memoryOnly` 这类运行事实为准，而不是读声明下结论。
- 把源码改完当成交付完成：Quick App 后面还有 build、RPK、设备安装目录和 Runtime，资源不同步会直接表现为设备端的旧行为。
- 视觉与交互问题难以只靠文本判断：圆屏裁切、文字重叠、蜂巢拖动和 beta Runtime 手势必须落到模拟器或真机证据，为此补充了模拟器窗口抓取与 PNG 完整性校验工具。
- 长会话与多人协作中的上下文衰减：把规则写进 Skill 与契约，而不是留在某一次长对话里。

> 许可证与第三方素材：源代码按 Apache License 2.0 发布（`quickapp/velaclaw-aiot/LICENSE`、`board/LICENSE`），第三方素材与生成资源的说明见各目录的 `NOTICE`。健康相关页面用于 Quick App 能力与交互演示，不构成医疗或健康判断；系统能力不可用时界面会进入明确标识的降级状态。
