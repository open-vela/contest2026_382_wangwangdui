/*
 * design-studio / icons.js
 * A tiny inline icon set so icon slots and palette previews never need an
 * external asset. Every path is authored for a 24x24 viewBox.
 */

const PATHS = {
  heart: 'M12 20.3c-.35 0-.7-.13-.97-.38C7.2 16.6 4 13.6 4 9.9A4.6 4.6 0 0 1 8.6 5.3c1.4 0 2.6.66 3.4 1.7a4.16 4.16 0 0 1 3.4-1.7A4.6 4.6 0 0 1 20 9.9c0 3.7-3.2 6.7-7.03 10.02-.27.25-.62.38-.97.38Z',
  steps: 'M7.2 20.5c-1.9 0-3.2-1.4-3.2-3.3 0-2.5 1.9-4.4 4.6-5.6l1.5-.7-.5-3.2C9.3 5.3 10.4 4 12.2 4c1.5 0 2.6 1 2.6 2.5 0 .9-.3 1.8-.9 2.7l-2 3.2 2.7-1.4c.6-.3 1.1-.5 1.5-.5 1.2 0 2 .9 2 2.1 0 1.4-.9 2.4-2.3 2.4-.8 0-1.6-.3-2.4-.8l-1.6-1-1 1.6c-.5.9-.7 1.6-.7 2.3 0 .8.4 1.3 1 1.3Z',
  clock: 'M12 4.6a7.4 7.4 0 1 0 0 14.8 7.4 7.4 0 0 0 0-14.8Zm0 3.1v4.6l3 1.8',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8-3.2c0-.5 0-.9-.1-1.3l1.7-1.3-1.7-3-2 .8c-.6-.5-1.3-.9-2-1.1L15.5 4h-3.4l-.3 2.1c-.7.2-1.4.6-2 1.1l-2-.8-1.7 3L7.8 10.7c-.1.4-.1.8-.1 1.3s0 .9.1 1.3l-1.7 1.3 1.7 3 2-.8c.6.5 1.3.9 2 1.1l.3 2.1h3.4l.3-2.1c.7-.2 1.4-.6 2-1.1l2 .8 1.7-3-1.7-1.3c.1-.4.1-.8.1-1.3Z',
  faces: 'M12 4.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2Zm-2.6 6.2h.01M14.6 10.6h.01M9 14.4c.9.9 1.9 1.3 3 1.3s2.1-.4 3-1.3',
  sync: 'M4.6 12a7.4 7.4 0 0 1 12.6-5.2l1.4 1.3M19.4 12a7.4 7.4 0 0 1-12.6 5.2l-1.4-1.3M18.6 4.6v3.5h-3.5M5.4 19.4v-3.5h3.5',
  brightness: 'M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2ZM12 3.4v1.8M12 18.8v1.8M3.4 12h1.8M18.8 12h1.8M5.9 5.9l1.3 1.3M16.8 16.8l1.3 1.3M18.1 5.9l-1.3 1.3M7.2 16.8l-1.3 1.3',
  vibration: 'M8.4 5.4h7.2a1.8 1.8 0 0 1 1.8 1.8v9.6a1.8 1.8 0 0 1-1.8 1.8H8.4a1.8 1.8 0 0 1-1.8-1.8V7.2a1.8 1.8 0 0 1 1.8-1.8ZM3.6 9.2v5.6M20.4 9.2v5.6',
  notification: 'M12 4.6a5 5 0 0 0-5 5v2.6l-1.2 2.4h12.4L17 12.2V9.6a5 5 0 0 0-5-5ZM10.3 17.4a1.8 1.8 0 0 0 3.4 0',
  history: 'M12 5.4a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Zm0 3.1v3.5l2.6 1.6M4.8 6.6v3.2h3.2',
  today: 'M5.6 6.2h12.8a1.4 1.4 0 0 1 1.4 1.4v10.4a1.4 1.4 0 0 1-1.4 1.4H5.6a1.4 1.4 0 0 1-1.4-1.4V7.6a1.4 1.4 0 0 1 1.4-1.4ZM4.2 10.4h15.6M8.4 4.2v3M15.6 4.2v3',
  workout: 'M6.4 12.6l2.4 2.4 8-8m-9 11.4h8.4a2 2 0 0 0 0-4H6.4Z',
  play: 'M8.6 6.4 17 12l-8.4 5.6Z',
  pause: 'M9.4 6.4v11.2M14.6 6.4v11.2',
  reset: 'M6.2 12a5.8 5.8 0 1 1 1.9 4.3M6.2 12V8.4M6.2 12h3.6',
  chart: 'M5.4 18.6V12M10 18.6V7.4M14.6 18.6v-4.2M19.2 18.6V9.4',
  battery: 'M4.4 8.6h12.2a1.4 1.4 0 0 1 1.4 1.4v4a1.4 1.4 0 0 1-1.4 1.4H4.4A1.4 1.4 0 0 1 3 14v-4a1.4 1.4 0 0 1 1.4-1.4ZM20 11v2M6 10.6h5.4v2.8H6Z',
  arrow: 'M6 12h11m-4.4-4.4L17 12l-4.4 4.4',
  check: 'M5.6 12.4l4 4 8.8-9.2',
  close: 'M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4',
  plus: 'M12 5.6v12.8M5.6 12h12.8'
}

export function iconSvg(name, options = {}) {
  const path = PATHS[name] || PATHS.heart
  const stroke = options.filled ? 'none' : 'currentColor'
  const fill = options.filled ? 'currentColor' : 'none'
  const width = options.strokeWidth || 1.7
  return `<svg viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`
}

export const ICON_NAMES = Object.keys(PATHS)

export function iconList() {
  return ICON_NAMES
}
