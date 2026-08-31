import storageAdapter from './storage_adapter'
import { parseStorageValue, safeJsonParse, formatDateKey } from './utils'
import healthMetrics from './health_metrics'

// 表盘活动数据与历史缓存；即时心率由 health_sample_service 写入。
var SELECTED_FACE_KEY = 'selected_face_id'
var RIGHT_FACE_TRANSITION_KEY = 'right_face_transition'
var RIGHT_FACE_TRANSITION_MAX_AGE = 3000
var HEALTH_HISTORY_KEY = 'health_history_7d'
var HOURLY_HEART_RATE_KEY = 'hourly_heart_rate_24h'
var HISTORY_DAYS = 7
var CHART_MAX_HEIGHT = 84
var HOURLY_LABELS = ['0', '3', '6', '9', '12', '15', '18', '21']

var snapshotVersion = 0
var cachedSnapshot = null

function invalidateSnapshot() {
  snapshotVersion++
  cachedSnapshot = null
}

var state = {
  selectedFaceId: 'sport',
  steps: 4567,
  stepsGoal: 6000,
  calories: 180,
  caloriesGoal: 300,
  standHours: 8,
  standGoal: 12,
  currentHeartRate: 88,
  hourlyHeartRate: [],
  heartRateData: [
    { value: 65 },
    { value: 82 },
    { value: 71 },
    { value: 95 },
    { value: 78 },
    { value: 88 }
  ]
}

function clampPercent(value, goal) {
  if (!goal || goal <= 0) {
    return 0
  }
  var percent = Math.round((value / goal) * 100)
  if (percent < 0) {
    return 0
  }
  if (percent > 100) {
    return 100
  }
  return percent
}

function calcGoalPercent() {
  // Three sport metrics share the same weight: steps, calories, stand hours.
  var stepsPercent = clampPercent(state.steps, state.stepsGoal)
  var caloriesPercent = clampPercent(state.calories, state.caloriesGoal)
  var standPercent = clampPercent(state.standHours, state.standGoal)
  return Math.round((stepsPercent + caloriesPercent + standPercent) / 3)
}

function applyHeartRateValue(value) {
  var nextRate = Math.max(30, Math.min(220, Math.round(Number(value) || state.currentHeartRate)))
  state.heartRateData.shift()
  state.heartRateData.push({ value: nextRate })
  state.currentHeartRate = nextRate
  invalidateSnapshot()
  return buildSnapshot()
}

function formatNumber(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDayLabel(dateText) {
  return dateText.slice(5).replace('-', '/')
}

function safeStorageSet(key, value, callback) {
  // Delegate to the shared storage adapter (memory cache + persistent storage with fallback).
  storageAdapter.set(key, value, callback)
}

function safeStorageGet(key, success, fail, forceRefresh) {
  // Re-wrap the adapter's raw string into { value } so existing parseStorageValue call sites work.
  storageAdapter.get(key, function (raw) {
    if (raw !== undefined && raw !== '') {
      success({ value: raw })
    } else if (fail) {
      fail()
    } else {
      success({ value: '' })
    }
  }, forceRefresh)
}

function parseHistoryList(data) {
  // Storage keeps JSON text; invalid or empty data falls back to demo history.
  var raw = parseStorageValue(data)
  if (!raw) {
    return []
  }
  try {
    var parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
    }
  } catch (e) {
    console.log('health history parse failed, recreate demo data')
  }
  return []
}

function saveSelectedFaceId(id, callback) {
  safeStorageSet(SELECTED_FACE_KEY, id, callback)
}

function cloneHeartRateData() {
  var result = []
  var values = []
  for (var i = 0; i < state.heartRateData.length; i++) {
    values.push(state.heartRateData[i].value)
  }
  var pillHeights = healthMetrics.barHeights(values, 4, 28, 8)
  var circleHeights = healthMetrics.barHeights(values, 4, 18, 8)
  for (var index = 0; index < state.heartRateData.length; index++) {
    var item = state.heartRateData[index]
    result.push({
      value: item.value,
      barHeight: pillHeights[index],
      circleBarHeight: circleHeights[index]
    })
  }
  return result
}

function getAverageHeartRate() {
  // Use the recent samples shared by the system health service and watch faces.
  var total = 0
  for (var i = 0; i < state.heartRateData.length; i++) {
    total += state.heartRateData[i].value
  }
  return Math.round(total / state.heartRateData.length)
}

