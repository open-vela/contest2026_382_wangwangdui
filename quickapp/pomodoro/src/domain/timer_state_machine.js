// Pure pomodoro state machine. No native APIs, no timers, no side effects:
// everything here is a function of (state, settings) -> new state.

var PHASE_FOCUS = 'focus'
var PHASE_BREAK = 'break'
var STATUS_IDLE = 'idle'
var STATUS_RUNNING = 'running'
var STATUS_PAUSED = 'paused'

function toPositiveMinutes(value, fallback) {
  var number = Number(value)
  if (!isFinite(number) || number <= 0) return fallback
  return Math.round(number)
}

function durationSeconds(phase, settings) {
  var focus = toPositiveMinutes(settings && settings.focusMinutes, 25)
  var rest = toPositiveMinutes(settings && settings.breakMinutes, 5)
  return (phase === PHASE_BREAK ? rest : focus) * 60
}

function createState(settings) {
  var total = durationSeconds(PHASE_FOCUS, settings)
  return {
    phase: PHASE_FOCUS,
    status: STATUS_IDLE,
    remainingSeconds: total,
    totalSeconds: total,
    completedFocus: 0
  }
}

function start(state) {
  if (state.status === STATUS_RUNNING) return state
  if (state.remainingSeconds <= 0) return state
  return {
    phase: state.phase,
    status: STATUS_RUNNING,
    remainingSeconds: state.remainingSeconds,
    totalSeconds: state.totalSeconds,
    completedFocus: state.completedFocus
  }
}

function pause(state) {
  if (state.status !== STATUS_RUNNING) return state
  return {
    phase: state.phase,
    status: STATUS_PAUSED,
    remainingSeconds: state.remainingSeconds,
    totalSeconds: state.totalSeconds,
    completedFocus: state.completedFocus
  }
}

function reset(state, settings) {
  return createState(settings)
}

// Applies new durations only while nothing is running, so an in-flight session
// is never silently shortened or extended by a settings change.
function applySettings(state, settings) {
  if (state.status === STATUS_RUNNING || state.status === STATUS_PAUSED) return state
  return createState(settings)
}

// One deterministic step. Returns the next state plus what happened, so the
// runtime layer decides about haptics / persistence instead of the domain.
function tick(state, settings, seconds) {
  var step = seconds === undefined ? 1 : Number(seconds)
  if (state.status !== STATUS_RUNNING || !isFinite(step) || step <= 0) {
    return { state: state, phaseCompleted: false, focusCompleted: false }
  }
  var remaining = state.remainingSeconds - step
  if (remaining > 0) {
    return {
      state: {
        phase: state.phase,
        status: STATUS_RUNNING,
        remainingSeconds: remaining,
        totalSeconds: state.totalSeconds,
        completedFocus: state.completedFocus
      },
      phaseCompleted: false,
      focusCompleted: false
    }
  }
  var nextPhase = state.phase === PHASE_FOCUS ? PHASE_BREAK : PHASE_FOCUS
  var nextTotal = durationSeconds(nextPhase, settings)
  var completedFocus = state.completedFocus + (state.phase === PHASE_FOCUS ? 1 : 0)
  return {
    state: {
      phase: nextPhase,
      status: STATUS_IDLE,
      remainingSeconds: nextTotal,
      totalSeconds: nextTotal,
      completedFocus: completedFocus
    },
    phaseCompleted: true,
    focusCompleted: state.phase === PHASE_FOCUS
  }
}

function progress(state) {
  if (!state.totalSeconds || state.totalSeconds <= 0) return 0
  var elapsed = state.totalSeconds - state.remainingSeconds
  if (elapsed <= 0) return 0
  if (elapsed >= state.totalSeconds) return 1
  return elapsed / state.totalSeconds
}

function formatClock(seconds) {
  var total = Number(seconds)
  if (!isFinite(total) || total < 0) total = 0
  var whole = Math.ceil(total)
  var minutes = Math.floor(whole / 60)
  var rest = whole - minutes * 60
  return (minutes < 10 ? '0' + minutes : String(minutes)) + ':' + (rest < 10 ? '0' + rest : String(rest))
}

function phaseLabel(phase) {
  return phase === PHASE_BREAK ? '休息' : '专注'
}

function statusLabel(status) {
  if (status === STATUS_RUNNING) return '进行中'
  if (status === STATUS_PAUSED) return '已暂停'
  return '待开始'
}

function actionLabel(state) {
  if (state.status === STATUS_RUNNING) return '暂停'
  if (state.status === STATUS_PAUSED) return '继续'
  return '开始'
}

module.exports = {
  PHASE_FOCUS: PHASE_FOCUS,
  PHASE_BREAK: PHASE_BREAK,
  STATUS_IDLE: STATUS_IDLE,
  STATUS_RUNNING: STATUS_RUNNING,
  STATUS_PAUSED: STATUS_PAUSED,
  createState: createState,
  start: start,
  pause: pause,
  reset: reset,
  applySettings: applySettings,
  tick: tick,
  progress: progress,
  formatClock: formatClock,
  phaseLabel: phaseLabel,
  statusLabel: statusLabel,
  actionLabel: actionLabel,
  durationSeconds: durationSeconds
}
