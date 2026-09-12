import activityRepository from './repository'
var core = require('./store_core')

export default core.createStore(activityRepository)
