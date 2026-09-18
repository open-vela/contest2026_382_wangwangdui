import healthStore from '../domain/health/store'
import watchData from './watch_data'

// Legacy bridge only. New pages must import domain/health/store directly.
// watchSnapshot is preserved here until the remaining old pages are migrated.
var listenerMap = []

function findEntry(listener) {
  for (var i = 0; i < listenerMap.length; i++) {
    if (listenerMap[i].listener === listener) return listenerMap[i]
  }
  return null
}

function start(listener) {
  if (typeof listener !== 'function' || findEntry(listener)) return
  var wrapped = function (state) {
    var data = {}
    for (var key in state) data[key] = state[key]
    if (data.heartRateChanged) watchData.applyHeartRate(data.heartRate)
    data.watchSnapshot = watchData.getSnapshot()
    listener(data)
  }
  listenerMap.push({ listener: listener, wrapped: wrapped })
  healthStore.subscribeAll(wrapped)
}

function stop(listener) {
  var next = []
  for (var i = 0; i < listenerMap.length; i++) {
    var entry = listenerMap[i]
    if (entry.listener === listener) {
      healthStore.unsubscribe(entry.wrapped)
    } else {
      next.push(entry)
    }
  }
  listenerMap = next
}

export default {
  start: start,
  stop: stop,
  getSnapshot: function () {
    var state = healthStore.getSnapshot()
    state.watchSnapshot = watchData.getSnapshot()
    return state
  }
}
