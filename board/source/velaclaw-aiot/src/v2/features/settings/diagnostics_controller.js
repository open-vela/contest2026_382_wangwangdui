import capabilityIntrospection from '../../../capabilities/introspection'

function deviceSnapshot(profile) {
  var source = profile || {}
  return {
    deviceFamily: source.deviceFamily,
    model: source.model,
    screenWidth: source.screenWidth,
    screenHeight: source.screenHeight,
    formFactor: source.formFactor,
    platformVersionCode: source.platformVersionCode,
    isBetaPillViewport: !!source.isBetaPillViewport
  }
}

function hostSnapshot(scene) {
  var source = scene || {}
  return { width: Number(source.width) || 0, height: Number(source.height) || 0 }
}

function capabilitySnapshot(entry) {
  var source = entry || {}
  return { id: source.id, name: source.name, api: source.api, available: !!source.available, fallback: !!source.fallback }
}

export function createDiagnosticsController(onChange) {
  var profile = null
  var scene = null

  function snapshot() {
    var raw = capabilityIntrospection.list()
    var capabilities = []
    for (var i = 0; i < raw.length; i++) capabilities.push(capabilitySnapshot(raw[i]))
    return { device: deviceSnapshot(profile), host: hostSnapshot(scene), capabilities: capabilities }
  }

  function emit() {
    var value = snapshot()
    if (typeof onChange === 'function') onChange(value)
    return value
  }

  return {
    configureScene: function (nextProfile, nextScene) { profile = nextProfile; scene = nextScene; return emit() },
    refresh: emit
  }
}
