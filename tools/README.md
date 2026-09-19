# tools/ — 本地设计与验证工具

本目录存放不参与应用打包的开发期工具：辅助设计、模拟器取证和布局/几何核对脚本。

| 路径 | 用途 |
| --- | --- |
| `design-studio/` | 本地网页辅助设计工具（JSON 型提示词生成器）：设备画板上拖放组件、写语义备注、定义多页面与跳转，导出 Agent 提示词 JSON、中文摘要、Vela 脚手架与字段说明。用法见 [design-studio/README.md](design-studio/README.md)。 |
| `emu_capture.py` | 抓取 Vela 模拟器窗口画面并做基础分析（设备屏范围、像素颜色、ASCII 预览）。Vela 镜像没有 `screencap`，模拟器 UI 取证只能从宿主窗口取。 |
| `emu_window.py` | 按进程枚举并抓取模拟器窗口，供 `emu_capture.py` 使用。 |
| `png_check.py` | 校验 PNG 的 chunk CRC：损坏的 IDAT 肉眼不可见，但会被 Vela 图片转换和运行时拒绝。 |
| `rewrite_honeycomb.js` | 针对 `src/presentation/engines/honeycomb.js` 的一次性源码改写脚本，用于核对蜂巢晶格几何的引用方式。 |

## Design Studio 快速启动

```bash
cd tools/design-studio
node server.js                 # http://127.0.0.1:4174
node test/design_studio.test.js
```

也可以从应用工程转发调用：

```bash
cd quickapp/velaclaw-aiot
npm run studio
npm run studio:check
```

这些工具不参与应用构建与 RPK 打包，只用于开发、评审取证和设计意图导出。