function getMinHeartRate() {
  var minValue = state.heartRateData[0].value
  for (var i = 1; i < state.heartRateData.length; i++) {
    if (state.heartRateData[i].value < minValue) {
      minValue = state.heartRateData[i].value
    }
  }
  return minValue
}

function getMaxHeartRate() {
  var maxValue = state.heartRateData[0].value
  for (var i = 1; i < state.heartRateData.length; i++) {
    if (state.heartRateData[i].value > maxValue) {
      maxValue = state.heartRateData[i].value
    }
  }
  return maxValue
}

function makeTodayRecord() {
  // Today's record is generated from the same live data shown on the watch faces.
  return {
    date: formatDateKey(new Date()),
    steps: state.steps,
    calories: state.calories,
    standHours: state.standHours,
    avgHeartRate: getAverageHeartRate(),
    minHeartRate: getMinHeartRate(),
    maxHeartRate: getMaxHeartRate(),
    goalPercent: calcGoalPercent()
  }
}

function makeDemoHistory() {
  // Simulator-friendly seed data makes the history page useful on first launch.
  var result = []
  var stepsList = [3800, 5200, 6100, 4500, 7200, 5600]
  var caloriesList = [146, 205, 242, 178, 288, 220]
  var standList = [6, 8, 9, 7, 10, 8]
  var heartList = [78, 81, 84, 79, 86, 82]

  for (var i = HISTORY_DAYS - 1; i > 0; i--) {
    var date = new Date()
    date.setDate(date.getDate() - i)
    var index = HISTORY_DAYS - 1 - i
    result.push({
      date: formatDateKey(date),
      steps: stepsList[index],
      calories: caloriesList[index],
      standHours: standList[index],
      avgHeartRate: heartList[index],
      minHeartRate: heartList[index] - 12,
      maxHeartRate: heartList[index] + 14,
      goalPercent: Math.round((clampPercent(stepsList[index], state.stepsGoal) + clampPercent(caloriesList[index], state.caloriesGoal) + clampPercent(standList[index], state.standGoal)) / 3)
    })
  }

  result.push(makeTodayRecord())
  return result
}

function makeDemoHourlyHeartRate() {
  // 24-hour demo data: each entry is one 3-hour window with min/max/avg bpm.
  var raw = [
    { min: 48, max: 72, avg: 60 },
    { min: 51, max: 70, avg: 62 },
    { min: 58, max: 88, avg: 72 },
    { min: 68, max: 95, avg: 80 },
    { min: 63, max: 88, avg: 76 },
    { min: 66, max: 93, avg: 79 },
    { min: 64, max: 91, avg: 77 },
    { min: 55, max: 80, avg: 68 }
  ]
  var result = []
  for (var i = 0; i < HOURLY_LABELS.length; i++) {
    result.push({
      label: HOURLY_LABELS[i],
      min: raw[i].min,
      max: raw[i].max,
      avg: raw[i].avg
    })
  }
  return result
}

function copyHistory(history) {
  var result = []
  for (var i = 0; i < history.length; i++) {
    var item = history[i]
    result.push({
      date: item.date,
      steps: item.steps,
      calories: item.calories,
      standHours: item.standHours,
      avgHeartRate: item.avgHeartRate,
      minHeartRate: item.minHeartRate,
      maxHeartRate: item.maxHeartRate,
      goalPercent: item.goalPercent
    })
  }
  return result
}

function sortHistory(history) {
  history.sort(function (a, b) {
    return a.date > b.date ? 1 : -1
  })
}

function mergeTodayRecord(history) {
  // Restore persisted totals before replacing today's record. This prevents a
  // completed workout from returning to demo defaults after an app restart.
  var todayDate = formatDateKey(new Date())
  for (var i = 0; i < history.length; i++) {
    if (history[i].date === todayDate) {
      state.steps = Math.max(state.steps, Number(history[i].steps) || 0)
      state.calories = Math.max(state.calories, Number(history[i].calories) || 0)
      state.standHours = Math.max(state.standHours, Number(history[i].standHours) || 0)
      break
    }
  }

  // Keep one record per day and replace today's value with the restored snapshot.
  var today = makeTodayRecord()
  var merged = []
  for (var j = 0; j < history.length; j++) {
    if (history[j].date !== today.date) {
      merged.push(history[j])
    }
  }
  merged.push(today)
  sortHistory(merged)
  while (merged.length > HISTORY_DAYS) {
    merged.shift()
  }
  return merged
}

function saveHistory(history) {
  safeStorageSet(HEALTH_HISTORY_KEY, JSON.stringify(history))
}

