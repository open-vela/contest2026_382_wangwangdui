var sendTimer = null
var connectTimer = null
var cancelled = false

function clearTimers() {
  clearTimeout(sendTimer)
  clearTimeout(connectTimer)
}

export default {
  getCapability() {
    return {
      realBleAvailable: false,
      transportName: '模拟器分包链路'
    }
  },

  connect(options) {
    cancelled = false
    clearTimers()
    connectTimer = setTimeout(function () {
      if (cancelled) return
      // Real BLE requires a known peripheral UUID and companion GATT server.
      // Until hardware parameters are configured, the simulator transport is used.
      options.success({ mode: 'mock', deviceName: 'Vela Sync Host' })
    }, 700)
  },

  sendPackets(packets, options) {
    cancelled = false
    clearTimeout(sendTimer)
    var index = 0

    function sendNext() {
      if (cancelled) return
      if (index >= packets.length) {
        options.success()
        return
      }

      var packet = packets[index]
      sendTimer = setTimeout(function () {
        if (cancelled) return
        index++
        options.progress({
          sent: index,
          total: packets.length,
          percent: Math.round((index / packets.length) * 100),
          sequence: packet.sequence
        })
        sendNext()
      }, 180)
    }

    sendNext()
  },

  disconnect() {
    cancelled = true
    clearTimers()
  }
}
