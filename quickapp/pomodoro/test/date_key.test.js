var h = require('./harness')
var dateKey = require('../src/domain/date_key')

h.test('formats a local calendar day with zero padding', function () {
  h.equal(dateKey.keyOf(new Date(2026, 8, 3)), '2026-09-03')
  h.equal(dateKey.keyOf(new Date(2026, 11, 31)), '2026-12-31')
})

h.test('falls back to today for invalid input', function () {
  var today = dateKey.keyOf(new Date())
  h.equal(dateKey.keyOf(undefined), today)
  h.equal(dateKey.keyOf('nonsense'), today)
})

h.test('shifts across month and year boundaries', function () {
  h.equal(dateKey.keyOf(dateKey.shiftDays(new Date(2026, 0, 1), -1)), '2025-12-31')
  h.equal(dateKey.keyOf(dateKey.shiftDays(new Date(2026, 1, 28), 1)), '2026-03-01')
  h.equal(dateKey.pad(7), '07')
})

h.test('recent keys are ordered newest first and clipped to the window', function () {
  var keys = dateKey.recentKeys(3, new Date(2026, 8, 13))
  h.equal(keys.length, 3)
  h.equal(keys[0], '2026-09-13')
  h.equal(keys[2], '2026-09-11')
  h.equal(dateKey.recentKeys(0, new Date(2026, 8, 13)).length, 7, 'invalid window falls back to 7')
})

h.report('date_key')
