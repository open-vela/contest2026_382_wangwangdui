var WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function pad2(value) { return value < 10 ? '0' + value : '' + value }
function formatNumber(value) { return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

function decorateCells(cells) {
  var source = Array.isArray(cells) ? cells : []
  var result = []
  for (var i = 0; i < source.length; i++) {
    var cell = source[i]
    result.push({
      key: cell.key,
      day: cell.day,
      inMonth: !!cell.inMonth,
      isToday: !!cell.isToday,
      textColor: cell.isToday ? '#FFFFFF' : (cell.inMonth ? '#E5E5EA' : '#4D4D52'),
      backgroundColor: cell.isToday ? '#FF375F' : 'transparent'
    })
  }
  return result
}

function project(model) {
  var source = model || {}
  var goalPercent = Math.max(0, Math.min(100, Number(source.goalPercent) || 0))
  return {
    yearText: (Number(source.currentYear) || 0) + ' 年',
    monthText: (Number(source.currentMonth) + 1 || 1) + '月',
    monthNumberText: pad2((Number(source.calendarMonth) || 0) + 1),
    dayText: String(Number(source.currentDay) || 0),
    weekdayText: WEEKDAYS[Number(source.currentWeekday) || 0] || WEEKDAYS[0],
    lunarText: source.lunarText || '',
    stepsText: formatNumber(source.steps),
    caloriesText: formatNumber(source.calories),
    standText: formatNumber(source.standHours),
    heartText: source.heartRate === null || source.heartRate === undefined ? '--' : String(source.heartRate),
    goalPercent: goalPercent,
    goalWidth: goalPercent + '%',
    calendarTitle: (Number(source.calendarYear) || 0) + '年 ' + ((Number(source.calendarMonth) || 0) + 1) + '月',
    calendarCells: decorateCells(source.calendarCells)
  }
}

module.exports = { project: project, decorateCells: decorateCells }
