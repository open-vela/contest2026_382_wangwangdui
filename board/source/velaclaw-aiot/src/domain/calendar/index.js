var LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
]
var LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
var DAY_PREFIXES = ['初', '十', '廿', '三']
var DAY_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
var DAY_MS = 86400000

function leapMonth(year) { return LUNAR_INFO[year - 1900] & 0xf }
function leapDays(year) { return leapMonth(year) ? ((LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29) : 0 }
function lunarMonthDays(year, month) { return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29 }
function lunarYearDays(year) {
  var sum = 348
  for (var mask = 0x8000; mask > 0x8; mask >>= 1) if (LUNAR_INFO[year - 1900] & mask) sum++
  return sum + leapDays(year)
}
function toLunar(date) {
  var offset = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1900, 0, 31)) / DAY_MS)
  if (offset < 0) return null
  var year = 1900
  while (year <= 2100) {
    var yearDays = lunarYearDays(year)
    if (offset < yearDays) break
    offset -= yearDays
    year++
  }
  if (year > 2100) return null
  var leap = leapMonth(year)
  for (var month = 1; month <= 12; month++) {
    var days = lunarMonthDays(year, month)
    if (offset < days) return { year: year, month: month, day: offset + 1, isLeap: false }
    offset -= days
    if (leap === month) {
      var extra = leapDays(year)
      if (offset < extra) return { year: year, month: month, day: offset + 1, isLeap: true }
      offset -= extra
    }
  }
  return null
}
function formatLunarDay(day) {
  if (day === 10) return '初十'
  if (day === 20) return '二十'
  if (day === 30) return '三十'
  return DAY_PREFIXES[Math.floor(day / 10)] + DAY_NUMBERS[day % 10]
}
function formatLunar(date) {
  var lunar = toLunar(date)
  if (!lunar) return '农历日期不可用'
  return '农历' + (lunar.isLeap ? '闰' : '') + LUNAR_MONTHS[lunar.month - 1] + formatLunarDay(lunar.day)
}
function daysInMonth(year, monthIndex) { return new Date(year, monthIndex + 1, 0).getDate() }
function pad2(value) { return value < 10 ? '0' + value : '' + value }
function buildMonth(year, monthIndex, today) {
  var normalized = new Date(year, monthIndex, 1)
  var viewYear = normalized.getFullYear()
  var viewMonth = normalized.getMonth()
  var firstWeekday = normalized.getDay()
  var currentDays = daysInMonth(viewYear, viewMonth)
  var previousDays = new Date(viewYear, viewMonth, 0).getDate()
  var cells = []
  for (var index = 0; index < 42; index++) {
    var cellMonth = viewMonth
    var cellDay = index - firstWeekday + 1
    var inMonth = true
    if (cellDay < 1) { inMonth = false; cellMonth--; cellDay = previousDays + cellDay }
    else if (cellDay > currentDays) { inMonth = false; cellMonth++; cellDay -= currentDays }
    var cellDate = new Date(viewYear, cellMonth, cellDay)
    var cellYear = cellDate.getFullYear()
    cellMonth = cellDate.getMonth()
    var isToday = !!today && cellYear === today.getFullYear() && cellMonth === today.getMonth() && cellDay === today.getDate()
    cells.push({ key: cellYear + '-' + pad2(cellMonth + 1) + '-' + pad2(cellDay), day: cellDay, inMonth: inMonth, isToday: isToday })
  }
  return cells
}
function shiftMonth(year, monthIndex, delta) {
  var date = new Date(year, monthIndex + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}
module.exports = { toLunar: toLunar, formatLunar: formatLunar, buildMonth: buildMonth, shiftMonth: shiftMonth, daysInMonth: daysInMonth }
