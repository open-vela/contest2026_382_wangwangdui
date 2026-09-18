import storage from '@system.storage'

// Capability boundary for @system.storage.
// Every read/write is normalised into a Promise and never throws at the caller:
// the layers above only ever see { ok, value } results.

function available() {
  return !!(storage && typeof storage.set === 'function' && typeof storage.get === 'function')
}

function extractValue(data) {
  if (data === undefined || data === null) return ''
  if (typeof data === 'object') {
    if (data.value !== undefined) return data.value
    if (data.data !== undefined) return data.data
  }
  return typeof data === 'string' ? data : ''
}

function read(key) {
  return new Promise(function (resolve) {
    if (!available() || typeof storage.get !== 'function') {
      resolve({ ok: false, value: '', reason: 'unavailable' })
      return
    }
    try {
      storage.get({
        key: key,
        success: function (data) {
          resolve({ ok: true, value: extractValue(data) })
        },
        fail: function () {
          resolve({ ok: false, value: '', reason: 'read-failed' })
        }
      })
    } catch (error) {
      resolve({ ok: false, value: '', reason: 'exception' })
    }
  })
}

function write(key, value) {
  return new Promise(function (resolve) {
    if (!available() || typeof storage.set !== 'function') {
      resolve({ ok: false, reason: 'unavailable' })
      return
    }
    var serialised
    try {
      serialised = typeof value === 'string' ? value : JSON.stringify(value)
    } catch (error) {
      resolve({ ok: false, reason: 'encode-failed' })
      return
    }
    try {
      storage.set({
        key: key,
        value: serialised,
        success: function () {
          resolve({ ok: true })
        },
        fail: function () {
          resolve({ ok: false, reason: 'write-failed' })
        }
      })
    } catch (error) {
      resolve({ ok: false, reason: 'exception' })
    }
  })
}

function remove(key) {
  return new Promise(function (resolve) {
    if (!available() || typeof storage.delete !== 'function') {
      resolve({ ok: false, reason: 'unavailable' })
      return
    }
    try {
      storage.delete({
        key: key,
        success: function () {
          resolve({ ok: true })
        },
        fail: function () {
          resolve({ ok: false, reason: 'delete-failed' })
        }
      })
    } catch (error) {
      resolve({ ok: false, reason: 'exception' })
    }
  })
}

export default {
  available: available,
  read: read,
  write: write,
  remove: remove
}
