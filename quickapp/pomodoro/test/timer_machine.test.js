var h = require('./harness')
var machine = require('../src/domain/timer_state_machine')

var settings = { focusMinutes: 25, breakMinutes: 5, autoStart: false }

h.test('starts idle in focus with the configured duration', function () {
  var state = machine.createState(settings)
  h.equal(state.phase, machine.PHASE_FOCUS)
  h.equal(state.status, machine.STATUS_IDLE)
  h.equal(state.remainingSeconds, 1500)
  h.equal(machine.formatClock(state.remainingSeconds), '25:00')
})

h.test('start / pause are idempotent and keep remaining time', function () {
  var state = machine.start(machine.createState(settings))
  h.equal(state.status, machine.STATUS_RUNNING)
  h.equal(machine.start(state).status, machine.STATUS_RUNNING)
  var paused = machine.pause(state)
  h.equal(paused.status, machine.STATUS_PAUSED)
  h.equal(paused.remainingSeconds, 1500)
  h.equal(machine.pause(paused).status, machine.STATUS_PAUSED)
})

h.test('tick does nothing while idle or paused', function () {
  var idle = machine.createState(settings)
  h.equal(machine.tick(idle, settings, 5).state.remainingSeconds, 1500)
  var paused = machine.pause(machine.start(idle))
  h.equal(machine.tick(paused, settings, 5).state.remainingSeconds, 1500)
})

h.test('tick counts down one second at a time', function () {
  var state = machine.start(machine.createState(settings))
  var result = machine.tick(state, settings, 1)
  h.equal(result.phaseCompleted, false)
  h.equal(result.state.remainingSeconds, 1499)
})

h.test('focus completion switches to break and counts the pomodoro', function () {
  var state = machine.start(machine.createState(settings))
  var result = machine.tick({
    phase: state.phase, status: state.status, remainingSeconds: 1,
    totalSeconds: state.totalSeconds, completedFocus: 0
  }, settings, 1)
  h.equal(result.phaseCompleted, true)
  h.equal(result.focusCompleted, true)
  h.equal(result.state.phase, machine.PHASE_BREAK)
  h.equal(result.state.status, machine.STATUS_IDLE)
  h.equal(result.state.remainingSeconds, 300)
  h.equal(result.state.completedFocus, 1)
})

h.test('break completion returns to focus without counting a pomodoro', function () {
  var result = machine.tick({
    phase: machine.PHASE_BREAK, status: machine.STATUS_RUNNING,
    remainingSeconds: 1, totalSeconds: 300, completedFocus: 2
  }, settings, 1)
  h.equal(result.focusCompleted, false)
  h.equal(result.state.phase, machine.PHASE_FOCUS)
  h.equal(result.state.completedFocus, 2)
  h.equal(result.state.remainingSeconds, 1500)
})

h.test('reset returns to a fresh focus session and clears the counter', function () {
  var running = machine.start(machine.createState(settings))
  var reset = machine.reset(running, settings)
  h.equal(reset.status, machine.STATUS_IDLE)
  h.equal(reset.remainingSeconds, 1500)
  h.equal(reset.completedFocus, 0)
})

h.test('applySettings only touches an idle session', function () {
  var idle = machine.applySettings(machine.createState(settings), { focusMinutes: 45, breakMinutes: 10 })
  h.equal(idle.remainingSeconds, 2700)
  var running = machine.start(machine.createState(settings))
  var kept = machine.applySettings(running, { focusMinutes: 45, breakMinutes: 10 })
  h.equal(kept.remainingSeconds, 1500, 'running session must not be resized')
})

h.test('progress and clock formatting stay in range', function () {
  var state = machine.createState(settings)
  h.equal(machine.progress(state), 0)
  h.equal(machine.formatClock(65), '01:05')
  h.equal(machine.formatClock(0), '00:00')
  h.equal(machine.formatClock(-5), '00:00')
  h.equal(machine.progress({ totalSeconds: 0, remainingSeconds: 0 }), 0)
})

h.test('invalid durations fall back to the defaults', function () {
  h.equal(machine.durationSeconds(machine.PHASE_FOCUS, { focusMinutes: 0 }), 1500)
  h.equal(machine.durationSeconds(machine.PHASE_BREAK, { breakMinutes: -3 }), 300)
})

h.report('timer_machine')
