var h = require('./harness')
var stats = require('../src/domain/stats_model')

h.test('records completions per day and keeps a total', function () {
  var store = stats.emptyStore()
  store = stats.recordCompletion(store, '2026-09-13')
  store = stats.recordCompletion(store, '2026-09-13')
  store = stats.recordCompletion(store, '2026-09-12')
  h.equal(stats.countFor(store, '2026-09-13'), 2)
  h.equal(stats.countFor(store, '2026-09-12'), 1)
  h.equal(stats.normalize(store).total, 3)
})

h.test('recording does not mutate the previous store', function () {
  var first = stats.recordCompletion(stats.emptyStore(), '2026-09-13')
  var second = stats.recordCompletion(first, '2026-09-13')
  h.equal(stats.countFor(first, '2026-09-13'), 1)
  h.equal(stats.countFor(second, '2026-09-13'), 2)
})

h.test('corrupt or hostile data is normalised away', function () {
  var decoded = stats.decode('not json')
  h.equal(decoded.ok, false)
  h.equal(decoded.store.total, 0)
  var normalised = stats.normalize({ days: { bad: -2, alsobad: 'x', good: 3 }, total: 99 })
  h.equal(normalised.total, 3, 'total is recomputed from the days')
  h.equal(stats.countFor(normalised, 'good'), 3)
})

h.test('recent days project the requested window in order', function () {
  var store = stats.recordCompletion(stats.emptyStore(), '2026-09-13')
  var list = stats.recentDays(store, ['2026-09-13', '2026-09-12'])
  h.equal(list.length, 2)
  h.equal(list[0].label, '09-13')
  h.equal(list[0].count, 1)
  h.equal(list[1].count, 0)
})

h.test('encode/decode round trip', function () {
  var store = stats.recordCompletion(stats.emptyStore(), '2026-09-13')
  var round = stats.decode(stats.encode(store))
  h.equal(round.ok, true)
  h.equal(round.store.total, 1)
})

h.report('stats_model')
