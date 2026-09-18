var MODE_ACTIVE = 'ACTIVE'
var MODE_DIM = 'DIM'
var MODE_SLEEP = 'SLEEP'
var DIM_AFTER_MS = 8000
var SLEEP_AFTER_MS = 15000

function normalizeNow(value) {
  var number = Number(value)
  return isFinite(number) && number > 0 ? number : Date.now()
}

function modeForIdle(idleMs) {
  var idle = Math.max(0, Number(idleMs) || 0)
  if (idle >= SLEEP_AFTER_MS) return MODE_SLEEP
  if (idle >= DIM_AFTER_MS) return MODE_DIM
  return MODE_ACTIVE
}

function create(initialNow) {
  var state = {
    mode: MODE_ACTIVE,
    lastActiveAt: normalizeNow(initialNow),
    changedAt: normalizeNow(initialNow),
    reason: 'init'
  }

  function snapshot() {
    return {
      mode: state.mode,
      lastActiveAt: state.lastActiveAt,
      changedAt: state.changedAt,
      reason: state.reason
    }
  }

  function transition(nextMode, reason, now) {
    var next = nextMode || MODE_ACTIVE
    if (next !== MODE_ACTIVE && next !== MODE_DIM && next !== MODE_SLEEP) next = MODE_ACTIVE
    var time = normalizeNow(now)
    if (state.mode !== next) {
      state.mode = next
      state.changedAt = time
      state.reason = reason || 'transition'
    }
    return snapshot()
  }

  return {
    markActive: function (reason, now) {
      var time = normalizeNow(now)
      state.lastActiveAt = time
      return transition(MODE_ACTIVE, reason || 'activity', time)
    },
    evaluate: function (now) {
      var time = normalizeNow(now)
      return transition(modeForIdle(time - state.lastActiveAt), 'idle', time)
    },
    force: function (mode, reason, now) {
      return transition(mode, reason || 'force', now)
    },
    getSnapshot: snapshot
  }
}

module.exports = {
  MODE_ACTIVE: MODE_ACTIVE,
  MODE_DIM: MODE_DIM,
  MODE_SLEEP: MODE_SLEEP,
  DIM_AFTER_MS: DIM_AFTER_MS,
  SLEEP_AFTER_MS: SLEEP_AFTER_MS,
  modeForIdle: modeForIdle,
  create: create
}
