# vela_band

[English](docs/README_EN.md) | **简体中文**

`vela_band` 是一个面向 Xiaomi Vela Quick App 的智能手环/手表演示项目。项目覆盖表盘、健康趋势、运动记录、通知演示、同步协议和低功耗状态管理，同一 RPK 已在 `mi-band10` 胶囊屏和 `Vela_Watchs4` 圆屏模拟器完成交互验证。

> 本项目以模拟器演示和架构验证为目标，不是医疗、健康监测或生产级设备固件。健康服务不可用时会明确降级为演示数据；任何结果都不能用于健康判断。

## 功能状态

| 模块 | 当前实现 | 数据或能力来源 |
| --- | --- | --- |
| 多表盘 | 基础3款、圆屏曜金机械、胶囊屏星野远山，支持切换、选择和持久化 | Quick App 组件、旋转变换、授权背景图与 `system.storage` |
| 多屏适配 | 胶囊、矩形、圆形三类表盘，覆盖 7 个内置 wearable skin | `$device`、`system.device`、宽高比和形态专用组件 |
| 应用启动器 | 胶囊固定列表分页、圆屏固定错列蜂巢与八向拖动 | 共享应用目录、弹性焦点、透明玻璃名称板与柔化 JPG 图标 |
| 健康数据 | 心率、血氧、压力柱状趋势与窗口统计 | 前台 `service.health`，单项不可用时降级演示数据 |
| 运动记录 | 步行/跑步、暂停/继续、历史记录 | 时间增量模拟；GPS 可用时计算轨迹距离 |
| 通知 | 来电、短信、应用通知覆盖层 | 本地演示或 `system.event`；不等同于真实电话系统 |
| 数据同步 | 协议打包、分包、ACK 和进度 | 模拟传输层，不包含真实 BLE |
| 低功耗 | ACTIVE、DIM、SLEEP 与抬腕唤醒 | 状态机、加速度计和视觉降级 |
| 设置 | 固定分页、设备自检、动作诊断、震动反馈、亮度和同步 | 系统 API 可用时调用，否则保留 UI 降级 |
| 今日日历 | 农历、实时心率、今日健康摘要与圆屏月历 | 系统时间、`service.health` 与共享日历换算模块 |

## 环境要求

