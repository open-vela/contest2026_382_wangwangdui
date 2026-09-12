import watchfaceStore from '../../../domain/watchface/store'
import faceCatalog from '../../../domain/watchface/catalog'

export function createWatchfaceController(onChange) {
  var ids = []
  var selectedId = 'sport'

  function normalize(id) {
    if (ids.indexOf(id) >= 0) return id
    return ids.length ? ids[0] : 'sport'
  }

  function snapshot() {
    selectedId = normalize(selectedId)
    var faces = faceCatalog.list(ids)
    var selectedIndex = 0
    for (var i = 0; i < faces.length; i++) if (faces[i].id === selectedId) selectedIndex = i
    return { selectedId: selectedId, selectedIndex: selectedIndex, faces: faces }
  }

  function emit() {
    var value = snapshot()
    if (typeof onChange === 'function') onChange(value)
    return value
  }

  return {
    configure: function (faceIds) {
      ids = Array.isArray(faceIds) ? faceIds.slice() : []
      return emit()
    },
    load: function () {
      watchfaceStore.loadSelectedFaceId(function (id) { selectedId = normalize(id); emit() })
    },
    select: function (id, callback) {
      selectedId = normalize(id)
      emit()
      watchfaceStore.setSelectedFaceId(selectedId, function () { if (callback) callback(selectedId) })
    },
    refresh: emit
  }
}
