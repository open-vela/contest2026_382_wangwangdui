# 维护者指南

本文面向负责维护、发布和评审 `vela_band` 的开发者。它关注工程约束和修改流程，不重复 Quick App 基础语法。架构细节见 [TECHNICAL.md](TECHNICAL.md)，运行环境见 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 维护目标

每次改动都应满足：

1. 同一 RPK 可以在 `mi-band10` 与 `Vela_Watchs4` 模拟器构建、安装和启动。
2. 页面离开后没有残留定时器、订阅或异步 UI 更新。
3. 持久化修改不会覆盖同一键的并发更新。
4. 文档明确区分真实系统能力、模拟数据和视觉降级。
5. 生成文件、日志、私有 IDE 状态和签名材料不进入 Git。

## 事实来源

发生文档与实现冲突时，按以下顺序核对：

1. `src/manifest.json`：包名、feature、权限、路由。
2. `package.json` 和 `package-lock.json`：命令与依赖版本。
3. `src/common/*`：数据结构、存储键和公共行为。
4. 页面 `script`：交互和生命周期。
5. [COMPATIBILITY.md](COMPATIBILITY.md)：特定镜像的实测能力。

不要根据其他 AVD、旧日志或下载示例推断当前应用已经具备某项能力。

## 模块所有权

| 关注点 | 主要文件 |
| --- | --- |
| 包配置、权限和路由 | `src/manifest.json` |
| 屏幕形态识别 | `src/common/screen_profile.js` |
| 主运行时和表盘切换 | `src/pages/clock/clock.ux` |
| Beta 根路由返回保护 | `src/pages/clock_guard/clock_guard.ux`、`watch_data.js` 的右滑过渡标记 |
| 表盘元数据与顺序 | `src/common/face_registry.js` |
| 表盘 UI | `src/components/watchfaces/*.ux` |
| 圆屏机械表盘角度与刻度 | `src/common/analog_face.js`、`src/components/watchfaces/mechanical_circle.ux` |
| 胶囊背景图表盘与形态隔离 | `src/components/watchfaces/alpine.ux`、`src/common/face_scope.js`、`src/common/watchfaces/*` |
| 应用目录、胶囊固定分页与 Watch S4 固定错列蜂巢 | `src/common/launcher_apps.js`、`fixed_pager.js`、`src/common/icons/*`、`src/pages/applist/applist.ux` |
| 公历月历与农历换算 | `src/common/calendar_utils.js`、`src/pages/today/today.ux` |
| 健康与通知演示数据 | `src/common/watch_data.js` |
| 持久化与并发更新 | `src/common/storage_adapter.js` |
| 页面资源清理 | `src/common/lifecycle_manager.js` |
| 页面转场 | `src/common/page_motion.js` |
| 功耗和抬腕 | `src/common/power_manager.js` |
| 加速度诊断与动作强度 | `src/common/motion_metrics.js`、`src/pages/settings/motion/motion.ux` |
| 震动反馈模式 | `src/common/haptic_feedback.js`、`src/pages/settings/vibration/vibration.ux` |
| 通知接收与状态 | `src/common/notification_manager.js` |
| 运动和 GPS | `src/common/workout_manager.js`、`gps_tracker.js` |
| 同步协议和传输 | `src/common/sync_protocol.js`、`ble_sync.js` |
| 用户设置 | `src/common/device_settings.js` |

页面目录必须与 manifest 路由保持一致。表盘选择页位于 `src/pages/watchface/index.ux`。

## 关键不变量

### 生命周期

- `onShow` 可以被多次调用，启动逻辑必须幂等。
- `onHide` 和 `onDestroy` 都可以执行清理，清理函数必须可重复调用。
- 命名定时器和订阅通过生命周期上下文登记。
- 页面销毁后不得继续写入页面字段。
- GPS、加速度计、通知事件和模拟传输必须有明确的停止入口。

### 路由

