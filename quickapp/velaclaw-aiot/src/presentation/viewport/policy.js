function cloneViewport(profile) {
  return {
    viewportClass: profile.viewportClass || '',
    viewportPosition: profile.viewportPosition || 'relative',
    viewportLeft: profile.viewportLeft || '0px',
    viewportTop: profile.viewportTop || '0px',
    viewportWidth: profile.viewportWidth || '100%',
    viewportHeight: profile.viewportHeight || '100%'
  }
}

function design(profile) {
  var result = cloneViewport(profile || {})
  var isBand10Beta = !!(profile && profile.isBetaPillViewport && Number(profile.screenWidth) === 212)
  if (!isBand10Beta) return result

  // Band 10 beta legacy pages use a 24px root inset. Design Engine pages already
  // reserve the capsule cap in their own geometry, so applying both insets makes
  // the rendered coordinate system shorter than the Layout Plan and can create
  // bottom overflow. Restore the full 192-wide, 471-high design canvas here.
  result.viewportPosition = 'absolute'
  result.viewportLeft = '0px'
  result.viewportTop = '0px'
  result.viewportWidth = '192px'
  result.viewportHeight = Math.max(1, Math.round(Number(profile.logicalHeight) || 1)) + 'px'
  return result
}

module.exports = {
  legacy: cloneViewport,
  design: design
}
