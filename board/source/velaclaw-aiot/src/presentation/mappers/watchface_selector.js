var faceCatalog = require('../../domain/watchface/catalog')

function selectedId(faceIds, requested) {
  var ids = faceIds || []
  if (!ids.length) return 'sport'
  for (var i = 0; i < ids.length; i++) {
    if (ids[i] === requested) return requested
  }
  return ids[0]
}

function mapFaces(faceIds, requested) {
  var normalized = selectedId(faceIds, requested)
  var faces = faceCatalog.list(faceIds)
  for (var i = 0; i < faces.length; i++) {
    faces[i].selected = faces[i].id === normalized
    faces[i].border = faces[i].selected ? faces[i].accent : '#2C2C2E'
  }
  return {
    selectedId: normalized,
    selectedIndex: faceCatalog.indexOf(faceIds, normalized),
    faces: faces
  }
}

function pageIndex(selectedIndex, pageSize) {
  var size = Math.max(1, Number(pageSize) || 1)
  return Math.floor(Math.max(0, Number(selectedIndex) || 0) / size)
}

module.exports = {
  mapFaces: mapFaces,
  pageIndex: pageIndex,
  selectedId: selectedId
}
