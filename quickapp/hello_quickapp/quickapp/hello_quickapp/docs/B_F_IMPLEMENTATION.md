# 运动记录与同步协议

本文描述运动记录、GPS 距离、同步 payload 和模拟传输层。整体架构见 [TECHNICAL.md](TECHNICAL.md)，模拟器能力见 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 能力边界

- 步行和跑步支持开始、暂停、继续、结束和未完成会话恢复。
- GPS 可用时优先采用轨迹距离；不可用时使用模拟步数和步幅估算。
- 完成记录保存到 `system.storage`，并把步数和卡路里合并到当天健康数据。
- 同步模块生成稳定的业务 payload、分包和 ACK 进度。
- `ble_sync.js` 是模拟传输，不执行 BLE 扫描、连接或 GATT 写入。

## 运动状态

`workout_manager.js` 在内存中只维护一个活动会话，并持久化到 `active_workout_v1`。

```text
none ── start ──> running
                    │
                  pause
                    ▼
                  paused
                    │
                  resume
                    ▼
                  running
                    │
                  finish
                    ▼
                   none + saved record
```

取消运动会删除活动会话但不创建历史记录。完成运动会创建记录、删除活动会话并更新健康数据。

## 模拟指标

| 模式 | 步频 | 步幅 | 每步卡路里 |
| --- | --- | --- | --- |
| 步行 | 1.5 步/秒 | 0.7 米 | 0.04 |
| 跑步 | 2.5 步/秒 | 0.9 米 | 0.06 |

运行时根据当前时间与 `lastUpdateAt` 的差值更新数据。小于 500 ms 的差值不会产生新样本。

```text
steps += floor(elapsedSeconds × stepsPerSecond + carry)
estimatedDistance = round(steps × strideMeters)
calories = round(steps × caloriesPerStep)
```

心率同样是演示值：

- 步行：86–95 bpm 循环。
- 跑步：118–129 bpm 循环。

这些公式保证模拟器演示可重复，不代表真实运动算法。

## GPS 距离

`gps_tracker.js` 通过 `system.geolocation` 订阅位置：

1. 使用 `interval: 'normal'` 建立单一订阅。
2. 把经纬度、海拔、精度和速度转换为数值。
3. 使用 Haversine 公式计算相邻点距离。
4. 只累计 2–200 米的单段距离。
5. 6 秒没有有效位置时切换为“GPS 不可用 · 步幅估算”。
6. 暂停、结束或离开页面时取消订阅。

只要累计 GPS 距离大于 0，展示和最终记录就采用 GPS；否则使用步幅估算值。

## 持久化

| 键 | 内容 |
| --- | --- |
| `active_workout_v1` | 当前活动会话 |
| `workout_records_v1` | 最多 30 条完成记录 |

记录按新到旧排序。读改写通过 `storage_adapter.updateJSON` 串行执行，避免同步标记和新增记录互相覆盖。

完成记录包含：

- 类型、开始/结束时间和时长。
- 步数、卡路里、距离和距离来源。
- 最后 GPS 点与 GPS 累计距离。
- 平均演示心率。
- `synced` 标记。

## 同步 payload

`sync_protocol.createPayload(callback)` 聚合当天健康快照、7 日历史和运动记录：

```json
{
  "version": 1,
  "deviceId": "vela-band-demo",
  "syncedAt": 0,
  "health": {
    "steps": 0,
    "calories": 0,
    "standHours": 0,
    "heartRate": 0
  },
  "history": [],
  "workouts": []
}
```

`encode(payload, chunkSize)` 把 JSON 文本分成默认 96 字符的片段：

```json
{
  "version": 1,
  "transferId": "sync_0",
  "sequence": 1,
  "total": 3,
  "payload": "..."
}
```

当前 `bytesText` 是 JavaScript 字符数，不是 UTF-8 字节数。真实 BLE 实现必须先编码为字节，再根据协商 MTU 计算分包大小。

## 模拟传输

`ble_sync.js` 暴露以下适配边界：

- `getCapability()`：返回 `realBleAvailable: false`。
- `connect(options)`：700 ms 后建立模拟链路。
- `sendPackets(packets, options)`：每 180 ms 确认一个包并报告进度。
- `disconnect()`：取消连接和发送定时器。

同步完成后，页面记录同步时间，并通过 `markAllSynced()` 更新运动记录。

## 真实传输替换要求

如果目标固件提供受支持的 BLE API，只替换传输层仍需满足：

1. 明确手机端或上位机的 Service、Write Characteristic 和 ACK Characteristic UUID。
2. 按 UTF-8 字节和 GATT MTU 分包。
3. 处理扫描、连接、配对、超时、重试和断开。
4. 在收到对端 ACK 后再发送下一包。
5. 页面隐藏或失败时释放扫描器、连接和回调。
6. 保持 `sync_protocol.js` 的版本和序号语义，或显式升级协议版本。

当前 Vela manifest 不接受此前尝试的 `system.bluetooth.ble` 声明，因此仓库不导入该模块，也不宣称已经完成真实 BLE。

## 验收场景

### 运动

1. 分别开始步行和跑步，确认指标增长速率不同。
2. 暂停后确认时长和指标停止，继续后恢复。
3. 页面离开再进入，确认未完成会话恢复。
4. 无 GPS 时确认距离来源为步幅估算。
5. 注入多个有效 GPS 点，确认切换为 GPS 距离。
6. 完成后确认记录、当天健康数据和 30 条上限。

### 同步

1. 创建至少一条运动记录。
2. 打开设置中的同步页面并建立模拟链路。
3. 确认包总数、序号、ACK 和进度连续。
4. 中途离开页面，确认定时器停止且不再更新 UI。
5. 完成后确认运动记录标记为已同步。
