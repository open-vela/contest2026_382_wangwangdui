function normalize(value, cycle) {
  var result = Number(value) % cycle
  return result < 0 ? result + cycle : result
}

function roundOne(value) { return Math.round(value * 10) / 10 }

function angles(hours, minutes, seconds) {
  var h = normalize(hours, 12)
  var m = normalize(minutes, 60)
  var s = normalize(seconds, 60)
  return {
    hour: roundOne(h * 30 + m * 0.5 + s / 120),
    minute: roundOne(m * 6 + s * 0.1),
    second: roundOne(s * 6)
  }
}

function transform(value) { return JSON.stringify({ rotate: roundOne(value) + 'deg' }) }

function buildTicks() {
  var result = []
  for (var i = 0; i < 60; i++) {
    result.push({ index: i, className: i % 5 === 0 ? 'mechanical-major-tick' : 'mechanical-minute-tick', transform: transform(i * 6) })
  }
  return result
}

var STATIC_TICKS = buildTicks()

function ticks() { return STATIC_TICKS }

module.exports = { angles: angles, transform: transform, ticks: ticks }
