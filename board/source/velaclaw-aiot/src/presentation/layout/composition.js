/**
 * Composition resolver
 *
 * A composition may override ordering, region sizes, visibility and variants for a
 * specific screen shape. Arrays are replaced (not merged) because ordering itself is
 * part of the design intent.
 */
function clone(value) {
  if (value === undefined || value === null) return value
  return JSON.parse(JSON.stringify(value))
}

function merge(base, override) {
  var result = clone(base) || {}
  var source = override || {}
  for (var key in source) {
    if (Array.isArray(source[key])) {
      result[key] = clone(source[key])
    } else if (source[key] && typeof source[key] === 'object') {
      result[key] = merge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

function normalizeFreedomLevel(value) {
  var level = Math.round(Number(value) || 1)
  if (level < 1) return 1
  if (level > 3) return 3
  return level
}

function defaultStrategy(level) {
  if (level === 3) return 'free'
  if (level === 2) return 'assisted'
  return 'auto'
}

function select(spec, profile) {
  var source = spec || {}
  var shape = profile && profile.formFactor ? profile.formFactor : 'rect'
  var base = source.default ? clone(source.default) : clone(source)
  if (base && base.compositions) delete base.compositions

  var overrides = source.compositions || {}
  var override = overrides[shape]
  var selected = merge(base || {}, override || {})
  var freedomLevel = normalizeFreedomLevel(source.freedomLevel || selected.freedomLevel)
  selected.id = source.id || selected.id || 'anonymous-layout'
  selected.freedomLevel = freedomLevel
  selected.strategy = source.strategy || selected.strategy || defaultStrategy(freedomLevel)
  selected.shape = shape
  selected.composition = override ? shape : 'default'
  selected.hasOverride = !!override
  return selected
}

module.exports = {
  select: select,
  merge: merge,
  normalizeFreedomLevel: normalizeFreedomLevel
}
