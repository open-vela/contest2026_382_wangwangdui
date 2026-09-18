module.exports = {
  id: 'workout-l2-assisted',
  freedomLevel: 2,
  strategy: 'assisted',
  default: {
    mode: 'auto-stack',
    verticalAlign: 'center',
    minScale: 0.82,
    maxScale: 1,
    gap: 14,
    comfort: 2,
    regions: [
      { id: 'header', role: 'workout-header', width: 128, height: 28 },
      { id: 'hero', role: 'duration-hero', width: 164, height: 100 },
      { id: 'metrics', role: 'metric-grid', width: 164, height: 154 },
      { id: 'actions', role: 'workout-actions', width: 164, height: 46 }
    ]
  },
  compositions: {
    circle: {
      mode: 'fixed-composition',
      comfort: 2,
      regions: [
        { id: 'header', role: 'workout-header', left: 37, top: 23, width: 118, height: 16, variant: 'compact' },
        { id: 'hero', role: 'duration-hero', left: 41, top: 40, width: 110, height: 44, variant: 'compact' },
        { id: 'metrics', role: 'metric-grid', left: 22, top: 86, width: 148, height: 60, variant: 'compact' },
        { id: 'actions', role: 'workout-actions', left: 36, top: 148, width: 120, height: 20, variant: 'compact' }
      ]
    },
    rect: {
      mode: 'fixed-composition',
      comfort: 2,
      regions: [
        { id: 'header', role: 'workout-header', left: 24, top: 12, width: 144, height: 22, variant: 'wide' },
        { id: 'hero', role: 'duration-hero', left: 16, top: 38, width: 160, height: 56, variant: 'wide' },
        { id: 'metrics', role: 'metric-grid', left: 8, top: 104, width: 176, height: 52, variant: 'wide' },
        { id: 'actions', role: 'workout-actions', left: 24, top: 174, width: 144, height: 36, variant: 'wide' }
      ]
    }
  }
}
