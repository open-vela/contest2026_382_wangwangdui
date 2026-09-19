# Board 交付说明

本目录用于 PR / 评审交付，集中保存可在目标板端验证的 Quick App 源码快照与已构建 RPK。

## 目录结构

```text
board/
├── README.md
├── LICENSE
├── rpk/
│   ├── com.application.watch.demo.debug.2.4.0.rpk
│   └── com.application.watch.demo.release.2.4.0.rpk
└── source/
    └── velaclaw-aiot/
        ├── src/                # Quick App 源码、页面、组件和运行时
        ├── assets/             # 可编辑素材
        ├── docs/               # 架构、兼容性和维护文档
        ├── scripts/            # 检查、资源处理和辅助脚本
        ├── test/               # 纯逻辑和架构回归测试
        ├── tools/              # Layout Studio 等辅助工具
        ├── package.json
        ├── package-lock.json
        ├── build.sh
        ├── build.bat
        ├── LICENSE
        └── NOTICE
```

`source/velaclaw-aiot` 是从 `quickapp/velaclaw-aiot` 整理出的源码快照，不提交 `node_modules/`、`build/`、`dist/`、`.temp_*` 等本地依赖或构建产物目录。

## 开源协议

本交付目录使用 Apache License 2.0：

- `board/LICENSE`
- `board/source/velaclaw-aiot/LICENSE`
- `board/source/velaclaw-aiot/package.json` 的 `license` 字段为 `Apache-2.0`

保留 `NOTICE` 文件，用于记录第三方素材、工具链和生成资源说明。

## RPK 信息

| 文件 | 类型 | 大小 | SHA256 |
| --- | --- | ---: | --- |
| `board/rpk/com.application.watch.demo.debug.2.4.0.rpk` | debug RPK | 614K | `21d049f7c7c6abf034d010766e210b6203bfa310a1220f2e4e891cda181b4e29` |
| `board/rpk/com.application.watch.demo.release.2.4.0.rpk` | release RPK | 598K | `feca0789cca59949eeba32290492edfdb81c5b1ff32101e96a04d7f879af87bc` |

校验命令：

```bash
sha256sum board/rpk/*.rpk
```

期望输出：

```text
21d049f7c7c6abf034d010766e210b6203bfa310a1220f2e4e891cda181b4e29  board/rpk/com.application.watch.demo.debug.2.4.0.rpk
feca0789cca59949eeba32290492edfdb81c5b1ff32101e96a04d7f879af87bc  board/rpk/com.application.watch.demo.release.2.4.0.rpk
```

## 环境要求

- Node.js 18 或更高版本
- npm
- Xiaomi AIoT / Vela Quick App 构建工具链，需可执行 `aiot build`

本次验证环境中 `aiot build` 输出的 Node 版本为 `v24.16.0`，工具链版本为 `aiot-toolkit 2.0.5`。

## 目标真机资料

本作品面向 openvela / NuttX 真机环境下的圆屏手表 Quick App 验证，开发和调试过程中使用的目标板信息如下：

- SoC / 板级：Sifli SF32LB52 系列，实际验证使用黄山派 / LCKFB 黄山派相关配置。
- 屏幕：480 x 480 圆形 LCD。
- 触摸：`/dev/input0` 单点触摸输入。
- LCD 设备：`/dev/lcd0`。
- 串口：USB 转串口，常用设备为 `/dev/ttyUSB0`。
- 串口参数：`1000000` baud，8N1，无流控。
- 系统 Shell：NuttShell，启动后可看到 `nsh>` 提示符。

常用串口连接命令：

```bash
picocom -b 1000000 --noreset --lower-rts --lower-dtr /dev/ttyUSB0
```

调试中使用过的应用启动命令示例：

```text
vapp hap://app/com.application.watch.demo &
```

早期调试曾使用过旧包名 `com.openvela.contest2026.team382.vela_band`。当前交付 RPK 和源码快照使用的包名为：

```text
com.application.watch.demo
```

若将应用集成进板级固件，需要确保 RPK 或解包后的应用目录被放入目标系统的应用数据目录，并且 `vapp` 启动 URI 与 `src/manifest.json` 中的 `package` 保持一致。

## 从源码构建

```bash
cd board/source/velaclaw-aiot
npm ci
npm run check
npm run build
```

