# 面向普通用户的 openvela 可穿戴应用创作原型 —— 从可视化草图与自然语言到 AI Agent

## 一、作品简介

`vela_band` 是一套可穿戴应用运行系统，加上一个面向 AI Coding Agent 的创作入口。运行侧让同一份 Quick App 在圆屏 Circle、胶囊屏 Pill、矩形屏 Rect 上以各自的形态原生构图运行，覆盖表盘与表盘库、应用启动器、健康与趋势、运动与历史、今日日历、通知演示、同步演示、番茄钟、设置、设备自检与低功耗状态机。创作侧是 Design Studio，用户在设备画板上用基础图形画出界面的大致结构，用自然语言写下每个区域要完成什么，再定义页面之间的跳转，工具把这些空间、语义与流程信息导出为结构化的 Agent 提示词 JSON，交给 AI Coding Agent 生成 Vela 工程代码。

作品针对三个具体问题。同一业务语义在三种物理形态上不能靠一套界面等比缩放，圆屏要按弦宽计算可用宽度，胶囊屏适合纵向信息流，矩形屏才是有完整四边的方屏。健康、定位、传感器、存储、振动等系统能力在真机上可能随时不可用，必须以显式降级代替虚假成功。普通用户能够说清自己想要什么应用，却说不清组件、变量与系统 API。

亮点是三件事的组合。运行系统以 Capability、Domain、Feature、Design、Page 五层组织，业务语义共享而形态构图保持原生，并用 L1 自动、L2 辅助、L3 自由三档设计自由度区分可以由规则算出的差异和必须由设计决定的差异。工程约束写成机器可执行的契约与门禁，覆盖架构依赖、交互 owner、数据来源、资源生命周期与包体积。整套系统已经落在真实硬件上，在 Sifli SF32LB52 黄山派 480×480 圆屏开发板上通过 NuttShell 与 vapp 启动 Quick App，跑通 LCD `/dev/lcd0` 与触摸 `/dev/input0` 的显示与输入链路。

## 二、选题方向

手表应用创新与 AI 硬件产品创新。

手表应用创新：作品主体是运行在 openvela wearable 形态上的 Quick App，工作量集中在圆屏弦宽与安全区、胶囊端帽、蜂巢启动器拖动与焦点吸附、导航手势 owner、ACTIVE 与 DIM 与 SLEEP 三态低功耗调度、传感器多消费者共享订阅这些可穿戴特有问题上，而不是把手机页面缩小。

AI 硬件产品创新：作品把 AI 用在用户意图到代码这一段。Design Studio 导出的 `designstudio/v1` 结构化提示词 JSON 与 Vela 脚手架，加上两个自定义 Skill，把可穿戴工程规则交给 AI Coding Agent，形成文字负责语义、草图负责空间、AI 负责实现、平台负责保障运行的创作方式。

选题不包含新硬件适配。目标平台是赛事支持范围内的 Sifli SF32LB52 黄山派与 LCKFB 黄山派 openvela/NuttX 配置，作品没有自行设计 PCB，也没有新增 LCD、Touch、IMU、BLE 驱动，板端工作是既有板级支持之上的 Quick App、Capability Gate、资源预算与低资源 UI 适配。

## 三、目录结构

