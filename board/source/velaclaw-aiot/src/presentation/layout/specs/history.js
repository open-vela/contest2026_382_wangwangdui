module.exports = {
  id: 'history-l2-scroll',
  freedomLevel: 2,
  strategy: 'assisted',
  default: {
    mode: 'auto-stack',
    minScale: 0.92,
    maxScale: 1.05,
    scaleStep: 0.01,
    gap: 8,
    regions: [
      { id: 'header', role: 'header', width: 156, height: 28 },
      { id: 'summary', role: 'summary', width: 164, height: 60 },
      { id: 'chart', role: 'chart', width: 164, height: 150 },
      { id: 'insights', role: 'insights', width: 164, height: 62 }
    ],
    stream: {
      width: 164,
      itemHeight: 48,
      gap: 8,
      topGap: 10,
      bottomPadding: 32
    },
    tokens: {
      summaryVisible: true,
      chartMaxHeight: 88,
      compactLabels: false,
      insightVariant: 'row',
      insightDetailVisible: true,
      visualScale: 1
    }
  },
  compositions: {
    circle: {
      mode: 'fixed-composition',
      regions: [
        { id: 'header', role: 'header', left: 36, top: 23, width: 120, height: 20, variant: 'compact' },
        { id: 'chart', role: 'chart', left: 22, top: 47, width: 148, height: 86, variant: 'compact' },
        { id: 'insights', role: 'insights', left: 36, top: 140, width: 120, height: 28, variant: 'compact' }
      ],
      stream: {
        width: 148,
        itemHeight: 38,
        gap: 5,
        topGap: 6,
        bottomPadding: 24
      },
      tokens: {
        summaryVisible: false,
        chartMaxHeight: 52,
        compactLabels: true,
        insightVariant: 'row',
        insightDetailVisible: false,
        visualScale: 0.78
      }
    },
    rect: {
      mode: 'fixed-composition',
      regions: [
        { id: 'header', role: 'header', left: 20, top: 8, width: 152, height: 24, variant: 'wide' },
        { id: 'summary', role: 'summary', left: 14, top: 36, width: 164, height: 46, variant: 'wide' },
        { id: 'chart', role: 'chart', left: 14, top: 88, width: 104, height: 88, variant: 'wide' },
        { id: 'insights', role: 'insights', left: 122, top: 88, width: 56, height: 88, variant: 'column' }
      ],
      stream: {
        width: 164,
        itemHeight: 42,
        gap: 6,
        topGap: 8,
        bottomPadding: 24
      },
      tokens: {
        summaryVisible: true,
        chartMaxHeight: 54,
        compactLabels: true,
        insightVariant: 'column',
        insightDetailVisible: false,
        visualScale: 0.9
      }
    }
  }
}
