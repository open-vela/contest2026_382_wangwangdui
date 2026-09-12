var ROUTES = {
  workout: '/pages/workout_select',
  history: '/pages/history',
  heart: '/pages/heartrate',
  steps: '/pages/steps',
  faces: '/pages/watchface',
  sync: '/pages/settings/bluetooth',
  brightness: '/pages/settings/brightness',
  settings: '/pages/settings/settings',
  vibration: '/pages/settings/vibration',
  motion: '/pages/settings/motion',
  diagnostics: '/pages/settings/diagnostics',
  notification: '/pages/notification_demo',
  today: '/pages/today'
}

function routeFor(id) { return ROUTES[id] || '' }

module.exports = { routeFor: routeFor }
