# 技术架构

本文面向开发者和维护者，描述 `vela_band` 1.0.0 的代码结构、运行时约束和模块接口。用户操作和环境准备见 [README](../README.md)，模拟器差异见[兼容性说明](COMPATIBILITY.md)。

## 应用边界

- 框架：Xiaomi Vela Quick App
- 包名：`com.application.watch.demo`
- 清单入口：`pages/clock_guard`；用户首屏：`pages/clock`
- 设备类型：`watch`
- 设计基准宽度：192
- 目标视口：192×490、212×520、336×480、432×514、466×466
- 构建：AIoT Toolkit + JSC

项目以模拟器演示为目标。健康数据、心率和 BLE 传输不是生产级硬件实现。

## 分层结构

```text
pages
  clock / health / workout / settings / demo
           │
           ▼
components
  watchfaces: pill variants + compact circle/rectangle variants
           │
           ▼
common
  screen profile / face registry / launcher registry
  data / storage / lifecycle / power / notification
  workout / GPS / sync protocol / transport
           │
           ▼
Vela features
  router / storage / sensor / geolocation / event / ...
```

职责约束：

- 页面拥有交互状态、生命周期钩子和路由行为。
- 表盘组件只渲染传入属性，不创建业务定时器或直接持久化。
- 公共模块封装跨页面状态、存储和系统 API。
- 系统能力失败时由适配层降级，页面不直接实现第二套存储或资源管理。

## 路由与页面

所有页面在 `src/manifest.json` 中注册。页面跳转统一经过 `page_motion.js`，由其补充空 `params` 并管理转场定时器。

| 路由 | 职责 |
| --- | --- |
| `/pages/clock_guard` | 建立主表盘下方的应用内返回保护层，正常启动时不可见 |
| `/pages/clock` | 形态专用表盘、胶囊屏通知覆盖层、功耗状态 |
| `/pages/watchface` | 表盘预览和选择 |
| `/pages/applist` | 胶囊固定列表分页或圆屏固定错列蜂巢入口 |
| `/pages/heartrate` | 心率详情与小时数据 |
| `/pages/steps` | 今日健康数据 |
| `/pages/history` | 7 日趋势 |
| `/pages/workout_select` | 运动类型和未完成运动入口 |
| `/pages/workout` | 运动状态、GPS 和结束确认 |
| `/pages/workout_history` | 已完成记录 |
| `/pages/notification_demo` | 本地通知演示 |
| `/pages/settings/*` | 同步、震动、亮度、动作诊断和设备自检 |
| `/pages/today` | 农历、实时心率、今日活动摘要与圆屏月历 |
| `/pages/index`、`/pages/detail` | 保留的基础示例页 |

转场通过逐帧更新 `margin-left`、`margin-top` 和 `opacity` 实现。离开页面前必须调用 `pageMotion.clear(this)`，防止销毁后的帧回调继续执行。

## 生命周期与资源

`lifecycle_manager.js` 为页面提供命名资源上下文：

- `addTimer(name, id)`：替换同名 `setTimeout`。
- `addInterval(name, id)`：替换同名 `setInterval`。
- `addSubscription(name, cleanup)`：登记传感器、GPS 或其他资源清理函数。
- `cleanup()`：一次释放上下文中的全部资源。
- `reactivate()`：页面重新显示时恢复上下文状态。

页面应遵循以下规则：

1. `onShow` 中加载最新持久化状态并启动运行时资源。
2. `onHide` 中停止页面不可见时不应继续的资源。
3. `onDestroy` 再次执行幂等清理。
4. 异步回调更新页面前检查上下文仍然有效。

主表盘把时间、心率、电量、功耗和通知运行时集中管理，避免三个表盘组件分别启动定时器。

## 公共模块

