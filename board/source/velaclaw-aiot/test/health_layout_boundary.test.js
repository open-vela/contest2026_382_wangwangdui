const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const health = fs.readFileSync(path.join(root, 'src/pages/heartrate/heartrate.ux'), 'utf8')

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

function hasCssRule(source, selector, property, value) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rule = new RegExp(escapedSelector + '\\s*\\{[^}]*' + escapedProperty + '\\s*:\\s*' + escapedValue + '\\s*;?[^}]*\\}', 'm')
  return rule.test(source)
}

expect(health.includes("makeMetricBars(this.heartTrendValues || [], 8, '#7A2436', '#FF375F', 29)"), 'heart trend should keep the 29px scale until heartrate is rewritten')
expect(health.includes("makeMetricBars(this.spo2TrendValues || [], 4, '#245566', '#5AC8FA', 24)"), 'SpO2 compact trend must cap bars at 24px')
expect(health.includes("makeMetricBars(this.stressTrendValues || [], 10, '#542966', '#BF5AF2', 24)"), 'stress compact trend must cap bars at 24px')
expect(hasCssRule(health, '.compact-trend', 'height', '24px'), 'compact trend container must stay 24px high')

console.log('Legacy health visual boundary verified until V2 heartrate replacement')
