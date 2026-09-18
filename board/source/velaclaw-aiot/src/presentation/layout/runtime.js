import screenProfile from '../viewport/profile'
var viewportRuntime = require('../viewport/runtime')
var adapter = require('./adapter')

function regionStyle(region) {
  if (!region) return ''
  return 'position: absolute; left: ' + region.left + 'px; top: ' + region.top + 'px; width: ' + region.width + 'px; height: ' + region.height + 'px;'
}

function apply(page, plan) {
  if (!page || !plan) return
  page.layoutPlan = plan
  page.layoutScale = plan.scale
  page.layoutNeedsOverride = plan.needsOverride
  page.layoutComposition = plan.composition
  page.designFreedomLevel = plan.freedomLevel
  page.designStrategy = plan.strategy
  page.layoutRegions = adapter.regionMap(plan)
}

function resolvePlan(profile, specOrResolver) {
  if (typeof specOrResolver === 'function') return specOrResolver(profile)
  if (specOrResolver && typeof specOrResolver.resolve === 'function') return specOrResolver.resolve(profile)
  return adapter.resolve(profile, specOrResolver)
}

function bind(page, specOrResolver, callback) {
  screenProfile.resolve(page, function (profile) {
    // Layout plans are expressed in full design coordinates. Do not apply the
    // legacy beta-pill top offset here or rendered coordinates diverge from the
    // safe geometry used by the planner.
    viewportRuntime.applyDesign(page, profile)
    var plan = resolvePlan(profile, specOrResolver)
    apply(page, plan)
    if (typeof callback === 'function') callback(plan, profile)
  })
}

module.exports = {
  bind: bind,
  apply: apply,
  resolvePlan: resolvePlan,
  regionStyle: regionStyle
}