- 新页面先写入 manifest，再添加入口。
- 页面 URI 使用绝对形式，例如 `/pages/history`。
- 跳转通过 `pageMotion.push/replace/back`。
- `router.push` 和 `router.replace` 始终传入 `params`，即使为空。
- 页面隐藏时调用 `pageMotion.clear(this)`。

### 存储

- 页面和业务模块不直接绕过 `storage_adapter.js`。
- 对数组或对象的读改写使用 `updateJSON`。
- 写入完成后的跨页面读取需要等待回调，必要时强制刷新缓存。
- 存储失败的内存降级只在当前进程有效。
- 新增字段应与旧数据合并，而不是假定完整 schema。

### 系统 API

- 新增 `@system.*` 导入时同步更新 manifest。
- 声明 feature 不代表目标镜像实现了它。
- 调用失败必须有可理解的 UI 或数据降级。
- 不通过删除真实设备所需 feature 来隐藏模拟器平台日志。
- 新的模拟器差异写入 `COMPATIBILITY.md`。

### UI

- manifest统一使用192设计宽度；Mi Band 10的212×520物理屏换算为192×471逻辑视口，Band 9保持192×490，Watch S4将192×192圆屏布局等比映射到466×466物理屏幕。
- 页面根容器使用相对尺寸，圆屏视觉覆盖使用 `(shape: circle)` 媒体规则，结构差异通过 `screen_profile.js` 的结果切换。
- 胶囊屏内容避开上下圆角，圆屏内容避开四角；新增页面必须分别检查两种安全区、分页边界和必要页面的滚动末端。
- 胶囊beta根高度必须用“物理高度×192÷物理宽度”换算，禁止把Band 10的520物理像素直接写成逻辑高度。
- 只使用 Vela 官方组件文档支持的属性、事件和样式。
- 条件覆盖层继续采用已验证的页面内联结构。
- 表盘页面禁止用原生 `swiper` 包裹胶囊表盘；上滑和左右滑使用根节点与表盘组件的双层手势监听，长按必须使用系统 `longpress`，禁止定时器长按误判上滑。
- 不要把 manifest 入口直接改回 `pages/clock`。`pages/clock_guard` 是 Beta 胶囊宿主绕过 `onBackPress` 时的栈底保护；修改右滑逻辑必须同时回归中心右滑、最左边缘右滑、连续右滑和左滑，确认每次只切一款且应用保持前台。
- 主表盘保持100%沉浸舞台，不恢复独立表盘标题、分页点、底部手势文字或固定360px高度；beta胶囊仅主表盘可将背景延伸到原安全顶距，其他页面继续使用共享安全视口。
- 胶囊应用列表和设置禁止恢复纵向自由滚动；分页必须复用 `fixed_pager.js` 并保留显式前后按钮。
- 圆屏应用列表保持固定错列蜂巢坐标和八向连续拖动；周围项只改变焦点，中心项才打开应用。
- 圆屏拖动只更新同一张画布的轻量位置、尺寸和透明度，禁止恢复整页切换模拟或16ms惯性定时器；应用名背板保持低透明玻璃层，不使用厚重卡通胶囊。
- 圆屏今日日历默认显示摘要，左滑进入月历；月历固定42格、相邻月份灰色补位，上下切月、右滑回摘要。健康订阅必须在隐藏和销毁时成对释放。
- 文本和图标不能依赖模拟器可能缺失的 emoji 字体。
- 新增应用图标先提交 `assets/icons/*.svg`，再运行 `npm run icons:render` 生成普通 JPG 和圆屏柔化 JPG。

## 常见修改流程

### 新增页面

1. 创建 `src/pages/<name>/<component>.ux`。
2. 在 manifest 中注册路由。
3. 为 `private` 字段提供可渲染默认值。
4. 接入 `pageMotion.enter` 和 `pageMotion.clear`。
5. 在入口页面通过 `pageMotion.push` 跳转。
6. 补充 README 导航和技术文档。
7. 回归首次进入、返回、重复进入和销毁。

### 新增设置

