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
 closeDialog();sim.clearLine();sim.state.inspection=null;sim.state.onPier=false;
 Object.assign(sim.state.player,{x,y:scene.shoreY(x)+24});
 sim.state.rodSupplies[sim.state.activeRod]={id:rig,condition:1,bait:isShoreLure(rig)?null:{kind:'sandcrab',condition:1}};
 sim.state.rig=rig==='float_rig'?'float':isShoreLure(rig)?'lure':rig==='fishfinder_rig'?'fishfinder':'carolina';
 sim.state.seaState={waveHeightM:.65,wavePeriodS:10,waveDirectionDeg:10,tideM:.8};
 sim.setFishingControls({reelSpeed:.6,rodLift:.35,rodSweep:0,drag:.5});
 interactions.reset(sim.state);world.focus(null);updateUI();return sim.state;
},cast(power=.65){const result=sim.cast({power,aim:.15});if(!result.ok)throw new Error(result.message);this.advance(sim.state.cast.flightDuration+.05,{reel:false});return sim.state;
},advance(seconds,input={}){for(let t=0;t<seconds;t+=.025)sim.update(Math.min(.025,seconds-t),input);updateUI();return sim.state;
},hook(id='jacksmelt',length=33){if(!sim.state.cast)this.cast();sim.state.phase='bite';sim.state.biteSpeciesId=id;sim.state.biteLengthCm=length;const r=sim.strike();if(!r.ok)throw new Error(r.message);lastPhase=sim.state.phase;updateUI();return sim.state;
},freeze(){focused=false;resetInput();updateUI();},resume(){focused=true;last=performance.now();updateUI();}};`});
});
const state=()=>page.locator('#beach-state').textContent().then(JSON.parse);
async function shot(name){await page.screenshot({path:out+name+'.png',style:'#toast{visibility:hidden!important}'});}
async function settle(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function assertScene(){assert.equal(await page.locator('#world').isVisible(),true);assert.equal(await page.locator('#fight-view').count(),0);assert.equal((await state()).view,'shore');}
try{
 for(const scene of ['pacifica','half-moon-bay','benicia']){
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();await page.evaluate(()=>window.shorePlay.place());await settle();
  await assertScene();
  assert.match(await page.locator('#tackle-name').textContent(),/#2 · 1\/2 oz/);
  assert.equal(await page.locator('#boat-console').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(24, 62, 69)');
  await page.locator('#shore-reel-speed').focus();await page.keyboard.press('Home');await settle();assert.equal((await state()).fishingControls.reelSpeed,.2);
  await page.locator('#shore-reel-speed').focus();await page.keyboard.press('End');
  await page.locator('#shore-drag').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  await page.locator('#shore-rod-pad').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowRight');
  await settle();let s=await state();assert.equal(s.fishingControls.reelSpeed,1);assert.equal(s.fishingControls.drag,.15);assert.ok(s.fishingControls.rodLift>.35&&s.fishingControls.rodSweep>0);
  // The visible charge/release button performs an actual cast on this canvas.
  const castButton=await page.locator('#beach-cast').boundingBox();
  await page.mouse.move(castButton.x+castButton.width/2,castButton.y+castButton.height/2);await page.mouse.down();await page.waitForTimeout(950);
  assert.equal(await page.locator('#cast-charge').isVisible(),true);await shot(scene+'-cast');await page.mouse.up();
  await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='waiting');await assertScene();
  s=await state();const before=s.lineDistance,depth=s.presentation.depth;
  const reelButton=await page.locator('#beach-reel').boundingBox();await page.mouse.move(reelButton.x+reelButton.width/2,reelButton.y+reelButton.height/2);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();
  s=await state();assert.ok(s.lineDistance<before,'held reel moves the lure toward the bank');
  const keyBefore=s.lineDistance;await page.locator('#shore-reel-speed').focus();await page.keyboard.down('f');await page.waitForTimeout(250);await page.keyboard.up('f');await settle();assert.ok((await state()).lineDistance<keyBefore,'reel shortcut still works after a slider adjustment');
  await page.locator('#beach-twitch').click();await settle();assert.ok((await state()).presentation.twitch>0);
  await page.locator('#beach-retrieve').click();s=await state();assert.ok(s.cast&&s.autoRetrieve,'reel-home starts without teleporting');
  await page.locator('#beach-retrieve').click();assert.equal((await state()).autoRetrieve,false);
  await shot(scene+'-retrieve');
  // Same rod, same controls and same canvas through a real strike transition.
  await page.evaluate(()=>window.shorePlay.hook());await settle();await assertScene();
  const fight=await state();assert.ok(fight.fishMotion&&fight.phase==='fighting');
  const pad=await page.locator('#shore-rod-pad').boundingBox();await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();await page.mouse.move(pad.x+pad.width-17,pad.y+17,{steps:6});await page.mouse.up();
  s=await state();assert.ok(s.fishingControls.rodLift>.7&&s.fishingControls.rodSweep>.5);
  await shot(scene+'-fight');
  await page.evaluate(()=>window.shorePlay.freeze());
  for(const [label,width,height]of[['small-phone',320,568],['landscape',844,390],['desktop',1440,1000]]){
   await page.setViewportSize({width,height});await settle();await assertScene();
   for(const id of ['shore-rod-pad','shore-reel-speed','shore-drag','beach-reel','beach-twitch']){
    const box=await page.locator('#'+id).boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,scene+' '+label+' '+id+' '+JSON.stringify(box));
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(label==='small-phone'||label==='landscape')await shot(scene+'-'+label);
  }
  const frozen=(await state()).elapsed;await page.waitForTimeout(120);assert.equal((await state()).elapsed,frozen);
  await page.setViewportSize({width:390,height:844});
  checks.push({scene,checks:['Continuous world through cast/retrieve/strike/fight','Keyboard speed/drag/rod controls','Shortcuts work from range controls','Opaque readable control panel and hook/weight label','Pointer rod lift and sweep','Held retrieve moves lure','Twitch moves presentation','Gradual reel-home starts and stops','Controls fit phone/landscape/desktop','Blur freezes simulation'],initialDepth:depth});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