| 模块 | 主要职责 |
| --- | --- |
| `screen_profile.js` | 缓存屏幕 profile，优先采用 `$device` 真实视口，并按宽高比解析胶囊、矩形和圆形形态 |
| `viewport_math.js` | 把胶囊物理高度换算为192设计宽度下的逻辑高度 |
| `face_registry.js` | 表盘 ID、名称、颜色和索引的单一注册表 |
| `face_scope.js` | 按 pill/rect/circle 过滤形态专属表盘 |
| `analog_face.js` | 圆屏机械表盘的三针角度、Vela旋转值和60格刻度 |
| `launcher_apps.js` | 多形态应用目录、路由和普通/柔化图标路径 |
| `fixed_pager.js` | 设置与胶囊应用列表共享的固定分页边界和切片 |
| `calendar_utils.js` | 固定六周公历网格、跨年月切换与1900—2100年农历换算 |
| `motion_metrics.js` | 三轴合加速度、向量变化、基线、峰值和强度分类 |
| `haptic_feedback.js` | 自定义震动节奏、停止控制和基础模式降级 |
| `watch_data.js` | 今日健康、表盘选择、趋势、小时心率和通知演示数据 |
| `storage_adapter.js` | 内存缓存、异步存储、同键串行更新和错误结果 |
| `device_settings.js` | 设置默认值、旧亮度字段迁移和设置持久化 |
| `power_manager.js` | ACTIVE/DIM/SLEEP、亮度调用和抬腕检测 |
| `notification_manager.js` | 通知状态、事件订阅、震动和自动关闭 |
| `workout_manager.js` | 运动状态机、活动记录和 GPS 状态合并 |
| `gps_tracker.js` | 位置订阅、轨迹距离和定位降级 |
| `sync_protocol.js` | 同步 payload 与分包格式 |
| `ble_sync.js` | 当前的模拟连接和传输定时器 |
| `page_motion.js` | 页面转场与路由调用 |

## 数据与持久化

### 存储适配

`storage_adapter.js` 先更新内存缓存，再异步调用 `system.storage`。同一键的写入和读改写进入串行队列，避免并发覆盖。

写操作回调返回：

```js
{
  persisted: true,
  memoryOnly: false,
  error: null
}
```

系统存储失败时，当前进程仍可从内存缓存读取；应用重启后的数据恢复不作保证。

### 存储键

| 键 | 内容 |
| --- | --- |
| `selected_face_id` | 当前表盘 ID |
| `right_face_transition` | Beta 根路由右滑的一次性目标表盘，3秒后失效 |
| `health_history_7d` | 最近 7 天健康记录 |
| `hourly_heart_rate_24h` | 小时心率演示数据 |
| `device_settings_v1` | 设置 |
| `active_workout_v1` | 未完成运动 |
| `workout_records_v1` | 最多 30 条运动记录 |

对对象或数组执行更新时使用 `updateJSON`，不要在页面中实现“读取后立即写入”的并发逻辑。

## 表盘与健康数据

`watch_data.js` 是表盘、活动趋势和历史数据的数据源：

- `getSnapshot()` 返回格式化后的不可变视图数据。
- `applyHeartRate()` 接收 `service.health` 的心率样本，并同步当前值、表盘柱图和今日汇总。
- `addActivityData()` 合并运动产生的步数和卡路里。
- `getHealthHistory()` 和 `getHistorySummary()` 提供趋势数据。
- `loadSelectedFaceId()` 强制读取持久化值，避免跨页面缓存竞态。

`health_sample_service.js` 负责前台页面共享的即时心率、血氧和压力：

1. manifest 声明 `service.health` 和 `hapjs.permission.HEALTH`。
2. 健康页显示时先调用 `getRecentSamples`，再用 `subscribeSample` 分别订阅 `HEART_RATE`、`SPO2` 和 `STRESS`。
3. 每个指标独立记录实时状态、样本时间戳和错误码；某项无系统样本时只降级该项，不影响其余实时指标，错误码203显示为设备不支持。
4. 页面隐藏或销毁后调用 `unsubscribeSample` 并停止演示定时器。
5. 不声明 `config.background.features`，本轮不做后台 1 Hz 健康采样。

表盘也订阅同一个 `health_sample_service.js`，并通过 `watchData.applyHeartRate()` 更新当前值和表盘柱图，不再调用独立的随机心率。进入 SLEEP 或离开表盘时停止健康订阅，唤醒后恢复。

今日日历页同样只在 `onShow` 到 `onHide/onDestroy` 之间订阅该服务，并把新心率写回 `watchData.applyHeartRate()`，因此摘要、月历底部心率和表盘使用同一数据源。日期区由 `calendar_utils.js` 把原来的“本月第几天”替换为农历；圆屏默认保留今日摘要，左滑进入固定7列×6行月历，上滑切到下个月、下滑切到上个月、右滑返回摘要。月首和月末使用相邻月份日期补满42格并降低文字亮度，每列严格对应星期日到星期六。

`health_metrics.js` 是无框架依赖的纯计算层，负责心率/压力区间、定长滑动窗口、最低/平均/最高统计、错误码文案和自适应柱高。`test/health_metrics.test.js` 可直接由 Node.js 执行，避免把边界逻辑只能放到模拟器中验证。

