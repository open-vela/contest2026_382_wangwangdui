#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
const root = path.resolve(process.argv[2] || process.cwd())
const errors = []
function fail(code, message) { errors.push({ code, message }) }
function readJson(file, code) { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch (error) { fail(code, error.message); return null } }
function finite(v) { return typeof v === 'number' && Number.isFinite(v) }
function chordWidth(side, y) { const r=side/2, o=Math.abs(y-r); return o>=r?0:2*Math.sqrt(r*r-o*o) }
function chord(side, top, height) { return Math.min(chordWidth(side, top), chordWidth(side, top + height)) }
const manifest = readJson(path.join(root,'src','manifest.json'),'MANIFEST_INVALID')
const intentPath = path.join(root,'docs','design-intent.json')
if (!fs.existsSync(intentPath)) fail('DESIGN_INTENT_MISSING','docs/design-intent.json is required before UI implementation')
const intent = fs.existsSync(intentPath) ? readJson(intentPath,'DESIGN_INTENT_INVALID') : null
if (intent) {
  if (!['L1','L2','L3'].includes(intent.level)) fail('DESIGN_LEVEL_REQUIRED','level must be L1, L2, or L3')
  if (typeof intent.rationale!=='string'||intent.rationale.trim().length<20) fail('DESIGN_RATIONALE_REQUIRED','rationale is required')
  if (!Array.isArray(intent.sharedSemantics)||!intent.sharedSemantics.length) fail('SHARED_SEMANTICS_REQUIRED','sharedSemantics is required')
  for (const shape of ['circle','pill','rect']) if (!intent.shapeStrategy||typeof intent.shapeStrategy[shape]!=='string'||!intent.shapeStrategy[shape].trim()) fail('SHAPE_STRATEGY_REQUIRED',`shapeStrategy.${shape} is required`)
}
if (manifest) {
  if (!manifest.package||!manifest.name) fail('APP_IDENTITY_REQUIRED','manifest package and name are required')
  const routes=Object.keys((manifest.router&&manifest.router.pages)||{})
  if (!manifest.router||!routes.includes(manifest.router.entry)) fail('ENTRY_REQUIRED','router.entry must be a declared page')
  if (!manifest.icon||path.extname(manifest.icon).toLowerCase()!=='.png') fail('RUNTIME_ICON_REQUIRED','manifest.icon must reference PNG')
  else {
    const iconPath=path.join(root,'src',manifest.icon.replace(/^\/+/,''))
    if (!fs.existsSync(iconPath)) fail('RUNTIME_ICON_MISSING',manifest.icon)
    else { const data=fs.readFileSync(iconPath); if(data.length<24||data.toString('ascii',1,4)!=='PNG') fail('RUNTIME_ICON_INVALID','runtime icon is not PNG'); else if(data.readUInt32BE(16)!==192||data.readUInt32BE(20)!==192) fail('RUNTIME_ICON_SIZE','runtime icon must be 192x192') }
  }
  const svg=path.join(root,'design-assets','app-icon.svg')
  if(!fs.existsSync(svg)) fail('SVG_ICON_SOURCE_REQUIRED','design-assets/app-icon.svg is required')
  else { const source=fs.readFileSync(svg,'utf8'); if(!/<svg\b/i.test(source)||!/viewBox\s*=/i.test(source)) fail('SVG_ICON_SOURCE_INVALID','app-icon.svg must contain svg + viewBox') }
  const contractPath=path.join(root,'test','ui_geometry_contract.js')
  if(!fs.existsSync(contractPath)) fail('GEOMETRY_CONTRACT_MISSING','test/ui_geometry_contract.js is required')
  else try {
    const require=createRequire(import.meta.url), contract=require(contractPath), profiles=Array.isArray(contract.profiles)?contract.profiles:[], screens=typeof contract.screens==='function'?contract.screens():[]
    for(const shape of ['circle','pill','rect']) if(!profiles.some(p=>p&&p.shape===shape)) fail('SHAPE_PROFILE_REQUIRED',`missing ${shape} profile`)
    for(const p of profiles) for(const route of routes) if(!screens.some(s=>s.route===route&&s.profileId===p.id)) fail('ROUTE_PROFILE_MISSING',`${route}/${p.id}`)
    for(const s of screens) for(const r of s.rects||[]) {
      const vp=s.viewport||{}
      if(![r.left,r.top,r.width,r.height].every(finite)||r.width<=0||r.height<=0){fail('RECT_INVALID',`${s.route}/${s.profileId}/${r.id}`);continue}
      if(r.left<0||r.top<0||r.left+r.width>vp.width+.01||r.top+r.height>vp.height+.01) fail('RECT_OUT_OF_VIEWPORT',`${s.route}/${s.profileId}/${r.id}`)
      if(s.shape==='circle'&&r.circleSafe){const b=chord(vp.width,r.top,r.height),l=(vp.width-b)/2;if(r.left<l-.51||r.left+r.width>l+b+.51) fail('CIRCLE_CHORD_VIOLATION',`${s.route}/${s.profileId}/${r.id}`)}
    }
  } catch(error) { fail('GEOMETRY_CONTRACT_INVALID',error.stack||error.message) }
}
console.log('openvela UI work audit')
console.log(`- errors: ${errors.length}`)
for(const x of errors) console.log(`- [error] ${x.code}: ${x.message}`)
if(!errors.length) console.log('- design, app identity, and route/profile geometry gates passed')
process.exit(errors.length?1:0)
