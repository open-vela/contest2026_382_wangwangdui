import createHealthChannel from './internal/health_channel'

export default createHealthChannel({
  dataTypeName: 'STRESS',
  fallbackDataType: 9,
  initialValue: 28,
  fallbackInterval: 10000,
  fallbackValue: function (tick) {
    return 18 + ((tick * 5) % 28)
  }
})