- `quickapp/velaclaw-aiot/` — 主应用 vela_band，包名 `com.application.watch.demo`，版本 2.4.0。`src/` 存放 capabilities、domain、v2、pages、components，`assets/` 存放图标与表盘源素材，`scripts/` 存放检查与资源脚本，`test/` 存放契约与纯逻辑测试，`docs/` 存放架构、设计系统、兼容性与审计文档
- `quickapp/pomodoro/` — 第二个独立快应用 `com.application.pomodoro`，圆屏与矩形使用两套 composition，`src/`、`test/`、`docs/`、`design-assets/` 与主应用同构
- `quickapp/emulator-rpk/` — 模拟器上验证过的调试包 `com.application.watch.demo.debug.2.4.0.rpk`，598 KiB
- `board/rpk/` — 板端交付包，debug 614 KiB 与 release 598 KiB 两个 RPK 及对应 SHA256
- `board/source/velaclaw-aiot/` — 板端源码快照，含 native feature gate 与 memory、exchange 两级存储降级
- `board/README.md` — 目标板资料、构建复现步骤、真机验证结论与能力限制
- `skills/` — 两个自定义 AI Coding Skill，`openvela-wearable-engineering` 与 `openvela-existing-app-refactor`，以及 Skill 套件校验脚本
- `tools/` — 仓库根目录的本地辅助工具，`design-studio/` 是设计画布与提示词导出工具，另有模拟器窗口抓取、PNG 校验与蜂巢几何核对脚本
- `logs/` — AI Coding 日志，按 `logs/<github_login>/<日期>/<tool>__<session>.jsonl` 组织
- `.github/` — Issue 模板、CLA 流程与 PR 质量门禁
- `contest2026_382_wangwangdui.xml`、`openvela.xml` — repo 清单，把本仓 linkfile 到 openvela 源码树的 `packages/apps/contest2026_382_velaclaw_aiot`
- `quickapp/velaclaw-aiot/LICENSE`、`quickapp/velaclaw-aiot/NOTICE`、`board/LICENSE` — Apache License 2.0 与第三方素材说明
- `README.md` — 本文件

## 四、运行方式

### 环境准备

需要 Node.js 18 或更高版本与 npm，需要 Xiaomi AIoT-IDE 或可执行 `aiot build` 的 Vela Quick App 工具链，工程内执行 `npm ci` 会自动安装 `aiot-toolkit` 2.0.5。只想直接运行的话不必重新编译，模拟器可安装 `quickapp/emulator-rpk/` 中的调试包，真机可安装 `board/rpk/` 中的两个 RPK。真机复现需要 Sifli SF32LB52 黄山派或 LCKFB 黄山派开发板、480×480 圆形 LCD 与 USB 转串口，串口参数为 1000000 baud、8N1、无流控。

### 1. 编译主应用

```bash
cd quickapp/velaclaw-aiot
npm ci
npm run check
npm run build
npm run release
```

`npm ci` 按 `package-lock.json` 安装锁定依赖。`npm run check` 运行 lint、架构与几何、交互、生命周期、数据来源等契约检查以及文档链接检查。`npm run build` 生成调试包 `dist/com.application.watch.demo.debug.2.4.0.rpk`，`npm run release` 生成 `dist/com.application.watch.demo.release.2.4.0.rpk`。构建流程关闭内联 source map，并在打包后逐个文件复查体积，因为设备安装器会拒绝包含单个大于 1 MiB 文件的包。

### 2. 在模拟器或 IDE 中运行

```bash
cd quickapp/velaclaw-aiot
npm run start
```

`npm run start` 以 watch 模式启动开发构建，配合 AIoT-IDE 选择 wearable AVD 运行。也可以把构建好的包装到已经运行的设备或模拟器上：

```bash
adb -s <serial> push dist/com.application.watch.demo.debug.2.4.0.rpk /tmp/app.rpk
adb -s <serial> shell pm install /tmp/app.rpk
adb -s <serial> shell am start com.application.watch.demo
```

`<serial>` 替换为 `adb devices` 输出的设备号。建议至少覆盖圆屏与矩形手环两类 AVD，用于对照 Circle 蜂巢启动器与 Pill 分页列表的差异。`scripts/run-emulator.ps1` 可以在 AIoT-IDE 调试会话存在时，把调试包装到指定 AVD。

### 3. 在真机上运行

```bash
picocom -b 1000000 --noreset --lower-rts --lower-dtr /dev/ttyUSB0
```

进入 NuttShell 后，把 `board/rpk/com.application.watch.demo.release.2.4.0.rpk` 或 debug 包按目标镜像的应用数据目录部署到设备，确认包名与 `src/manifest.json` 一致后启动：

```text
vapp hap://app/com.application.watch.demo &
```

真机链路为 NuttShell 到 vapp 到 Quick App Runtime 到 LVGL framebuffer，显示走 `/dev/lcd0`，单点触摸走 `/dev/input0`。校验交付包：

```bash
sha256sum board/rpk/*.rpk
```