健康页在胶囊、矩形和圆形视口中复用三张纵向卡片。胶囊屏允许纵向滚动；beta Band 9/10 使用与其他页面相同的内联视口修正，避免单独维护健康页偏移量。心率、血氧和压力分别保存最近10个样本并显示柱状趋势；各指标只在自己的时间戳变化时追加，其他类型回调不会重复写入。压力卡同时显示窗口最低、平均和最高值。柱高按当前窗口动态范围映射到 7–29px，心率/血氧/压力的最小显示跨度分别为8/4/10。

表盘心率窗口保留最近6个真实样本。`watch_data.js` 不再按固定60–100bpm区间计算柱高，而是每次用当前6个值重新生成 `barHeight` 和 `circleBarHeight`：胶囊屏映射到4–28px，圆形/矩形紧凑表盘映射到4–18px，最小心率跨度为8bpm。这样正常区间内的小幅变化仍有清晰起伏，同时不会溢出缩短后的图表容器。

`clock.ux` 不再使用原生 `swiper` 承载胶囊表盘，因为 beta 运行时会由该组件捕获纵向手势，使页面收不到上滑事件。胶囊屏改用静态 `pill-face-stage`，圆屏和矩形屏继续使用全宽紧凑舞台。主表盘删除独立的表盘名称、分页点和底部手势提示，舞台及四款胶囊组件均使用 `100%×100%`；beta 胶囊表盘页单独把根节点从安全顶距扩展回完整逻辑高度，使背景和纯色盘面从顶部延伸到底部，核心内容仍在组件内部居中或使用安全坐标。其他业务页面继续保留24px标题安全顶距。三类屏幕都在页面根节点根据触摸位移判断主轴：纵向上滑进入应用列表，横向滑动切换表盘，短按仍交给表盘卡片，系统 `longpress` 打开表盘库。36px 阈值和 1.2 倍主轴比例用于过滤点击与斜向误触。页面根节点和当前挂载的表盘组件都绑定系统级 `swipe/longpress`，覆盖 beta 运行时不跨组件冒泡的情况；系统滑动事件与触摸位移统一进入 `routeGesture()`，并用300ms窗口抑制重复路由。禁止用定时器模拟长按，否则缺失 `touchmove` 时会把上滑误判为表盘库长按。

右滑是 Vela 的系统返回手势。正式运行时由 `clock.ux.onBackPress()` 返回 `true` 截断默认返回，并把它转换为上一表盘；部分 Beta 胶囊宿主会在根路由绕过页面生命周期，直接退出 Quick App。为此 manifest 以不可见的 `clock_guard` 为栈底，再 `push` 用户可见的主表盘。若宿主仍强制返回，只会回到守护页；守护页读取最近一次右滑目标，避免重复切换，然后恢复主表盘。`right_face_transition` 是最长保留3秒的一次性存储标记，既覆盖跨页面模块隔离，也避免正常 `onBackPress` 和 Beta 兜底同时减两次索引。其他业务页面仍按普通路由栈返回，不受守护页影响。

当前圆屏运行时没有暴露可用的 `system.battery`，因此圆屏表盘直接显示 `75%`，不发起无效查询。胶囊屏仍尝试读取系统电量，并在 feature 缺失或调用失败时降级为 `75%`。

圆屏额外提供 `mechanical_circle.ux` “曜金机械”表盘。`analog_face.js` 根据当前时、分、秒计算连续角度：时针包含分钟和秒的增量，分针包含秒的增量，秒针每秒前进6度；旋转值序列化为官方示例验证过的 `{"rotate":"…deg"}`，组件使用 `transform-origin` 把三根指针固定在盘面中心。60个分钟刻度只在页面初始化时生成，12个整点刻度使用金色长线。日期窗和心率副盘分别路由到今日日历与健康页，不启动独立计时器。`face_registry.js` 的 `circleOnly` 标记保证该表盘只出现在圆屏轮换和圆屏选择页，胶囊与矩形设备仍使用原有三款。

