var disabled = {
  '@system.battery': true,
  '@system.event': true,
  '@system.geolocation': true,
  '@system.interconnect': true,
  '@system.sensor': true,
  '@system.storage': true,
  '@system.vibrator': true,
  '@service.health': true
}

var allowed = {
  '@system.brightness': true
}

var cache = {}

export default function getNativeFeature(name) {
  if (disabled[name]) return null
  if (!allowed[name]) return null
  if (cache[name] !== undefined) return cache[name] || null
  cache[name] = false
  try {
    var runtimeRequire = Function('return typeof require === "function" ? require : null')()
    var moduleName = name && name.charAt(0) === '@' ? name.slice(1) : name
    if (runtimeRequire && moduleName) cache[name] = runtimeRequire(moduleName) || false
  } catch (error) {
    cache[name] = false
  }
  return cache[name] || null
}
