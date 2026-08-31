# vela_band — openvela 2026 参赛作品

## 作品简介

`vela_band` 是一个面向 Xiaomi Vela Quick App 的智能手环 / 手表交互项目，覆盖多表盘、多屏适配、健康趋势、运动记录、通知演示、设置、自检、震动反馈、低功耗状态管理与今日历等能力。

项目重点是围绕可穿戴设备约束进行工程化实现：同一应用适配胶囊、矩形与圆形屏幕；健康和传感器能力遵循“系统接口可用则读取、不可用则明确降级”的策略；对滑动、蜂窝启动器、安全区和低功耗状态提供独立逻辑与回归测试。

> 当前分支名为 `feat/velaclaw-aiot`，但已提交源码尚未集成 `system.velaclaw`。本文只描述仓库中可核验的实现，不以分支名称替代功能证据。

## 选题方向

**手表应用创新 / 快应用方向。**

## 目录结构

```text
contest2026_382_wangwangdui/
├── quickapp/
│   └── velaclaw-aiot/          # Vela Quick App 源码工程
│       ├── src/                # app.ux、真实 manifest、页面、组件与运行时资源
│       ├── assets/             # 可编辑图标与表盘源素材
│       ├── scripts/            # 静态检查、资源生成、模拟器辅助脚本
│       ├── test/               # 纯逻辑回归测试
│       ├── docs/               # 技术、兼容性与维护文档
│       ├── package.json
│       ├── package-lock.json
│       ├── LICENSE             # Apache License 2.0
│       └── NOTICE
├── logs/                       # 官方 AI Coding 日志目录
├── contest2026_382_wangwangdui.xml
└── README.md
```

赛事 manifest 将本作品映射到：

```text
packages/apps/contest2026_382_velaclaw_aiot
```

## 主要实现

- 多表盘：胶囊、矩形和圆形屏使用形态适配的表盘组件，并共享注册与持久化逻辑。
- 多屏适配：通过 `$device`、`system.device`、宽高比与安全区逻辑识别 wearable 形态。
- 应用启动器：胶囊屏采用固定分页；圆屏采用可拖动蜂窝布局与焦点吸附。
- 健康数据：使用 `service.health` 读取心率、血氧、压力等能力；不可用时明确显示演示降级状态。
- 运动记录：支持步行 / 跑步、暂停继续、历史记录，GPS 可用时参与距离计算。
- 通知演示：支持来电、短信、应用通知覆盖层的本地演示与公共事件入口。
- 震动反馈：提供多档强度和多种震动节奏，并设计系统能力不足时的兼容降级。
- 低功耗状态：实现 ACTIVE、DIM、SLEEP 状态和简化抬腕唤醒逻辑。
- 工程质量：包含 lint、文档检查、多屏检查、安全区检查及多项纯逻辑测试。

详细设计与兼容性说明见 `quickapp/velaclaw-aiot/docs/` 及工程自身 README。

## 构建与验证

需要 Node.js 18 或更高版本、npm，以及 Xiaomi AIoT-IDE / Vela Quick App 开发环境。

```bash
cd quickapp/velaclaw-aiot
npm ci
npm run check
npm run build
```

`npm run build` 用于生成调试 RPK。生产模式入口为：

```bash
npm run release
```

根据赛事官方快应用提交要求，最终仓库还需包含生产模式生成的 `dist/*.release.rpk`。本仓库当前尚未提交可核验的 production `release.rpk`，因此不宣称生产包已经完成或通过签名验证。

## AI Coding

赛事要求的正式 AI Coding 日志应通过官方支持的采集流程生成并提交到 `logs/<github_login>/...`。当前仅保留日志格式说明，尚未提交可用于评分的正式会话日志；不会手工伪造或修改 JSONL 会话内容。

## 提交状态

已完成：

- Quick App 源码、页面、组件与运行时资源
- 工程脚本和纯逻辑测试
- 技术与兼容性文档
- 赛事 manifest 映射
- Apache-2.0 主许可证与 NOTICE
- 首次赛事 PR / CLA 流程

最终提交前仍需补齐或实机/模拟器验证：

- 生产版 `dist/*.release.rpk`
- 官方 AI Coding 日志
- 最终 Demo 视频（不超过 5 分钟）
- 作品介绍文档（DOCX / PDF / PPTX）

## 许可证与第三方素材

项目源代码按 Apache License 2.0 发布，详见 `quickapp/velaclaw-aiot/LICENSE`。第三方素材及生成资源的归属与适用条款见 `quickapp/velaclaw-aiot/NOTICE`。

## 免责声明

健康相关页面用于 Quick App 能力和交互演示，不构成医疗或健康判断。系统健康接口不可用时，界面会明确进入演示降级状态。