胶囊屏额外提供 `alpine.ux` “星野远山”表盘。424×1040雪山星空 JPG 作为本地资源随 RPK 发布，组件和背景使用 `100%×100%` 与 `object-fit: cover` 铺满胶囊画布，再叠加低透明遮罩、日期玻璃栏、错位时分显示、步数/心率玻璃层和电量进度。宿主最底部约36逻辑像素是应用不可绘制的系统手势区：背景保留完整高度并由 `fade-watchface-background.py` 从72%位置渐隐至黑色，使边缘与系统栏融合；交互内容则使用“背景逻辑高度−36”得到可绘制高度，再通过普通 `top` 属性定位数据卡与电量条，避免部分Vela运行时忽略 `bottom`。背景层不参与业务刷新，时间与健康仍由 `clock.ux` 统一传入。日期、步数、心率分别路由到 today、steps、heartrate。`pillOnly` 标记保证圆屏和矩形屏不加载该资源表盘；胶囊表盘库用两页固定卡片容纳四款表盘，左滑下一页，第二页右滑先返回第一页。

## 多屏、固定分页与蜂窝启动器

实现遵循 Xiaomi Vela 官方多屏设计建议：圆屏 `W/H=1`，矩形屏 `0.5<=W/H<1`，胶囊屏 `0.3<W/H<0.5`。manifest 使用数值 `designWidth: 192`，页面根容器统一使用 `100%`，不写物理分辨率宽高，也不使用左右 padding 模拟视口。框架负责把设计坐标等比映射到实际屏幕。

`screen_profile.js` 只发起一次完整的 `system.device.getInfo()` 请求，并把并发页面回调排队到同一结果。它返回以下稳定接口：

```js
{
  shape: 'pill-shaped' | 'rect' | 'circle',
  formFactor: 'pill' | 'rect' | 'circle',
  isPill: true,
  isRect: false,
  isCircle: false,
  screenWidth: 212,
  screenHeight: 520,
  screenClass: 'screen-pill',
  viewportClass: '',
  viewportPosition: 'relative',
  viewportLeft: '0px',
  viewportWidth: '100%',
  viewportHeight: '100%',
  deviceFamily: 'xiaomi_band_10'
}
```

视口形状和尺寸优先取页面 `$device`，设备型号、平台版本等身份字段再取 `system.device.getInfo()`。原因是同一系统镜像可能搭配不同 AVD skin，系统 API 的默认机型信息不能覆盖页面实际视口。manifest 的 `display.fullScreen=true` 与 `display.titleBar=false` 用于隐藏 beta 宿主上方的调试标题栏，避免它占用或覆盖首屏。三款表盘共享时间、健康和设备状态；胶囊屏使用纵向组件，圆形和矩形使用紧凑组件。圆屏文本和主要点击区域位于官方示意的中心安全区，矩形屏在多出的纵向空间中居中表盘画布。

beta镜像的胶囊Quick App宿主可能错误分配466px根宽度。适配器只对 `Emulator-Vela` 平台版本 `1200` 的192/212px胶囊视口返回绝对定位和内联视口参数，所有页面把这些字段逐项绑定到根节点。两种胶囊屏都使用manifest的192px逻辑宽度；`viewport_math.js` 进一步按“物理高度×192÷物理宽度”计算根高度，因此Band 9得到490px，Band 10得到471px。beta 根节点统一增加24px安全顶距并扣除对应逻辑高度，192设计画布保持逻辑x=0由运行时等比铺满物理宽度；形态判断优先使用宿主 `screenShape`，避免错误的466×466默认画布把胶囊误判为圆屏。若把Band 10的520物理高度直接当成逻辑高度，框架会再次按212/192缩放，根页面约为574物理像素，表现为可向下拖出大块空白。正式镜像继续使用 `relative/0px/100%/100%`。

胶囊应用列表和设置通过 `fixed_pager.js` 计算页数、当前切片和前后边界。胶囊应用列表每页四项，设置页胶囊每页三项、圆屏每页两项；这些页面提供显式翻页按钮，根结构不包含 `scroll` 或原生 `swiper`。圆屏应用蜂窝使用独立的二维焦点模型。

胶囊应用列表的顶部曲率不能只按矩形安全区处理。标题行使用左右各28px等宽占位，把“应用”保持在物理中心，并使用50px顶部外边距；标题行压缩为30px。底部分页行取消额外顶部间距并压缩为28px，使四张卡片、分页箭头和进度条完整落在Band 10的471逻辑高度及Band 9的490逻辑高度内。

Watch S4 应用入口使用固定 3×3 聚焦蜂窝：

