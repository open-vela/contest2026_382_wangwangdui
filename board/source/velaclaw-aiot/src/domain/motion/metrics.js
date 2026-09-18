function number(value) { var result = Number(value); return isFinite(result) ? result : 0 }
function magnitude(sample) { var x = number(sample && sample.x), y = number(sample && sample.y), z = number(sample && sample.z); return Math.sqrt(x * x + y * y + z * z) }
function vectorDelta(current, previous) { if (!previous) return 0; var dx = number(current && current.x) - number(previous.x), dy = number(current && current.y) - number(previous.y), dz = number(current && current.z) - number(previous.z); return Math.sqrt(dx * dx + dy * dy + dz * dz) }
function classify(score) { if (score < 1.5) return 'stable'; if (score < 4) return 'light'; if (score < 8) return 'medium'; return 'strong' }
function createState(baseline) { return { x: 0, y: 0, z: 0, magnitude: 0, baseline: number(baseline), calibrationSamples: baseline ? 12 : 0, delta: 0, score: 0, peak: 0, sampleCount: 0, intensityKey: classify(0), previous: null } }
function applySample(state, sample) {
  var previousState = state || createState()
  var current = { x: number(sample && sample.x), y: number(sample && sample.y), z: number(sample && sample.z) }
  var currentMagnitude = magnitude(current)
  var calibrationSamples = previousState.calibrationSamples || 0
  var baseline = number(previousState.baseline)
  if (calibrationSamples < 12) { baseline = (baseline * calibrationSamples + currentMagnitude) / (calibrationSamples + 1); calibrationSamples++ }
  var delta = vectorDelta(current, previousState.previous)
  var gravityOffset = Math.abs(currentMagnitude - baseline)
  var score = Math.max(delta, gravityOffset)
  return { x: current.x, y: current.y, z: current.z, magnitude: currentMagnitude, baseline: baseline, calibrationSamples: calibrationSamples, delta: delta, score: score, peak: Math.max(number(previousState.peak), score), sampleCount: (previousState.sampleCount || 0) + 1, intensityKey: classify(score), previous: current }
}
module.exports = { magnitude: magnitude, vectorDelta: vectorDelta, classify: classify, createState: createState, applySample: applySample }
