module.exports = {
  id: 'today-l2-assisted',
  freedomLevel: 2,
  strategy: 'assisted',
  default: {
    mode: 'external-engine',
    surface: 'rect-calendar-dashboard',
    pageSize: 1,
    safeWidth: 168,
    tokens: {
      calendar: true,
      monthNavigation: true,
      summary: true
    }
  },
  compositions: {
    circle: {
      mode: 'external-engine',
      surface: 'circle-dual-page',
      pageSize: 2,
      safeWidth: 136,
      tokens: {
        calendar: true,
        monthNavigation: true,
        summary: true,
        calendarVariant: 'compact'
      }
    },
    pill: {
      mode: 'external-engine',
      surface: 'pill-month-gallery',
      pageSize: 2,
      safeWidth: 168,
      tokens: {
        calendar: true,
        monthNavigation: true,
        summary: true,
        calendarVariant: 'gallery'
      }
    },
    rect: {
      mode: 'external-engine',
      surface: 'rect-calendar-dashboard',
      pageSize: 1,
      safeWidth: 168,
      tokens: {
        calendar: true,
        monthNavigation: true,
        summary: true,
        calendarVariant: 'dashboard'
      }
    }
  }
}
