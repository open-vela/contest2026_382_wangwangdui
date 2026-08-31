# 模拟器与系统能力兼容性

本文记录 `vela_band` 已验证的运行环境、Quick App feature 和 Android Emulator Extended Controls 边界。它描述当前事实，不代表后续适配承诺。

## 已验证基线

| 项目 | Mi Band 10 | Watch S4 |
| --- | --- | --- |
| AVD | `mi-band10` | `Vela_Watchs4` |
| Vela 镜像 | `vela-watch-5.0` | `vela-miwear-watch-5.0` |
| 屏幕 | 212×520，胶囊形 | 466×466，圆形 |
| 应用布局 | 192×471 逻辑视口，对应212×520物理屏 | 192×192 设计坐标等比映射到 466×466 |
| 设备 profile | `pill-shaped` | `circle` |
| 应用列表 | 四项固定分页列表 | 全屏固定错列蜂巢，八向拖动、中心放大、周围柔化和透明玻璃名称板 |
| 应用通知 | 保留演示覆盖层 | 不初始化，交给系统界面 |
| 表盘数量 | 3款纵向表盘 + 1款星野远山背景表盘 | 3款紧凑表盘 + 1款曜金机械表盘 |

公共构建基线为 `com.application.watch.demo` 1.0.0、Node.js 24.15.0、AIoT Toolkit 2.0.5 和 JSC 1.0.8。项目最低 Node.js 版本为 18；manifest 最低 API Level 为 2，以满足 `vela-miwear-watch-5.0` 安装器。

Mi Band 10 已回归表盘、健康/运动流程、通知演示和设置；Watch S4 的新一轮回归目标包括圆屏表盘、固定错列蜂巢、中心/周围两级图标、透明名称板、圆屏月历、固定设置分页和新页面安全区。

## 多屏目标矩阵

