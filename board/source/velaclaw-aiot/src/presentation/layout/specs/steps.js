module.exports = {
  id: 'steps-l1-scroll',
  freedomLevel: 1,
  strategy: 'auto',
  default: {
    mode: 'auto-stack',
    minScale: 0.82,
    maxScale: 1.16,
    scaleStep: 0.02,
    gap: 4,
    comfort: 2,
    regions: [
      { id: 'header', role: 'header', width: 120, height: 22 },
      { id: 'history', role: 'action', width: 148, height: 30 },
      { id: 'stream', role: 'scroll-viewport', width: 148, height: 70 }
    ],
    stream: {
      regionId: 'stream',
      growViewport: true,
      scaleWithPlan: true,
      itemHeight: 118,
      gap: 8,
      bottomPadding: 24
    },
    tokens: {
      chartRatio: 0.5,
      minChartHeight: 48,
      maxChartHeight: 68
    }
  }
}
