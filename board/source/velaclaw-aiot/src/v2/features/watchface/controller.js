import watchfaceStore from '../../../domain/watchface/store'
import faceCatalog from '../../../domain/watchface/catalog'

export function createWatchfaceController(onChange) {
  var ids = []
  var selectedId = watchfaceStore.getSelectedFaceId() || 'sport'

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
      selectedId = normalize(watchfaceStore.getSelectedFaceId() || selectedId)
      return emit()
    },
    load: function () {
      watchfaceStore.loadSelectedFaceId(function (id) { selectedId = normalize(id || watchfaceStore.getSelectedFaceId()); emit() })
    },
    loadFromEntry: function () {
      watchfaceStore.consumeRightFaceTransition(function (id) {
        if (id) {
          selectedId = normalize(id)
          emit()
        } else {
          watchfaceStore.loadSelectedFaceId(function (storedId) { selectedId = normalize(storedId || watchfaceStore.getSelectedFaceId()); emit() })
        }
      })
    },
    setCurrent: function (id) {
      selectedId = normalize(id || selectedId)
      return emit()
    },
    select: function (id, callback) {
      selectedId = normalize(id)
      emit()
      watchfaceStore.setSelectedFaceId(selectedId, function () { if (callback) callback(selectedId) })
    },
    refresh: emit
  }
}
