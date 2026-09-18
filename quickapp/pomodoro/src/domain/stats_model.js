// Pure completion statistics. Keys are local calendar dates (YYYY-MM-DD).

function emptyStore() {
  return { days: {}, total: 0 }
}

function normalize(raw) {
  var source = raw && typeof raw === 'object' ? raw : {}
  var days = {}
  var total = 0
  var incoming = source.days && typeof source.days === 'object' ? source.days : {}
  var keys = Object.keys(incoming)
  for (var index = 0; index < keys.length; index++) {
    var key = keys[index]
    var value = Math.round(Number(incoming[key]))
    if (!isFinite(value) || value <= 0) continue
    days[key] = value
    total += value
  }
  return { days: days, total: total }
}

function decode(text) {
  if (typeof text !== 'string' || text === '') return { store: emptyStore(), ok: true }
  try {
    return { store: normalize(JSON.parse(text)), ok: true }
  } catch (error) {
    return { store: emptyStore(), ok: false }
  }
}

function encode(store) {
  var normalized = normalize(store)
  return JSON.stringify({ days: normalized.days, total: normalized.total })
}

function recordCompletion(store, dateKey) {
  var normalized = normalize(store)
  if (typeof dateKey !== 'string' || dateKey === '') return normalized
  var days = {}
  var keys = Object.keys(normalized.days)
  for (var index = 0; index < keys.length; index++) {
    days[keys[index]] = normalized.days[keys[index]]
  }
  days[dateKey] = (days[dateKey] || 0) + 1
  return { days: days, total: normalized.total + 1 }
}

function countFor(store, dateKey) {
  var normalized = normalize(store)
  return normalized.days[dateKey] || 0
}

// recentDays takes the ordered list of date keys to display (newest first) and
// returns label/count pairs, so the view never has to know about storage.
function recentDays(store, dateKeys) {
  var normalized = normalize(store)
  var list = []
  var keys = dateKeys || []
  for (var index = 0; index < keys.length; index++) {
    list.push({
      date: keys[index],
      label: keys[index].slice(5),
      count: normalized.days[keys[index]] || 0
    })
  }
  return list
}

module.exports = {
  emptyStore: emptyStore,
  normalize: normalize,
  decode: decode,
  encode: encode,
  recordCompletion: recordCompletion,
  countFor: countFor,
  recentDays: recentDays
}
