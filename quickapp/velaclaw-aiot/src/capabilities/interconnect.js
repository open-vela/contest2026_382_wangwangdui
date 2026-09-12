import interconnect from '@system.interconnect'

var listeners = []
var connection = null

function isAvailable() {
  return !!(interconnect && interconnect.instance)
}

function emit(message) {
  var current = listeners.slice()
  for (var i = 0; i < current.length; i++) current[i](message)
}

function connect() {
  if (connection || listeners.length === 0 || !isAvailable()) return
  try {
    connection = interconnect.instance()
    if (connection) connection.onmessage = emit
  } catch (error) {
    connection = null
  }
}

function disconnect() {
  if (!connection) return
  try { connection.onmessage = null } catch (error) {}
  connection = null
}

function subscribe(listener) {
  if (typeof listener !== 'function' || listeners.indexOf(listener) >= 0) return
  listeners.push(listener)
  if (listeners.length === 1) connect()
}

function unsubscribe(listener) {
  var next = []
  for (var i = 0; i < listeners.length; i++) if (listeners[i] !== listener) next.push(listeners[i])
  listeners = next
  if (listeners.length === 0) disconnect()
}

export default {
  isAvailable: isAvailable,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  consumerCount: function () { return listeners.length }
}
