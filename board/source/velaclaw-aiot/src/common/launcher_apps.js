var appCatalog = require('../domain/apps/catalog')

// Temporary surface presets retained for the current launcher page. These move
// into the L3 applist composition spec when the three visual surfaces land.
var PILL_APP_IDS = ['heart', 'steps', 'workout', 'history', 'today', 'settings', 'notification']
var CIRCLE_APP_IDS = ['heart', 'steps', 'workout', 'history', 'today', 'faces', 'sync', 'brightness', 'vibration', 'settings', 'clock']

export default {
  createPillApps: function () {
    return appCatalog.list(PILL_APP_IDS)
  },
  createCircleApps: function () {
    return appCatalog.list(CIRCLE_APP_IDS)
  }
}
