'use strict'

function clone(value) {
  if (Array.isArray(value)) return value.map(clone)
  if (!value || typeof value !== 'object') return value
  const result = {}
  Object.keys(value).forEach(key => { result[key] = clone(value[key]) })
  return result
}

function getPath(source, path) {
  if (!path) return source
  const parts = String(path).split('.')
  let current = source
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return undefined
    current = current[part]
  }
  return current
}

function hasPath(source, path) {
  if (!path) return true
  const parts = String(path).split('.')
  let current = source
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) return false
    current = current[part]
  }
  return true
}

function setPath(target, path, value) {
  const parts = String(path).split('.')
  let current = target
  parts.forEach((part, index) => {
    if (index === parts.length - 1) current[part] = value
    else {
      if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) current[part] = {}
      current = current[part]
    }
  })
  return target
}

function deletePath(target, path) {
  const parts = String(path).split('.')
  const stack = []
  let current = target
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) return target
    stack.push([current, part])
    current = current[part]
  }
  const last = stack.pop()
  delete last[0][last[1]]
  while (stack.length) {
    const entry = stack.pop()
    const child = entry[0][entry[1]]
    if (child && typeof child === 'object' && !Array.isArray(child) && Object.keys(child).length === 0) delete entry[0][entry[1]]
    else break
  }
  return target
}

function replaceObject(target, source) {
  Object.keys(target).forEach(key => { delete target[key] })
  Object.keys(source || {}).forEach(key => { target[key] = clone(source[key]) })
  return target
}

module.exports = { clone, getPath, hasPath, setPath, deletePath, replaceObject }
