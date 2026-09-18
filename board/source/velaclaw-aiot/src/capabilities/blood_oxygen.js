import createHealthChannel from './internal/health_channel'

export default createHealthChannel({
  dataTypeName: 'SPO2',
  fallbackDataType: 6,
  initialValue: 97,
  fallbackInterval: 5000,
  fallbackValue: function (tick) {
    return 96 + (tick % 4)
  }
})
