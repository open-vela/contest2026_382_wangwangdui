var DEFAULT_STATE = {
  steps: 4567,
  stepsGoal: 6000,
  calories: 180,
  caloriesGoal: 300,
  standHours: 8,
  standGoal: 12
}

function normalizeState(source, fallback) {
  var base = fallback || DEFAULT_STATE
  var value = source || base
  return {
    steps: Math.max(0, Math.round(Number(value.steps) || 0)),
    stepsGoal: Math.max(1, Math.round(Number(value.stepsGoal) || base.stepsGoal)),
    calories: Math.max(0, Math.round(Number(value.calories) || 0)),
    caloriesGoal: Math.max(1, Math.round(Number(value.caloriesGoal) || base.caloriesGoal)),
    standHours: Math.max(0, Math.round(Number(value.standHours) || 0)),
    standGoal: Math.max(1, Math.round(Number(value.standGoal) || base.standGoal))
  }
}

function clampPercent(value, goal) {
  if (!goal || goal <= 0) return 0
  var percent = Math.round((value / goal) * 100)
  if (percent < 0) return 0
  if (percent > 100) return 100
  return percent
}

function createStore(repository, defaults) {
  var base = normalizeState(defaults || DEFAULT_STATE, DEFAULT_STATE)
  var state = normalizeState(base, base)
  var hydrated = false
  var loading = false
  var hydrateWaiters = []
  var pendingMutations = []
  var saveQueue = []
  var saveInFlight = false

  function snapshot() {
    var stepsPercent = clampPercent(state.steps, state.stepsGoal)
    var goalPercent = Math.round((
      stepsPercent +
      clampPercent(state.calories, state.caloriesGoal) +
      clampPercent(state.standHours, state.standGoal)
    ) / 3)
    return {
      steps: state.steps,
      stepsGoal: state.stepsGoal,
      calories: state.calories,
      caloriesGoal: state.caloriesGoal,
      standHours: state.standHours,
      standGoal: state.standGoal,
      stepsPercent: stepsPercent,
      goalPercent: goalPercent
    }
  }

  function mergePersisted(persisted) {
    if (!persisted) return snapshot()
    var source = normalizeState(persisted, base)
    state.steps = Math.max(state.steps, source.steps)
    state.calories = Math.max(state.calories, source.calories)
    state.standHours = Math.max(state.standHours, source.standHours)
    state.stepsGoal = source.stepsGoal || state.stepsGoal
    state.caloriesGoal = source.caloriesGoal || state.caloriesGoal
    state.standGoal = source.standGoal || state.standGoal
    return snapshot()
  }

  function applyAdd(steps, calories) {
    state.steps += Math.max(0, Math.round(Number(steps) || 0))
    state.calories += Math.max(0, Math.round(Number(calories) || 0))
    return snapshot()
  }

  function flushSaveQueue() {
    if (saveInFlight || !saveQueue.length) return
    saveInFlight = true
    var entry = saveQueue.shift()
    repository.save(entry.snapshot, function (saved, result) {
      saveInFlight = false
      if (entry.callback) entry.callback(saved || entry.snapshot, result)
      flushSaveQueue()
    })
  }

  function enqueueSave(value, callback) {
    saveQueue.push({ snapshot: value, callback: callback })
    flushSaveQueue()
  }

  function applyPendingMutations() {
    var mutations = pendingMutations
    pendingMutations = []
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i]
      if (mutation.type === 'add') enqueueSave(applyAdd(mutation.steps, mutation.calories), mutation.callback)
      else if (mutation.type === 'persist') enqueueSave(snapshot(), mutation.callback)
    }
  }

  function finishHydrate(persisted) {
    mergePersisted(persisted)
    hydrated = true
    loading = false
    applyPendingMutations()
    var waiters = hydrateWaiters
    hydrateWaiters = []
    var value = snapshot()
    for (var i = 0; i < waiters.length; i++) waiters[i](value)
  }

  function startHydrate() {
    if (hydrated || loading) return
    loading = true
    var syncValue = repository.loadSync ? repository.loadSync() : null
    if (syncValue) mergePersisted(syncValue)
    repository.load(function (persisted) { finishHydrate(persisted) })
  }

  return {
    getSnapshot: snapshot,
    hydrate: function (callback) {
      if (hydrated) {
        if (callback) callback(snapshot())
        return
      }
      if (callback) hydrateWaiters.push(callback)
      startHydrate()
    },
    add: function (steps, calories) { return applyAdd(steps, calories) },
    addAndPersist: function (steps, calories, callback) {
      if (!hydrated) {
        pendingMutations.push({ type: 'add', steps: steps, calories: calories, callback: callback })
        startHydrate()
        return
      }
      enqueueSave(applyAdd(steps, calories), callback)
    },
    persist: function (callback) {
      if (!hydrated) {
        pendingMutations.push({ type: 'persist', callback: callback })
        startHydrate()
        return
      }
      enqueueSave(snapshot(), callback)
    },
    restoreTotals: function (record) { return mergePersisted(record) }
  }
}

module.exports = {
  DEFAULT_STATE: DEFAULT_STATE,
  createStore: createStore
}