1. 在 `device_settings.js` 默认对象中增加字段。
2. 在 `cloneSettings` 中完成类型归一化。
3. 确保旧 JSON 缺少该字段时使用默认值。
4. 页面从 `load` 回调更新 UI，通过 `update` 保存。
5. 如果设置控制系统 API，同时保留不可用时的降级。

### 新增持久化数据

1. 使用带版本后缀的稳定键名。
2. 定义空数据和解析失败的 fallback。
3. 对集合设置明确的数量上限。
4. 使用回调确认写入结果，不假定同步完成。
5. 记录迁移策略和清理策略。

### 修改表盘

1. 表盘组件只接收显示属性。
2. 时间、健康、电量和功耗刷新仍由 `clock.ux` 统一驱动。
3. 表盘 ID、名称、颜色和顺序只在 `face_registry.js` 中定义；不要在页面脚本中新增第二份元数据映射。
4. 同步增加胶囊屏与圆屏组件，并在 `clock.ux` 和表盘选择页注册对应渲染节点。
5. 选择写入完成后再返回主表盘。
6. 回归两种屏幕的滑动切换、长按进入、持久化和冷启动恢复。
7. 圆屏专属表盘必须设置 `circleOnly`，并回归胶囊与矩形设备不会轮换到空白索引；机械指针角度修改同步运行 `npm run analog:logic`。
8. 胶囊专属表盘必须设置 `pillOnly`；新增网络图片时把原图保存到 `assets/watchfaces`，运行 `npm run backgrounds:render` 生成设备资源，在 `NOTICE` 记录来源和许可，并回归固定表盘分页及系统手势栏衔接。

### 修改通知

1. 保持 `call`、`sms`、`app` 三种基础类型兼容。
2. 新字段在 `watch_data.js` 的默认模型中提供 fallback。
3. 外部输入先归一化，再交给 `notificationManager.show`。
4. 确认振动失败不会阻止覆盖层显示。
5. 确认自动关闭、忽略、挂断和页面销毁都会清理定时器。

### 修改运动或同步

运动状态、GPS 过滤、记录 schema 和同步协议集中记录在 [B_F_IMPLEMENTATION.md](B_F_IMPLEMENTATION.md)。协议不兼容修改必须提升版本，而不是静默改变现有字段语义。

## 模拟器验证

### 最小回归

对两个 AVD 安装同一次构建产生的 RPK，再分别执行：