期望的 SHA256、真机验证结论以及当前板端的能力限制见 [board/README.md](board/README.md)。

### 4. 运行番茄钟应用

```bash
cd quickapp/pomodoro
npm install
npm run test
npm run build
```

`npm run test` 覆盖计时状态机、几何、设置与统计的纯逻辑用例，`npm run build` 生成 `dist/com.application.pomodoro.debug.1.0.0.rpk`，包名为 `com.application.pomodoro`，安装方式与主应用相同。番茄钟同时出现在主应用启动器应用列表的第一项。

### 5. 打开 Design Studio

```bash
cd tools/design-studio
node server.js
node test/design_studio.test.js
```

服务监听 `127.0.0.1:4174`。在设备画板上拖放组件、给组合写语义备注、定义多页面与跳转，然后导出 Agent 提示词 JSON 交给 AI Coding Agent，完整操作说明见 [tools/design-studio/README.md](tools/design-studio/README.md)。

### 6. 校验 Skill 套件

```bash
node skills/validate-skill-suite.mjs
```

## 五、AI Coding 使用说明

| 指标 | 情况 |
| --- | --- |
| AI Coding 代码占比 | 约 98% |
| 使用的 AI 工具 | Codex、ChatGPT |
| MCP | VelaJS MCP、WebSearch |
| Skills | 自建 `openvela-wearable-engineering`、`openvela-existing-app-refactor` |
| Token 使用总量 | 约 20 亿 |

完整对话日志见 `logs/` 目录，按 `logs/<github_login>/<日期>/<tool>__<session_id>.jsonl` 组织，由赛事归集工具导出。

需求拆解与方案设计：先定位一个问题属于 Capability、Domain、Feature、Design 还是 Page，再让 AI 在正确的层提方案。多形态适配、健康与运动模块划分、设计层与页面层的边界都按这条顺序确定。

编码：可视化调整集中在结构化的 Design Spec 与布局配置里，AI 修改的是受约束的字段。圆屏弦宽、蜂巢轴坐标、Haversine 距离、功耗状态机这类确定性逻辑先写纯函数与契约测试，再接页面。

调试：把日志、manifest、构建产物、设备文件与源码放进同一条问题链，按 source 到 build 到 RPK 到 device 到 runtime 的顺序确认现象。板端问题继续追到 NuttX 构建、vapp 启动、LCD 与触摸设备节点以及 native feature 的暴露范围。

文档：架构、设计系统、兼容性、维护者指南与审计记录按仓库既有主题维护，README 与文档链接由 `npm run check` 中的检查兜底。

实际带来的帮助：

- 跨模块分析：一个显示异常可能同时牵涉 Device Profile、Safe Geometry、Design Spec、Feature 状态与 Capability 返回值，AI 能一次把调用链摊开，省掉逐文件追踪的时间
- 重复性工程操作自动化：测试、几何检查、交互检查、包体积门禁与构建脚本由 AI 补齐，规则固化为 `npm run check` 中的可执行条目，回归由门禁发现而不是依赖人工 review
- 经验复用：两名成员的会话并不共享上下文，稳定经验沉淀成仓库内的文档、测试与两个 Skill，供后续会话与开发者复用

需要主动控制的点：

- 修改范围：AI 倾向修改离问题最近的文件，因此页面不越过 Feature 直接访问 Capability，新页面不依赖 `src/common`，这两条由架构契约测试约束
- 能力可用性以运行事实为准：manifest 声明某个能力不等于目标板真的具备，Capability Runtime 以 available、live、fallback、persisted、memoryOnly 这类运行结果为准
- 交付物一致性：源码之外还有 build、RPK 与设备安装目录，验证按 source 到 build 到 RPK 到 device 到 runtime 的顺序做
- 视觉与交互以模拟器或真机证据为准：圆屏裁切、文字重叠、蜂巢拖动与手势 owner 不能只靠阅读源码判断，配合 `tools/` 下的模拟器抓取与 PNG 校验脚本取证
- 规则落在仓库里：把稳定结论写进 Skill 与契约测试，避免只存在于某一次会话中
