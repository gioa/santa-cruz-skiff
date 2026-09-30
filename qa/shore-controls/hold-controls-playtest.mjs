import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('.',import.meta.url)),root=fileURLToPath(new URL('../../',import.meta.url)),base=process.env.SHORE_QA_URL||'http://127.0.0.1:4213/dist/';
const selectedScenes=(process.env.HOLD_QA_SCENES||'pacifica,half-moon-bay,benicia').split(',');
const sourceFiles=['pacifica-game.js','pacifica.css','pacifica.html','half-moon-bay.html','benicia.html','shore-reel-input.js','shore-reel-feedback.js','shore-presentation.js','pacifica-sim.js','shore-action-view.js','pacifica-world.js','benicia-world.js','shore-data.js','shore-movement.js'].filter(name=>selectedScenes.includes('benicia')||!name.startsWith('benicia'));
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async name=>[name,createHash('sha256').update(await fs.readFile(root+'dist/'+name)).digest('hex')])));
const browser=await chromium.launch({headless:true,channel:'chrome'}),checks=[],layouts=[],artifacts=[],errors=[];
let activePage,activeCase='';
const fixture=`
window.holdQA={frames:[],recording:false,
 setup(deployed=false){
  closeDialog();focused=false;resetInput();sim.clearLine();sim.rng=()=>.9999;
  const s=sim.state,x=scene.id==='benicia'?1384:2440;
  Object.assign(s.player,{x,y:scene.shoreY(x)+SHORE_MOVEMENT.stand,walking:false});
  s.onPier=false;s.walkTarget=null;s.walkRoute=[];s.inspection=null;s.wardenNextAt=100000;
  s.activeRod='starter_rod';s.rodSupplies.starter_rod={id:'carolina_rig',condition:1,bait:{kind:'sandcrab',condition:1}};s.rig='carolina';
  s.seaState={waveHeightM:.8,wavePeriodS:11,waveDirectionDeg:10,tideM:.8};s.elapsed=47;
  sim.setFishingControls({rodLift:.2,rodSweep:0,drag:.5});interactions.reset(s);
  if(deployed){let result;for(const direction of [0,.15,-.15,.35,-.35]){result=sim.cast({power:1,aim:direction});if(result.ok)break;}
   if(!result?.ok)throw new Error(result?.message||'Cast failed');
   const flight=s.cast.flightDuration;for(let t=0;t<flight+.25;t+=.025)sim.update(.025,{reel:false,crankRate:0});
   if(s.phase!=='waiting'||!s.cast)throw new Error('Actual bottom cast did not remain deployed');
  }
  lastPhase=s.phase;world.focus(null);updateUI();resize();focused=true;last=performance.now();this.frames=[];
  return this.snapshot();
 },bite(){const s=sim.state;s.phase='bite';s.biteSpeciesId='jacksmelt';s.biteLengthCm=33;s.biteRemaining=8;lastPhase=s.phase;updateUI();return this.snapshot();},snapshot(){const s=sim.state;return{phase:s.phase,elapsed:s.elapsed,paidLength:s.cast?.paidLength??null,lineDistance:s.lineDistance,feedback:{...s.reelFeedback},visual:{...reelVisual},heldSources:[...reelInput.sources],heldSeconds:reelInput.heldSeconds||0,reeling,active:$('beach-reel').classList.contains('active'),paused:paused(),modalType,drag:s.fishingControls.drag,rodLift:s.fishingControls.rodLift,rodVisualLift:lastWorldFrame?.tackle?.rodControls?.rodLift,presentationTwitch:s.presentation?.twitch||0,cameraScale:lastWorldFrame?.camera.scale,focus:lastWorldFrame?.actionCamera.focus};},
 record(){this.frames=[];this.recording=true;},stop(){this.recording=false;return this.frames;},
 layout(){const ids=['boat-console','shore-drag-control','shore-drag','beach-cast','beach-reel','beach-twitch'];return{width:innerWidth,height:innerHeight,phase:sim.state.phase,elements:Object.fromEntries(ids.map(id=>{const el=$(id);if(!el)return[id,{visible:false}];const r=el.getBoundingClientRect();return[id,{visible:Boolean(el.getClientRects().length&&!el.hidden&&getComputedStyle(el).visibility!=='hidden'),x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,text:el.textContent.trim()}]}))};}
};
const holdOriginalDraw=world.draw.bind(world);
world.draw=(state,time,options={})=>{const shot=holdOriginalDraw(state,time,options);if(window.holdQA.recording)window.holdQA.frames.push({...window.holdQA.snapshot(),controllerActionFocus:options.actionFocus??null});return shot;};`;
const snapshot=page=>page.evaluate(()=>window.holdQA.snapshot());
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function capture(page,name){await page.screenshot({path:out+name,style:'#toast{visibility:hidden!important}'});artifacts.push(name);}
function layoutCheck(result,deployed){
 const e=result.elements;assert.equal(e['shore-drag-control'].visible,deployed,'drag appears only after a cast');
 const ids=deployed?['shore-drag-control','shore-drag','beach-reel']:['beach-cast'];
 for(const id of ids){const r=e[id];assert.ok(r.visible,id+' visible');assert.ok(r.x>=0&&r.y>=0&&r.right<=result.width+.5&&r.bottom<=result.height+.5,id+' inside viewport');}
 for(const id of deployed?['beach-reel']:['beach-cast']){const r=e[id];assert.ok(r.width>=44&&r.height>=44,id+' has 44px touch bounds');}
 if(deployed){const drag=e['shore-drag-control'],reel=e['beach-reel'];assert.ok(drag.right<=reel.x,'drag is left of the single action');assert.equal(e['beach-cast'].visible,false,'only the combined action appears after casting');assert.equal(e['beach-twitch'].visible,false,'separate twitch action is absent');}
}
async function pointerDown(page){const b=await page.locator('#beach-reel').boundingBox();assert.ok(b);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();}
async function assertStopped(page,label,{paused=false}={}){
 const immediate=await snapshot(page);assert.equal(immediate.reeling,false,label+' releases control immediately');assert.deepEqual(immediate.heldSources,[],label+' clears held sources');assert.equal(immediate.active,false,label+' clears button state');assert.equal(immediate.rodLift,.2,label+' lowers rod immediately');
 await settle(page);const released=await snapshot(page);if(!paused)assert.equal(released.feedback.handleRate,0,label+' clears handle rate on next frame');assert.equal(released.rodVisualLift,.2,label+' visibly lowers rod');
 await page.waitForTimeout(230);const later=await snapshot(page);assert.equal(later.visual.handleAngle,released.visual.handleAngle,label+' has no residual crank motion');if(released.phase!=='fighting')assert.equal(later.visual.spoolAngle,released.visual.spoolAngle,label+' has no unloaded spool rotation');
 if(!paused&&released.phase!=='fighting'&&released.paidLength!==null)assert.ok(Math.abs(later.paidLength-released.paidLength)<1e-8,label+' cannot wind unattended');
 return{immediate,released,later};
}
async function holdCheck(page,label,start,end,duration=1000){
 const before=await snapshot(page);await page.evaluate(()=>window.holdQA.record());await start();await page.waitForTimeout(100);const liftOnly=await snapshot(page);assert.equal(liftOnly.rodLift,.7,label+' raises rod during initial press');assert.equal(liftOnly.rodVisualLift,.7,label+' visibly raises rod');assert.equal(liftOnly.feedback.handleRate,0,label+' does not reel below 220ms');assert.ok(Math.abs(liftOnly.paidLength-before.paidLength)<1e-8,label+' does not pick up paid line below threshold');await page.waitForTimeout(duration-100);const held=await snapshot(page);await end();const stopped=await assertStopped(page,label);const frames=await page.evaluate(()=>window.holdQA.stop());
 assert.ok(held.reeling&&held.feedback.handleRate>0,label+' winds while held');assert.ok(before.paidLength-held.paidLength>.65,label+' picks up actual paid line');assert.ok(frames.filter(f=>f.reeling&&f.feedback.handleRate>0).length>10,label+' sustained winding spans frames');assert.ok(frames.every(f=>f.controllerActionFocus===null),'input does not pump camera focus');assert.ok(frames.filter(f=>f.feedback.handleRate>0).every(f=>f.heldSeconds>=.22),'winding begins only after 220ms');
 checks.push({label,before,liftOnly,held,...stopped,frameCount:frames.length,activeFrames:frames.filter(f=>f.reeling).length,paidLinePickedUp:before.paidLength-held.paidLength});
}
async function edgeCases(page,context){
 await page.evaluate(()=>window.holdQA.setup(true));await settle(page);const shortBefore=await snapshot(page);await pointerDown(page);await page.waitForTimeout(100);const shortHeld=await snapshot(page);assert.equal(shortHeld.rodLift,.7);assert.equal(shortHeld.rodVisualLift,.7);assert.equal(shortHeld.feedback.handleRate,0);assert.equal(shortHeld.paidLength,shortBefore.paidLength);await page.mouse.up();const shortStopped=await assertStopped(page,'short press lift only');assert.equal(shortStopped.later.paidLength,shortBefore.paidLength);checks.push({label:'short press lifts without winding',before:shortBefore,held:shortHeld,...shortStopped});
 await page.evaluate(()=>window.holdQA.setup(true));await page.evaluate(()=>window.holdQA.bite());await settle(page);const biteLayout=await page.evaluate(()=>window.holdQA.layout());layoutCheck(biteLayout,true);await pointerDown(page);await page.waitForTimeout(80);const struck=await snapshot(page);assert.equal(struck.phase,'fighting','combined press strikes the bite');assert.equal(struck.feedback.handleRate,0);await page.mouse.up();const biteStopped=await assertStopped(page,'bite strike short press');checks.push({label:'one combined action strikes a bite',struck,layout:biteLayout,...biteStopped});
 for(const [label,interrupt,resume]of[
  ['pointer cancel',async()=>{const id=(await snapshot(page)).heldSources.find(s=>s.startsWith('pointer:')).split(':')[1];await page.locator('#beach-reel').dispatchEvent('pointercancel',{pointerId:Number(id),pointerType:'mouse',bubbles:true});},async()=>{}],
  ['lost pointer capture',async()=>page.evaluate(()=>{const el=document.getElementById('beach-reel'),id=Number(window.holdQA.snapshot().heldSources.find(s=>s.startsWith('pointer:')).split(':')[1]);el.releasePointerCapture(id);}),async()=>{}],
  ['window blur',async()=>page.evaluate(()=>window.dispatchEvent(new Event('blur'))),async()=>page.evaluate(()=>window.dispatchEvent(new Event('focus')))],
  ['menu interruption',async()=>page.keyboard.press('i'),async()=>page.locator('#close-modal').click()],
  ['location picker interruption',async()=>page.evaluate(()=>window.dispatchEvent(new CustomEvent('location-picker',{detail:{open:true}}))),async()=>page.evaluate(()=>window.dispatchEvent(new CustomEvent('location-picker',{detail:{open:false}})))]
 ]){
  await page.evaluate(()=>window.holdQA.setup(true));await settle(page);await pointerDown(page);await page.waitForTimeout(380);assert.ok((await snapshot(page)).reeling,label+' starts held');await interrupt();await settle(page);const paused=(await snapshot(page)).paused;const stopped=await assertStopped(page,label,{paused});await page.mouse.up();await resume();await settle(page);assert.equal((await snapshot(page)).reeling,false,label+' does not resume hold');checks.push({label,...stopped});
 }
 for(const [label,key,focus]of[['global F','f',false],['focused Space','Space',true],['focused Enter','Enter',true]]){
  await page.evaluate(()=>window.holdQA.setup(true));await settle(page);if(focus)await page.locator('#beach-reel').focus();else await page.locator('#world').focus();
  await holdCheck(page,label,()=>page.keyboard.down(key),()=>page.keyboard.up(key));
 }
 await page.evaluate(()=>window.holdQA.setup(true));await settle(page);await page.locator('#beach-reel').focus();await page.keyboard.down('Space');await page.waitForTimeout(380);assert.ok((await snapshot(page)).reeling,'focused key blur starts while winding');await page.locator('#shore-drag').focus();const blur=await assertStopped(page,'focused key blur');await page.keyboard.up('Space');checks.push({label:'focused key blur',...blur});
 await page.evaluate(()=>window.holdQA.setup(true));await settle(page);const beforeClick=await snapshot(page);await page.locator('#beach-reel').evaluate(el=>el.click());await page.waitForTimeout(230);const afterClick=await snapshot(page);assert.equal(afterClick.reeling,false);assert.equal(afterClick.feedback.handleRate,0);assert.equal(afterClick.paidLength,beforeClick.paidLength);checks.push({label:'click does not toggle or queue winding',before:beforeClick,after:afterClick});
 await page.evaluate(()=>window.holdQA.setup(true));await settle(page);const cdp=await context.newCDPSession(page),reel=await page.locator('#beach-reel').boundingBox(),drag=await page.locator('#shore-drag').boundingBox();
 const first={x:reel.x+reel.width/2,y:reel.y+reel.height/2,id:1},second={x:drag.x+drag.width*.5,y:drag.y+drag.height/2,id:2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});await page.waitForTimeout(380);const held=await snapshot(page);assert.ok(held.reeling);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,second]});second.x=drag.x+drag.width*.85;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[first,second]});await page.waitForTimeout(250);const adjusted=await snapshot(page);assert.ok(adjusted.reeling&&adjusted.feedback.handleRate>0,'second thumb on drag preserves pointer winding');assert.ok(adjusted.drag>held.drag,'second thumb adjusts actual drag');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[first]});await page.waitForTimeout(120);assert.ok((await snapshot(page)).reeling,'lifting drag thumb preserves reel thumb');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const stopped=await assertStopped(page,'two-thumb release');checks.push({label:'two thumbs: hold right reel and adjust left drag',held,adjusted,...stopped});await cdp.detach();
}
try{
 const cases=selectedScenes.flatMap(scene=>[[scene,'phone',390,844],[scene,'desktop',1440,900]]).concat(selectedScenes.includes('pacifica')?[['pacifica','narrow',320,844],['pacifica','landscape',844,390]]:[]);
 for(const [scene,viewport,width,height]of cases){
  activeCase=scene+'/'+viewport;const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:viewport!=='desktop'}),page=await context.newPage();activePage=page;
  await context.addInitScript(()=>{let seed=4187;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
  page.on('pageerror',error=>errors.push({scene,viewport,message:error.message}));
  await page.route('**/pacifica-game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+fixture});});
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();
  await page.evaluate(()=>window.holdQA.setup(false));await settle(page);const before=await page.evaluate(()=>window.holdQA.layout());layoutCheck(before,false);await capture(page,`hold-controls-${scene}-${viewport}-before-cast.png`);
  await page.evaluate(()=>window.holdQA.setup(true));await settle(page);const after=await page.evaluate(()=>window.holdQA.layout());layoutCheck(after,true);await capture(page,`hold-controls-${scene}-${viewport}-after-cast.png`);layouts.push({scene,viewport,before,after});
  await holdCheck(page,scene+'/'+viewport+' pointer hold',()=>pointerDown(page),()=>page.mouse.up());
  if(scene==='pacifica'&&viewport==='phone')await edgeCases(page,context);
  await context.close();console.log(activeCase+' layout and hold checks passed');
 }
 assert.deepEqual(errors,[]);for(const name of sourceFiles)assert.equal(createHash('sha256').update(await fs.readFile(root+'dist/'+name)).digest('hex'),sourceHashes[name],name+' changed during QA');
 await fs.writeFile(out+'hold-controls-review.json',JSON.stringify({status:'automated_checks_passed_pending_visual_review',sourceHashes,method:'Actual production frame/controller; simulation fixture performs a real full Carolina cast. One action raises the rod at .70; below 220ms no winding; holding longer winds; release immediately rests at .20. Real mouse, keyboard and CDP multi-touch events exercise controls; pointercancel/window interruption events are explicitly dispatched. Classic world artwork remains unchanged.',layouts,checks,artifacts,errors},null,2)+'\n');
 console.log(JSON.stringify({layouts:layouts.length,checks:checks.length,artifacts:artifacts.length,errors},null,2));
}catch(error){if(activePage&&!activePage.isClosed())await activePage.screenshot({path:out+'hold-controls-failure.png'});await fs.writeFile(out+'hold-controls-failure.json',JSON.stringify({activeCase,error:String(error),layouts,checks,errors},null,2)+'\n');throw error;}finally{await browser.close();}
