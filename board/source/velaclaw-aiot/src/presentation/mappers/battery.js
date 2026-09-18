function clamp(value) {
  var percent = Math.round(Number(value) || 0)
  if (percent < 0) return 0
  if (percent > 100) return 100
  return percent
}

function map(value) {
  var percent = clamp(value)
  var color = '#30D158'
  if (percent < 20) color = '#FF375F'
  else if (percent < 60) color = '#FFD60A'
  return {
    percent: percent,
    width: percent + '%',
    color: color
  }
}

module.exports = {
  map: map
}
