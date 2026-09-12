module.exports = {
  id: 'diagnostics-l1-frame',
  freedomLevel: 1,
  strategy: 'auto',
  default: {
    mode: 'auto-stack',
    verticalAlign: 'center',
    minScale: 0.82,
    maxScale: 1.14,
    scaleStep: 0.02,
    gap: 4,
    regions: [
      { id: 'header', role: 'header', width: 120, height: 20 },
      { id: 'content', role: 'content', width: 148, height: 106 },
      { id: 'footer', role: 'pager', width: 110, height: 14 }
    ]
  }
}
