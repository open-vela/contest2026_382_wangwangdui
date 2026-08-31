function normalize(value, cycle) {
  var result = Number(value) % cycle
  return result < 0 ? result + cycle : result
}

function roundOne(value) {
  return Math.round(value * 10) / 10
}

function handAngles(hours, minutes, seconds) {
  var safeHours = normalize(hours, 12)
  var safeMinutes = normalize(minutes, 60)
  var safeSeconds = normalize(seconds, 60)
  return {
    hour: roundOne(safeHours * 30 + safeMinutes * 0.5 + safeSeconds / 120),
    minute: roundOne(safeMinutes * 6 + safeSeconds * 0.1),
    second: roundOne(safeSeconds * 6)
  }
}

function rotationTransform(degrees) {
  return JSON.stringify({ rotate: roundOne(degrees) + 'deg' })
}

function makeTickMarks() {
  var marks = []
  for (var index = 0; index < 60; index++) {
    var major = index % 5 === 0
    marks.push({
      index: index,
      className: major ? 'mechanical-major-tick' : 'mechanical-minute-tick',
      transform: rotationTransform(index * 6)
    })
  }
  return marks
}

module.exports = {
  handAngles: handAngles,
  rotationTransform: rotationTransform,
  makeTickMarks: makeTickMarks
}
