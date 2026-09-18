var adapter = require('./adapter')
var composition = require('./composition')

function resolve(profile, spec) {
  var selected = composition.select(spec, profile)
  var plan = adapter.resolve(profile, spec)
  var itemIds = selected.itemIds || selected.appIds || []
  plan.surface = selected.surface || 'free'
  plan.itemIds = itemIds.slice()
  plan.appIds = selected.appIds ? selected.appIds.slice() : []
  plan.pageSize = Number(selected.pageSize) || 0
  plan.columns = Number(selected.columns) || 0
  plan.tokens = selected.tokens || {}
  return plan
}

module.exports = {
  resolve: resolve
}
