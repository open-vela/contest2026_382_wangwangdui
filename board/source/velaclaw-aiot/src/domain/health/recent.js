var currentHeartRate = 88
var recentHeartRates = [65, 82, 71, 95, 78, 88]

function clampHeartRate(value) {
  var number = Math.round(Number(value) || currentHeartRate)
  if (number < 30) return 30
  if (number > 220) return 220
  return number
}

function copyRecent() {
  return recentHeartRates.slice()
}

function stats(values) {
  if (!values || values.length === 0) return { min: 0, max: 0, avg: 0 }
  var min = values[0]
  var max = values[0]
  var total = 0
  for (var i = 0; i < values.length; i++) {
    if (values[i] < min) min = values[i]
    if (values[i] > max) max = values[i]
    total += values[i]
  }
  return { min: min, max: max, avg: Math.round(total / values.length) }
}

export default {
  append: function (value) {
    var next = clampHeartRate(value)
    recentHeartRates.shift()
    recentHeartRates.push(next)
    currentHeartRate = next
    return this.getSnapshot()
  },

  getSnapshot: function () {
    return {
      currentHeartRate: currentHeartRate,
      recentHeartRates: copyRecent()
    }
  },

  getStats: function () {
    return stats(recentHeartRates)
  }
}
