var h = require('./harness')
var settings = require('../src/domain/settings_model')

h.test('defaults are applied to empty input', function () {
  var value = settings.normalize(null)
  h.equal(value.focusMinutes, 25)
  h.equal(value.breakMinutes, 5)
  h.equal(value.autoStart, false)
})

h.test('out of range values are clamped instead of trusted', function () {
  h.equal(settings.normalize({ focusMinutes: 999 }).focusMinutes, 180)
  h.equal(settings.normalize({ focusMinutes: -5 }).focusMinutes, 1)
  h.equal(settings.normalize({ breakMinutes: 0 }).breakMinutes, 1)
  h.equal(settings.normalize({ autoStart: 'yes' }).autoStart, false)
})

h.test('encode/decode round trips and survives corrupt data', function () {
  var encoded = settings.encode({ focusMinutes: 45, breakMinutes: 10, autoStart: true })
  var decoded = settings.decode(encoded)
  h.equal(decoded.ok, true)
  h.equal(decoded.settings.focusMinutes, 45)
  h.equal(decoded.settings.autoStart, true)
  var broken = settings.decode('{not json')
  h.equal(broken.ok, false)
  h.equal(broken.settings.focusMinutes, 25, 'corrupt data must not lose the defaults')
})

h.test('preset cycling wraps in both directions', function () {
  h.equal(settings.cycleFocus(25, 1), 45)
  h.equal(settings.cycleFocus(45, 1), 15)
  h.equal(settings.cycleFocus(15, -1), 45)
  h.equal(settings.cycleBreak(10, -1), 5)
  h.equal(settings.cycleBreak(7, 1), 10, 'unknown presets start from the first entry')
})

h.test('auto start toggles without touching durations', function () {
  var toggled = settings.toggleAutoStart({ focusMinutes: 45, breakMinutes: 10, autoStart: false })
  h.equal(toggled.autoStart, true)
  h.equal(toggled.focusMinutes, 45)
})

h.report('settings_model')
