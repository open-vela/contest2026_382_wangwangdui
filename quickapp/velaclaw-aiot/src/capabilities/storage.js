import storage from '@system.storage'

var memoryCache = {}
var persistedCache = {}
var operationQueues = {}

function parseStorageValue(data) {
  if (data && data.value !== undefined) return data.value
  if (data && data.data !== undefined) return data.data
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

function rememberPersisted(key, value) {
  memoryCache[key] = value
  persistedCache[key] = value
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
      if (stringValue !== undefined && persistedCache[key] === stringValue) {
        memoryCache[key] = stringValue
        if (callback) callback(makeResult(true, false))
        finishOperation(key)
        return
      }
      memoryCache[key] = stringValue
      try {
        if (storage && storage.set) {
          storage.set({
            key: key,
            value: stringValue,
            success: function () {
              persistedCache[key] = stringValue
              if (callback) callback(makeResult(true, false))
              finishOperation(key)
            },
            fail: function (error) {
              if (callback) callback(makeResult(false, true, error))
              finishOperation(key)
            },
            complete: function () {}
          })
          return
        }
      } catch (error) {
        if (callback) callback(makeResult(false, true, error))
        finishOperation(key)
        return
      }
      if (callback) callback(makeResult(false, true, new Error('storage.set unavailable')))
      finishOperation(key)
    })
  },

  get: function (key, callback, forceRefresh) {
    if (!callback) return
    if (memoryCache[key] !== undefined && !forceRefresh) {
      callback(memoryCache[key])
      return
    }
    try {
      if (storage && storage.get) {
        storage.get({
          key: key,
          success: function (data) {
            var value = parseStorageValue(data)
            if (value !== '' && value !== undefined) rememberPersisted(key, value)
            callback(value)
          },
          fail: function () {
            callback(memoryCache[key] !== undefined ? memoryCache[key] : '')
          },
          complete: function () {}
        })
        return
      }
    } catch (error) {}
    callback(memoryCache[key] !== undefined ? memoryCache[key] : '')
  },

  getSync: function (key) {
    if (memoryCache[key] !== undefined) return memoryCache[key]
    try {
      if (storage && storage.getSync) {
        var raw
        try { raw = storage.getSync({ key: key }) } catch (e1) {
          try { raw = storage.getSync(key) } catch (e2) {}
        }
        var value = parseStorageValue(raw)
        if (value !== '' && value !== undefined) {
          rememberPersisted(key, value)
          return value
        }
      }
    } catch (error) {}
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
      delete persistedCache[key]
      try {
        if (storage && storage.delete) {
          storage.delete({
            key: key,
            success: function () {
              if (callback) callback(makeResult(true, false))
              finishOperation(key)
            },
            fail: function (error) {
              if (callback) callback(makeResult(false, false, error))
              finishOperation(key)
            },
            complete: function () {}
          })
          return
        }
      } catch (error) {
        if (callback) callback(makeResult(false, false, error))
        finishOperation(key)
        return
      }
      if (callback) callback(makeResult(false, false, new Error('storage.delete unavailable')))
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
        if (stringValue !== undefined && persistedCache[key] === stringValue) {
          memoryCache[key] = stringValue
          if (callback) callback(nextValue, makeResult(true, false))
          finishOperation(key)
          return
        }
        memoryCache[key] = stringValue
        try {
          if (storage && storage.set) {
            storage.set({
              key: key,
              value: stringValue,
              success: function () {
                persistedCache[key] = stringValue
                if (callback) callback(nextValue, makeResult(true, false))
                finishOperation(key)
              },
              fail: function (error) {
                if (callback) callback(nextValue, makeResult(false, true, error))
                finishOperation(key)
              },
              complete: function () {}
            })
            return
          }
        } catch (error) {
          if (callback) callback(nextValue, makeResult(false, true, error))
          finishOperation(key)
          return
        }
        if (callback) callback(nextValue, makeResult(false, true, new Error('storage.set unavailable')))
        finishOperation(key)
      }, fallback)
    })
  },

  clearCache: function () { memoryCache = {}; persistedCache = {} }
}

export default adapter
