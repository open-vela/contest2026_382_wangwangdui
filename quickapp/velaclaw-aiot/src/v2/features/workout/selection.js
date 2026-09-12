import workoutState from '../../../domain/workout/state_machine'
import workoutRepository from '../../../domain/workout/repository'

var MODE_TYPES = ['walk', 'run']

export default {
  getModeTypes: function () { return MODE_TYPES.slice() },
  hasActive: function (callback) {
    var current = workoutState.getActive()
    if (current) { if (callback) callback(true); return }
    workoutRepository.loadActive(function (stored) { if (callback) callback(!!(stored && stored.id)) })
  },
  create: function (type, callback) {
    var session = workoutState.start(type)
    workoutRepository.saveActive(session, function () { if (callback) callback(session) })
  }
}
