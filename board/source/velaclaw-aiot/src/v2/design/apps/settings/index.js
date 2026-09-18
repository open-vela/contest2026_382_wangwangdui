var freedom = require('../../freedom')
var adapter = require('../../adapter')
var layout = require('./layout')

var ITEM_IDS = ['sync', 'vibration', 'brightness', 'motion', 'diagnostics']

function contentWidth(profile) { return adapter.contentWidth(profile, layout) }

function resolve(profile, scene, safe) {
  var config = adapter.select(layout, profile)
  var plan = adapter.createPlan(profile, scene, safe, freedom.AUTO, layout.surface || 'paged-settings-list')
  var header = adapter.placeBand(profile, scene, safe, config.header)
  var list = adapter.placeBand(profile, scene, safe, config.list)
  var footer = adapter.placeBand(profile, scene, safe, config.footer)
  plan.itemIds = ITEM_IDS.slice()
  plan.capacity = {
    fixedFrame: true,
    header: header,
    list: list,
    footer: footer,
    pageSize: config.pageSize,
    itemHeight: config.itemHeight,
    itemGap: config.itemGap
  }
  plan.visual = {
    itemRadius: config.itemRadius,
    itemPadding: config.itemPadding,
    iconSize: config.iconSize,
    titleSize: config.titleSize,
    itemNameSize: config.itemNameSize,
    itemDescSize: config.itemDescSize,
    arrowSize: config.arrowSize
  }
  return plan
}

module.exports = { freedomLevel: freedom.AUTO, contentWidth: contentWidth, resolve: resolve, layout: layout }
