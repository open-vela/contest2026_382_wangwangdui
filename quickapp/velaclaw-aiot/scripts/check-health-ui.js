const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'manifest.json'), 'utf8'))
const pageSource = fs.readFileSync(path.join(root, 'src', 'pages', 'heartrate', 'heartrate.ux'), 'utf8')
const todaySource = fs.readFileSync(path.join(root, 'src', 'pages', 'today', 'today.ux'), 'utf8')
const serviceSource = fs.readFileSync(path.join(root, 'src', 'common', 'health_sample_service.js'), 'utf8')
const clockSource = fs.readFileSync(path.join(root, 'src', 'pages', 'clock', 'clock.ux'), 'utf8')
const watchDataSource = fs.readFileSync(path.join(root, 'src', 'common', 'watch_data.js'), 'utf8')
const metricsSource = fs.readFileSync(path.join(root, 'src', 'common', 'health_metrics.js'), 'utf8')
const metricsTestSource = fs.readFileSync(path.join(root, 'test', 'health_metrics.test.js'), 'utf8')
const errors = []

function requireCondition(condition, message) {
  if (!condition) errors.push(message)
}

const featureNames = new Set((manifest.features || []).map(function (feature) {
  return feature.name
}))
const permissionNames = new Set((manifest.permissions || []).map(function (permission) {
  return permission.name
}))

requireCondition(featureNames.has('service.health'), 'manifest must declare service.health')
requireCondition(permissionNames.has('hapjs.permission.HEALTH'), 'manifest must request hapjs.permission.HEALTH')

;['HEART_RATE', 'SPO2', 'STRESS'].forEach(function (dataType) {
  requireCondition(serviceSource.includes('health.DATA_TYPES.' + dataType), 'health service must resolve ' + dataType)
})

requireCondition(serviceSource.includes('health.getRecentSamples'), 'health service must load recent samples')
requireCondition(serviceSource.includes('health.subscribeSample'), 'health service must subscribe while the page is visible')
requireCondition(serviceSource.includes('health.unsubscribeSample'), 'health service must unsubscribe after leaving the page')
requireCondition(serviceSource.includes('updateFallbackValues'), 'health service must provide per-metric demo fallback')
requireCondition(serviceSource.includes('heartRateUpdatedAt'), 'health service must identify new heart-rate samples')
requireCondition(serviceSource.includes('heartRateErrorCode'), 'health service must expose per-metric error codes')
requireCondition(!manifest.config.background, 'health sampling must remain foreground-only')

;['心率', '血氧', '压力'].forEach(function (label) {
  requireCondition(pageSource.includes(label), 'health card is missing: ' + label)
})

requireCondition(pageSource.includes('healthSampleService.start(this.healthListener)'), 'health page must start sampling on show')
requireCondition(pageSource.includes('healthSampleService.stop(this.healthListener)'), 'health page must stop sampling on hide/destroy')
requireCondition(pageSource.includes('scroll-y="true"'), 'health cards must remain vertically scrollable on pill screens')
requireCondition(pageSource.includes('{{ viewportClass }}'), 'health page must use the shared multi-screen viewport')
// 视口写回已收敛到 common/page_viewport；页面走共享助手或历史的逐字段赋值均可。
requireCondition(
  pageSource.includes('pageViewport.bind(') || pageSource.includes('self.viewportWidth = profile.viewportWidth'),
  'health page must apply the resolved viewport width'
)
requireCondition(pageSource.includes('healthMetrics.barHeights'), 'health trends must use adaptive bar heights')
requireCondition(pageSource.includes('spo2Trend'), 'SpO2 card must include a sample trend')
requireCondition(pageSource.includes('stressTrend'), 'stress card must include a sample trend')
requireCondition(pageSource.includes('stressAvg'), 'stress card must expose window statistics')
requireCondition(pageSource.includes('data.heartRateUpdatedAt !== this.lastHeartRateUpdatedAt'), 'health trend must not duplicate heart rate on SpO2/stress callbacks')
requireCondition(clockSource.includes('healthSampleService.start(this.watchFaceHealthListener)'), 'watch face must subscribe to the shared health service')
requireCondition(clockSource.includes('healthSampleService.stop(this.watchFaceHealthListener)'), 'watch face must release the shared health subscription')
requireCondition(clockSource.includes('watchData.applyHeartRate(data.heartRate)'), 'watch face must render the health-service heart rate')
requireCondition(todaySource.includes('healthSampleService.start(this.healthListener)'), 'today page must start live heart-rate sampling on show')
requireCondition(todaySource.includes('healthSampleService.stop(this.healthListener)'), 'today page must stop live heart-rate sampling on hide/destroy')
requireCondition(todaySource.includes('watchData.applyHeartRate(data.heartRate)'), 'today page must share the health-service heart rate')
requireCondition(!clockSource.includes('watchData.tickHeartRate()'), 'watch face must not generate a separate random heart rate')
requireCondition(watchDataSource.includes('applyHeartRate(value)'), 'watch data must accept a real health-service heart rate')
requireCondition(!watchDataSource.includes('tickHeartRate()'), 'watch data must not retain a second random heart-rate path')
requireCondition(watchDataSource.includes('healthMetrics.barHeights(values, 4, 28, 8)'), 'pill watch-face bars must use adaptive window heights')
requireCondition(watchDataSource.includes('healthMetrics.barHeights(values, 4, 18, 8)'), 'compact watch-face bars must use adaptive window heights')
requireCondition(metricsSource.includes('function pushWindow'), 'health metrics must provide a sliding window')
requireCondition(metricsSource.includes('function stats'), 'health metrics must provide window statistics')
requireCondition(metricsSource.includes('function codeMessage'), 'health metrics must normalize service errors')
requireCondition(metricsTestSource.includes('自适应柱高保持起伏'), 'health metrics tests must cover visible bar fluctuation')

if (errors.length > 0) {
  errors.forEach(function (error) {
    console.error('health UI error: ' + error)
  })
  process.exitCode = 1
} else {
  console.log('Checked health manifest, three metric cards, foreground subscriptions, fallback, and viewport adapter')
}