`npm run build` 会生成 debug RPK：

```text
dist/com.application.watch.demo.debug.2.4.0.rpk
```

生成 release RPK：

```bash
npm run release
```

`npm run release` 会生成：

```text
dist/com.application.watch.demo.release.2.4.0.rpk
```

本目录已同时提交 debug 与 release RPK。`source/velaclaw-aiot/sign/release/` 保留了 release 构建所需证书路径，用于复现当前 release 构建流程。

## 已完成验证

整理后的源码快照已经在 `board/source/velaclaw-aiot` 内实际执行：

```bash
npm ci
npm run check
npm run build
```

结果：

- `npm ci`：通过，安装 735 个依赖。
- `npm run check`：通过，0 errors；保留 1 个既有 warning：`src/v2/design/engines/honeycomb.js` 中 `showActiveIcon` 未使用。
- `npm run build`：通过，生成 `dist/com.application.watch.demo.debug.2.4.0.rpk`。
- `npm run release`：通过，生成 `dist/com.application.watch.demo.release.2.4.0.rpk`。

原工程还完成过板级固件构建：

```bash
cmake --build cmake_out/lckfb_huangshan_pi -j2
```

最近板级固件产物：

```text
cmake_out/lckfb_huangshan_pi/nuttx.bin
SHA256: 28950645cd8b1f4ed00865e7939e15b5d4b4b886b5eeb01a5717c8b2e4e1a33c
```

真机调试中确认过以下基础链路：

- 系统可进入 NuttShell。
- `vapp` 可启动 Quick App 运行时。
- LVGL framebuffer loop 可启动。
- LCD `/dev/lcd0` 可打开。
- 触摸 `/dev/input0` 可打开。
- 应用可以进入表盘、应用列表、设置、健康、运动等主要页面。

真机问题定位过程中重点修复和规避过：

- 应用首屏白屏和页面加载失败。
- RPK / 固件集成后资源路径不一致。
- 表盘快速左右切换与表盘库状态不同步。
- 应用内部右滑返回。
- 蜂窝 / 应用列表在低性能硬件上的卡顿和图标显示问题。
- `system.storage` 数据库不可用时的降级存储。
- 缺失 `system.brightness`、`system.sensor`、`service.health`、`system.battery`、`system.vibrator` 等 native feature 时的兼容处理。

## 功能范围

当前应用覆盖：

- 多表盘与表盘快速切换
- 应用启动器
- 心率、趋势、步数等健康演示页面
- 运动选择、运动记录与历史
- 今日历、通知演示、同步演示
- 设置、亮度、震动、动作诊断、自检等页面

部分能力依赖目标硬件和 Vela native feature 支持。硬件或系统 feature 不可用时，应用会使用降级逻辑或演示数据。

## 真机能力限制与降级

当前目标硬件和系统镜像并不保证提供所有 watch native feature。已知验证情况如下：

- 亮度页：UI 和设置项可用；若系统未提供 `system.brightness` 或底层背光控制未接入，滑动条只保存状态，不保证改变真实屏幕亮度。
- 振动页：若硬件或系统未提供 `system.vibrator`，页面保留交互和提示，不触发真实马达。
- 运动 / 心率 / 趋势：若无健康传感器或 `service.health`，使用模拟数据或降级数据展示。
- 加速度 / 动作诊断：若缺少 `system.sensor` 或对应 IMU 通道，页面展示兼容状态。
- 电量：若缺少 `system.battery`，使用演示值或保守默认值。
- 同步 / 互联：若缺少 `system.interconnect`，保留页面入口和演示状态。
- 通知：若系统事件能力不完整，通知演示页面保留本地展示能力。

这些限制属于目标板硬件能力或系统 native feature 暴露范围，不影响 RPK 构建和基础 UI 路由验证。

## PR 注意事项

- 本目录是交付快照，实际开发源仍在 `quickapp/velaclaw-aiot`。
- 若后续继续修改应用源码，需要重新执行 `npm run check`、`npm run build`，并同步更新 `board/source/velaclaw-aiot` 与 `board/rpk/`。
- 当前已同时提交 debug RPK 与 release RPK。
- 不要提交 `node_modules/`、`build/`、`dist/`、`.temp_*` 等本地构建产物目录。
