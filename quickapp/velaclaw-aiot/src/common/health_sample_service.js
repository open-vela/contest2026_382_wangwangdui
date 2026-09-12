import heartRate from '../capabilities/heart_rate'

var entries = []

function mapSnapshot(snapshot) {
  var source = snapshot || heartRate.getSnapshot()
  return {
    heartRate: source.value,
    heartRateLive: source.live,
    heartRateUpdatedAt: source.updatedAt || 0,
    heartRateErrorCode: source.errorCode || 0,
    anyLive: !!source.live,
    serviceAvailable: !!source.available,
    sourceText: source.live ? '系统实时数据' : '兼容演示数据',
    updatedAt: source.updatedAt || 0
  }
}

function start(listener) {
  if (typeof listener !== 'function') return
  for (var i = 0; i < entries.length; i++) if (entries[i].listener === listener) return
  var wrapped = function (snapshot) { listener(mapSnapshot(snapshot)) }
  entries.push({ listener: listener, wrapped: wrapped })
  heartRate.subscribe(wrapped)
}

function stop(listener) {
  var next = []
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].listener === listener) heartRate.unsubscribe(entries[i].wrapped)
    else next.push(entries[i])
  }
  entries = next
}

export default {
  start: start,
  stop: stop,
  getSnapshot: function () { return mapSnapshot(heartRate.getSnapshot()) }
}