1. `launcher_apps.js` 提供圆屏应用目录，进入页面时为每个应用分配固定的错列蜂巢坐标；运行中只平移同一张应用画布，不按焦点重建3×3页面，因此应用数量不足或超过九个时都不会强行填满当前网格，设置等应用也不会落在矩形网格的孤立角落。
2. 固定坐标映射到完整192×192安全区；中心图标最大为50px，周围图标基准为34px，圆屏不再渲染顶部标题和页码。中心图标下方单独保留应用名和“点按打开”区域，背板由低透明深色层、细描边和顶部微高光组成，使用8px圆角而不是厚重胶囊，名称不会覆盖图标。
3. 中心项显示应用名；点击周围项只移动焦点，点击中心项才执行路由。
4. 周围图标从 `src/common/icons/soft/` 读取高斯柔化、降饱和、降亮度的 JPG，并叠加较低透明度。
5. `touchmove` 同时记录 X/Y 位移，支持上、下、左、右和四个对角方向；图标在同一张蜂巢画布上以0.58阻尼连续跟随手指，单帧位移限制为18px防止异常飞出，但整张画布允许132px行程，使图标可以完整绕过名称区域并继续进入下方。松手后用缓出吸附到中心，屏幕左边缘向右长滑仍用于返回。
6. 拖动过程中只更新轻量槽位的位置、尺寸、透明度和图标资源，不创建页面、不做整页淡入淡出；所有图标按距离使用0.86–1.0弹性跟随，中心应用连续从34px放大到50px。名称区域整体下移6px，普通图标接近禁入带时按平滑曲线向左右分开，越过后合拢并继续移动；两轮确定性最小间距修正避免放大图标互相重叠。名称层只负责展示，不绑定点击事件，避免 beta 运行时截断父级 `touchmove`。

所有形态从 `launcher_apps.js` 生成应用项，因此相同应用共享标签、路由和 JPG 图标。运行时资源位于 `src/common/icons/`，可编辑 SVG 源位于 `assets/icons/`；`scripts/render-icons.ps1` 通过无界面 Chrome/Edge 把新 SVG 栅格化成 96×96 JPG，`scripts/render-soft-icons.py` 再生成圆屏周围项的柔化版本。

公开 Quick App 文档没有 Watch S4 表冠事件，因此当前蜂窝接受点击、八向拖动和右滑返回，不伪造表冠缩放能力。

## 设备自检、动作诊断与震动反馈

`/pages/settings/diagnostics` 显示 `screen_profile.js` 最终采用的视口、设备族、平台版本和 beta 胶囊修正状态，并用 `typeof`/方法存在性检查八类系统接口。此页只回答“接口是否暴露”，不会把接口存在误报成传感器已出数。

`/pages/settings/motion` 在用户主动开始后以 `interval: game` 订阅加速度计，显示三轴、合加速度和相邻向量变化。`motion_metrics.js` 用前 12 个样本建立静态基线，动作分数取向量变化与偏离基线的较大值；3 秒动作测量保留峰值并分类。页面隐藏或销毁时取消订阅、停止计时器和震动。

`haptic_patterns.js` 定义轻触、达标、倒计时、警报四种独立节奏，并保证强度只缩放持续时间、不改变模式键。`device_settings.js` 持久化 `vibrationPattern`，设置页选中模式后立即保存和试听；返回第一页的预览以及通知模块都读取同一字段，不再根据强档硬编码为警报。灰度 beta 宿主虽然可能暴露 `vibrator.start/stop`，但会把自定义参数静默折叠成系统警报，因此实际播放统一采用文档支持的 `vibrate(short/long)` 单次脉冲并由应用调度次数和间隔。首次异步读取设置时的待写入值也会优先于旧存储，避免刚选择的模式被回滚。

## 通知

`notification_manager.js` 接受统一 payload：

```js
{
  type: 'call',
  contact: '张三',
  phone: '13900139000',
  appName: '',
  appIcon: '',
  content: ''
}
```

`type` 支持 `call`、`sms`、`app`。事件来源：

1. 通知演示页调用 `showDemo(type)`。
2. `system.event` 订阅 `band.demo.notification`。
3. `system.interconnect` 在镜像提供该 feature 时接收外部消息。

显示通知时尝试短振动，并设置 10 秒安全关闭定时器。调用 `destroy()` 会取消事件订阅、互联回调和通知定时器。该管理器仅在胶囊屏初始化；Watch S4 使用系统通知界面，蜂窝中不注册通知演示入口。

通知覆盖层直接位于表盘和演示页模板中。当前 Vela 运行时曾在包含条件节点的自定义覆盖组件上出现原生渲染异常，因此没有抽成独立组件。

## 功耗状态

