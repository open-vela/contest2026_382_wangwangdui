/**
 * Pomodoro timer controller.
 *
 * Owns the only interval in the feature, exactly like the workout controller,
 * so the page stays a lifecycle binding and no ticking work survives a hidden
 * page. The controller is a singleton: leaving the page and coming back keeps
 * the countdown, while `stop()` is the single place that releases the timer.
 */

var FOCUS_SECONDS = 25 * 60
var BREAK_SECONDS = 5 * 60
var TICK_MS = 1000

function formatClock(total) {
  var safe = Math.max(0, Math.round(Number(total) || 0))
  var minutes = Math.floor(safe / 60)
  var seconds = safe % 60
  return (minutes < 10 ? '0' + minutes : String(minutes)) + ':' + (seconds < 10 ? '0' + seconds : String(seconds))
}

export function createPomodoroController(onChange) {
  var running = false
  var phase = 'focus'
  var remaining = FOCUS_SECONDS
  var completed = 0
  var timer = null
  var listener = typeof onChange === 'function' ? onChange : null

  function totalFor(currentPhase) {
    return currentPhase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS
  }

  function snapshot() {
    var total = totalFor(phase)
    return {
      running: running,
      phase: phase,
      remaining: remaining,
      completed: completed,
      clockText: formatClock(remaining),
      progress: Math.max(0, Math.min(1, (total - remaining) / total)),
      phaseText: phase === 'focus' ? '专注' : '休息',
      actionText: running ? '暂停' : remaining === total ? '开始' : '继续',
      hintText: completed > 0 ? '今日完成 ' + completed + ' 个番茄' : '待开始'
    }
  }

  function emit() {
    var value = snapshot()
    if (listener) listener(value)
    return value
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function advance() {
    remaining -= 1
    if (remaining > 0) return
    // Phase boundary: a finished focus block counts as one pomodoro.
    remaining = 0
    running = false
    if (phase === 'focus') {
      completed += 1
      phase = 'break'
      remaining = BREAK_SECONDS
    } else {
      phase = 'focus'
      remaining = FOCUS_SECONDS
    }
    stopTimer()
  }

  function startTimer() {
    stopTimer()
    timer = setInterval(function () {
      if (!running) return
      advance()
      emit()
    }, TICK_MS)
  }

  return {
    snapshot: snapshot,
    /** Bind (or rebind) the page's render callback. */
    bind: function (callback) {
      listener = typeof callback === 'function' ? callback : null
      return emit()
    },
    toggle: function () {
      if (running) {
        running = false
        stopTimer()
      } else {
        if (remaining <= 0) remaining = totalFor(phase)
        running = true
        startTimer()
      }
      return emit()
    },
    reset: function () {
      running = false
      stopTimer()
      phase = 'focus'
      remaining = FOCUS_SECONDS
      return emit()
    },
    /** Called from onHide/onDestroy: the countdown state survives, the tick does not. */
    stop: function () {
      stopTimer()
    },
    isRunning: function () {
      return running
    }
  }
}

// The page binds to one controller instance, so a revisit resumes the same
// session instead of starting a second timer.
export var pomodoroController = createPomodoroController(null)
