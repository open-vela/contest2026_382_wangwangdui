# Contributing to vela_band

感谢参与 `vela_band`。贡献应保持边界清晰、可验证、可回退，并尊重 Vela 可穿戴运行时的资源和布局约束。

## 开发环境

- Node.js 18 或更高版本
- npm
- Xiaomi Vela Quick App 开发环境
- 与变更目标相匹配的模拟器或设备

安装依赖：

```bash
npm ci
```

## 开发原则

### 保持依赖方向

新代码优先遵循：

```text
Capability → Domain → Feature → Design → Page
```

- 原生系统 API 封装放在 `src/capabilities`。
- 与设备形态无关的业务事实放在 `src/domain`。
- 页面级状态和资源所有权放在 `src/v2/features`。
- 几何、形态差异和显示语义放在 `src/v2/design`。
- `.ux` 页面只承担生命周期、事件绑定和渲染。

不要把系统 API、持久化、业务状态机或复杂格式化重新复制到页面中。

### 保持数据真实性

- `service.health` 等系统能力可用时，保留样本来源信息。
- 没有可信系统样本时显示等待或不可用状态。
- 不使用模拟值伪装真实心率、血氧、压力或历史趋势。
- 运动心率只接受官方心率能力的有效实时样本。
- 模拟同步 transport 必须明确保持为模拟边界，不描述为真实 BLE。

### 保持资源生命周期

传感器、定位、健康订阅、计时器和事件监听必须有单一 owner，并在对应状态结束时释放。至少覆盖：

- `onHide`；
- `onDestroy`；
- Workout pause、finish、cancel；
- DIM 或 SLEEP 导致的资源降级场景。

不得依靠页面销毁后的垃圾回收替代显式释放。

### 保持形态设计边界

V2.5 采用 L1、L2、L3 设计自由度。先判断差异属于自动几何、辅助构图还是独立交互，再修改对应 Design Spec 或布局配置。

- Circle 关注圆弧和弦区。
- Pill 利用纵向空间并避开端部舒适区。
- Rect 利用横向空间和更高信息密度。
- 背景 Scene 与前景安全内容分开处理。

避免在页面里堆叠 `isCircle`、`isPill`、`isRect` 分支来修补布局。

## 提交流程

从目标分支创建聚焦的工作分支。提交前至少运行：

```bash
npm run check
npm run build
```

涉及 Layout Studio 时运行：

```bash
npm run studio:check
```

涉及页面体积时运行：

```bash
npm run bundle:audit
```

静态检查通过后，对受影响的形态做模拟器或设备 smoke test。交互、绝对定位、系统能力和资源生命周期改动不能只依赖 Node.js 测试。

## 文档维护

文档按长期主题维护，不创建以阶段号、临时重构名或个人工作记录命名的长期文档。

- 用户可见能力变化：更新 `README.md` 与 `docs/README_EN.md`。
- 架构边界变化：更新 `docs/ARCHITECTURE.md`。
- 形态和设计规则变化：更新 `docs/DESIGN_SYSTEM.md`。
- Layout Studio 行为变化：更新 `docs/LAYOUT_STUDIO.md`。
- 运动与同步边界变化：更新 `docs/WORKOUT_AND_SYNC.md`。
- 模拟器、系统 API 或设备差异：更新 `docs/COMPATIBILITY.md`。
- 能体现项目方法论的新增能力：更新 `docs/INNOVATIONS.md`。

检查 Markdown 本地链接：

```bash
npm run docs:check
```

## 提交信息

推荐 Conventional Commits：

```text
feat: add a user-visible capability
fix: correct runtime behavior
docs: update documentation
refactor: reorganize code without changing behavior
test: add or adjust verification
chore: maintain tooling or dependencies
```

## 代码评审检查

评审时重点确认：

- 业务事实是否只有一个 owner；
- 系统能力是否存在明确失败路径；
- 订阅和计时器是否成对释放；
- 形态差异是否位于 Design 层；
- 页面是否仍保持薄层；
- 持久化读改写是否避免竞态；
- 新增 UI 是否覆盖 Circle、Pill、Rect 的合理行为；
- 文档中的能力声明是否能从源码、测试或运行证据中找到依据；
- 没有提交密钥、IDE 私有配置、普通构建缓存或无关日志。

问题报告应包含复现步骤、目标 skin 或设备、Vela 镜像信息、Node.js 与 AIoT Toolkit 版本、相关日志和预期行为，并删除账号、设备标识等敏感信息。