| 状态 | 时间刷新 | 心率刷新 | 电量刷新 | 视觉/系统行为 |
| --- | --- | --- | --- | --- |
| ACTIVE | 1 秒 | 3 秒 | 60 秒 | 正常显示 |
| DIM | 5 秒 | 30 秒 | 120 秒 | 暗色覆盖 |
| SLEEP | 60 秒 | 停止 | 停止 | 息屏覆盖 |

默认阈值：

- 空闲 8 秒进入 DIM。
- 空闲 15 秒进入 SLEEP。
- 用户触摸或有效抬腕事件返回 ACTIVE。

抬腕检测订阅 `subscribeAccelerometer({ interval: 'normal' })`，使用相邻样本差值和 3 秒冷却时间。它是模拟器演示算法，不是成熟姿态识别。

`power_manager.js` 把样本限制为最多每 100 ms 处理一次，并计算 `|Δx| + |Δy| + |Δz|`；结果大于 5 时调用表盘唤醒回调。模拟器验证命令：

```powershell
adb -s emulator-5556 emu sensor set acceleration 9.8:0:0
adb -s emulator-5556 emu sensor set acceleration 0:9.8:0
```

该链路只用于抬腕演示，不计算步数，也不向业务页面暴露原始传感器面板。

`system.brightness` 可用时尝试设置亮度和保持亮屏；不可用时由视觉覆盖层降级。

## 健康视觉回归

`check-health-ui.js` 检查 feature、权限、三类数据、前台订阅释放和视口适配契约。`check-health-visual.js` 直接解析模拟器 RGBA PNG，校验 Band 9/10 物理尺寸、卡片左右边距、中心误差和三种指标色；它不会因实时数值和更新时间变化产生逐像素误报。

在健康页顶部执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/capture-health-visual.ps1 -Device xiaomi_band -Serial emulator-5556
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/capture-health-visual.ps1 -Device xiaomi_band_10 -Serial emulator-5554
```

截图写入被 Git 忽略的 `outputs/health_visual/current/`，脚本随后自动运行视觉断言。

## 运动与 GPS

运动状态为 `running`、`paused` 或不存在。运行时长根据时间戳差值计算，不依赖 UI 定时器精确触发。

`gps_tracker.js`：

- 使用 `geolocation.subscribe` 和 `interval: 'normal'`。
- 使用 Haversine 公式计算相邻点距离。
- 只累计 2–200 米的单段距离，过滤静止抖动和异常跳点。
- 6 秒内没有有效位置时报告不可用，运动距离回退为步数×步幅估算。
- 停止运动或离开页面时取消订阅。

更多细节见[运动与同步实现](B_F_IMPLEMENTATION.md)。

## 同步协议

`sync_protocol.js` 创建版本 1 payload：

```js
{
  version: 1,
  deviceId: 'vela-band-demo',
  syncedAt: 0,
  health: {},
  history: [],
  workouts: []
}
```

JSON 默认按 96 个 JavaScript 字符切分。每个包包含 `transferId`、`sequence`、`total` 和 `payload`。

`ble_sync.js` 当前只模拟 700 ms 连接和逐包 ACK。字符计数不等同于 UTF-8 字节长度，真实 BLE 适配必须重新按 MTU 和字节编码分包。

## 系统能力

manifest 声明 `device`、`router`、`battery`、`brightness`、`sensor`、`geolocation`、`vibrator`、`event`、`interconnect`、`storage` 和 `service.health`，并声明定位与健康权限。最低 API Level 为 2，以允许同一 RPK 安装到 `vela-miwear-watch-5.0`；高版本 feature 仍按运行时实际能力降级。

声明 feature 不代表所有系统镜像都实现它。当前模拟器的详细结果与平台日志分类见 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 构建与质量门禁

```bash
npm ci
npm run check
npm run build
```

`npm run check` 执行 Vela 源码检查、多屏清单/组件/页面根节点检查和 Markdown 本地链接检查。`npm run build` 通过 AIoT Toolkit 编译模板、复制资源、生成 JSC 字节码并打包 RPK。

输出：

```text
dist/com.application.watch.demo.debug.1.0.0.rpk
```

## 设计约束

- 不在文档或 UI 中把模拟 BLE、通知或健康数据描述为真实硬件能力。
- 不绕过 `storage_adapter.js` 直接实现新的持久化竞态。
- 不在表盘子组件中创建重复运行时资源。
- 不使用官方组件文档未支持的属性或样式。
- 不把模拟器平台日志通过删除真实设备 feature 的方式“消音”。
