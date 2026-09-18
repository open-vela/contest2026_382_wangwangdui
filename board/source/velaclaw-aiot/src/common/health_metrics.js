var domain = require('../domain/health/metrics')
var chart = require('../presentation/mappers/health_chart')
var text = require('../presentation/mappers/health_text')

module.exports = {
  classifyHeartRate: domain.classifyHeartRate,
  classifyStress: domain.classifyStress,
  pushWindow: domain.pushWindow,
  stats: domain.stats,
  adaptiveRange: chart.adaptiveRange,
  barHeights: chart.barHeights,
  sampleBarHeight: chart.sampleBarHeight,
  formatValue: text.formatValue,
  codeMessage: text.codeMessage
}
