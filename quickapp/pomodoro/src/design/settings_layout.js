var timerLayout = require('./timer_layout')

function round(value) { return Math.round(value) }
function centered(width, child) { return round((width - child) / 2) }

function compute(profile) {
  var plan = timerLayout.computeListLayout(profile)
  var circle = plan.composition === 'circle-ring'

  if (circle) {
    var side = plan.sceneWidth
    var titleTop = round(side * 0.115)
    var titleHeight = 16
    var listTop = 42
    var backTop = round(side * 0.823)
    var backHeight = 22
    var listBottom = backTop - 6
    var listHeight = listBottom - listTop
    var titleWidth = Math.min(timerLayout.safeRowWidth(side, titleTop, titleHeight) - 8, round(side * 0.62))
    var listWidth = Math.min(timerLayout.safeRowWidth(side, listTop, listHeight) - 10, round(side * 0.78))
    var backWidth = Math.min(timerLayout.safeRowWidth(side, backTop, backHeight) - 6, round(side * 0.50))

    plan.titleTop = titleTop
    plan.titleHeight = titleHeight
    plan.titleLeft = centered(side, titleWidth)
    plan.titleWidth = titleWidth
    plan.titleAlign = 'center'
    plan.listTop = listTop
    plan.listLeft = centered(side, listWidth)
    plan.listWidth = listWidth
    plan.listHeight = listHeight
    plan.backTop = backTop
    plan.backHeight = backHeight
    plan.backLeft = centered(side, backWidth)
    plan.backWidth = backWidth
    plan.rowHeight = 26
    plan.rowGap = 4
    plan.bodySize = 8
    plan.valueSize = 10
    plan.pillFontSize = 10
    plan.blocks = [
      { id: 'title', top: titleTop, height: titleHeight, width: titleWidth, left: plan.titleLeft },
      { id: 'list', top: listTop, height: listHeight, width: listWidth, left: plan.listLeft },
      { id: 'back', top: backTop, height: backHeight, width: backWidth, left: plan.backLeft }
    ]
  }

  var inset = Math.max(6, round(plan.scale * 8))
  var stepSize = Math.max(18, round(plan.rowHeight * 0.72))
  var controlGap = Math.max(2, round(plan.scale * 3))
  var valueWidth = circle ? round(plan.scale * 34) : round(plan.scale * 42)
  var controlWidth = stepSize * 2 + valueWidth + controlGap * 2
  var labelWidth = plan.listWidth - inset * 2 - controlWidth
  var minLabelWidth = circle ? round(plan.scale * 38) : round(plan.scale * 44)

  if (labelWidth < minLabelWidth) {
    valueWidth = Math.max(round(plan.scale * 28), valueWidth - (minLabelWidth - labelWidth))
    controlWidth = stepSize * 2 + valueWidth + controlGap * 2
    labelWidth = plan.listWidth - inset * 2 - controlWidth
  }

  plan.rowInset = inset
  plan.stepSize = stepSize
  plan.stepRadius = round(stepSize / 2)
  plan.valueWidth = valueWidth
  plan.controlGap = controlGap
  plan.controlWidth = controlWidth
  plan.labelWidth = labelWidth
  plan.toggleWidth = Math.min(controlWidth, circle ? round(plan.scale * 42) : round(plan.scale * 48))
  plan.toggleOffset = Math.max(0, controlWidth - plan.toggleWidth)
  plan.minLabelWidth = minLabelWidth
  plan.settingsContentHeight = 3 * (plan.rowHeight + plan.rowGap) + Math.max(12, round(plan.bodySize * 1.8))
  return plan
}

function leafRects(plan) {
  var rows = []
  for (var i = 0; i < 3; i++) {
    var top = plan.listTop + i * (plan.rowHeight + plan.rowGap)
    var labelLeft = plan.listLeft + plan.rowInset
    var controlLeft = plan.listLeft + plan.listWidth - plan.rowInset - plan.controlWidth
    rows.push({
      id: 'settings-row-' + i,
      left: plan.listLeft, top: top, width: plan.listWidth, height: plan.rowHeight,
      children: [
        { id: 'label', left: labelLeft, top: top, width: plan.labelWidth, height: plan.rowHeight },
        { id: 'control', left: controlLeft, top: top, width: plan.controlWidth, height: plan.rowHeight },
        { id: 'minus', left: controlLeft, top: top + round((plan.rowHeight - plan.stepSize) / 2), width: plan.stepSize, height: plan.stepSize },
        { id: 'value', left: controlLeft + plan.stepSize + plan.controlGap, top: top, width: plan.valueWidth, height: plan.rowHeight },
        { id: 'plus', left: controlLeft + plan.stepSize + plan.controlGap + plan.valueWidth + plan.controlGap, top: top + round((plan.rowHeight - plan.stepSize) / 2), width: plan.stepSize, height: plan.stepSize }
      ]
    })
  }
  return rows
}

module.exports = { compute: compute, leafRects: leafRects }
