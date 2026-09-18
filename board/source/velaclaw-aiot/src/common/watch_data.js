import activityStore from '../domain/activity/store'
import recentHealth from '../domain/health/recent'
import historyRepository from '../domain/history/repository'
import watchfaceStore from '../domain/watchface/store'
import { mapWatchSnapshot } from '../presentation/mappers/watch_snapshot'
import { mapHistory } from '../presentation/mappers/history'
import notificationFixtures from '../presentation/fixtures/notifications'

// Legacy compatibility aggregator.
// New code must import the owning domain / presentation module directly.
function snapshot() {
  return mapWatchSnapshot(activityStore.getSnapshot(), recentHealth.getSnapshot())
}

export default {
  getSelectedFaceId: function () {
    return watchfaceStore.getSelectedFaceId()
  },

  loadSelectedFaceId: function (callback) {
    watchfaceStore.loadSelectedFaceId(callback)
  },

  setSelectedFaceId: function (id, callback) {
    watchfaceStore.setSelectedFaceId(id, callback)
  },

  markRightFaceTransition: function (faceId, callback) {
    watchfaceStore.markRightFaceTransition(faceId, callback)
  },

  consumeRightFaceTransition: function (callback) {
    watchfaceStore.consumeRightFaceTransition(callback)
  },

  clearRightFaceTransition: function () {
    watchfaceStore.clearRightFaceTransition()
  },

  getSnapshot: snapshot,

  applyHeartRate: function (value) {
    recentHealth.append(value)
    return snapshot()
  },

  addActivityData: function (steps, calories) {
    activityStore.add(steps, calories)
    return snapshot()
  },

  ensureHealthHistory: function () {
    historyRepository.ensure()
  },

  saveTodayHealth: function () {
    historyRepository.saveToday()
  },

  getHealthHistory: function (callback) {
    historyRepository.getHistory(callback)
  },

  getHistorySummary: function (callback) {
    historyRepository.getHistory(function (history) {
      if (callback) callback(mapHistory(history))
    })
  },

  getNotificationByType: function (type, extra) {
    return notificationFixtures.getByType(type, extra)
  },

  getDemoNotifications: function () {
    return notificationFixtures.getAll()
  },

  getHourlyHeartRate: function () {
    return historyRepository.getHourlyHeartRate()
  },

  loadHourlyHeartRate: function (callback) {
    historyRepository.loadHourlyHeartRate(callback)
  },

  saveHourlyHeartRate: function () {
    historyRepository.saveHourlyHeartRate()
  }
}
