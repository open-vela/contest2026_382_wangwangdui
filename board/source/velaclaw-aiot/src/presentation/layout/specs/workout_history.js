module.exports = {
  id: 'workout-history-l1-scroll',
  freedomLevel: 1,
  strategy: 'auto',
  default: {
    mode: 'auto-stack',
    verticalAlign: 'start',
    minScale: 0.8,
    maxScale: 1.08,
    scaleStep: 0.02,
    gap: 4,
    regions: [
      { id: 'header', role: 'header', width: 120, height: 18 },
      { id: 'summary', role: 'summary', width: 156, height: 38 },
      { id: 'stream', role: 'stream-viewport', width: 156, height: 72 }
    ],
    stream: {
      regionId: 'stream',
      growViewport: true,
      scaleWithPlan: true,
      itemHeight: 72,
      gap: 7,
      bottomPadding: 24
    },
    tokens: {
      cardVariant: 'automatic'
    }
  }
}
