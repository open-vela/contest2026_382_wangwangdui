/**
 * 右滑返回手势
 *
 * 表盘之外的页面都用「右滑返回上一页」。此前 steps、heartrate、workout_select、
 * workout_history、watchface 等页面各自实现了一遍 onTouchStart/onTouchEnd，阈值
 * 从 30px 到 40px 不等，边界判断（touches 是否为空）也各写各的，导致同一个手势在
 * 不同页面手感不一致，个别页面还会在缺少 changedTouches 时抛错。
 *
 * 这里统一成一处：横向位移超过阈值、且横向明显大于纵向时才触发，避免与列表的
 * 纵向滚动打架。
 */
import pageMotion from './page_motion'

// 触发返回的最小横向位移（逻辑像素）。
var BACK_THRESHOLD = 34

// 横向位移需要达到纵向位移的这个倍数，才认定为「横滑」而非滚动列表时的手抖。
var HORIZONTAL_RATIO = 1.4

function firstTouch(list) {
  return list && list[0] ? list[0] : null
}

/**
 * 记录手势起点。在页面的 @touchstart 中调用。
 */
function start(page, event) {
  var point = firstTouch(event && event.touches)
  if (!point) return
  page.swipeBackStartX = point.pageX
  page.swipeBackStartY = point.pageY
}

/**
 * 判断是否构成右滑返回；构成则执行返回并返回 true。
 * 在页面的 @touchend 中调用。
 *
 * @param {object} page 页面 this
 * @param {object} event 触摸事件
 * @param {object} router @system.router
 * @returns {boolean} 是否已触发返回
 */
function end(page, event, router) {
  var point = firstTouch(event && event.changedTouches)
  if (!point || page.swipeBackStartX === undefined) return false
  var deltaX = point.pageX - page.swipeBackStartX
  var deltaY = Math.abs(point.pageY - (page.swipeBackStartY || 0))
  page.swipeBackStartX = undefined
  page.swipeBackStartY = undefined
  if (deltaX < BACK_THRESHOLD) return false
  if (deltaX < deltaY * HORIZONTAL_RATIO) return false
  pageMotion.back(page, router)
  return true
}

module.exports = {
  BACK_THRESHOLD: BACK_THRESHOLD,
  start: start,
  end: end
}
