const assert = require('assert')
const fs = require('fs')
const path = require('path')
const scene = require('../src/v2/design/scene')
const history = require('../src/v2/design/apps/history')
const faces = require('../src/v2/design/apps/faces')
const today = require('../src/v2/design/apps/today')
const launcher = require('../src/v2/design/apps/launcher')
const clockDesign = require('../src/v2/design/apps/clock')
const honeycomb = require('../src/v2/design/engines/honeycomb')

const root = path.join(__dirname, '..')
function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}
function resolved(app, profile) {
  const host = scene.resolve(profile)
  const safe = scene.safeForWidth(profile, app.contentWidth(profile))
  return { safe, plan: app.resolve(profile, host, safe) }
}

const circle = { formFactor: 'circle', logicalHeight: 192, screenWidth: 466, screenHeight: 466 }
const rect = { formFactor: 'rect', logicalHeight: 228, screenWidth: 432, screenHeight: 514 }
const pill = { formFactor: 'pill', logicalHeight: 471, screenWidth: 212, screenHeight: 520 }

const circleHistory = resolved(history, circle).plan
const rectHistory = resolved(history, rect).plan
const pillHistory = resolved(history, pill).plan
assert.ok(circleHistory.insightHeight >= 38, 'Circle History insight cards must preserve three readable text lines')
assert.ok(rectHistory.insightHeight >= 41, 'Rect History insight cards must preserve three readable text lines')
assert.ok(pillHistory.insightHeight >= 42, 'Pill History insight cards must preserve three readable text lines')
assert.ok(pillHistory.cardRadius <= 17, 'Pill History cards must not regress to oversized 20px corners')

const simpleCircle = read('src/components/watchfaces/simple_circle.ux')
const sportCircle = read('src/components/watchfaces/sport_circle.ux')
const dashboardCircle = read('src/components/watchfaces/dashboard_circle.ux')
const sportPill = read('src/components/watchfaces/sport.ux')
const simplePill = read('src/components/watchfaces/simple.ux')
const dashboardPill = read('src/components/watchfaces/dashboard.ux')

assert.ok(simpleCircle.includes('.simple-circle-footer { width: 136px;'), 'Circle Simple footer must reserve the historical 136px metric band')
assert.ok(simpleCircle.includes('.simple-circle-metric { width: 44px;'), 'Circle Simple metrics must keep 44px text width')
assert.ok(sportCircle.includes('.circle-metric-row { width: 136px;'), 'Circle Sport metric band must not collapse back to 108px')
assert.ok(sportCircle.includes('.circle-metric { width: 44px;'), 'Circle Sport metrics must keep 44px text width')
assert.ok(dashboardCircle.includes('border-radius: 12px;'), 'Circle Dashboard cards must keep the reduced corner radius')
assert.ok(dashboardCircle.includes('.dashboard-circle-step { font-size: 12px;'), 'Circle Dashboard long step values need their compact type size')
assert.ok(sportPill.includes('.step-current { width: 118px; font-size: 15px;'), 'Pill Sport long step values must stay compact')
assert.ok(simplePill.includes('.simple-step-value { font-size: 13px;'), 'Pill Simple long step values must stay compact')
assert.ok(dashboardPill.includes('.dash-step-value { width: 86px; font-size: 16px;'), 'Pill Dashboard long step values must stay compact')

const circleFaces = resolved(faces, circle)
assert.strictEqual(faces.layout.circle.header.top, 10, 'Circle watchface selector recipe must keep the historical 10px safe-area offset')
assert.strictEqual(circleFaces.plan.header.top - circleFaces.safe.top, 10, 'Circle watchface selector header must stay 10px below the safe-area cap')

const todayPage = read('src/pages/today/today.ux')
const clockPage = read('src/pages/clock/clock.ux')
const sportRect = read('src/components/watchfaces/sport_rect.ux')
const simpleRect = read('src/components/watchfaces/simple_rect.ux')
const dashboardRect = read('src/components/watchfaces/dashboard_rect.ux')
const mechanicalRect = read('src/components/watchfaces/mechanical_rect.ux')
assert.strictEqual(today.layout.rect.surface, today.layout.circle.surface, 'Rect Today must share Circle summary/calendar page flow')
assert.ok(todayPage.includes('isRect && pageIndex === 0') && todayPage.includes('isRect && pageIndex === 1'), 'Rect Today must keep summary and calendar as separate pages owned by pageIndex')
assert.ok(todayPage.includes('rect-summary-grid') && todayPage.includes('openCalendar') && todayPage.includes('closeCalendar'), 'Rect Today must expose readable 2x2 summary cards and reuse shared calendar actions')
assert.ok(todayPage.includes('.rect-surface { position: absolute; width: 164px; height: 228px;'), 'Rect Today summary must fill the square canvas')
assert.ok(todayPage.includes('.rect-calendar-grid { height: 144px;'), 'Rect calendar must use the full square-screen height')
assert.ok(sportRect.includes('height: 228px;') && simpleRect.includes('height: 228px;') && dashboardRect.includes('height: 228px;'), 'Rect digital watchfaces must explicitly fill the 228px square canvas')
assert.ok(!clockPage.includes('<mechanicalrect') || !clockPage.slice(clockPage.indexOf('<mechanicalrect'), clockPage.indexOf('</mechanicalrect>')).includes('analog-ticks'), 'Rect Clock must not feed Circle tick geometry into the square analog face')
assert.strictEqual(launcher.layout.rect.surface, 'honeycomb', 'Rect launcher must reuse the Circle honeycomb surface')
assert.ok(clockDesign.layout.rect.faceIds.includes('mechanical'), 'Rect Clock must expose the mechanical face')
assert.ok(faces.layout.rect.faceIds.includes('mechanical'), 'Rect watchface selector must expose the mechanical face')
assert.ok(clockPage.includes('mechanical_rect.ux') && clockPage.includes('<mechanicalrect'), 'Rect Clock must mount the Rect mechanical component')
assert.ok(!mechanicalRect.includes('analogTicks') && mechanicalRect.includes('rect-chapter') && mechanicalRect.includes('hourHandTransform') && mechanicalRect.includes('minuteHandTransform'), 'Rect mechanical face must use square-native geometry while reusing only hand angles')
assert.ok(sportRect.includes('border-radius: 10px;') && simpleRect.includes('border-radius: 10px;') && dashboardRect.includes('border-radius: 10px;'), 'Rect digital faces must keep compact card corners')
assert.ok(honeycomb.DRAG_CAPTURE_DISTANCE <= 4, 'Honeycomb drag capture must stay responsive without stealing taps')

console.log('Text-fit regressions verified: readable History cards, compact corners and long-value-safe watchfaces')
