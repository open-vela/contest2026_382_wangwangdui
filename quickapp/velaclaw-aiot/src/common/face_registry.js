var faceCatalog = require('../domain/watchface/catalog')
var availability = require('../presentation/watchface/availability')

function getAll(scope) {
  return faceCatalog.list(availability.idsFor(scope || 'rect'))
}

function getIndex(faceId, scope) {
  var faces = getAll(scope)
  for (var index = 0; index < faces.length; index++) {
    if (faces[index].id === faceId) return index
  }
  return 0
}

function getById(faceId, scope) {
  return getByIndex(getIndex(faceId, scope), scope)
}

function getByIndex(index, scope) {
  var faces = getAll(scope)
  if (index < 0 || index >= faces.length) return faces[0]
  return faces[index]
}

function makeDots(index, scope) {
  var faces = getAll(scope)
  var activeFace = getByIndex(index, scope)
  var dots = []
  for (var dotIndex = 0; dotIndex < faces.length; dotIndex++) {
    dots.push({
      width: dotIndex === index ? 18 : 6,
      color: dotIndex === index ? activeFace.accent : '#3A3A3C'
    })
  }
  return dots
}

export default {
  getAll: getAll,
  getIndex: getIndex,
  getById: getById,
  getByIndex: getByIndex,
  makeDots: makeDots
}
