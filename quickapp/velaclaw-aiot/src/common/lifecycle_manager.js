/**
 * 生命周期资源管理器
 * 为页面/模块提供统一的定时器和订阅追踪，确保在页面离开时一次性清理所有资源。
 */

export function createContext() {
  var timers = {}        // name -> timer id (setTimeout)
  var intervals = {}     // name -> interval id (setInterval)
  var subscriptions = {} // name -> unsubscribe function
  var active = true

  return {
    /**
     * 注册一个setTimeout
     * @param {string} name - 唯一标识
     * @param {number} id - setTimeout返回的id
     * @returns {number} 返回timer id
     */
    addTimer: function (name, id) {
      if (timers[name]) {
        clearTimeout(timers[name])
      }
      timers[name] = id
      return id
    },

    /**
     * 注册一个setInterval
     * @param {string} name - 唯一标识
     * @param {number} id - setInterval返回的id
     * @returns {number} 返回interval id
     */
    addInterval: function (name, id) {
      if (intervals[name]) {
        clearInterval(intervals[name])
      }
      intervals[name] = id
      return id
    },

    /**
     * 注册一个订阅/资源，提供清理函数
     * @param {string} name - 唯一标识
     * @param {function} unsubscribeFn - 取消订阅/清理的函数
     */
    addSubscription: function (name, unsubscribeFn) {
      if (subscriptions[name] && typeof subscriptions[name] === 'function') {
        try { subscriptions[name]() } catch (e) {}
      }
      subscriptions[name] = unsubscribeFn
    },

    /**
     * 清除单个定时器
     */
    clearTimer: function (name) {
      if (timers[name]) {
        clearTimeout(timers[name])
        delete timers[name]
      }
    },

    /**
     * 清除单个interval
     */
    clearInterval: function (name) {
      if (intervals[name]) {
        clearInterval(intervals[name])
        delete intervals[name]
      }
    },

    /**
     * 清除单个订阅/资源
     */
    clearSubscription: function (name) {
      if (subscriptions[name] && typeof subscriptions[name] === 'function') {
        try { subscriptions[name]() } catch (e) {}
      }
      delete subscriptions[name]
    },

    /**
     * 一次性清理所有注册的资源
     */
    cleanup: function () {
      active = false
      var key
      for (key in timers) {
        clearTimeout(timers[key])
      }
      timers = {}
      for (key in intervals) {
        clearInterval(intervals[key])
      }
      intervals = {}
      for (key in subscriptions) {
        if (typeof subscriptions[key] === 'function') {
          try { subscriptions[key]() } catch (e) {}
        }
      }
      subscriptions = {}
    },

    /**
     * 返回上下文是否仍然活跃
     */
    isActive: function () {
      return active
    },

    /**
     * 重新激活上下文（用于页面re-show）
     */
    reactivate: function () {
      active = true
    }
  }
}
