import createHealthChannel from './internal/health_channel'

export default createHealthChannel({
  dataTypeName: 'HEART_RATE',
  fallbackDataType: 0,
  initialValue: 88,
  fallbackInterval: 3000,
  fallbackValue: function (tick) {
    return 78 + ((tick * 7) % 19)
  }
})
