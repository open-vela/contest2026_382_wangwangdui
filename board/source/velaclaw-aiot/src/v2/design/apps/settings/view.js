var pager = require('../../pager')
var catalog = require('../../catalogs/settings')

function decorate(items, gap) {
  var source = catalog.list(items)
  var result = []
  for (var i = 0; i < source.length; i++) {
    var item = source[i]
    result.push({ id: item.id, name: item.name, description: item.description, icon: item.icon, marginBottom: i < source.length - 1 ? gap : 0 })
  }
  return result
}

function dots(pageCount, pageIndex) {
  var result = []
  for (var i = 0; i < pageCount; i++) result.push({ color: i === pageIndex ? '#0A84FF' : '#3A3A3C' })
  return result
}

function project(designPlan, pageIndex) {
  var state = pager.resolve(designPlan.itemIds, pageIndex, designPlan.capacity.pageSize)
  var plan = designPlan.capacity
  var visual = designPlan.visual || {}
  var iconSize = Number(visual.iconSize) || 30
  return {
    pageIndex: state.pageIndex,
    pageText: state.pageText,
    pageItems: decorate(state.items, plan.itemGap),
    dots: dots(state.pageCount, state.pageIndex),
    plan: plan,
    itemRadius: Number(visual.itemRadius) || 16,
    itemPadding: Number(visual.itemPadding) || 7,
    iconSize: iconSize,
    iconRadius: Math.round(iconSize / 2),
    titleSize: Number(visual.titleSize) || 12,
    itemNameSize: Number(visual.itemNameSize) || 10,
    itemDescSize: Number(visual.itemDescSize) || 6,
    arrowSize: Number(visual.arrowSize) || 13
  }
}

module.exports = { project: project }
