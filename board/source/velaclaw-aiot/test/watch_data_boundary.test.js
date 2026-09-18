const fs = require('fs')
const path = require('path')
const assert = require('assert')

const root = path.resolve(__dirname, '..')
const watchData = fs.readFileSync(path.join(root, 'src', 'common', 'watch_data.js'), 'utf8')
const recent = fs.readFileSync(path.join(root, 'src', 'domain', 'health', 'recent.js'), 'utf8')
const tallFace = fs.readFileSync(path.join(root, 'src', 'components', 'watchfaces', 'dashboard.ux'), 'utf8')
const compactFace = fs.readFileSync(path.join(root, 'src', 'components', 'watchfaces', 'dashboard_circle.ux'), 'utf8')

assert.ok(!watchData.includes('circleBarHeight'), 'watch_data must not expose circle-specific geometry')
assert.ok(!watchData.includes('barHeight:'), 'watch_data must not expose pixel bar heights')
assert.ok(!watchData.includes('var state ='), 'watch_data must not own application state anymore')
assert.ok(watchData.includes("../domain/activity/store"), 'watch_data must delegate activity state')
assert.ok(watchData.includes("../domain/health/recent"), 'watch_data must delegate recent health state')
assert.ok(watchData.includes("../domain/history/repository"), 'watch_data must delegate history persistence')
assert.ok(watchData.includes("../domain/watchface/store"), 'watch_data must delegate watchface state')
assert.ok(recent.includes('recentHeartRates = [65, 82, 71, 95, 78, 88]'), 'recent health domain must preserve golden-reference samples')

assert.ok(tallFace.includes('sampleBarHeight(this.heartRateData, index, 4, 28, 8)'), 'tall dashboard must own its 28px chart geometry')
assert.ok(compactFace.includes('sampleBarHeight(this.heartRateData, index, 4, 18, 8)'), 'compact dashboard must own its 18px chart geometry')

console.log('watch_data boundary verified: compatibility only; state belongs to domains')
