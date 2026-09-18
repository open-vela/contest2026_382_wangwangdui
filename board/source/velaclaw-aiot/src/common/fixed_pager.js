function toPositiveInt(value, fallback) {
  var number = Math.floor(Number(value))
  return isFinite(number) && number > 0 ? number : fallback
}

function getPageCount(items, pageSize) {
  var size = toPositiveInt(pageSize, 1)
  var count = items && items.length ? items.length : 0
  return Math.max(1, Math.ceil(count / size))
}

function normalizePage(pageIndex, pageCount) {
  var count = toPositiveInt(pageCount, 1)
  var page = Math.floor(Number(pageIndex))
  if (!isFinite(page) || page < 0) return 0
  if (page >= count) return count - 1
  return page
}

function build(items, pageIndex, pageSize) {
  var source = Array.isArray(items) ? items : []
  var size = toPositiveInt(pageSize, 1)
  var pageCount = getPageCount(source, size)
  var page = normalizePage(pageIndex, pageCount)
  var start = page * size
  return {
    items: source.slice(start, start + size),
    pageIndex: page,
    pageNumber: page + 1,
    pageCount: pageCount,
    pageText: page + 1 + ' / ' + pageCount,
    hasPrevious: page > 0,
    hasNext: page < pageCount - 1
  }
}

function move(items, pageIndex, pageSize, step) {
  return build(items, Number(pageIndex) + Number(step || 0), pageSize)
}

module.exports = {
  build: build,
  move: move,
  getPageCount: getPageCount,
  normalizePage: normalizePage
}
