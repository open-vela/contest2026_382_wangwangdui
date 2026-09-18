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

## 功能范围

当前应用覆盖：

- 多表盘与表盘快速切换
- 应用启动器
- 心率、趋势、步数等健康演示页面
- 运动选择、运动记录与历史
- 今日历、通知演示、同步演示
- 设置、亮度、震动、动作诊断、自检等页面

部分能力依赖目标硬件和 Vela native feature 支持。硬件或系统 feature 不可用时，应用会使用降级逻辑或演示数据。

## PR 注意事项

- 本目录是交付快照，实际开发源仍在 `quickapp/velaclaw-aiot`。
- 若后续继续修改应用源码，需要重新执行 `npm run check`、`npm run build`，并同步更新 `board/source/velaclaw-aiot` 与 `board/rpk/`。
- 当前已同时提交 debug RPK 与 release RPK。
- 不要提交 `node_modules/`、`build/`、`dist/`、`.temp_*` 等本地构建产物目录。
