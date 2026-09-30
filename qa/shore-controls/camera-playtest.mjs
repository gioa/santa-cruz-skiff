import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('.',import.meta.url)),base=process.env.SHORE_QA_URL||'http://127.0.0.1:4213/dist/';
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:320,height:568}}),errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/pacifica-game.js*',async route=>{
 const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
window.cameraReview={place(sign=1,phase='waiting'){
 closeDialog();sim.clearLine();const s=sim.state,x=scene.id==='benicia'?1500:2440;
 Object.assign(s.player,{x,y:scene.shoreY(x)+24});s.inspection=null;s.onPier=false;s.regular=null;s.crowd=[];
 s.cast={origin:{x,y:s.player.y-18},target:{x:x+sign*360,y:s.player.y-230},distance:Math.hypot(360,212)/3.2,flightDuration:1};
 s.cast.fightDistance=s.cast.distance;s.phase=phase;s.lineDistance=s.cast.distance;s.tension=.3;s.elapsed=5;s.autoRetrieve=false;
 s.rodSupplies[s.activeRod]={id:'float_rig',condition:1,bait:{kind:'sandcrab',condition:1}};s.rig='float';s.presentation={mode:'float',depth:1};
 s.seaState={waveHeightM:0,tideM:1.2};s.fish=phase==='fighting'?{id:'jacksmelt',length:33,weightKg:.3}:null;
 s.fishMotion=phase==='fighting'?{depth:0,airHeight:.2,jumpActive:true,lateral:0,energy:.6,run:1,headShake:.3,splash:.4}:null;
 focused=false;resetInput();lastPhase=phase;world.focus(null);updateUI();resize();
},inspect(){const f=lastWorldFrame,points={angler:world.worldToScreen(sim.state.player),waterEntry:world.worldToScreen(f.tackle.waterEntry),rodTip:world.worldToScreen(f.tackle.rodTip)};
 if(f.fishVisual.visible)points.fish=world.worldToScreen(f.fishVisual.world);
 const overlays=[...document.querySelectorAll('.hud,#trip-info,#trip-tools,.location-hud-link,#boat-console')].filter(e=>e.getClientRects().length).map(e=>{const b=e.getBoundingClientRect();return{id:e.id||e.className,left:b.left,right:b.right,top:b.top,bottom:b.bottom};});
 return{points,overlays,camera:f.camera,safe:f.actionCamera.safeBounds};}};`});
});
try{
 for(const scene of ['pacifica','half-moon-bay','benicia']){
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();
  for(const [label,width,height,safeTop,safeBottom]of[['small-phone',320,568,0,0],['notched-phone',390,844,44,34],['landscape',844,390,0,0]]){
   await page.setViewportSize({width,height});
   await page.evaluate(({safeTop,safeBottom})=>{document.documentElement.style.setProperty('--safe-top',safeTop+'px');document.documentElement.style.setProperty('--safe-bottom',safeBottom+'px');},{safeTop,safeBottom});
   for(const sign of [-1,1])for(const phase of ['waiting','fighting']){
    await page.evaluate(({sign,phase})=>window.cameraReview.place(sign,phase),{sign,phase});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
    const result=await page.evaluate(()=>window.cameraReview.inspect());
    for(const [name,p]of Object.entries(result.points)){
     assert.ok(p.visible&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height,`${scene} ${label} ${phase} ${name} outside screen`);
     const cover=result.overlays.find(r=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom);
     assert.equal(cover,undefined,`${scene} ${label} ${phase} ${sign} ${name} covered by ${cover?.id} at ${p.x},${p.y}`);
    }
    checks.push({scene,viewport:label,direction:sign,phase,scale:result.camera.scale,points:result.points});
   }
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'camera-results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({scenarios:checks.length,errors}));
}finally{await browser.close();}