- Node.js 18 或更高版本
- npm
- [AIoT-IDE](https://iot.mi.com/vela/quickapp/zh/guide/start/use-ide.html)
- Vela Quick App 模拟器或兼容设备

最后一次交互验收使用 `aiot-toolkit 2.0.5`、`@aiot-toolkit/jsc 1.0.8`、`mi-band10` 和 `Vela_Watchs4` AVD。多屏 profile 同时覆盖 `redmi_watch`、`xiaomi_band`、`xiaomi_band_10`、`xiaomi_band_pro`、`xiaomi_s4`、`xiaomi_s4_41` 和 `xiaomi_watch`；不同系统镜像提供的 Quick App feature 可能不同，详见[兼容性说明](docs/COMPATIBILITY.md)。

## 快速开始

安装锁定依赖并执行质量检查：

```bash
npm ci
npm run check
```

构建启用 JSC 字节码的调试 RPK：

```bash
npm run build
```

成功产物：

```text
dist/com.application.watch.demo.debug.1.0.0.rpk
```

项目也提供一键检查和构建脚本：

```bash
# Windows
build.bat

# macOS / Linux
sh build.sh
```

### 开发模式

```bash
npm run start
```

该命令启动 AIoT Toolkit 的 watch 模式。应用安装、调试和模拟器选择仍由 AIoT-IDE 或兼容调试工具完成。

### 在模拟器中运行

1. 在 AIoT-IDE 中导入仓库。
2. 选择兼容性矩阵中的胶囊、矩形或圆形 Vela 模拟器。
3. 构建并安装生成的 RPK。
4. 启动包 `com.application.watch.demo`。清单入口为内部守护页 `pages/clock_guard`，它会立即进入用户可见的 `pages/clock` 主表盘。

Mi Band 10 冷启动后，可在 AIoT-IDE 已打开本项目、项目 Broker 正在运行且 JSC RPK 已安装的前提下执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-emulator.ps1 -Avd mi-band10
```

脚本会恢复模拟器调试配置并启动应用，不负责构建或安装 RPK。详细前提与排障说明见[兼容性说明](docs/COMPATIBILITY.md)。

热重装可能触发部分旧版 Vela 运行时问题。需要重新安装 RPK 时，优先停止应用并冷启动模拟器。

## 交互导航

| 入口 | 操作 | 结果 |
| --- | --- | --- |
| 表盘 | 左右滑动 | 切换表盘 |
| 表盘 | 长按 | 打开表盘选择页 |
| 表盘 | 上滑 | 打开应用列表 |
| 圆屏曜金机械表盘 | 点击日期窗 / 心率副盘 | 打开今日日历 / 健康状态 |
| 胶囊屏星野远山表盘 | 点击日期栏 / 步数 / 心率 | 打开今日日历 / 活动详情 / 健康状态 |
| Watch S4 蜂窝 | 八向自由拖动或点击周围图标 | 蜂巢连续跟手移动；中心图标放大，应用名显示在透明玻璃板上 |
| Watch S4 蜂窝 | 点击中心图标 | 打开当前聚焦应用；周围八项使用柔化 JPG 并降低透明度 |
| 胶囊屏表盘/列表 | 点击心率或健康模块 | 打开心率、血氧、压力健康卡片或活动趋势 |
| 应用列表 | 点击运动记录 | 选择运动类型并查看历史 |
| 应用列表 | 点击今日日历 | 查看农历、日期、实时心率和今日活动摘要 |
| 圆屏今日摘要 | 左滑 | 进入固定 7 列 × 6 行月历 |
| 圆屏月历 | 上滑 / 下滑 / 右滑 | 下个月 / 上个月 / 返回今日摘要；相邻月份补位日期以灰色显示 |
| 应用列表 | 点击设置 | 打开固定分页的同步、震动、亮度、动作诊断和设备自检 |
| 子页面 | 右滑或返回按钮 | 返回上一页 |

表盘静置约 8 秒进入 DIM，约 15 秒进入 SLEEP；点击息屏覆盖层可模拟唤醒。

胶囊、矩形和圆形表盘统一由页面根节点识别手势，并在当前表盘组件补充系统 `swipe` 监听，以兼容 Beta 运行时不向页面根节点冒泡的横向滑动。胶囊表盘不使用会捕获纵向触摸的原生分页组件，因此上滑应用列表、左右切表盘、短按健康卡片和长按表盘库可以同时工作。右滑由 `onBackPress` 转换为“上一表盘”；若 Beta 宿主绕过该生命周期强制返回，黑色 `clock_guard` 只在应用内部接住返回、恢复目标表盘并重新打开主表盘，不会落到系统自带表盘。

### 健康页与加速度计回归

健康页只在前台调用 `service.health`：进入页面读取最近样本并订阅心率、血氧、压力，离开页面立即取消订阅。表盘心率复用同一健康服务，进入 SLEEP 后停止订阅，唤醒后恢复；不再单独生成随机心率。模拟器没有某项样本时，仅该项显示“演示”，不会把模拟值标成实时数据。

打开两台 beta 模拟器的“健康状态”页并停在顶部后，可抓图并检查尺寸、三卡片存在性和水平居中：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/capture-health-visual.ps1 -Device xiaomi_band -Serial emulator-5556
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/capture-health-visual.ps1 -Device xiaomi_band_10 -Serial emulator-5554
```

加速度计当前用于 SLEEP 状态的简化抬腕唤醒。模拟器可交替注入两个方向，三轴变化绝对值之和超过 5 时唤醒，连续触发有 3 秒冷却：

```powershell
adb -s emulator-5556 emu sensor set acceleration 9.8:0:0
adb -s emulator-5556 emu sensor set acceleration 0:9.8:0
```

真实设备无需手动调用。除抬腕演示外，可进入“设置 → 动作与加速度”查看 X/Y/Z、合加速度、相邻样本变化、采样数量和当前强度；动作页的 3 秒测量会记录峰值并给出平稳、轻微、中等、强烈四档结果。页面隐藏或销毁时立即取消订阅。该结果只用于功能诊断，不是步数、医疗或专业运动测量。

“设置 → 设备自检”显示页面真实视口、设备族、平台版本、beta 胶囊修正状态，以及健康、传感器、震动、电池、亮度、事件、互联和存储接口是否存在。“接口存在”不等于已经收到真实数据，加速度是否出数仍以动作诊断页为准。

“设置 → 震动反馈”提供开关、轻/中/强三档以及轻触、达标、倒计时、警报四类可持久化模式。轻触为单次，达标为两次，倒计时为三次，警报为两次长震动；强度只缩放单次持续时间，不会把模式替换成警报。系统不支持自定义节奏时，应用使用定时脉冲保留次数与间隔；通知模块读取同一模式和强度设置。

## 通知事件

Mi Band 10 版本订阅公共事件 `band.demo.notification`，支持 `call`、`sms` 和 `app` 三种类型。Watch S4 圆屏不初始化应用内通知覆盖层，通知由系统界面处理。兼容调试工具发布事件时，业务参数放在 `params` 中：

```json
{
  "eventName": "band.demo.notification",
  "options": {
    "params": {
      "type": "call",
      "contact": "张三",
      "phone": "13900139000"
    }
  }
}
```

Mi Band 10 也可以从“应用列表 → 通知演示”直接触发三类通知。Android Emulator 的 Extended Controls Phone/SMS 面板目前不会自动转发到该事件，不能作为真实电话或短信接入证明。

## 项目结构

```text
vela_band/
├── docs/                       # 架构、兼容性和维护文档
├── scripts/                    # 检查、构建与模拟器启动辅助脚本
├── src/
│   ├── app.ux                  # 应用生命周期
│   ├── manifest.json           # feature、权限和路由
│   ├── common/                 # 数据、屏幕 profile、表盘注册和业务模块
│   ├── components/watchfaces/  # 胶囊屏与圆形/矩形紧凑表盘组件
│   └── pages/                  # 页面实现
├── build.bat
├── build.sh
├── package.json
├── LICENSE
└── NOTICE
```

核心设计：

- 页面负责交互和渲染，公共模块负责状态、持久化和系统能力。
- `screen_profile.js` 优先使用页面 `$device` 的真实视口，结合宽高比识别胶囊、矩形和圆形屏；应用保持单 RPK 发布。
- 胶囊应用列表和设置共用 `fixed_pager.js`，不使用原生 `swiper`；圆屏蜂窝保留独立的八向连续拖动与焦点吸附。
- 胶囊应用列表标题使用左右等宽占位保持真正居中，并使用50px安全顶距避开BAND5外壳的深圆角；Band 10 beta的520物理高度会换算为471逻辑像素，避免根页面被放大后拖出底部空白。
- 圆屏使用完整安全区的固定错列蜂巢画布：每个应用保持固定坐标，不按焦点强行填满3×3；中心应用按距离连续放大并在下方的半透明玻璃板显示名称，周围应用使用柔化 JPG，碰到名称区域会自动让开，支持八方向自由拖动和松手吸附。
- `calendar_utils.js` 生成固定六周月历并在本地换算1900—2100年农历；今日日历在前台复用健康服务更新心率，不用独立随机数据。
- 圆屏“曜金机械”使用 `transform` 与 `transform-origin` 驱动时、分、秒针，60个刻度由 `analog_face.js` 生成；角度随分钟和秒连续推进，矩形与胶囊屏不会把该圆屏专属表盘加入轮换。
- 胶囊屏“星野远山”使用本地纵向雪山星空背景，叠加日期、错位大时间、玻璃健康层与电量条；背景底部预处理为黑色渐隐，与不可绘制的系统手势栏自然衔接，数据层按实际可绘制高度定位。表盘库使用两页固定选择，图片来源和许可记录在 `NOTICE`。
- 主表盘统一采用无框沉浸舞台，不再显示独立表盘标题、分页点或底部手势文字；胶囊屏四款表盘均铺满完整逻辑画布，业务子页面仍保留标题安全区。
- 圆屏焦点页在进入页面时一次性预计算，触摸过程中不按像素重建九宫格，也不启动惯性定时器。
- 两种应用列表共享 `launcher_apps.js` 中的应用目录和 `src/common/icons/*.jpg` 图标；可编辑矢量源保存在 `assets/icons/*.svg`。
- 表盘组件只消费属性，不创建独立业务定时器。
- 路由统一通过 `page_motion.js`，避免页面之间复制转场逻辑。
- 定时器、传感器和事件订阅统一在页面隐藏或销毁时释放。
- `storage_adapter.js` 为异步存储提供内存缓存、串行更新和失败降级。

## 可用命令

| 命令 | 说明 |
| --- | --- |
| `npm run start` | 启动 watch 开发模式 |
| `npm run lint` | 检查 Vela 模板、样式和 JavaScript 兼容性 |
| `npm run multiscreen:check` | 检查多屏清单、页面根视口、圆屏组件和共享资源 |
| `npm run health:check` | 检查健康权限、三类指标、前台订阅清理和多屏适配 |
| `npm run health:logic` | 测试健康区间、滑动窗口、统计、错误码和自适应柱高 |
| `npm run pager:logic` | 测试固定分页切片、边界和翻页 |
| `npm run motion:logic` | 测试三轴合加速度、向量变化、峰值和强度分类 |
| `npm run calendar:logic` | 测试农历换算、固定42格月历、补位日期和跨年切月 |
| `npm run analog:logic` | 测试机械表盘三针角度、连续走针、旋转格式和60格刻度 |
| `npm run face:logic` | 测试胶囊、矩形、圆形三类设备的专属表盘隔离 |
| `npm run viewport:logic` | 测试 Band 9/10 物理尺寸到192设计坐标的高度换算 |
| `npm run haptic:check` | 检查震动模式持久化、预览映射、通知映射和选中状态 |
| `npm run haptic:logic` | 测试四种震动节奏、降级脉冲和强度缩放 |
| `npm run icons:render` | 从 SVG 生成新 JPG 图标，并重新生成圆屏柔化图标 |
| `npm run backgrounds:render` | 从授权原图重新生成底部渐隐的胶囊表盘 JPG |
| `npm run health:visual -- xiaomi_band=路径.png` | 解析模拟器 PNG，检查健康卡片居中与裁切 |
| `npm run docs:check` | 检查 Markdown 本地链接 |
| `npm run check` | 运行代码和文档检查 |
| `npm run build` | 构建 JSC 调试 RPK |
| `npm run release` | 构建 JSC 发布 RPK |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-emulator.ps1 -Avd mi-band10` | 恢复 Mi Band 10 冷启动调试配置并启动应用 |

## 已知限制

- 心率、血氧和压力优先读取系统健康服务；镜像、权限或单项数据不可用时会降级演示值，均不可用于真实健康判断。
- `mi-band10` 的 `vela-watch-5.0` 镜像缺少 `system.battery`、`system.brightness` 和 `system.interconnect`；应用会降级，但系统仍可能记录缺失 feature 日志。
- 蓝牙页面实现的是同步协议和 UI 流程，未进行真实扫描、连接或 GATT 传输。
- 自动亮度只保存开关状态，没有环境光算法。
- 通知“挂断”只更新演示 UI，不会控制真实电话。
- 多屏布局按官方建议分为胶囊 UI 与圆形/矩形紧凑 UI；正式宿主使用 `100%` 根视口，平台版本 1200 的 beta 胶囊宿主统一启用安全顶距、逻辑高度扣减和水平居中，全部页面复用同一根视口参数，避免标题被状态区遮挡或画布只显示半边。
- 三个 466×466 圆屏 skin 共用相同安全区布局；设备外壳差异不影响应用设计坐标。
- Watch S4 的公开 Quick App 文档未提供表冠旋转事件，因此蜂巢使用八向触摸拖动、点击聚焦和右滑返回，不模拟系统表冠缩放。

## 文档

| 文档 | 内容 |
| --- | --- |
| [技术架构](docs/TECHNICAL.md) | 模块分层、数据流、生命周期和公共接口 |
| [兼容性说明](docs/COMPATIBILITY.md) | 已验证环境、系统 API 和 Extended Controls 边界 |
| [运动与同步实现](docs/B_F_IMPLEMENTATION.md) | 运动状态机、GPS 和模拟同步协议 |
| [维护者指南](docs/PROJECT_OWNER_GUIDE.md) | 修改流程、工程约束、发布和排障 |
| [贡献指南](CONTRIBUTING.md) | 开发规范和提交检查清单 |
| [English README](docs/README_EN.md) | English project overview |

## 贡献

欢迎提交问题和改进。开始开发前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，并确保 `npm run check` 与 `npm run build` 通过。

## 许可证

项目源代码采用 [MIT License](LICENSE)。直接开发依赖及外部平台说明见 [NOTICE](NOTICE)。

## 参考资料

- [Xiaomi Vela Quick App 文档](https://iot.mi.com/vela/quickapp/zh/guide/)
- [Xiaomi Vela 多屏适配](https://iot.mi.com/vela/quickapp/zh/guide/multi-screens/)
- [AIoT-IDE 使用说明](https://iot.mi.com/vela/quickapp/zh/guide/start/use-ide.html)
