module.exports = {
  base: {
    contentWidth: 164,
    surface: 'calendar-dashboard',
    interaction: 'explicit-buttons',
    overflow: 'fixed'
  },
  circle: {
    contentWidth: 136,
    surface: 'summary-calendar-pages',
    requiredHeights: { summary: 128, calendar: 128 },
    circleFrame: { left: 28, top: 30, width: 136, height: 128 }
  },
  pill: {
    contentWidth: 168,
    surface: 'pill-month-calendar',
    requiredHeights: { summary: 327, calendar: 350 }
  },
  rect: {
    contentWidth: 164,
    surface: 'summary-calendar-pages',
    requiredHeights: { summary: 176, calendar: 176 }
  }
}
