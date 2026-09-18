# Vela Layout Studio v2.4

Vela Layout Studio 是一个本地网页辅助设计工具。它的目标不是替代 Vela，也不是再造一套布局算法，而是把现有的 **UX + Recipe + Scene + Adapter** 变成可视化、可快速调整的开发工作流。

## 核心原则

> UX 决定结构，Recipe 决定设计意图，Scene 给出 Host Scene / Safe Area，Adapter 负责翻译和合法化，Studio 负责把这一切可视化。

Studio 不拥有第二套 Adapter。预览使用项目真实的 `scene.js`、`adapter.js` 和 `apps/<app>/index.js` 解析计划，因此开发工具和设备运行时共享同一套几何语义。

## 启动

在 `quickapp/velaclaw-aiot` 中执行：

```bash
npm run studio
```

默认会打开：

```text
http://127.0.0.1:4174
```

Studio 只监听本机地址。若不希望自动打开浏览器：

```bash
node tools/layout-studio/server.js --no-open
```

也可以通过环境变量 `LAYOUT_STUDIO_PORT` 修改端口。

## 设计体验

界面分为三个主要区域：

- **左侧组件栏**：按“内容区域、页头、主卡、趋势、按钮”等真实组件分组，避免开发者面对一长串裸字段。
- **中间实时预览**：读取真实 `.ux`，翻译成浏览器可显示的结构；同时叠加真实 Adapter Plan 和 Safe Area。
- **右侧属性面板**：每个组件只展示它允许修改的参数，支持 `+ / -`、数字输入、滑杆、恢复继承。

布局框支持快捷操作：

- 上下拖动：修改当前组件的 `top` / `streamTop`。
- 右下角缩放：修改可编辑的 `width` / `height`。
- 点击组件框：直接切换到对应属性面板。

Studio 中的蓝色几何框来自实际 Plan。UX 页面底图是浏览器翻译预览，主要用于结构和视觉定位；最终设备表现仍以 Vela Runtime 为准。

## 只写差异

Recipe 继续遵循：

```text
base    = Canonical Design
circle  = Circle delta
pill    = Pill delta
rect    = Rect delta
```

开发者只需要写当前形态与 `base` 不同的部分。

例如 `base` 已经定义：

```js
base: {
  cardGap: 6,
  cardRadius: 16
}
```

Circle 只改圆角时，Studio 保存：

```js
circle: {
  cardRadius: 15
}
```

不会自动复制 `cardGap: 6`。

属性面板会明确标记：

- `继承 base`
- `当前机型覆盖`

点击“恢复继承”会删除 shape 对应字段，而不是把 base 的值再写一遍。

## 本地文件写入

拖动、滑杆和输入只修改 Studio 内存中的 Draft，并实时请求预览。

只有点击 **“保存到本地”** 时，Node Studio Server 才会修改：

```text
src/v2/design/apps/<app>/layout.js
```

保存器只重写当前 shape 配置块，不修改 `base` 或其他 shape。保存后可以直接使用：

```bash
git diff
```

查看源码变化。

Studio 不执行 Git commit、push 或 merge。

## UX 浏览器翻译

浏览器不能原生执行 Vela `.ux`。Studio 使用轻量 Translator：

- 读取 `<template>` 与 `<style>`；
- 把 `stack / scroll / swiper / text` 映射为浏览器 DOM；
- 把 Adapter Plan 中的 `streamLeft / headerWidth / ...` 等绑定值注入模板；
- 移除浏览器无法执行的 Vela 事件与循环指令；
- 在隔离的 iframe 中渲染，避免页面 CSS 污染 Studio UI。

Translator 的定位是 **辅助设计预览**，不是 Vela Runtime 模拟器。交互、系统组件和平台特性仍需要模拟器 / 真机 smoke test。

## L1 / L2 / L3

Studio 遵循现有 Freedom Contract：

- **L1：改空间。** 调位置、尺寸、间距、字号、列数、排列方向等，不改变产品表达。
- **L2：改局部表达。** 除 L1 外，可让某个局部 renderer 改为横向 / 纵向、图表 / 列表等。
- **L3：改产品形态。** 不同设备可以拥有完全不同的 Surface 和页面结构。

Circle / Pill / Rect 本身不是升级等级的理由，等级属于“差异本身”。

## 安全边界

Studio Server 有意保持很小的写权限：

- 只监听 `127.0.0.1`；
- App 和文件路径来自固定配置，不接受任意磁盘路径；
- 只允许修改该 App 在 Studio 中声明过的 Recipe 字段；
- 请求体有限制；
- Adapter 仍负责运行时必要的安全 clamp；
- Studio 会显示 Safe Area 与基础几何告警。

## 验证

```bash
npm run studio:check
npm run check
```

`studio:check` 会验证：Recipe 最小覆盖编辑、UX 翻译、App/页面文件存在、真实 Adapter 预览和非法字段保护。
