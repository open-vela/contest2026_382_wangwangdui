import getNativeFeature from './native_feature'

var subscriptions = []
var systemEvent = null

function api() {
  if (!systemEvent) systemEvent = getNativeFeature('@system.event')
  return systemEvent
}

function isAvailable() {
  var native = api()
  return !!(native && native.subscribe)
}

function subscribe(eventName, listener) {
  if (!eventName || typeof listener !== 'function') return false
  for (var i = 0; i < subscriptions.length; i++) {
    if (subscriptions[i].eventName === eventName && subscriptions[i].listener === listener) return true
  }
  if (!isAvailable()) return false
  try {
    var id = api().subscribe({ eventName: eventName, callback: listener })
    if (id === undefined || id === null) return false
    subscriptions.push({ eventName: eventName, listener: listener, id: id })
    return true
  } catch (error) {
    return false
  }
}

function unsubscribe(eventName, listener) {
  var next = []
  for (var i = 0; i < subscriptions.length; i++) {
    var item = subscriptions[i]
    if (item.eventName === eventName && item.listener === listener) {
      try {
        var native = api()
        if (native && native.unsubscribe) native.unsubscribe({ id: item.id })
      } catch (error) {}
    } else {
      next.push(item)
    }
  }
  subscriptions = next
}

export default {
  isAvailable: isAvailable,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  consumerCount: function () { return subscriptions.length }
}
