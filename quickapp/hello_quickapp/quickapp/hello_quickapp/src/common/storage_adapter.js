/**
 * 统一存储适配层
 * 封装@system.storage API，内置memory fallback和统一错误处理。
 * 兼容不同openvela模拟器版本的存储行为差异。
 */
import storage from '@system.storage'
import { parseStorageValue, safeJsonParse } from './utils'

var memoryCache = {}
var operationQueues = {}

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
  return {
    persisted: persisted,
    memoryOnly: memoryOnly,
    error: error || null
  }
}

var storageAdapter = {
  /**
   * 写入存储（先写memory cache，再异步写storage）
   * @param {string} key
   * @param {*} value - 会自动JSON序列化非字符串值
   */
  set: function (key, value, callback) {
    enqueueOperation(key, function () {
      var strValue
      try {
        strValue = typeof value === 'string' ? value : JSON.stringify(value)
      } catch (error) {
        if (callback) callback(makeResult(false, false, error))
        finishOperation(key)
        return
      }
      memoryCache[key] = strValue
      try {
        if (storage && storage.set) {
          storage.set({
            key: key,
            value: strValue,
            success: function () {
              if (callback) callback(makeResult(true, false))
              finishOperation(key)
            },
            fail: function (error) {
              console.log('storage_adapter set failed, memory fallback: ' + key)
              if (callback) callback(makeResult(false, true, error))
              finishOperation(key)
            },
            complete: function () {}
          })
          return
        }
      } catch (error) {
        console.log('storage_adapter set unavailable: ' + key)
        if (callback) callback(makeResult(false, true, error))
        finishOperation(key)
        return
      }
      if (callback) callback(makeResult(false, true, new Error('storage.set unavailable')))
      finishOperation(key)
    })
  },

  /**
   * 异步读取存储（优先返回memory cache）
   * @param {string} key
   * @param {function} callback - callback(value) value为原始字符串
   */
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
            if (value !== '' && value !== undefined) {
              memoryCache[key] = value
            }
            callback(value)
          },
          fail: function () {
            callback(memoryCache[key] !== undefined ? memoryCache[key] : '')
          },
          complete: function () {}
        })
        return
      }
    } catch (e) {
      console.log('storage_adapter get unavailable: ' + key)
    }
    callback(memoryCache[key] !== undefined ? memoryCache[key] : '')
  },

  /**
   * 同步读取存储（优先memory cache，未命中则尝试系统storage的同步接口）
   * @param {string} key
   * @returns {string|undefined}
   */
  getSync: function (key) {
    if (memoryCache[key] !== undefined) {
      return memoryCache[key]
    }
    try {
      if (storage && storage.getSync) {
        var raw
        try {
          raw = storage.getSync({ key: key })
        } catch (e1) {
          try {
            raw = storage.getSync(key)
          } catch (e2) {}
        }
        var value = parseStorageValue(raw)
        if (value !== '' && value !== undefined) {
          memoryCache[key] = value
          return value
        }
      }
    } catch (e) {
      console.log('storage_adapter getSync unavailable: ' + key)
    }
    return undefined
  },

  /**
   * 读取并自动解析JSON
   * @param {string} key
   * @param {function} callback - callback(parsedValue)
   * @param {*} fallback - JSON解析失败时的默认值
   */
  getJSON: function (key, callback, fallback) {
    this.get(key, function (value) {
      if (!value || value === '') {
        callback(fallback !== undefined ? fallback : null)
        return
      }
      callback(safeJsonParse(value, fallback))
    })
  },

  /**
   * 删除存储项
   * @param {string} key
   */
  delete: function (key, callback) {
    enqueueOperation(key, function () {
      delete memoryCache[key]
      try {
        if (storage && storage.delete) {
          storage.delete({
            key: key,
            success: function () {
              if (callback) callback(makeResult(true, false))
              finishOperation(key)
            },
            fail: function (error) {
              console.log('storage_adapter delete failed: ' + key)
              if (callback) callback(makeResult(false, false, error))
              finishOperation(key)
            },
            complete: function () {}
          })
          return
        }
      } catch (error) {
        console.log('storage_adapter delete unavailable: ' + key)
        if (callback) callback(makeResult(false, false, error))
        finishOperation(key)
        return
      }
      if (callback) callback(makeResult(false, false, new Error('storage.delete unavailable')))
      finishOperation(key)
    })
  },

  /**
   * 对同一键执行串行读改写，避免并发操作覆盖彼此结果。
   * @param {string} key
   * @param {*} fallback
   * @param {function} updater
   * @param {function} callback - callback(nextValue, result)
   */
  updateJSON: function (key, fallback, updater, callback) {
    enqueueOperation(key, function () {
      storageAdapter.getJSON(key, function (current) {
        var nextValue
        var strValue
        try {
          nextValue = updater(current)
          strValue = JSON.stringify(nextValue)
        } catch (error) {
          if (callback) callback(current, makeResult(false, false, error))
          finishOperation(key)
          return
        }
        memoryCache[key] = strValue
        try {
          if (storage && storage.set) {
            storage.set({
              key: key,
              value: strValue,
              success: function () {
                if (callback) callback(nextValue, makeResult(true, false))
                finishOperation(key)
              },
              fail: function (error) {
                console.log('storage_adapter update failed, memory fallback: ' + key)
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

  /**
   * 清空memory cache（不影响persistent storage）
   */
  clearCache: function () {
    memoryCache = {}
  }
}

export default storageAdapter
