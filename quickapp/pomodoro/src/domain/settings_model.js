// Pure settings model: defaults, validation, encode/decode, preset cycling.

var DEFAULTS = { focusMinutes: 25, breakMinutes: 5, autoStart: false }
var FOCUS_PRESETS = [15, 25, 45]
var BREAK_PRESETS = [5, 10, 15]

function clampMinutes(value, fallback, minimum, maximum) {
  var number = Number(value)
  if (!isFinite(number)) return fallback
  var rounded = Math.round(number)
  if (rounded < minimum) return minimum
  if (rounded > maximum) return maximum
  return rounded
}

function normalize(raw) {
  var source = raw && typeof raw === 'object' ? raw : {}
  return {
    focusMinutes: clampMinutes(source.focusMinutes, DEFAULTS.focusMinutes, 1, 180),
    breakMinutes: clampMinutes(source.breakMinutes, DEFAULTS.breakMinutes, 1, 60),
    autoStart: source.autoStart === true
  }
}

function decode(text) {
  if (typeof text !== 'string' || text === '') return { settings: normalize(DEFAULTS), ok: true, reason: '' }
  try {
    return { settings: normalize(JSON.parse(text)), ok: true, reason: '' }
  } catch (error) {
    return { settings: normalize(DEFAULTS), ok: false, reason: 'decode-failed' }
  }
}

function encode(settings) {
  return JSON.stringify(normalize(settings))
}

function cycle(list, current, direction) {
  var index = list.indexOf(Number(current))
  if (index < 0) index = 0
  var step = direction === -1 ? -1 : 1
  var next = (index + step + list.length) % list.length
  return list[next]
}

function cycleFocus(current, direction) {
  return cycle(FOCUS_PRESETS, current, direction)
}

function cycleBreak(current, direction) {
  return cycle(BREAK_PRESETS, current, direction)
}

function toggleAutoStart(settings) {
  var normalized = normalize(settings)
  return { focusMinutes: normalized.focusMinutes, breakMinutes: normalized.breakMinutes, autoStart: !normalized.autoStart }
}

module.exports = {
  DEFAULTS: DEFAULTS,
  FOCUS_PRESETS: FOCUS_PRESETS,
  BREAK_PRESETS: BREAK_PRESETS,
  normalize: normalize,
  decode: decode,
  encode: encode,
  cycleFocus: cycleFocus,
  cycleBreak: cycleBreak,
  toggleAutoStart: toggleAutoStart
}
