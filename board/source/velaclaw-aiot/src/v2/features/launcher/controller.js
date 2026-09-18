function clamp(value, min, max) { return Math.max(min, Math.min(max, value)) }

export function createLauncherController(onChange) {
  var all = []
  var pageIndex = 0
  var pageSize = 4

  function pageCount() {
    return Math.max(1, Math.ceil(all.length / pageSize))
  }

  function wrapPage(index) {
    var count = pageCount()
    return ((index % count) + count) % count
  }

  function snapshot() {
    var count = pageCount()
    pageIndex = clamp(pageIndex, 0, count - 1)
    var start = pageIndex * pageSize
    return {
      all: all.slice(),
      items: all.slice(start, start + pageSize),
      pageIndex: pageIndex,
      pageNumber: pageIndex + 1,
      pageCount: count,
      hasPrevious: count > 1,
      hasNext: count > 1
    }
  }

  function emit() {
    var value = snapshot()
    if (typeof onChange === 'function') onChange(value)
    return value
  }

  return {
    configure: function (ids, size) {
      all = Array.isArray(ids) ? ids.slice() : []
      pageSize = Math.max(1, Math.round(Number(size) || 4))
      pageIndex = 0
      return emit()
    },
    next: function () { pageIndex = wrapPage(pageIndex + 1); return emit() },
    previous: function () { pageIndex = wrapPage(pageIndex - 1); return emit() },
    goToPage: function (index) { pageIndex = Math.round(Number(index) || 0); return emit() },
    refresh: emit
  }
}
