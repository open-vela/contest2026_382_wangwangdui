var LEVEL_AUTO = 1
var LEVEL_ASSISTED = 2
var LEVEL_FREE = 3

function describe(level) {
  if (level === LEVEL_FREE) return { level: 3, id: 'free', adapter: 'independent-surface' }
  if (level === LEVEL_ASSISTED) return { level: 2, id: 'assisted', adapter: 'local-expression' }
  return { level: 1, id: 'auto', adapter: 'adaptive-geometry' }
}

module.exports = {
  AUTO: LEVEL_AUTO,
  ASSISTED: LEVEL_ASSISTED,
  FREE: LEVEL_FREE,
  describe: describe
}
