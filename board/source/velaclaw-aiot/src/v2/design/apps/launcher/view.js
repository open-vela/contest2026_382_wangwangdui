var apps = require('../../catalogs/apps')

function launcherIcon(item) {
  return item.launcherIcon || item.liteIcon || item.icon || item.softIcon || ''
}

function decorateList(items) {
  var source = apps.list(items)
  var result = []
  for (var i = 0; i < source.length; i++) {
    var item = source[i]
    var icon = launcherIcon(item)
    result.push({ id: item.id, label: item.label, icon: icon, normalIcon: icon, softIcon: icon, liteIcon: icon, accent: item.accent, glyph: item.glyph, glyphSize: item.glyphSize, glyphColor: item.glyphColor })
  }
  return result
}

function decorateGrid(items, gap) {
  var source = apps.list(items)
  var result = []
  for (var i = 0; i < source.length; i++) {
    var item = source[i]
    result.push({ id: item.id, label: item.label, icon: launcherIcon(item), accent: item.accent, glyph: item.glyph, glyphSize: item.glyphSize, glyphColor: item.glyphColor, marginRight: i % 2 === 0 ? gap : 0, marginBottom: i < 4 ? gap : 0 })
  }
  return result
}

function project(state, plan) {
  var source = state || {}
  var pageCount = Math.max(1, Number(source.pageCount) || 1)
  var pageNumber = Math.max(1, Number(source.pageNumber) || 1)
  return {
    allApps: decorateList(source.all),
    pageApps: decorateList(source.items),
    gridApps: decorateGrid(source.items, Number(plan && plan.gap) || 0),
    pageText: pageNumber + ' / ' + pageCount,
    pageProgress: Math.round((pageNumber / pageCount) * 100) + '%',
    previousColor: source.hasPrevious ? '#0A84FF' : '#3A3A3C',
    nextColor: source.hasNext ? '#0A84FF' : '#3A3A3C'
  }
}

module.exports = { project: project }
