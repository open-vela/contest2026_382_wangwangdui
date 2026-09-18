module.exports = {
  base: {
    contentWidth: 164,
    surface: 'paged-settings-list',
    itemIds: ['sync', 'vibration', 'brightness', 'motion', 'diagnostics'],
    header: { top: 0, width: 164, height: 24, circleFit: 'none' },
    list: { top: 30, width: 164, height: 164, circleFit: 'none' },
    footer: { top: 190, width: 100, height: 20, circleFit: 'none' },
    pageSize: 3,
    itemHeight: 50,
    itemGap: 7,
    itemRadius: 16,
    itemPadding: 7,
    iconSize: 30,
    titleSize: 13,
    itemNameSize: 10,
    itemDescSize: 6,
    arrowSize: 13
  },
  circle: {
    contentWidth: 148,
    header: { top: 14, width: 112, height: 18, circleFit: 'edges' },
    list: { top: 37, width: 148, height: 106, circleFit: 'none' },
    footer: { top: 147, width: 100, height: 16, circleFit: 'center' },
    pageSize: 2,
    itemHeight: 50,
    itemGap: 6,
    itemRadius: 17,
    itemPadding: 7,
    iconSize: 30,
    titleSize: 12,
    itemNameSize: 10,
    itemDescSize: 6,
    arrowSize: 13
  },
  pill: {
    contentWidth: 168,
    header: { top: 0, width: 168, height: 30, circleFit: 'none' },
    list: { top: 40, width: 168, height: 246, circleFit: 'none' },
    footer: { top: 298, width: 112, height: 24, circleFit: 'none' },
    pageSize: 3,
    itemHeight: 76,
    itemGap: 9,
    itemRadius: 22,
    itemPadding: 10,
    iconSize: 40,
    titleSize: 18,
    itemNameSize: 14,
    itemDescSize: 8,
    arrowSize: 18
  },
  rect: {
    contentWidth: 164,
    header: { top: 0, width: 164, height: 24, circleFit: 'none' },
    list: { top: 30, width: 164, height: 164, circleFit: 'none' },
    footer: { top: 196, width: 100, height: 20, circleFit: 'none' }
  }
}
