function availableFaces(faces, scope) {
  if (!scope) return faces.slice()
  return faces.filter(function (face) {
    if (scope === 'circle') return !face.pillOnly
    if (scope === 'pill') return !face.circleOnly
    return !face.circleOnly && !face.pillOnly
  })
}

module.exports = {
  availableFaces: availableFaces
}
