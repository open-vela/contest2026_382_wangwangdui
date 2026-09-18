#!/usr/bin/env node
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vela-ui-work-'))
for(const d of ['src/common','docs','design-assets','test']) fs.mkdirSync(path.join(tmp,d),{recursive:true})
fs.writeFileSync(path.join(tmp,'src/manifest.json'),JSON.stringify({package:'com.test.app',name:'Test',icon:'/common/app-icon.png',router:{entry:'pages/home',pages:{'pages/home':{component:'home'}}}}))
fs.writeFileSync(path.join(tmp,'docs/design-intent.json'),JSON.stringify({level:'L2',rationale:'Shared semantics with deliberately shape-native wearable composition.',sharedSemantics:['state'],shapeStrategy:{circle:'round',pill:'tall',rect:'column'}}))
fs.writeFileSync(path.join(tmp,'design-assets/app-icon.svg'),'<svg viewBox="0 0 192 192"></svg>')
const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12,'ascii');png.writeUInt32BE(192,16);png.writeUInt32BE(192,20);fs.writeFileSync(path.join(tmp,'src/common/app-icon.png'),png)
fs.writeFileSync(path.join(tmp,'test/ui_geometry_contract.js'),`module.exports={profiles:[{id:'c',shape:'circle'},{id:'p',shape:'pill'},{id:'r',shape:'rect'}],screens:function(){return [['c','circle'],['p','pill'],['r','rect']].map(function(x){return {route:'pages/home',profileId:x[0],shape:x[1],viewport:{width:192,height:x[1]==='circle'?192:300},rects:[{id:'main',left:x[1]==='circle'?46:12,top:70,width:100,height:40,circleSafe:true}]}})}}`)
const script=path.join(path.dirname(new URL(import.meta.url).pathname),'audit-ui-work.mjs')
let result=spawnSync(process.execPath,[script,tmp],{encoding:'utf8'});if(result.status!==0) throw new Error(result.stdout+result.stderr)
fs.unlinkSync(path.join(tmp,'docs/design-intent.json'));result=spawnSync(process.execPath,[script,tmp],{encoding:'utf8'});if(result.status===0||!result.stdout.includes('DESIGN_INTENT_MISSING')) throw new Error('missing design level must fail')
console.log('openvela UI work audit self-test passed')
