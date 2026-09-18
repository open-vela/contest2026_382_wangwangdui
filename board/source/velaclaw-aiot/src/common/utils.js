/**
 * 公共工具函数库
 * 从各模块中提取的重复实现统一到此处
 */

// 统一存储值解析 - 不同openvela模拟器版本返回格式不同
export function parseStorageValue(data) {
  if (data && data.value !== undefined) {
    return data.value
  }
  if (data && data.data !== undefined) {
    return data.data
  }
  if (typeof data === 'string') {
    return data
  }
  return ''
}

// 两位数字补零
export function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

// 日期格式化为 MM/DD
export function formatShortDate(date) {
  var d = date || new Date()
  return pad2(d.getMonth() + 1) + '/' + pad2(d.getDate())
}

// 范围限制
export function clamp(value, min, max) {
  if (value < min) return min
  if (value > max) return max
  return value
}

// 时间戳 → HH:MM（展示用）；空值回退 '--:--'
export function formatTimeHM(timestamp) {
  if (!timestamp) return '--:--'
  var date = new Date(timestamp)
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes())
}

// 日期 → YYYY-MM-DD（用作按天合并的稳定存储键，勿用于展示）
export function formatDateKey(date) {
  var d = date || new Date()
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

// 时间戳 → MM/DD HH:MM
export function formatDateTime(timestamp) {
  var date = new Date(timestamp)
  return pad2(date.getMonth() + 1) + '/' + pad2(date.getDate()) + ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes())
}

// 安全JSON解析
export function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str)
  } catch (e) {
    return fallback !== undefined ? fallback : null
  }
}