Mi Band 10 冷启动后，先确认 AIoT-IDE 已打开本项目且项目 Broker 正在运行，再恢复调试配置并启动应用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-emulator.ps1 -Avd mi-band10
```

**Mi Band 10**

1. 启动表盘，等待 ACTIVE → DIM → SLEEP，再点击唤醒。
2. 左右切换表盘，长按打开表盘库并验证选择持久化。
3. 切换到星野远山表盘，检查背景裁切、日期玻璃栏、大时间、步数/心率玻璃层和电量条；依次点击三类入口并确认路由。
4. 长按进入两页表盘库，检查左右翻页、第四款背景预览、选择持久化和右滑返回。
5. 上滑打开固定分页应用列表，检查显式翻页、横向翻页、今日日历和设置入口。
6. 触发 `call`、`sms`、`app` 三类本地通知，检查显示、关闭和定时器清理。

**Watch S4**

1. 左右切换三套圆屏表盘，长按打开表盘库并验证选择持久化。
2. 在运动仪表表盘确认六根心率柱高度有明显差异，并在心率刷新后发生可见变化。
3. 切换到曜金机械表盘，确认60格刻度、时分秒三针、日期窗和心率副盘完整显示，秒针逐秒转动，长按选择和冷启动恢复正常。
4. 打开固定错列蜂巢，检查顶部无遮挡、八向连续拖动、松手吸附、中心放大、透明玻璃名称板、周围图标柔化、周围点按聚焦和中心点按路由。
5. 进入今日日历，确认默认摘要心率持续更新；左滑进入月历，上下跨月、相邻月灰色补位且每行七天完整，再右滑返回摘要。
6. 进入健康、运动和设置页面，检查圆屏安全区、固定分页和返回行为。
7. 在动作诊断页确认状态从“等待样本”变为“正在出数”，完成一次 3 秒动作测量后离页，确认订阅和计时器释放。
8. 确认应用内通知入口不显示，且日志中没有通知定时器或覆盖层残留。

最后在两个 AVD 上各执行一次模拟同步，返回表盘并确认应用仍处于前台运行状态。

### 日志检查

优先定位应用级问题：

- JavaScript 类型、引用和语法错误。
- 未支持的模板属性或 CSS 样式。
- 缺少路由参数和页面未注册。
- 订阅失败后重复注册。
- 页面销毁后的元素更新。
- 缺失 JSC 文件或应用进程断言。

平台镜像的已知日志见 [COMPATIBILITY.md](COMPATIBILITY.md)。不要仅按 `ERROR` 文本总数判断应用质量。

## 排障

### 页面无法跳转

- manifest 是否注册了完全一致的路径。
- URI 是否以 `/` 开头。
- 是否经过 `pageMotion` 并传递空 `params`。
- 转场定时器是否在路由调用前被提前清理。

### 返回后刷新变快

- `onShow` 是否重复创建 interval。
- `onHide` 和 `onDestroy` 是否调用统一 cleanup。
- `notificationManager.init/destroy` 是否成对。
- GPS 和传感器是否取消订阅。

### 数据没有立即更新

- 写入是否提供并等待回调。
- 是否存在内存缓存中的旧值。
- 集合是否通过 `updateJSON` 串行更新。
- 页面重新显示时是否重新加载。

### GPS 一直使用步幅估算

- manifest 是否包含定位权限。
- `system.geolocation` 是否在当前镜像注册。
- Extended Controls 是否提供有效位置。
- 相邻点是否落在 2–200 米过滤范围。
- 页面暂停或隐藏后是否错误地保持旧订阅。

### 亮度或电量没有控制设备

先查看兼容性矩阵。当前已验证的两个镜像均未暴露对应 Quick App feature，应用只能使用保存值和视觉降级；这不是页面滑块或表盘计算错误。

### 通知演示正常但 Extended Controls 无效

本地演示、`system.event` 和 Emulator Phone/SMS 是不同链路。当前 RIL 不可用，Extended Controls 不会自动转换成 `band.demo.notification`。

## 发布流程

1. 确认 manifest 的版本、包名、feature、权限和路由。
2. 使用干净依赖执行质量检查和构建。

```bash
npm ci
npm run check
npm run build
```

3. 确认 RPK 位于 `dist/com.application.watch.demo.debug.1.0.0.rpk`，并包含 `.jsc` 页面文件。
4. 不重新构建，在冷启动的 `mi-band10` 与 `Vela_Watchs4` 中安装同一个 RPK，并分别执行最小回归。
5. 检查 `git diff --check` 和 `git status --short`。
6. 确认没有提交 `dist/`、`build/`、`outputs/`、签名、日志或 IDE 私有状态。
7. 更新中英文 README、兼容性说明和相关专题文档。

发布版使用：

```bash
npm run release
```

签名和设备分发应遵循目标平台要求，仓库不保存私钥。

## 评审清单

- [ ] 改动解决根因且没有复制已有适配层
- [ ] 新路由、feature 和权限已登记
- [ ] 定时器和订阅具有成对清理
- [ ] 存储更新不存在明显竞态
- [ ] 模拟能力没有被描述为真实硬件能力
- [ ] 中英文用户文档保持一致
- [ ] 兼容性结论有可复现环境
- [ ] `npm run check` 与 `npm run build` 通过

## Git 边界

提交应只包含可复现的源码、配置和正式文档。以下内容保持本地：

- `node_modules/`
- `build/` 和 `dist/`
- `outputs/` 中的日志、截图和下载页面
- `sign/`
- IDE workspace、shelf 和个人计划

当前稳定分支上的用户改动不要通过全量 restore、reset 或清理命令覆盖。提交前应明确选择暂存文件并复核 `git diff --cached`。
