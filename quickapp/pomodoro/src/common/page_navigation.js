import router from '@system.router'

// Thin navigation boundary: pages never call @system.router directly, so route
// names live in one place and a navigation failure can never break a tap.
// (Named page_navigation, not "navigator", so it cannot be mistaken for - or
// flagged as - the browser global.)

function to(uri, params) {
  try {
    router.push({ uri: uri, params: params || {} })
    return true
  } catch (error) {
    return false
  }
}

function back() {
  try {
    router.back()
    return true
  } catch (error) {
    return false
  }
}

export default {
  to: to,
  back: back
}