function loadHistory(callback) {
  safeStorageGet(
    HEALTH_HISTORY_KEY,
    function (data) {
      var history = parseHistoryList(data)
      if (history.length === 0) {
        history = makeDemoHistory()
      }
      history = mergeTodayRecord(history)
      saveHistory(history)
      callback(copyHistory(history))
    },
    function () {
      var history = mergeTodayRecord(makeDemoHistory())
      saveHistory(history)
      callback(copyHistory(history))
    }
  )
}

function buildStepBars(history) {
  var bars = []
  var maxSteps = 1
  for (var i = 0; i < history.length; i++) {
    if (history[i].steps > maxSteps) {
      maxSteps = history[i].steps
    }
  }
  for (var j = 0; j < history.length; j++) {
    var item = history[j]
    var height = Math.round((item.steps / maxSteps) * CHART_MAX_HEIGHT)
    if (height < 6) {
      height = 6
    }
    bars.push({
      label: formatDayLabel(item.date),
      height: height,
      color: j === history.length - 1 ? '#FFD60A' : '#3A7DFF',
      stepsText: formatNumber(item.steps),
      shortSteps: Math.round(item.steps / 1000) + 'k'
    })
  }
  return bars
}

function buildHistorySummary(history) {
  // The history page receives display-ready data to keep the page simple.
  var totalSteps = 0
  var totalHeart = 0
  var totalCalories = 0
  var best = history[0]
  var records = []
  for (var i = 0; i < history.length; i++) {
    var item = history[i]
    totalSteps += item.steps
    totalHeart += item.avgHeartRate
    totalCalories += item.calories
    if (item.steps > best.steps) {
      best = item
    }
    records.unshift({
      date: formatDayLabel(item.date),
      stepsText: formatNumber(item.steps),
      caloriesText: formatNumber(item.calories),
      heartText: item.avgHeartRate + ' bpm',
      goalText: item.goalPercent + '%'
    })
  }

  var today = history[history.length - 1]
  return {
    todayStepsText: formatNumber(today.steps),
    avgStepsText: formatNumber(Math.round(totalSteps / history.length)),
    bestStepsText: formatNumber(best.steps),
    bestDayText: formatDayLabel(best.date),
    avgHeartText: Math.round(totalHeart / history.length) + ' bpm',
    totalCaloriesText: formatNumber(totalCalories),
    goalText: today.goalPercent + '%',
    stepBars: buildStepBars(history),
    records: records
  }
}

function makeNotification(type, extra) {
  var item = null
  if (type === 'call') {
    item = {
      type: 'call',
      icon: 'C',
      title: '来电提醒',
      content: '未知 来电中',
      contact: '未知',
      phone: '+86 123456',
      typeText: 'CALL',
      color: '#30D158',
      duration: 8000
    }
  } else if (type === 'sms') {
    item = {
      type: 'sms',
      icon: 'S',
      title: '短信',
      appName: '短信',
      appIcon: '/common/logo.png',
      content: '测试',
      typeText: 'SMS',
      color: '#0A84FF',
      duration: 6000
    }
  } else {
    item = {
      type: 'app',
      icon: 'A',
      title: 'App通知',
      appName: '运动健康',
      appIcon: '/common/logo.png',
      content: '测试',
      typeText: 'APP',
      color: '#FF9F0A',
      duration: 6000
    }
  }

  // Console-triggered events may override fields while reusing the same UI model.
  if (extra) {
    if (extra.title) {
      item.title = extra.title
    }
    if (extra.content) {
      item.content = extra.content
    }
    if (extra.duration) {
      item.duration = extra.duration
    }
    if (extra.contact) {
      item.contact = extra.contact
    }
    if (extra.phone) {
      item.phone = extra.phone
    }
    if (extra.appName) {
      item.appName = extra.appName
    }
    if (extra.appIcon) {
      item.appIcon = extra.appIcon
    }
  }
  return item
}

function buildSnapshot() {
  if (cachedSnapshot && cachedSnapshot._version === snapshotVersion) {
    return cachedSnapshot
  }
  var goalPercent = calcGoalPercent()
  var snapshot = {
    steps: state.steps,
    stepsText: formatNumber(state.steps),
    stepsGoal: state.stepsGoal,
    stepsGoalText: formatNumber(state.stepsGoal),
    calories: state.calories,
    caloriesGoal: state.caloriesGoal,
    standHours: state.standHours,
    standGoal: state.standGoal,
    currentHeartRate: state.currentHeartRate,
    heartRateData: cloneHeartRateData(),
    goalPercent: goalPercent,
    goalProgressWidth: goalPercent + '%',
    stepsProgressWidth: clampPercent(state.steps, state.stepsGoal) + '%'
  }
  snapshot._version = snapshotVersion
  cachedSnapshot = snapshot
  return snapshot
}