目标矩阵来自 Xiaomi Vela 官方[多屏设计](https://iot.mi.com/vela/quickapp/zh/guide/design/multi-screens.html)和本机 AIoT-IDE 内置 skin。官方建议按胶囊、矩形、圆形三类设计；本项目让圆形与矩形复用紧凑表盘，胶囊屏保留纵向表盘：

| Skin | 分辨率 | 形态 | 表盘布局 |
| --- | ---: | --- | --- |
| `xiaomi_band` | 192×490 | 胶囊 | 纵向胶囊表盘 |
| `xiaomi_band_10` | 212×520 | 胶囊 | 纵向胶囊表盘 |
| `xiaomi_band_pro` | 336×480 | 矩形 | 紧凑表盘，画布垂直居中 |
| `redmi_watch` | 432×514 | 矩形 | 紧凑表盘，画布垂直居中 |
| `xiaomi_s4` | 466×466 | 圆形 | 圆屏安全区表盘 |
| `xiaomi_s4_41` | 466×466 | 圆形 | 圆屏安全区表盘 |
| `xiaomi_watch` | 466×466 | 圆形 | 圆屏安全区表盘 |

manifest 保持数值 `designWidth: 192`，所有页面根节点保持 `width/height: 100%`，由框架完成物理分辨率到设计坐标的等比映射。`screen_profile.js` 优先读取页面 `$device` 的真实 skin 视口，再读取 `system.device.getInfo()` 的设备身份信息；这是为了避免系统镜像的默认机型信息覆盖 AVD 的实际尺寸。DIM、SLEEP 和通知覆盖层与亮屏表盘位于同一根节点，禁止通过固定物理宽度、不对称 padding 或独立锁屏偏移修正布局。

`vela-miwear-watch-5.0-beta` 有一个仅限胶囊设备的宿主问题：页面根画布仍可能按466px圆表宽度布局，而屏幕只显示左侧192px或212px。`screen_profile.js` 仅在 `model=Emulator-Vela`、`platformVersionCode=1200` 且形态为胶囊时返回实际的根节点 `position/left/top/width/height`；manifest注册的全部页面都把这些值直接绑定为根节点内联样式。两个胶囊profile都使用192逻辑设计宽度；Band 10的212×520是物理尺寸，逻辑高度按 `520×192÷212` 换算为471px，不能把520直接作为逻辑高度，否则页面会被放大到约574物理像素并允许拖出底部空白。beta 业务页面统一使用24px安全顶距和扣减后的逻辑高度；主表盘因为已删除顶部标题，单独恢复 `top=0` 和完整逻辑高度，让背景或纯色盘面铺满屏幕，核心内容仍避开顶部覆盖区。192设计画布保持x=0由运行时等比铺满物理宽度；形态判断优先采用宿主 `screenShape`，避免错误的466×466默认画布把胶囊误判为圆屏。Band 9的192×490保持490逻辑像素。正式版、矩形和圆形设备返回标准的 `relative/0px/100%/100%`。

同一 Beta 宿主还可能在主表盘右滑时绕过页面 `onBackPress`，把根路由直接退回系统自带圆表盘。manifest 因此使用黑色 `pages/clock_guard` 作为内部入口，再进入 `pages/clock`；正常启动看不到守护页，异常系统返回只会落到应用内栈底并立即恢复上一款表盘。Band 10 Beta 已回归中心右滑、最左边缘右滑、连续右滑、反向左滑和上滑应用列表。

胶囊模拟器截图最底部约36逻辑像素由宿主绘制手势栏，应用无法覆盖其中的灰色横条。星野远山保留全高背景，但运行时版本在底部平滑渐隐到黑色；数据卡与电量条只使用扣除手势栏后的可绘制高度。因此验收时应区分“背景与系统栏的自然融合”和旧版图片在应用画布内部提前结束形成的硬黑边。

## 圆屏与胶囊屏安全区

设计稿是 192 宽的方形画布，但圆屏和胶囊屏的四角会被物理外形切掉——**元素在画布内不等于看得见**。`src/common/safe_area.js` 把这层关系写成纯函数，`scripts/check-safe-area.js` 按页面的纵向内容流累加 `margin-top / height / margin-bottom`，逐个判断四角是否落在内切圆内，纳入 `npm run check`，无需模拟器截图即可拦住越界改动。

核心约束是「内容越宽，可用的纵向区间越短」。192 圆屏的实测对照：

| 内容宽度 | 可用纵向区间 | 可用高度 |
| ---: | :--- | ---: |
| 120px | y=22..170 | 148px |
| 136px | y=29..163 | 134px |
| 148px | y=35..157 | 122px |
| 168px | y=50..142 | 92px |

因此圆屏页面统一采用**三段式安全栈**：窄的标题行与分页行放在上下两端，最宽的内容卡压在中段。`settings` 与 `diagnostics` 使用同一套节奏：

```
padding-top 26 → 标题 120×20 → 间距 4 → 内容 148×106 → 间距 3 → 分页 110×14
```

几何模型的校准锚点是胶囊屏：168px 宽的标题行推导出 `96 − √(96²−84²) ≈ 49.5`，与此前靠肉眼试出的 `margin-top: 50px` 吻合，说明真机可视区域就是理想内切圆。所以几何函数**不内缩半径**，视觉留白由调用方按需追加（`resolve()` 默认追加 2px，表盘背景等需要压满可视区的场景显式传 0）。

两条容易踩的坑：

- 圆屏 `@media` 里必须显式归零基础样式的 `margin-top / margin-bottom`，否则胶囊屏的间距会泄漏进来，把整摞内容顶出安全区。
- 文字元素要显式给 `height`，避免行高在不同镜像上浮动导致下方元素被切。
- 一个月最多跨 6 个自然周，月历网格必须按 6 行（42 格）预留，否则月末整行被挤出安全区。

`applist` 的圆屏蜂巢是铺满画布的拖拽舞台，图标坐标在运行时按手指位置计算，本来就允许滑出可视圆，因此不纳入静态盒模型校验。

## Quick App feature

`src/manifest.json` 声明的是应用目标能力；实际可用性由系统镜像决定。

| Feature | Mi Band 10 | Watch S4 | 应用行为 |
| --- | --- | --- | --- |
| `system.device` | 可用 | 可用 | 解析 `pill-shaped` / `circle` 并选择界面 |
| `system.router` | 可用 | 可用 | 页面 push、replace、back |
| `system.storage` | 可用 | 可用 | 持久化；失败时使用内存缓存 |
| `service.health` | beta 已验证 | 待业务回归 | 前台订阅心率、血氧、压力，单项失败时降级 |
| `system.sensor` | 可用 | 可用 | 用于简化抬腕检测，并可在设置中查看真实三轴样本和动作峰值 |
| `system.geolocation` | 可用 | 待业务回归 | 运动期间订阅位置并计算距离 |
| `system.vibrator` | 可加载 | 可加载 | 振动校准可能产生镜像告警；应用捕获失败 |
| `system.event` | 可用 | 不由圆屏通知使用 | Mi Band 10 订阅 `band.demo.notification` |
| `system.battery` | 缺失 | 当前运行时未暴露 | 表盘使用降级值并保持运行 |
| `system.brightness` | 缺失 | 当前运行时未暴露 | 保存设置并使用视觉 DIM/SLEEP 降级 |
| `system.interconnect` | 缺失 | 当前运行时未暴露 | 不接收真实手机互联消息 |

缺失 feature 会在导入阶段产生系统日志。JavaScript 代码已提供降级路径，但应用无法从自身补齐系统镜像中的原生模块。

## Extended Controls

Extended Controls 属于 Android Emulator 主机侧控制界面。只有当 Emulator、Vela 驱动、系统服务和 Quick App feature 全链路连通时，控制值才会到达应用。

| 控制项 | 主机/设备链路 | 当前结论 |
| --- | --- | --- |
| Location | GNSS → `/dev/ttyGNSS0` / uORB → `system.geolocation` | 可用于 GPS 定位和运动距离 |
| Virtual Sensors | goldfish sensor → `/dev/uorb/*` → `system.sensor` | 加速度计链路可用；动作诊断页可直接确认三轴样本和 3 秒动作峰值 |
| Battery | QEMU power → `/dev/charge` | 虚拟硬件可变，但镜像缺少 `system.battery`，表盘不联动 |
| Phone / SMS | EmulatorController → virtual modem → RIL/ofono | RIL 报告 modem 不可用，事件不会自动进入通知模块 |
| Bluetooth | Rootcanal/HCI → Bluetooth service | `BluetoothEmulation` 默认关闭且 `/dev/ttyHCI0` 不存在，当前没有真实 BLE |
| Health samples | goldfish sensor → health service → `service.health` | beta 胶囊镜像已返回心率、血氧和压力样本；不同镜像仍需逐项降级 |
| Brightness | 无独立 Extended Controls 面板 | 当前镜像缺少 `system.brightness`，仅有应用视觉降级 |

Extended Controls 的 Phone/SMS 面板和应用的 `band.demo.notification` 是两条不同链路。通知演示页或兼容调试工具发布的公共事件可以验证 UI，但不能证明电话系统已接通。

## 手动启动调试包

### Mi Band 10

`mi-band10` 冷启动会清空 `/tmp/quickapp_debug_cfg.json`。如果绕过 AIoT IDE 直接执行 `am start`，旧版 Quick App 运行时会等待调试通道约 10 秒，期间画面保持黑色。先在 AIoT IDE 打开本项目，再运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-emulator.ps1 -Avd mi-band10
```

脚本会查找本项目仍在运行的 AIoT IDE Broker、按实际 AVD 定位 ADB serial、写入无 BOM 的调试配置并启动应用。安装包仍应通过 `npm run build` 生成，并确认包含 `pages/clock/clock.jsc`。

## 已知平台日志

以下输出来自模拟器镜像或调试运行时，不应误判为应用 JavaScript 异常：

- RIL modem、Bluetooth HCI、振动校准和缺失设备信息。
- BOOT_GUIDE/HOME、DFX 和 debug 配置文件缺失。
- `InspectHostSetDomAttributes` 调试 inspector 输出。
- 镜像缺少 `system.battery`、`system.brightness` 和 `system.interconnect`。
- `vela-watch-5.0` 可能为未命中的圆屏媒体规则记录 `media type is not support`；胶囊屏布局不依赖这些规则。

验收应用日志时仍需单独检查：

- `TypeError`、`ReferenceError`、`SyntaxError`。
- 未支持的模板属性或样式。
- 路由参数缺失。
- 重复订阅、未释放定时器或页面销毁后的回调。
- JSC 文件缺失和应用进程断言。

## 安全验证流程

1. 运行 `npm run check` 和 `npm run build`。
2. 分别从胶囊、矩形和圆形矩阵中冷启动目标 AVD，不要跨 AVD 混用镜像。
3. 在目标 AVD 安装同一个 `dist/com.application.watch.demo.debug.1.0.0.rpk`。
4. 使用 `adb devices`、`adb shell ps` 和 `adb shell "am dump"` 确认设备、进程和前台状态。
5. 从表盘开始回归，再覆盖应用列表、子页面、亮屏、暗屏和息屏状态。
6. 在健康页顶部运行 `capture-health-visual.ps1`，分别验证 `xiaomi_band` 和 `xiaomi_band_10` 的物理尺寸、卡片水平中心及三类指标色。
7. 不把 `outputs/` 中的原始日志、截图或下载文档提交到 Git。

## 镜像使用原则

稳定版 `mi-band10` 使用 `vela-watch-5.0`，Watch S4 使用 `vela-miwear-watch-5.0`。项目通过同一 RPK 做应用层适配，不在 AVD 之间混合 `nuttx` 与 `vela_system.bin`，也不把二进制字符串中的 feature 名称视为兼容性证明。
