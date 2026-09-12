module.exports = {
  base: {
    contentWidth: 164,
    appIds: ['workout','history','heart','clock','steps','faces','sync','brightness','settings','vibration','notification','today'],
    surface: 'designed-grid',
    pageSize: 6,
    header: { top: 0, width: 164, height: 24 },
    content: { top: 30, width: 164, bottomInset: 32 },
    pager: { bottomInset: 24, width: 164, height: 20 },
    columns: 2,
    gap: 6,
    itemHeight: 54,
    titleSize: 14,
    nameSize: 9,
    iconSize: 30,
    itemRadius: 14
  },
  circle: {
    contentWidth: 148,
    surface: 'honeycomb',
    pageSize: 12,
    frame: 'scene'
  },
  pill: {
    contentWidth: 168,
    surface: 'paged-list',
    pageSize: 4,
    header: { top: 0, width: 168, height: 28 },
    content: { top: 36, width: 168, bottomInset: 78 },
    pager: { bottomInset: 30, width: 168, height: 24 },
    itemHeight: 62,
    itemGap: 8,
    titleSize: 18,
    nameSize: 14,
    arrowSize: 20,
    iconSize: 40,
    itemRadius: 20
  },
  rect: {
    contentWidth: 164,
    surface: 'honeycomb',
    pageSize: 12,
    frame: 'scene'
  }
}
