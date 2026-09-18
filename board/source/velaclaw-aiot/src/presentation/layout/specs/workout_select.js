module.exports = {
  id: 'workout-select-l1-scroll',
  freedomLevel: 1,
  strategy: 'auto',
  default: {
    mode: 'auto-stack',
    verticalAlign: 'start',
    minScale: 0.86,
    maxScale: 1.18,
    scaleStep: 0.02,
    gap: 4,
    regions: [
      { id: 'header', role: 'header', width: 120, height: 20 },
      { id: 'stream', role: 'scroll-viewport', width: 148, height: 104 }
    ],
    stream: {
      regionId: 'stream',
      growViewport: true,
      scaleWithPlan: true,
      itemHeight: 78,
      gap: 9,
      bottomPadding: 18
    },
    tokens: {
      title: '运动模式',
      streamVariant: 'mode-cards'
    }
  }
}
