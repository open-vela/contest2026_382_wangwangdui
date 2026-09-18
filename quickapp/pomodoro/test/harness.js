// Minimal assertion harness shared by the pomodoro logic tests.

var passed = 0
var failed = 0

function test(name, callback) {
  try {
    callback()
    passed++
    console.log('  PASS ' + name)
  } catch (error) {
    failed++
    console.log('  FAIL ' + name + ' :: ' + error.message)
  }
}

function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error((message || 'value') + ': expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual))
  }
}

function ok(value, message) {
  if (!value) throw new Error(message || 'expected truthy value')
}

function report(suite) {
  console.log(suite + ': ' + passed + ' passed, ' + failed + ' failed')
  if (failed > 0) process.exit(1)
}

module.exports = { test: test, equal: equal, ok: ok, report: report }
