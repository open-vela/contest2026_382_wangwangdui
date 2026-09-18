module.exports = {
  base: {
    contentWidth: 164,
    surface: 'notification-demo-stack',
    title: { top: 12, width: 150, height: 22 },
    buttons: { top: 40, width: 150, height: 146 },
    buttonHeight: 32,
    gap: 6,
    titleSize: 13,
    buttonSize: 9,
    radius: 16
  },
  circle: {
    contentWidth: 148,
    title: { top: 18, width: 120, height: 22, circleFit: 'edges' },
    buttons: { top: 44, width: 136, height: 134, circleFit: 'none' },
    buttonHeight: 29,
    gap: 6,
    titleSize: 13,
    buttonSize: 8,
    radius: 15
  },
  pill: {
    contentWidth: 168,
    title: { top: 50, width: 150, height: 34 },
    buttons: { top: 96, width: 150, height: 252 },
    buttonHeight: 54,
    gap: 12,
    titleSize: 20,
    buttonSize: 14,
    radius: 27
  },
  rect: { contentWidth: 164 }
}
