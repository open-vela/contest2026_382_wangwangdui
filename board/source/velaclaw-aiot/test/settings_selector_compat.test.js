const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const brightness = fs.readFileSync(path.join(root, 'src/pages/settings/brightness/brightness.ux'), 'utf8')
const vibration = fs.readFileSync(path.join(root, 'src/pages/settings/vibration/vibration.ux'), 'utf8')

assert.ok(!brightness.includes('.scale text'), 'Brightness must not use the Vela-unsupported descendant selector .scale text')
assert.ok(brightness.includes('class="scale-label"'), 'Brightness scale labels need an explicit supported class')
assert.ok(brightness.includes('.scale-label { color: #636366; font-size: 7px; }'))

assert.ok(!vibration.includes('.pattern-card .sub'), 'Vibration must not use the Vela-unsupported descendant selector .pattern-card .sub')
assert.ok(vibration.includes('class="sub pattern-sub"'), 'Vibration pattern descriptions need an explicit supported class')
assert.ok(vibration.includes('.pattern-sub { flex: 1; }'))

console.log('Settings selector compatibility verified: Vela-unsupported descendant selectors are removed')
