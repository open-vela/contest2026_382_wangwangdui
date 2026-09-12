function clamp(value, min, max) { return Math.max(min, Math.min(max, value)) }

function resolve(items, pageIndex, pageSize) {
  var source = Array.isArray(items) ? items : []
  var size = Math.max(1, Math.round(Number(pageSize) || 1))
  var pageCount = Math.max(1, Math.ceil(source.length / size))
  var index = clamp(Math.round(Number(pageIndex) || 0), 0, pageCount - 1)
  var start = index * size
  return {
    pageIndex: index,
    pageNumber: index + 1,
    pageCount: pageCount,
    pageText: index + 1 + ' / ' + pageCount,
    items: source.slice(start, start + size),
    hasPrevious: index > 0,
    hasNext: index < pageCount - 1,
    progress: Math.round(((index + 1) / pageCount) * 100) + '%'
  }
}

module.exports = { resolve: resolve }
