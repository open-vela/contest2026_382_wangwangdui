var memoryCache = {}
var operationQueues = {}
var exchangeApi = null

var EXCHANGE_KEY_PREFIX = 'watch.demo.storage.'
var EXCHANGE_VALUE_LIMIT = 80

function exchange() {
  if (exchangeApi !== null) return exchangeApi
  exchangeApi = false
  try {
    var runtimeRequire = Function('return typeof require === "function" ? require : null')()
    if (runtimeRequire) exchangeApi = runtimeRequire('system.exchange') || false
  } catch (error) {
    exchangeApi = false
  }
  return exchangeApi || null
}

function exchangeKey(key) {
  return EXCHANGE_KEY_PREFIX + key
}

function canUseExchange(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= EXCHANGE_VALUE_LIMIT
}

function exchangeValue(data) {
  if (data && data.value !== undefined) return data.value
  if (data === 'success') return ''
  if (typeof data === 'string') return data
  return ''
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback !== undefined ? fallback : null
  }
}

function finishOperation(key) {
  var queue = operationQueues[key]
  if (!queue) return
  queue.shift()
  if (queue.length === 0) {
    delete operationQueues[key]
    return
  }
  queue[0]()
}

function enqueueOperation(key, operation) {
  if (!operationQueues[key]) operationQueues[key] = []
  operationQueues[key].push(operation)
  if (operationQueues[key].length === 1) operation()
}

function makeResult(persisted, memoryOnly, error) {
  return { persisted: persisted, memoryOnly: memoryOnly, error: error || null }
}

var adapter = {
  set: function (key, value, callback) {
    enqueueOperation(key, function () {
      var stringValue
      try {
        stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      } catch (error) {
        if (callback) callback(makeResult(false, false, error))
        finishOperation(key)
        return
      }
      if (stringValue !== undefined && memoryCache[key] === stringValue) {
        memoryCache[key] = stringValue
        if (callback) callback(makeResult(false, true))
        finishOperation(key)
        return
      }
      memoryCache[key] = stringValue
      var api = exchange()
      if (api && api.set && canUseExchange(stringValue)) {
        try {
          api.set({
            key: exchangeKey(key),
            scope: 'global',
            value: stringValue,
            success: function () {
              if (callback) callback(makeResult(true, false))
              finishOperation(key)
            },
            fail: function (data, code) {
              if (callback) callback(makeResult(false, true, { data: data, code: code }))
              finishOperation(key)
            },
            complete: function () {}
          })
          return
        } catch (error) {
          if (callback) callback(makeResult(false, true, error))
          finishOperation(key)
          return
        }
      }
      if (callback) callback(makeResult(false, true))
      finishOperation(key)
    })
  },

  get: function (key, callback, forceRefresh) {
    if (!callback) return
    if (memoryCache[key] !== undefined && !forceRefresh) {
      callback(memoryCache[key])
      return
    }
    var api = exchange()
    if (api && api.get) {
      try {
        api.get({
          key: exchangeKey(key),
          scope: 'global',
          success: function (data) {
            var value = exchangeValue(data)
            if (value !== '') memoryCache[key] = value
            callback(value !== '' ? value : (memoryCache[key] !== undefined ? memoryCache[key] : ''))
          },
          fail: function () {
            callback(memoryCache[key] !== undefined ? memoryCache[key] : '')
          },
          complete: function () {}
        })
        return
      } catch (error) {}
    }
    callback(memoryCache[key] !== undefined ? memoryCache[key] : '')
  },

  getSync: function (key) {
    if (memoryCache[key] !== undefined) return memoryCache[key]
    return undefined
  },

  getJSON: function (key, callback, fallback) {
    this.get(key, function (value) {
      if (!value || value === '') {
        callback(fallback !== undefined ? fallback : null)
        return
      }
      callback(safeJsonParse(value, fallback))
    })
  },

  delete: function (key, callback) {
    enqueueOperation(key, function () {
      delete memoryCache[key]
      var api = exchange()
      if (api && api.remove) {
        try {
          api.remove({
            key: exchangeKey(key),
            scope: 'global',
            success: function () {
              if (callback) callback(makeResult(true, false))
              finishOperation(key)
            },
            fail: function (data, code) {
              if (callback) callback(makeResult(false, false, { data: data, code: code }))
              finishOperation(key)
            },
            complete: function () {}
          })
          return
        } catch (error) {
          if (callback) callback(makeResult(false, false, error))
          finishOperation(key)
          return
        }
      }
      if (callback) callback(makeResult(false, true))
      finishOperation(key)
    })
  },

  updateJSON: function (key, fallback, updater, callback) {
    enqueueOperation(key, function () {
      adapter.getJSON(key, function (current) {
        var nextValue
        var stringValue
        try {
          nextValue = updater(current)
          stringValue = JSON.stringify(nextValue)
        } catch (error) {
          if (callback) callback(current, makeResult(false, false, error))
          finishOperation(key)
          return
        }
        if (stringValue !== undefined && memoryCache[key] === stringValue) {
          memoryCache[key] = stringValue
          if (callback) callback(nextValue, makeResult(false, true))
          finishOperation(key)
          return
        }
        memoryCache[key] = stringValue
        var api = exchange()
        if (api && api.set && canUseExchange(stringValue)) {
          try {
            api.set({
              key: exchangeKey(key),
              scope: 'global',
              value: stringValue,
              success: function () {
                if (callback) callback(nextValue, makeResult(true, false))
                finishOperation(key)
              },
              fail: function (data, code) {
                if (callback) callback(nextValue, makeResult(false, true, { data: data, code: code }))
                finishOperation(key)
              },
              complete: function () {}
            })
            return
          } catch (error) {
            if (callback) callback(nextValue, makeResult(false, true, error))
            finishOperation(key)
            return
          }
        }
        if (callback) callback(nextValue, makeResult(false, true))
        finishOperation(key)
      }, fallback)
    })
  },

  clearCache: function () { memoryCache = {} }
}

export default adapter
