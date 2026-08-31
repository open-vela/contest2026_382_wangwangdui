import watchData from './watch_data'
import workoutManager from './workout_manager'

var PROTOCOL_VERSION = 1
var DEFAULT_CHUNK_SIZE = 96

function splitText(text, size) {
  var chunks = []
  var chunkSize = size || DEFAULT_CHUNK_SIZE
  for (var i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

export default {
  createPayload(callback) {
    var snapshot = watchData.getSnapshot()
    watchData.getHealthHistory(function (history) {
      workoutManager.getRecords(function (workouts) {
        callback({
          version: PROTOCOL_VERSION,
          deviceId: 'vela-band-demo',
          syncedAt: Date.now(),
          health: {
            steps: snapshot.steps,
            calories: snapshot.calories,
            standHours: snapshot.standHours,
            heartRate: snapshot.currentHeartRate
          },
          history: history,
          workouts: workouts
        })
      })
    })
  },

  encode(payload, chunkSize) {
    var text = JSON.stringify(payload)
    var pieces = splitText(text, chunkSize)
    var transferId = 'sync_' + Date.now()
    var packets = []
    for (var i = 0; i < pieces.length; i++) {
      packets.push({
        version: PROTOCOL_VERSION,
        transferId: transferId,
        sequence: i + 1,
        total: pieces.length,
        payload: pieces[i]
      })
    }
    return {
      transferId: transferId,
      bytesText: text.length,
      packets: packets
    }
  }
}
