module.exports = {
  id: 'applist-l3-free',
  freedomLevel: 3,
  strategy: 'free',
  default: {
    mode: 'external-engine',
    surface: 'paged-list',
    appIds: ['heart', 'steps', 'workout', 'history', 'today', 'settings', 'notification'],
    pageSize: 4,
    safeWidth: 168,
    tokens: {
      title: '应用',
      cardVariant: 'list'
    }
  },
  compositions: {
    circle: {
      mode: 'external-engine',
      surface: 'honeycomb',
      appIds: ['heart', 'steps', 'workout', 'history', 'today', 'faces', 'sync', 'brightness', 'vibration', 'settings', 'clock'],
      safeWidth: 136,
      tokens: {
        title: '应用',
        engine: 'honeycomb'
      }
    },
    rect: {
      mode: 'external-engine',
      surface: 'designed-grid',
      appIds: ['heart', 'steps', 'workout', 'history', 'today', 'settings', 'notification', 'faces'],
      pageSize: 6,
      columns: 2,
      safeWidth: 168,
      tokens: {
        title: '应用',
        cardVariant: 'grid-card'
      }
    },
    pill: {
      mode: 'external-engine',
      surface: 'paged-list',
      appIds: ['heart', 'steps', 'workout', 'history', 'today', 'settings', 'notification'],
      pageSize: 4,
      safeWidth: 168,
      tokens: {
        title: '应用',
        cardVariant: 'list'
      }
    }
  }
}
