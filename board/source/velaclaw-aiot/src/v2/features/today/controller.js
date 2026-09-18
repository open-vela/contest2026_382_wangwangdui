import activityStore from '../../../domain/activity/store'
import healthStore from '../../../domain/health/store'
var calendar = require('../../../domain/calendar')

function copy(state) {
  return {
    currentYear: state.currentYear,
    currentMonth: state.currentMonth,
    currentDay: state.currentDay,
    currentWeekday: state.currentWeekday,
    lunarText: state.lunarText,
    steps: state.steps,
    calories: state.calories,
    standHours: state.standHours,
    heartRate: state.heartRate,
    goalPercent: state.goalPercent,
    calendarYear: state.calendarYear,
    calendarMonth: state.calendarMonth,
    calendarCells: state.calendarCells.slice()
  }
}

export function createTodayController(onChange) {
  var now = new Date()
  var state = {
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth(),
    currentDay: now.getDate(),
    currentWeekday: now.getDay(),
    lunarText: calendar.formatLunar(now),
    steps: 0,
    calories: 0,
    standHours: 0,
    heartRate: null,
    goalPercent: 0,
    calendarYear: now.getFullYear(),
    calendarMonth: now.getMonth(),
    calendarCells: []
  }
  var started = false
  var lifecycleEpoch = 0

  function emit() {
    var value = copy(state)
    if (typeof onChange === 'function') onChange(value)
    return value
  }

  function refreshCalendar() {
    state.calendarCells = calendar.buildMonth(state.calendarYear, state.calendarMonth, new Date())
  }

  function refreshDate() {
    var date = new Date()
    state.currentYear = date.getFullYear()
    state.currentMonth = date.getMonth()
    state.currentDay = date.getDate()
    state.currentWeekday = date.getDay()
    state.lunarText = calendar.formatLunar(date)
    state.calendarYear = date.getFullYear()
    state.calendarMonth = date.getMonth()
    refreshCalendar()
  }

  function applyActivity(snapshot) {
    var source = snapshot || {}
    state.steps = Number(source.steps) || 0
    state.calories = Number(source.calories) || 0
    state.standHours = Number(source.standHours) || 0
    state.goalPercent = Math.max(0, Math.min(100, Number(source.goalPercent) || 0))
    emit()
  }

  function onHealth(snapshot) {
    if (!started) return
    if (snapshot && snapshot.heartRate !== undefined && snapshot.heartRate !== null) state.heartRate = Number(snapshot.heartRate) || 0
    emit()
  }

  refreshCalendar()

  return {
    start: function () {
      if (started) { emit(); return }
      started = true
      lifecycleEpoch++
      var epoch = lifecycleEpoch
      refreshDate()
      emit()
      activityStore.hydrate(function (snapshot) {
        if (!started || epoch !== lifecycleEpoch) return
        applyActivity(snapshot)
      })
      healthStore.subscribeHeartRate(onHealth)
    },
    stop: function () {
      if (!started) return
      started = false
      lifecycleEpoch++
      healthStore.unsubscribe(onHealth)
    },
    resetToday: function () { refreshDate(); emit() },
    shiftMonth: function (delta) {
      var next = calendar.shiftMonth(state.calendarYear, state.calendarMonth, delta)
      state.calendarYear = next.year
      state.calendarMonth = next.month
      refreshCalendar()
      emit()
    },
    getSnapshot: function () { return copy(state) }
  }
}
