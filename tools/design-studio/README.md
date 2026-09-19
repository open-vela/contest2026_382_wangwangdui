# Design Studio · JSON 型提示词生成器

一个本地网页辅助设计工具：像 PowerPoint 一样把组件拖到设备画板上，调尺寸和颜色、组合与备注、定义多页面与跳转，最后导出一份**给 agent 读的设计提示词 JSON**。

它取代了旧的 `tools/layout-studio`（Recipe 参数表单）。旧工具调整的是已有 `.ux` 的数值；新工具先产出设计与交互意图，agent 再把 JSON 变成代码。

工具当前位于仓库根目录 `tools/design-studio/`，已经不再放在应用工程内部：它可以脱离 `quickapp/velaclaw-aiot` 单独打开，也不需要先安装应用依赖。

## 启动

```bash
cd tools/design-studio
node server.js                 # http://127.0.0.1:4174
node server.js --no-open       # 不自动打开浏览器
DESIGN_STUDIO_PORT=4200 node server.js   # 自定义端口
node test/design_studio.test.js          # 静态检查 + 几何/导出契约测试
```

也可以沿用应用工程里的转发脚本：

```bash
cd quickapp/velaclaw-aiot
npm run studio          # 等价于 node ../../tools/design-studio/server.js
npm run studio:check    # 等价于 node ../../tools/design-studio/test/design_studio.test.js
```

服务只监听 `127.0.0.1`，没有第三方依赖，前端没有构建步骤（原生 ES module）。

## 画布操作

| 操作 | 方式 |
|---|---|
| 添加元素 | 从左侧组件库**拖到画板**，或直接点组件（落在画板中心） |
| 选择 | 单击；`Shift` 单击加选；空白处拖框选 |
| 移动 / 缩放 | 拖动元素；拖动 8 个控制点；方向键 1px、`Shift`+方向键 10px |
| 旋转 | 右侧「旋转」数值或快捷角度 |
| 改文字 | 双击文本 / 按钮，就地编辑 |
| 更名 | 图层行双击名称 |
| 平移 / 缩放视图 | 空格拖动 或 中键拖动；滚轮平移、`Ctrl`+滚轮缩放 |
| 对齐 | 顶部对齐按钮（多选时生效） |
| 层级 | 顶部置顶 / 置底，右键菜单可上移下移 |

拖动时会吸附到兄弟元素边缘、画板中线与网格；吸附参考线用粉色显示。

## 组合与备注

多选后 `Ctrl+G` 组合。组合是一个**语义单元**：

- 右侧「语义备注」写清楚这个组合是干什么的、有什么作用；
- 备注会写进导出 JSON 的 `note` 字段，并汇总到顶层 `groups[]` 与人类可读摘要；
- 组合的子元素坐标相对组合左上角（`coordinateSpace: parent-relative`），整体移动只改一个坐标；
- 图层行可以直接把元素拖进组合，`Ctrl+Shift+G` 解除组合并把坐标还原成画板绝对坐标。

## 页面与跳转

- 底部标签栏切换页面，`+ 新建页面` 沿用当前设备；页面卡片可拖动排序、复制、删除；
- 选中元素后在右侧「交互 / 跳转」添加动作，触发器支持：点击、双击、长按、滑动（上/下/左/右）、进入页面、定时器；
- 动作支持：跳转到页面（选择目标页与过场动画）、返回上一页、无动作；
- 「页面」面板顶部有**跳转总览**，把所有页面的跳转列成一张图；
- 顶部「预览」进入真实运行态：点热区跳转、上下左右滑动触发对应动作、可返回上一页。

## 导出

`导出 JSON`（`Ctrl+E`）打开五个视图：

1. **Agent 提示词 JSON** —— 交给 agent 的契约文件；
2. **人类可读摘要** —— 页面、元素构成、跳转流程、组合用途；
3. **Vela 脚手架** —— 把设计直接翻译成 `<template>` 骨架，可粘进 `.ux`；
4. **字段说明** —— 每个字段的含义与用法；
5. **原始文档** —— 编辑器内部文档，可重新导入。

### 提示词 JSON 结构

```text
schema / kind / generatedAt       "designstudio/v1" · "design-prompt"
design                            设计名、默认设备、页面数
designTokens                      颜色 / 字号 / 圆角 / 间距（agent 必须优先复用）
devices[]                         画板尺寸(px)、物理像素、圆角、安全区、形态
pages[]                           id / name / device / background / scroll / note
  children[]                      box{x,y,w,h} / rotation / opacity / sizeMode / style / text / note
    children[]                    组合与容器的子节点（相对父级坐标）
    interactions[]                trigger / direction / action / target / animation / delay
  flows[]                         该页出发的跳转，带中英文可读 description
flows[]                           按页面归拢的跳转图
groups[]                          每个组合的用途、成员与角色
notes[]                           画板便签
summary                           一段中文说明，可直接喂给 agent
agentInstructions                 给 agent 的硬性约定
```

## 主题

默认明亮主题：浅色毛玻璃面板 + 橙粉渐变强调色。顶部右侧的太阳按钮切换到深色主题，选择会记住（`localStorage`）。首次访问跟随系统 `prefers-color-scheme`，并在首帧前应用，避免闪烁。

## 数据与状态

- 文档自动保存到浏览器 `localStorage`（键 `design-studio:document:v1`）；
- `导入` 可以读回导出的原始文档 JSON；`新建` 通过底部确认条二次确认，不用原生弹窗；
- 旧的深色画板文档会自动迁移到当前浅色体系（只迁移仍是默认值的颜色，自定义颜色不动）；
- 撤销 / 重做深度 80 步，每次拖动只记一条历史。

## 测试

```bash
node tools/design-studio/test/design_studio.test.js
```

覆盖：文件完整性、模块引用、组件库 id、设备形态、旋转包围盒、吸附（画板中线 / 兄弟边缘）、resize 锚点、旋转后指针换算、圆屏弦宽、导出字段契约、交互与快捷键接线、面板与预览能力、服务端只监听本机。
