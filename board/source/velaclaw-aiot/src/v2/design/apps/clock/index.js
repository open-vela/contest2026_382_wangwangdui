var freedom = require('../../freedom')
var adapter = require('../../adapter')
var layout = require('./layout')

function resolve(profile, scene, safe) {
  var config = adapter.select(layout, profile)
  var plan = adapter.createPlan(profile, scene, safe, freedom.FREE, config.surface)
  plan.faceIds = (config.faceIds || []).slice()
  plan.notificationOverlay = !!config.notificationOverlay
  var alpine = config.alpine || {}
  var safeBottom = Number(safe && safe.bottom) || Number(scene && scene.height) || 192
  plan.alpineDataGlassTop = Math.max(Number(alpine.dataGlassMinTop) || 0, safeBottom - (Number(alpine.dataGlassBottomInset) || 0)) + 'px'
  plan.alpineDataRowTop = Math.max(Number(alpine.dataRowMinTop) || 0, safeBottom - (Number(alpine.dataRowBottomInset) || 0)) + 'px'
  plan.alpineBatteryRowTop = Math.max(Number(alpine.batteryMinTop) || 0, safeBottom - (Number(alpine.batteryBottomInset) || 0)) + 'px'
  return plan
}

module.exports = { freedomLevel: freedom.FREE, resolve: resolve, layout: layout }
