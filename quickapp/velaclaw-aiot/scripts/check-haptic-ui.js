const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const settingsSource = fs.readFileSync(path.join(root, 'src', 'common', 'device_settings.js'), 'utf8')
const managerSource = fs.readFileSync(path.join(root, 'src', 'common', 'notification_manager.js'), 'utf8')
const pageSource = fs.readFileSync(path.join(root, 'src', 'pages', 'settings', 'vibration', 'vibration.ux'), 'utf8')
const errors = []

function requireCondition(condition, message) {
  if (!condition) errors.push(message)
}

requireCondition(settingsSource.includes("vibrationPattern: 'goal'"), 'device settings must define a stable default vibration pattern')
requireCondition(settingsSource.includes('hapticPatterns.normalize'), 'stored vibration patterns must be normalized')
requireCondition(pageSource.includes("deviceSettings.update('vibrationPattern', name)"), 'vibration page must persist the selected pattern')
requireCondition(pageSource.includes('this.playPattern(this.vibrationPattern)'), 'preview must play the selected pattern')
requireCondition(!pageSource.includes("this.vibrationLevel === 'strong' ? 'alert'"), 'strength must not replace the selected pattern with alert')
requireCondition(pageSource.includes("this.vibrationPattern === 'countdown' ? '已选'"), 'vibration page must display the selected pattern')
requireCondition(managerSource.includes('settings.vibrationPattern'), 'notifications must use the persisted vibration pattern')

if (errors.length > 0) {
  errors.forEach(function (error) {
    console.error('haptic ui error: ' + error)
  })
  process.exitCode = 1
} else {
  console.log('Checked persisted vibration selection, preview mapping, notification mapping, and selected-state UI')
}
