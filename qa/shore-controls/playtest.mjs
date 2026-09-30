import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('.',import.meta.url)),base=process.env.SHORE_QA_URL||'http://127.0.0.1:4213/dist/';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'no-preference'});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/pacifica-game.js*',async route=>{
 const response=await route.fetch();
 await route.fulfill({response,body:await response.text()+`
window.shorePlay={sim,world,place({rig='grub_jig',x=scene.id==='benicia'?1900:2440}={}){
 closeDialog();resetInput();sim.clearLine();sim.state.inspection=null;sim.state.onPier=false;
 Object.assign(sim.state.player,{x,y:scene.shoreY(x)+SHORE_MOVEMENT.stand});
 sim.state.rodSupplies[sim.state.activeRod]={id:rig,condition:1,bait:isShoreLure(rig)?null:{kind:'sandcrab',condition:1}};
 sim.state.rig=rig==='float_rig'?'float':isShoreLure(rig)?'lure':rig==='fishfinder_rig'?'fishfinder':'carolina';
 sim.state.seaState={waveHeightM:.65,wavePeriodS:10,waveDirectionDeg:10,tideM:.8};
 sim.setFishingControls({reelSpeed:.6,rodLift:.35,rodSweep:0,drag:.5});
 // Isolate real browser controls from random encounters; strike is exercised
 // through its visible button after a deterministic bite fixture below.
 sim.stepFish=()=>{};sim.state.wardenNextAt=1e9;sim.state.elapsed=0;
 interactions.reset(sim.state);world.focus(null);updateUI();return sim.state;
},cast(power=.65){const result=sim.cast({power,aim:.15});if(!result.ok)throw new Error(result.message);this.advance(sim.state.cast.flightDuration+.05,{reel:false,crankRate:0});return sim.state;
},advance(seconds,input={}){for(let t=0;t<seconds;t+=.025)sim.update(Math.min(.025,seconds-t),input);updateUI();return sim.state;
},bite(id='jacksmelt',length=33){if(!sim.state.cast)this.cast();sim.state.phase='bite';sim.state.biteSpeciesId=id;sim.state.biteLengthCm=length;sim.state.biteRemaining=8;lastPhase='bite';updateUI();return sim.state;
},frame(){return {castCharge,world:lastWorldFrame};},freeze(){focused=false;resetInput();updateUI();},resume(){focused=true;last=performance.now();updateUI();}};`});
});
const state=()=>page.locator('#beach-state').textContent().then(JSON.parse);
const removed='#shore-rod-pad,#shore-rod-thumb,#shore-reel-speed,#shore-speed-value,#beach-retrieve,#beach-tension,#fish-distance,#charge-fill';
async function shot(name){await page.screenshot({path:out+name+'.png',style:'#toast{visibility:hidden!important}'});}
async function settle(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function assertScene(){assert.equal(await page.locator('#world').isVisible(),true);assert.equal(await page.locator('#fight-view').count(),0);assert.equal((await state()).view,'shore');}
async function assertStopped(message){
 await page.waitForTimeout(550);await settle();const s=await state(),angle=s.reelVisual.handleAngle;
 assert.equal(s.reelVisual.winding,false,message);assert.equal(s.reelFeedback.handleRate,0,message);
 await page.waitForTimeout(180);assert.equal((await state()).reelVisual.handleAngle,angle,message+'; drift must not crank the handle');
 return angle;
}
async function freshCast(){await page.evaluate(()=>{window.shorePlay.place();window.shorePlay.cast();window.shorePlay.advance(2,{crankRate:0});});await settle();}
// These are genuine keyboard events while the drag range retains focus. The
// identical duration and fresh cast make the achieved line pickup comparable.
async function cadence(intervalMs,taps){
 await freshCast();await page.locator('#shore-drag').focus();const before=await state(),start=Date.now();
 for(let i=0;i<taps;i++){
  const wait=start+i*intervalMs-Date.now();if(wait>0)await page.waitForTimeout(wait);
  await page.keyboard.press('f');
 }
 const rest=start+3000-Date.now();if(rest>0)await page.waitForTimeout(rest);
 const after=await state();assert.equal(after.reelVisual.winding,false,'each cadence ends after its final finite stroke');
 return {taps,intervalMs,seconds:after.elapsed-before.elapsed,pickup:before.lineDistance-after.lineDistance};
}
try{
 for(const scene of ['pacifica','half-moon-bay','benicia']){
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();await page.evaluate(()=>window.shorePlay.place());await settle();
  await assertScene();assert.equal(await page.locator(removed).count(),0,'only the simplified fishing controls remain');
  assert.match(await page.locator('#tackle-name').textContent(),/#2 · 1\/2 oz/);
  assert.doesNotMatch(await page.locator('#boat-console').innerText(),/%|\bft\b|\bHs\b/);
  assert.equal(await page.locator('#boat-console').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(24, 62, 69)');
  await page.locator('#shore-drag').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await settle();
  assert.equal((await state()).fishingControls.drag,.15,'drag still adjusts with normal range keyboard controls');
  await page.keyboard.press('End');await settle();assert.equal((await state()).fishingControls.drag,1);
  await page.keyboard.press('Home');for(let i=0;i<8;i++)await page.keyboard.press('ArrowRight');await settle();assert.equal((await state()).fishingControls.drag,.5);
  // A held cast charges the real rod; there is no trajectory forecast.
  const castButton=await page.locator('#beach-cast').boundingBox();
  await page.mouse.move(castButton.x+castButton.width/2,castButton.y+castButton.height/2);await page.mouse.down();await page.waitForTimeout(950);
  assert.equal(await page.locator('#cast-charge').count(),0);assert.deepEqual(await page.locator('#beach-cast').boundingBox(),castButton,'charging must not move the held button');const charging=await page.evaluate(()=>window.shorePlay.frame());assert.ok(charging.castCharge>.4);assert.equal(charging.world.castPreview,null);await shot(scene+'-cast');await page.mouse.up();
  await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='waiting');await assertScene();
  let s=await state();const initialDepth=s.presentation.depth,handleBefore=s.reelVisual.handleAngle;
  // Holding the pointer does nothing; completing one click makes one bounded stroke.
  const reelButton=await page.locator('#beach-reel').boundingBox();await page.mouse.move(reelButton.x+reelButton.width/2,reelButton.y+reelButton.height/2);await page.mouse.down();await page.waitForTimeout(130);
  s=await state();assert.equal(s.reelVisual.winding,false);assert.equal(s.reelVisual.handleAngle,handleBefore);
  await assertStopped('holding the reel button cannot wind indefinitely');
  await page.mouse.up();await page.waitForTimeout(130);assert.ok((await state()).reelVisual.winding,'completing the click starts its one stroke');await assertStopped('the completed click ends without held reeling');
  // A normal complete click also makes a finite stroke and then rests.
  await page.locator('#beach-reel').click();await page.waitForTimeout(120);assert.ok((await state()).reelVisual.winding);await assertStopped('one click finishes and stops');
  // Repeated keydown events simulate OS autorepeat and must not enqueue turns.
  await page.locator('#shore-drag').focus();await page.keyboard.down('f');await page.waitForTimeout(120);assert.ok((await state()).reelVisual.winding,'F works from the focused drag slider');
  for(let i=0;i<7;i++){await page.keyboard.down('f');await page.waitForTimeout(100);}
  const keyStop=await assertStopped('holding F and OS key repeat cannot sustain winding');await page.keyboard.up('f');await settle();assert.equal((await state()).reelVisual.handleAngle,keyStop);
  const sparse=await cadence(1500,2),dense=await cadence(450,6);
  assert.ok(dense.pickup>sparse.pickup+1,'denser actual F taps must recover materially more line: '+JSON.stringify({sparse,dense}));
  await page.keyboard.press('r');await assertStopped('the removed auto-retrieve shortcut cannot start winding');assert.equal((await state()).autoRetrieve,false);
  await page.locator('#beach-twitch').click();await settle();assert.ok((await state()).presentation.twitch>0);await shot(scene+'-retrieve');
  // Use the actual visible strike control, keeping the same cast anchor/canvas.
  const anchor=(await state()).cast.origin;await page.evaluate(()=>window.shorePlay.bite());await settle();assert.equal(await page.locator('#beach-cast').textContent(),'扬竿');
  await page.locator('#beach-cast').click();await settle();await assertScene();
  s=await state();assert.equal(s.phase,'fighting');assert.ok(s.fishMotion);assert.deepEqual(s.cast.origin,anchor);
  await page.locator('#beach-twitch').click();await settle();assert.ok((await state()).presentation.twitch>0,'the same light-lift control works during the fight');
  await page.locator('#beach-reel').click();await page.waitForTimeout(120);assert.ok((await state()).reelVisual.winding,'tap winding remains active during a fight');await shot(scene+'-fight');
  await page.evaluate(()=>window.shorePlay.freeze());
  for(const [label,width,height]of[['small-phone',320,568],['landscape',844,390],['desktop',1440,1000]]){
   await page.setViewportSize({width,height});await settle();await assertScene();assert.equal(await page.locator(removed).count(),0);
   for(const id of ['shore-drag','beach-reel','beach-twitch']){
    const box=await page.locator('#'+id).boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,scene+' '+label+' '+id+' '+JSON.stringify(box));
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(label==='small-phone'||label==='landscape')await shot(scene+'-'+label);
  }
  const frozen=(await state()).elapsed,pausedReel=(await state()).reelVisual;await page.waitForTimeout(120);assert.equal((await state()).elapsed,frozen);assert.deepEqual((await state()).reelVisual,pausedReel);
  await page.setViewportSize({width:390,height:844});
  checks.push({scene,checks:['Continuous world through actual charged cast, visible strike and fight','No posture pad, speed slider, auto retrieve or numeric fishing gauges','Each click makes a finite winding stroke and stops','Held pointer and repeated F keydown cannot sustain winding','Denser actual F taps retrieve more line','F works from the drag slider; drag range still adjusts','Light twitch works before and after the visible strike','Removed R shortcut cannot start automatic winding','Only drag, reel and twitch controls remain within phone/landscape/desktop bounds','Opaque readable panel and hook/weight label','Blur freezes simulation and reel'],initialDepth,cadence:{sparse,dense}});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
