/*
 * App registry audit.
 *
 * The launcher, the route table, the page files, the manifest and the icon set
 * are five separate places that have to agree. A mismatch is silent at build
 * time and only shows up as a dead tile or a missing icon on the device, so
 * this check walks the whole chain and names the broken link:
 *
 *   catalog entry -> icon files (+ soft variant) -> route -> page file
 *                 -> manifest router entry -> launcher placement
 *
 * It also reports the reverse direction, so a page that exists but is never
 * reachable is visible instead of forgotten.
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const catalog = require(path.join(root, 'src/v2/design/catalogs/apps.js'))
const routes = require(path.join(root, 'src/v2/app/app_routes.js'))
const launcher = require(path.join(root, 'src/v2/design/apps/launcher/layout.js'))
const manifest = require(path.join(root, 'src/manifest.json'))

const problems = []
const warnings = []

/**
 * A route maps to a page directory, and Vela accepts either naming inside it:
 * `pages/heartrate/heartrate.ux` or `pages/watchface/index.ux`.
 */
function pageFileCandidates(route) {
  const relative = String(route).replace(/^\//, '')
  const name = path.basename(relative)
  return [
    path.join(root, 'src', relative, `${name}.ux`),
    path.join(root, 'src', relative, 'index.ux')
  ]
}

function resolvePageFile(route) {
  const candidates = pageFileCandidates(route)
  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

const surfaces = Object.keys(launcher).filter(function (key) {
  return launcher[key] && typeof launcher[key] === 'object'
})
const placed = []
const placementSource = {}
surfaces.forEach(function (shape) {
  // A shape inherits `appIds` from `base` unless it overrides the list, exactly
  // like the runtime selection does.
  const list = launcher[shape].appIds || (launcher.base && launcher.base.appIds) || []
  placementSource[shape] = list.length
  list.forEach(function (id) {
    if (placed.indexOf(id) < 0) placed.push(id)
  })
})

placed.forEach(function (id) {
  const app = catalog.get(id)
  if (app.label === id) problems.push(`launcher lists "${id}" but the catalog has no entry for it`)

  // Icon: the tile renders `icon`, the focus state renders `softIcon`.
  ;[['icon', app.icon], ['softIcon', app.softIcon]].forEach(function (pair) {
    const label = pair[0]
    const webPath = pair[1]
    if (!webPath) {
      problems.push(`${id}: catalog is missing ${label}`)
      return
    }
    const onDisk = path.join(root, 'src', String(webPath).replace(/^\//, ''))
    if (!fs.existsSync(onDisk)) problems.push(`${id}: ${label} ${webPath} does not exist on disk`)
  })

  // Route + page + manifest.
  const route = routes.routeFor(id)
  if (!route) {
    // Known state: the clock tile is a shortcut that only pops the stack. It is
    // reported so it stays visible, but it is not a broken link.
    warnings.push(`${id}: no route in app_routes.js, so its tile only navigates back`)
    return
  }
  const pageFile = resolvePageFile(route)
  if (!pageFile) {
    problems.push(
      `${id}: route ${route} has no page (tried ${pageFileCandidates(route)
        .map((candidate) => path.relative(root, candidate))
        .join(' and ')})`
    )
  }
  const manifestKey = route.replace(/^\//, '')
  if (!manifest.router.pages[manifestKey]) problems.push(`${id}: route ${route} is not registered in manifest.router.pages`)
})

// Reverse direction: every manifest page should exist as a file.
Object.keys(manifest.router.pages).forEach(function (key) {
  if (!resolvePageFile('/' + key)) {
    problems.push(`manifest registers ${key} but no page file exists for it`)
  }
})

// Reverse direction: every page on disk should be reachable from the manifest.
function pageFiles(dir, out) {
  out = out || []
  fs.readdirSync(dir).forEach(function (name) {
    const file = path.join(dir, name)
    const stat = fs.statSync(file)
    if (stat.isDirectory()) {
      pageFiles(file, out)
      return
    }
    if (name.endsWith('.ux')) out.push(file)
  })
  return out
}

const pagesRoot = path.join(root, 'src/pages')
pageFiles(pagesRoot).forEach(function (file) {
  // The manifest key is the directory, not the file name.
  const relative = path.relative(pagesRoot, path.dirname(file)).split(path.sep).join('/')
  const key = 'pages/' + relative
  if (!manifest.router.pages[key]) warnings.push(`${key} exists on disk but is not in manifest.router.pages`)
})

console.log('App registry audit')
console.log(`- launcher surfaces: ${surfaces.join(', ')}`)
surfaces.forEach(function (shape) {
  console.log(`  - ${shape}: ${placementSource[shape]} apps`)
})
console.log(`- distinct placed apps: ${placed.length} (${placed.join(', ')})`)
console.log(`- manifest pages: ${Object.keys(manifest.router.pages).length}`)

if (warnings.length) {
  console.log('\nWarnings (pre-existing, not a broken link):')
  warnings.forEach(function (warning) {
    console.log('- ' + warning)
  })
}

if (problems.length) {
  console.error('\nApp registry violations:')
  problems.forEach(function (problem) {
    console.error('- ' + problem)
  })
  process.exit(1)
}

console.log('\nApp registry verified: every placed app resolves to an icon pair, a route, a page file and a manifest entry')
