var catalog = require('../../workout_catalog')

function project(model) {
  var source = model || {}
  return {
    modes: catalog.list(source.modeTypes),
    hasActive: !!source.hasActive
  }
}

module.exports = { project: project }
