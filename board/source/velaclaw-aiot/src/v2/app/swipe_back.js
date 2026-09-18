var BACK_THRESHOLD = 34
var HORIZONTAL_RATIO = 1.4

function firstTouch(list) {
  return list && list[0] ? list[0] : null
}

function start(page, event) {
  var point = firstTouch(event && event.touches)
  if (!point) return
  page.swipeBackStartX = point.pageX
  page.swipeBackStartY = point.pageY
}

function end(page, event, navigation) {
  var point = firstTouch(event && event.changedTouches)
  if (!point || page.swipeBackStartX === undefined) return false
  var deltaX = point.pageX - page.swipeBackStartX
  var deltaY = Math.abs(point.pageY - (page.swipeBackStartY || 0))
  page.swipeBackStartX = undefined
  page.swipeBackStartY = undefined
  if (deltaX < BACK_THRESHOLD) return false
  if (deltaX < deltaY * HORIZONTAL_RATIO) return false
  navigation.back()
  return true
}

module.exports = {
  start: start,
  end: end
}
