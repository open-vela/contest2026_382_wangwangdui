var IDS = {
  circle: ['sport', 'simple', 'dashboard', 'mechanical'],
  pill: ['sport', 'simple', 'dashboard', 'alpine'],
  rect: ['sport', 'simple', 'dashboard']
}

function idsFor(scope) {
  var source = IDS[scope] || IDS.rect
  return source.slice()
}

module.exports = {
  idsFor: idsFor
}
