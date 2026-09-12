var visuals = require('../../watchface_catalog')

function decorate(face, selectedId) {
  var style = visuals.get(face && face.id)
  return {
    id: face.id,
    name: face.name,
    description: face.description,
    tag: face.tag,
    background: style.background,
    accent: style.accent,
    selected: face.id === selectedId,
    borderColor: face.id === selectedId ? style.accent : '#2C2C2E'
  }
}

function project(state, gap) {
  var source = state || { faces: [], selectedId: 'sport', selectedIndex: 0 }
  var faces = []
  var rectFaces = []
  var gridGap = Math.max(0, Number(gap) || 0)
  for (var i = 0; i < source.faces.length; i++) {
    var face = decorate(source.faces[i], source.selectedId)
    faces.push(face)
    var rect = {}
    for (var key in face) rect[key] = face[key]
    rect.marginRight = i % 2 === 0 ? gridGap : 0
    rect.marginBottom = i < 2 ? gridGap : 0
    rectFaces.push(rect)
  }
  var selected = faces[source.selectedIndex] || faces[0]
  return {
    faces: faces,
    rectFaces: rectFaces,
    selectedIndex: selected ? Math.max(0, faces.indexOf(selected)) : 0,
    selectedName: selected ? selected.name : '活力数字',
    selectedAccent: selected ? selected.accent : visuals.get('sport').accent,
    previewName: selected ? selected.name : '活力数字'
  }
}

module.exports = { project: project }
