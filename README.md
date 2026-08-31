# vela_band — openvela 2026 参赛作品

## 一、作品简介

`vela_band` 是一个面向 Xiaomi Vela Quick App 的智能手环 / 手表交互项目，当前覆盖多表盘、多屏适配、健康趋势、运动记录、通知演示、设置、自检、震动反馈、低功耗状态管理与今日历等能力。

项目重点不是简单堆叠页面，而是围绕可穿戴设备的真实约束做工程化处理：同一 RPK 适配胶囊、矩形、圆形屏幕；对健康与传感器能力采用“系统接口可用则读取、不可用则明确降级”的策略；对滑动、表盘切换、蜂窝启动器、安全区和低功耗状态做了独立逻辑与回归测试。

> 当前 Git 分支名为 `feat/velaclaw-aiot`，但本次已提交代码中尚未包含 `system.velaclaw` API 集成。README 仅描述仓库中已经存在并可核验的功能，不把分支名称作为功能完成度证明。

## 二、选题方向

**快应用 / 手表应用创新**。

作品基于 Vela Quick App 开发，重点展示可穿戴终端在多形态屏幕、健康能力、运动交互、表盘系统、震动反馈与低功耗场景下的完整应用体验。

## 三、目录结构

```text
contest2026_382_wangwangdui/
├── quickapp/
│   └── velaclaw-aiot/          # 完整 Vela Quick App 工程
│       ├── src/                # 页面、组件、业务逻辑、资源和 manifest
│       ├── assets/             # 原始图标与表盘素材
│       ├── scripts/            # 静态检查、资源生成、模拟器辅助脚本
│       ├── test/               # 纯逻辑回归测试
│       ├── docs/               # 技术、兼容性与维护文档
│       ├── package.json
│       └── package-lock.json
├── logs/                       # 大赛 AI Coding 日志目录
├── contest2026_382_wangwangdui.xml
└── README.md
```

manifest 将本作品映射到：

```text
packages/apps/contest2026_382_velaclaw_aiot
```

## 四、主要实现

- 多表盘：胶囊、矩形与圆形屏幕使用不同紧凑表盘组件，并共享表盘注册和持久化逻辑。
- 多屏适配：通过 `$device`、`system.device`、宽高比与安全区逻辑识别不同 wearable 形态。
- 应用启动器：胶囊屏采用固定分页；圆屏采用可拖动蜂窝布局与焦点吸附。
- 健康数据：使用 `service.health` 读取心率、血氧、压力等能力；不可用时明确显示演示降级状态。
- 运动记录：支持步行 / 跑步、暂停继续、历史记录，并在 GPS 可用时参与距离计算。
- 通知演示：支持来电、短信、应用通知覆盖层的本地演示与公共事件入口。
- 震动反馈：提供轻 / 中 / 强以及多种震动节奏，并在系统能力有限时使用兼容降级策略。
- 低功耗状态：实现 ACTIVE、DIM、SLEEP 状态和简化抬腕唤醒逻辑。
- 工程质量：包含 lint、文档检查、多屏检查、安全区检查以及多项纯逻辑测试。

更详细的设计与兼容性说明见 `quickapp/velaclaw-aiot/docs/` 和工程自身的 `README.md`。

## 五、运行方式

### 1. 安装依赖

需要 Node.js 18 或更高版本、npm，以及 Xiaomi AIoT-IDE / Vela Quick App 开发环境。

进入工程：

```bash
cd quickapp/velaclaw-aiot
npm ci
```

### 2. 运行质量检查

```bash
npm run check
```

### 3. 构建调试 RPK

```bash
npm run build
```

工程脚本当前记录的调试产物形式为：

```text
dist/com.application.watch.demo.debug.1.0.0.rpk
```

### 4. 生产包

工程提供：

```bash
npm run release
```

比赛最终提交前还需要确认并提交 AIoT-IDE / 工具链生成的生产版 `release.rpk`。当前赛事分支中尚未包含可核验的 production `release.rpk`，因此本 README 不宣称生产包已经完成。

## 六、测试与验证

工程 `package.json` 中包含以下检查入口：

```bash
npm run lint
npm run multiscreen:check
npm run safearea:check
npm run health:check
npm run haptic:check
npm run health:logic
npm run pager:logic
npm run motion:logic
npm run calendar:logic
npm run analog:logic
npm run face:logic
npm run navigation:logic
npm run viewport:logic
npm run safearea:logic
npm run honeycomb:logic
npm run haptic:logic
npm run docs:check
```

本赛事仓内只对源码结构进行了提交检查；是否在评审环境成功构建，应以实际 AIoT-IDE / openvela 模拟器构建结果为准。

## 七、AI Coding 使用说明

项目开发过程中使用了 AI 辅助进行需求拆解、架构检查、代码审阅、兼容性分析和提交结构整理。

大赛要求的正式 AI Coding 日志必须由官方支持的日志归集流程生成并放入 `logs/<github_login>/...`。当前仓库仍保留模板日志目录，尚未提交可作为本作品正式评分依据的 AI Coding 会话日志；后续应通过官方 collector 导出，不能手工伪造或编辑 JSONL。

## 八、当前提交状态

已提交：

- 完整 Quick App 源码工程
- 页面、组件、运行时资源
- 工程脚本与纯逻辑测试
- 技术与兼容性文档
- 大赛 manifest 映射

仍需在最终提交前补齐 / 验证：

- 生产版 `release.rpk`
- 官方 AI Coding 日志
- 最终 Demo 视频与作品介绍材料
- CLA 状态及 PR 检查

## 九、免责声明

本项目中的健康相关页面用于 Quick App 能力和交互演示，不构成医疗或健康判断。系统健康接口不可用时，界面会明确进入演示降级状态。
