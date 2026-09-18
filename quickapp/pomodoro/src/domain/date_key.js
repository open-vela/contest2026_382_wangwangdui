// Pure date helpers. Kept separate from the view so the stats page never
// formats dates inline and the logic stays testable.

function pad(value) {
  return value < 10 ? '0' + value : String(value)
}

function keyOf(date) {
  var target = date instanceof Date ? date : new Date()
  return target.getFullYear() + '-' + pad(target.getMonth() + 1) + '-' + pad(target.getDate())
}

function shiftDays(date, days) {
  var target = date instanceof Date ? new Date(date.getTime()) : new Date()
  target.setDate(target.getDate() + (isFinite(Number(days)) ? Number(days) : 0))
  return target
}

function recentKeys(count, fromDate) {
  var total = isFinite(Number(count)) && Number(count) > 0 ? Math.round(Number(count)) : 7
  var base = fromDate instanceof Date ? fromDate : new Date()
  var keys = []
  for (var index = 0; index < total; index++) {
    keys.push(keyOf(shiftDays(base, -index)))
  }
  return keys
}

module.exports = {
  keyOf: keyOf,
  shiftDays: shiftDays,
  recentKeys: recentKeys,
  pad: pad
}
