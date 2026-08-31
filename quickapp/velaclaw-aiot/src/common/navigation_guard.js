var lockedUntil = 0
var LOCK_MS = 700

function begin(context, now) {
  var timestamp = Number(now) || Date.now()
  if (!context || context.navigationPending || timestamp < lockedUntil) return false
  context.navigationPending = true
  lockedUntil = timestamp + LOCK_MS
  return true
}

function enter(context) {
  if (context) context.navigationPending = false
}

function release(context) {
  if (context) context.navigationPending = false
}

function reset() {
  lockedUntil = 0
}

module.exports = {
  begin: begin,
  enter: enter,
  release: release,
  reset: reset,
  lockDuration: LOCK_MS
}
