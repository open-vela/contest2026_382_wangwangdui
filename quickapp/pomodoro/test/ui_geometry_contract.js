var layout = require('../src/design/timer_layout')
var settingsLayout = require('../src/design/settings_layout')

var profiles = [
  { id: 'circle-466', shape: 'circle', logicalWidth: 192, logicalHeight: 192 },
  { id: 'circle-480', shape: 'circle', logicalWidth: 192, logicalHeight: 192 },
  { id: 'pill-192x490', shape: 'pill', logicalWidth: 192, logicalHeight: 490 },
  { id: 'pill-212x520', shape: 'pill', logicalWidth: 192, logicalHeight: Math.round(520 * 192 / 212) },
  { id: 'rect-336x480', shape: 'rect', logicalWidth: 192, logicalHeight: Math.round(480 * 192 / 336) },
  { id: 'rect-432x514', shape: 'rect', logicalWidth: 192, logicalHeight: Math.round(514 * 192 / 432) }
]

function blockRect(item, plan) {
  var width = item.width === undefined ? plan.sceneWidth - plan.pad * 2 : item.width
  var left = item.left === undefined ? (plan.composition === 'circle-ring' ? Math.round((plan.sceneWidth - width) / 2) : plan.pad) : item.left
  return { id: item.id, left: left, top: item.top, width: width, height: item.height, circleSafe: plan.composition === 'circle-ring' }
}
function screen(route, profile, plan, rects) { return { route: route, profileId: profile.id, shape: profile.shape, viewport: { width: plan.sceneWidth, height: plan.sceneHeight }, rects: rects } }
function focus(profile) { var plan = layout.computeLayout(profile); return screen('pages/focus', profile, plan, plan.blocks.map(function (x) { return blockRect(x, plan) })) }
function settings(profile) {
  var plan = settingsLayout.compute(profile); var rects = plan.blocks.map(function (x) { return blockRect(x, plan) })
  settingsLayout.leafRects(plan).forEach(function (row) {
    rects.push({ id: row.id, left: row.left, top: row.top, width: row.width, height: row.height, circleSafe: true })
    row.children.forEach(function (c) { rects.push({ id: row.id + '/' + c.id, left: c.left, top: c.top, width: c.width, height: c.height, circleSafe: true }) })
  })
  return screen('pages/settings', profile, plan, rects)
}
function stats(profile) {
  var plan = layout.computeListLayout(profile); var rects = plan.blocks.map(function (x) { return blockRect(x, plan) })
  var summaryHeight = Math.max(plan.rowHeight, Math.round(plan.scale * 34))
  rects.push({ id: 'summary', left: plan.listLeft, top: plan.listTop, width: plan.listWidth, height: summaryHeight, circleSafe: true })
  return screen('pages/stats', profile, plan, rects)
}
function screens() { var out = []; profiles.forEach(function (p) { out.push(focus(p)); out.push(settings(p)); out.push(stats(p)) }); return out }
module.exports = { profiles: profiles, screens: screens }
