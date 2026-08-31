# Contributing to vela_band

感谢你参与 `vela_band`。本项目是面向 Xiaomi Vela Quick App 模拟器的演示应用，贡献内容应保持可构建、可回退，并明确区分真实系统能力与模拟行为。

## 开发环境

- Node.js 18 或更高版本
- npm
- AIoT-IDE 与可用的 Vela 模拟器

安装锁定依赖：

```bash
npm ci
```

## 开发流程

1. 从最新目标分支创建功能分支。
2. 保持改动聚焦，不混入 IDE 配置、构建产物或模拟器日志。
3. 修改系统 API、路由、存储结构或用户行为时同步更新文档。
4. 提交前运行完整检查。

```bash
npm run check
npm run build
```

涉及页面交互、生命周期或系统 API 时，还需在 `mi-band10` 和 `Vela_Watchs4` 中执行对应形态回归；仅影响单一形态的改动也必须确认另一形态可以启动。

## 编码约定

- 与现有 `.ux` 和 JavaScript 风格保持一致。
- 兼容 Vela 运行时支持的 JavaScript 子集，避免依赖浏览器 DOM 或 Node.js API。
- 页面跳转统一通过 `page_motion.js`，并始终传递路由 `params`。
- 定时器、传感器和事件订阅必须在 `onHide` 或 `onDestroy` 中释放。
- 持久化数据通过 `storage_adapter.js`，同一键的读改写使用串行更新接口。
- 系统能力不可用时提供明确降级，不得把模拟链路描述为真实硬件能力。
- 页面根节点使用可用视口，不恢复 `192×490` 固定根尺寸；圆屏内容必须位于安全区或提供滚动。
- 圆屏蜂窝坐标集中维护在 `launcher_apps.js`，拖拽定时器必须随页面生命周期释放。
- 应用标签、路由和图标路径集中维护在 `launcher_apps.js`；图标先修改 `assets/icons/*.svg`，再转换为 `src/common/icons/*.jpg`，两种列表不得各自维护图标。

## 文档要求

- 用户可见行为更新 `README.md` 与 `docs/README_EN.md`。
- 架构或公共模块变化更新 `docs/TECHNICAL.md`。
- 模拟器或系统 API 差异更新 `docs/COMPATIBILITY.md`。
- 运动和同步协议变化更新 `docs/B_F_IMPLEMENTATION.md`。

本地文档链接可通过以下命令检查：

```bash
npm run docs:check
```

## 提交信息

推荐使用 Conventional Commits：

```text
feat: add a user-visible capability
fix: correct runtime behavior
docs: update documentation only
refactor: reorganize code without behavior changes
test: add or adjust verification
chore: maintain tooling or dependencies
```

## 提交前检查清单

- [ ] `npm run check` 通过
- [ ] `npm run build` 生成 JSC RPK
- [ ] 相关模拟器场景已回归
- [ ] 同一 RPK 可安装并启动于 `mi-band10` 与 `Vela_Watchs4`
- [ ] 新增资源、页面和 feature 已在 manifest 中登记
- [ ] 中英文 README 与兼容性说明保持一致
- [ ] 未提交 `build/`、`dist/`、`outputs/`、IDE 私有文件或密钥

## 问题反馈

报告问题时请提供：复现步骤、AVD/系统镜像名称、Node.js 与 AIoT Toolkit 版本、相关日志片段以及预期行为。请先删除账号、设备标识和其他敏感信息。
