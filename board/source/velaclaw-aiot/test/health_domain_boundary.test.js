const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

const channel = read('src/capabilities/internal/health_channel.js')
const heart = read('src/capabilities/heart_rate.js')
const spo2 = read('src/capabilities/blood_oxygen.js')
const stress = read('src/capabilities/stress.js')
const domain = read('src/domain/health/store.js')
const legacy = read('src/common/health_domain.js')
const today = read('src/pages/today/today.ux')
const healthPage = read('src/pages/heartrate/heartrate.ux')

expect(channel.includes("from '@service.health'"), 'raw health API must live in the capability channel')
expect(heart.includes("dataTypeName: 'HEART_RATE'"), 'heart-rate capability must own only HEART_RATE')
expect(spo2.includes("dataTypeName: 'SPO2'"), 'blood-oxygen capability must own only SPO2')
expect(stress.includes("dataTypeName: 'STRESS'"), 'stress capability must own only STRESS')
expect(channel.includes('if (listeners.length === 1) startNative()'), 'health capability must lazily start for first consumer')
expect(channel.includes('if (listeners.length === 0) stopNative()'), 'health capability must stop after last consumer')
expect(channel.includes('stopFallback()'), 'live samples must be able to stop fallback work')

expect(domain.includes("../../capabilities/heart_rate"), 'health domain must consume heart-rate capability')
expect(domain.includes("../../capabilities/blood_oxygen"), 'health domain must consume blood-oxygen capability')
expect(domain.includes("../../capabilities/stress"), 'health domain must consume stress capability')
expect(!domain.includes('platform/vela'), 'health domain must not depend on legacy platform adapters')
expect(!domain.includes('watch_data'), 'health domain must not depend on watch_data compatibility layer')
expect(domain.includes("var source = metrics && metrics.length ? metrics : ['heartRate']"), 'default health subscription must activate heart rate only')
expect(domain.includes('subscribeAll'), 'health domain must support explicit all-metric consumers')
expect(domain.includes('heartRateChanged'), 'health domain must expose heart-rate dirty state')
expect(domain.includes('spo2Changed'), 'health domain must expose SpO2 dirty state')
expect(domain.includes('stressChanged'), 'health domain must expose stress dirty state')

;['circle', 'pill', 'rect', 'screenWidth', 'viewport', 'px'].forEach(function (token) {
  expect(!domain.includes(token), 'health domain must stay presentation-agnostic: found ' + token)
})

expect(legacy.includes("../domain/health/store"), 'legacy health entry must delegate to domain health')
expect(legacy.includes('healthStore.subscribeAll(wrapped)'), 'dedicated health page bridge must explicitly request all metrics')

expect(today.includes("import healthStore from '../../domain/health/store'"), 'today must consume health store directly')
expect(today.includes('healthStore.subscribe(this.healthListener)'), 'today default subscription should request heart rate only')
expect(today.includes('healthStore.unsubscribe(this.healthListener)'), 'today must release its health subscription')
expect(!today.includes("../../common/health_domain"), 'today must not regress to legacy health bridge')
expect(!today.includes('watch_data'), 'today must not depend on watch_data')

expect(healthPage.includes("import healthDomain from '../../common/health_domain'"), 'health page remains on compatibility entry until its page-thinning pass')
expect(!healthPage.includes("import healthSampleService from '../../common/health_sample_service'"), 'health page must not import low-level health directly')

expect(!today.includes('lastHeartRateUpdatedAt'), 'today page must not own dirty tracking')
expect(!healthPage.includes('lastHeartRateUpdatedAt'), 'health page must not own heart-rate dirty tracking')
expect(!healthPage.includes('lastSpo2UpdatedAt'), 'health page must not own SpO2 dirty tracking')
expect(!healthPage.includes('lastStressUpdatedAt'), 'health page must not own stress dirty tracking')

console.log('Health capability boundary verified: metrics are independent, lazy and domain-owned')
