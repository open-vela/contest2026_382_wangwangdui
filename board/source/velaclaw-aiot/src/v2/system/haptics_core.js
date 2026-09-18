function createRuntime(options) {
  var config = options || {}
  var vibrate = typeof config.vibrate === 'function' ? config.vibrate : function () { return false }
  var setTimer = typeof config.setTimeout === 'function' ? config.setTimeout : setTimeout
  var clearTimer = typeof config.clearTimeout === 'function' ? config.clearTimeout : clearTimeout
  var timers = []
  var activeOwner = null
  var generation = 0

  function clearScheduled() {
    for (var i = 0; i < timers.length; i++) clearTimer(timers[i])
    timers = []
  }

  function play(spec, owner) {
    var source = spec || {}
    if (!owner || !source.mode || !source.count) return false

    generation++
    var run = generation
    clearScheduled()
    activeOwner = owner

    var firstPlayed = !!vibrate(source.mode)
    if (!firstPlayed) {
      activeOwner = null
      return false
    }

    for (var i = 1; i < source.count; i++) {
      ;(function (delay, mode, expectedOwner, expectedRun) {
        timers.push(setTimer(function () {
          if (generation !== expectedRun || activeOwner !== expectedOwner) return
          vibrate(mode)
        }, delay))
      })(i * (source.duration + source.interval), source.mode, owner, run)
    }
    return true
  }

  function stop(owner) {
    if (!owner || activeOwner !== owner) return false
    generation++
    clearScheduled()
    activeOwner = null
    return true
  }

  return {
    play: play,
    stop: stop,
    getActiveOwner: function () { return activeOwner }
  }
}

module.exports = { createRuntime: createRuntime }