export default {
  getSelectedFaceId() {
    return state.selectedFaceId
  },

  loadSelectedFaceId(callback) {
    safeStorageGet(
      SELECTED_FACE_KEY,
      function (data) {
        var stored = parseStorageValue(data)
        if (stored) {
          state.selectedFaceId = stored
        }
        callback(state.selectedFaceId)
      },
      function () {
        callback(state.selectedFaceId)
      },
      true
    )
  },

  setSelectedFaceId(id, callback) {
    state.selectedFaceId = id || 'sport'
    saveSelectedFaceId(state.selectedFaceId, callback)
  },

  markRightFaceTransition(faceId, callback) {
    storageAdapter.set(
      RIGHT_FACE_TRANSITION_KEY,
      JSON.stringify({ faceId: faceId, updatedAt: Date.now() }),
      callback
    )
  },

  consumeRightFaceTransition(callback) {
    storageAdapter.get(
      RIGHT_FACE_TRANSITION_KEY,
      function (raw) {
        var transition = safeJsonParse(raw, null)
        var isRecent = transition && transition.faceId && Date.now() - Number(transition.updatedAt) < RIGHT_FACE_TRANSITION_MAX_AGE
        storageAdapter.delete(RIGHT_FACE_TRANSITION_KEY, function () {
          callback(isRecent ? transition.faceId : '')
        })
      },
      true
    )
  },

  clearRightFaceTransition() {
    storageAdapter.delete(RIGHT_FACE_TRANSITION_KEY)
  },

  getSnapshot() {
    return buildSnapshot()
  },

  applyHeartRate(value) {
    return applyHeartRateValue(value)
  },

  addActivityData(steps, calories) {
    var safeSteps = Math.max(0, Math.round(steps || 0))
    var safeCalories = Math.max(0, Math.round(calories || 0))
    state.steps += safeSteps
    state.calories += safeCalories
    invalidateSnapshot()
    return this.getSnapshot()
  },

  ensureHealthHistory() {
    // Called when the app is shown so first-run demo records are ready.
    loadHistory(function () {})
  },

  saveTodayHealth() {
    // Called when leaving the main page; one write per page hide is enough for the demo.
    loadHistory(function () {})
  },

  getHealthHistory(callback) {
    loadHistory(callback)
  },

  getHistorySummary(callback) {
    loadHistory(function (history) {
      callback(buildHistorySummary(history))
    })
  },

  getNotificationByType(type, extra) {
    if (type !== 'call' && type !== 'sms' && type !== 'app') {
      return null
    }
    return makeNotification(type, extra)
  },

  getDemoNotifications() {
    return [
      makeNotification('call'),
      makeNotification('sms'),
      makeNotification('app')
    ]
  },

  getHourlyHeartRate() {
    return state.hourlyHeartRate.length ? state.hourlyHeartRate : makeDemoHourlyHeartRate()
  },

  loadHourlyHeartRate(callback) {
    if (state.hourlyHeartRate && state.hourlyHeartRate.length > 0) {
      if (callback) callback(state.hourlyHeartRate)
      return
    }
    safeStorageGet(
      HOURLY_HEART_RATE_KEY,
      function (data) {
        var stored = parseStorageValue(data)
        var parsed = stored ? safeJsonParse(stored, null) : null
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          state.hourlyHeartRate = parsed
          console.log('hourly heart rate loaded from storage')
        } else {
          state.hourlyHeartRate = makeDemoHourlyHeartRate()
          // Persist the demo hourly data so the heart-rate page always has something to show.
          safeStorageSet(HOURLY_HEART_RATE_KEY, JSON.stringify(state.hourlyHeartRate))
          console.log('hourly heart rate fallback to demo and persisted')
        }
        if (callback) callback(state.hourlyHeartRate)
      },
      function () {
        state.hourlyHeartRate = makeDemoHourlyHeartRate()
        safeStorageSet(HOURLY_HEART_RATE_KEY, JSON.stringify(state.hourlyHeartRate))
        console.log('hourly heart rate storage failed, fallback to demo and persisted')
        if (callback) callback(state.hourlyHeartRate)
      }
    )
  },

  saveHourlyHeartRate() {
    safeStorageSet(HOURLY_HEART_RATE_KEY, JSON.stringify(state.hourlyHeartRate))
  }
}
