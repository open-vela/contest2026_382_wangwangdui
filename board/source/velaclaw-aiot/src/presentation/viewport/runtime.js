import screenProfile from './profile'
var viewportPolicy = require('./policy')

var DEFAULTS = {
  viewportClass: '',
  viewportPosition: 'relative',
  viewportLeft: '0px',
  viewportTop: '0px',
  viewportWidth: '100%',
  viewportHeight: '100%'
}

function applyValues(page, values) {
  if (!page || !values) return
  page.viewportClass = values.viewportClass
  page.viewportPosition = values.viewportPosition
  page.viewportLeft = values.viewportLeft
  page.viewportTop = values.viewportTop
  page.viewportWidth = values.viewportWidth
  page.viewportHeight = values.viewportHeight
}

function apply(page, profile) {
  if (!page || !profile) return
  applyValues(page, viewportPolicy.legacy(profile))
}

function applyDesign(page, profile) {
  if (!page || !profile) return
  applyValues(page, viewportPolicy.design(profile))
}

function bind(page, callback) {
  screenProfile.resolve(page, function (profile) {
    apply(page, profile)
    if (typeof callback === 'function') callback(profile)
  })
}

module.exports = {
  DEFAULTS: DEFAULTS,
  apply: apply,
  applyDesign: applyDesign,
  bind: bind
}
