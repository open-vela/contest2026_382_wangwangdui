module.exports = {
  base: {
    surface: 'rect-face-stage',
    faceIds: ['sport', 'simple', 'dashboard'],
    notificationOverlay: false
  },
  circle: {
    surface: 'circle-face-stage',
    faceIds: ['sport', 'simple', 'dashboard', 'mechanical'],
    notificationOverlay: false
  },
  pill: {
    surface: 'pill-face-stage',
    faceIds: ['sport', 'simple', 'dashboard', 'alpine'],
    notificationOverlay: true,
    alpine: {
      dataGlassBottomInset: 100,
      dataGlassMinTop: 244,
      dataRowBottomInset: 92,
      dataRowMinTop: 252,
      batteryBottomInset: 18,
      batteryMinTop: 326
    }
  },
  rect: {
    surface: 'rect-face-stage',
    faceIds: ['sport', 'simple', 'dashboard', 'mechanical']
  }
}
