module.exports = {
  base: {
    contentWidth: 164,
    surface: 'preview-grid',
    faceIds: ['sport', 'simple', 'dashboard'],
    header: { top: 0, width: 164, height: 24 },
    content: { top: 30, width: 164 },
    cardHeight: 76,
    gap: 8,
    titleSize: 14,
    nameSize: 8,
    previewTimeSize: 17
  },
  circle: {
    contentWidth: 148,
    surface: 'preview-swiper',
    faceIds: ['sport', 'simple', 'dashboard', 'mechanical'],
    header: { top: 10, width: 124, height: 18, circleFit: 'edges' },
    preview: { top: 32, width: 136, height: 112, circleFit: 'center' },
    footer: { top: 148, width: 120, height: 16, circleFit: 'center' },
    titleSize: 10,
    previewNameSize: 8,
    previewTimeSize: 24,
    previewRadius: 56
  },
  pill: {
    contentWidth: 168,
    surface: 'cards-pager',
    faceIds: ['sport', 'simple', 'dashboard', 'alpine'],
    pageSize: 2,
    header: { top: 0, width: 168, height: 30 },
    content: { top: 42, width: 168, bottomInset: 50 },
    pager: { bottomInset: 30, width: 168, height: 24 },
    cardHeight: 126,
    cardGap: 12,
    titleSize: 18,
    nameSize: 14,
    descSize: 8,
    previewWidth: 64
  },
  rect: {
    contentWidth: 164,
    faceIds: ['sport', 'simple', 'dashboard', 'mechanical']
  }
}
