import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('.',import.meta.url)),root=fileURLToPath(new URL('../../',import.meta.url)),base=process.env.SHORE_QA_URL||'http://127.0.0.1:4213/dist/';
const instant='2026-09-30T12:00:00-07:00',epoch=Date.parse(instant);
const sourceFiles=['pacifica-world.js','benicia-world.js','shore-action-view.js','shore-people.js','shore-scale.js','shore-line-geometry.js','shore-tackle-visual.js','pacifica-game.js','pacifica.css','pacifica.html','half-moon-bay.html','benicia.html','shore-day.js','shore-data.js','benicia-data.js','shore-surf.js','shore-movement.js','pacifica-sim.js','benicia-sim.js','benicia-crowd.js','shore-lore.js','shore-regular.js','shore-reel-input.js','shore-reel-feedback.js','shore-presentation.js','shore-fish-fight.js','shore-fish-field.js','fish-population.js'];
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async name=>[name,digest(await fs.readFile(root+'dist/'+name))])));
const fixture=`
import {shoreStandPosition as dailyStand} from './shore-movement.js';
const dailyInitialState=structuredClone(sim.state);
focused=false;
window.dailyVisual={arrivalPlayer:structuredClone(dailyInitialState.player),
 setup(arrival=false){
  closeDialog();focused=false;resetInput();sim.clearLine();window.shoreVisualNow=${epoch};
  Object.assign(sim.state,structuredClone(dailyInitialState));sim.syncSharedWorld();sim.updateSea(true);
  const s=sim.state;if(!arrival){Object.assign(s.player,{...dailyStand(scene,scene.id==='benicia'?1212:2440),walking:false});s.onPier=false;}
  s.walkTarget=null;s.walkRoute=[];sim.setFishingControls({rodLift:.2,rodSweep:0,drag:.55});sim.refreshSample();
  interactions.reset(s);world.focus(null);lastPhase=s.phase;updateUI();resize();return this.snapshot();
 },advance(seconds,input={}){for(let t=0;t<seconds-1e-9;t+=.025){const dt=Math.min(.025,seconds-t);window.shoreVisualNow+=dt*1000;sim.update(dt,input);}},
 cast(power=.75){
  const s=sim.state;if(s.rodSupplies[s.activeRod]?.id!=='carolina_rig'){const r=sim.configureEquipment('carolina_rig');if(!r.ok)throw new Error(r.message);}
  if(!s.rodSupplies[s.activeRod]?.bait){const r=sim.equipBait(scene.id==='benicia'?'anchovy':'sandcrab');if(!r.ok)throw new Error(r.message);}
  let result;const spots=scene.id==='benicia'?[1212,1888,1384]:[2440];
  for(const x of spots){Object.assign(s.player,{...dailyStand(scene,x),walking:false});for(const aim of [0,.15,-.15,.35,-.35]){result=sim.cast({power,aim});if(result.ok)break;}if(result?.ok)break;}
  if(!result?.ok)throw new Error(result?.message||'Cast failed');
  this.advance(s.cast.flightDuration+.5,{reel:false,crankRate:0,rodLift:.2,drag:.55});
  if(!s.cast||s.phase==='walk')throw new Error('Actual cast did not remain deployed');
  lastPhase=s.phase;updateUI();world.focus(null);resize();return this.snapshot();
 },fight(){
  this.cast(.3);const s=sim.state;
  // Explicit visual fixture only. This known bite is excluded from the
  // naturally encountered fish / catch-rate experiment.
  s.phase='bite';s.biteSpeciesId='jacksmelt';s.biteLengthCm=33;s.biteRemaining=8;s.biteWorldKey='visual-fixture-jacksmelt';
  const r=sim.strike();if(!r.ok)throw new Error(r.message);
  let hold=createShoreReelHold(),held=true,near=null;
  for(let i=0;i<7200&&s.phase==='fighting';i++){
   if(s.tension>=.62)held=false;else if(s.tension<=.42)held=true;
   hold=setShoreReelHeld(hold,'visual',held,{enabled:sim.canReel});const gesture=stepShoreReelHold(hold,.025,{enabled:sim.canReel});hold=gesture.state;
   this.advance(.025,{...gesture.input,drag:.55});
   if(s.phase==='fighting'&&s.lineDistance<10&&s.fightElapsed>3){near={state:structuredClone(s),epoch:window.shoreVisualNow};if(s.fishMotion.airHeight>.025||s.fishMotion.depth<.15)break;}
  }
  if(!near)throw new Error('No actual near-fish fight state before '+s.phase);
  Object.assign(s,near.state);window.shoreVisualNow=near.epoch;sim.syncSharedWorld();lastPhase=s.phase;updateUI();world.focus(null);resize();return this.snapshot();
 },snapshot(){const s=sim.state;return{scene:scene.id,phase:s.phase,sharedWorld:s.sharedWorld,sea:s.seaState,elapsed:s.elapsed,player:{...s.player},crowdCount:s.crowd?.length||0,regularMode:s.regular?.mode||null,visitor:s.shoreLore.encounter,rig:s.rodSupplies[s.activeRod]?.id,cast:s.cast?{origin:s.cast.origin,target:s.cast.target,distance:s.cast.distance,paidLength:s.cast.paidLength}:null,lineDistance:s.lineDistance,fish:s.fish,fishMotion:s.fishMotion};},
 measure(){
  const before=JSON.stringify(sim.state),times=[];let frame;window.shoreTideCalls=[];window.shoreTrackTide=true;
  for(let i=0;i<12;i++){const start=performance.now();frame=world.draw(sim.state,sim.state.elapsed,{});times.push(performance.now()-start);}window.shoreTrackTide=false;lastWorldFrame=frame;
  if(JSON.stringify(sim.state)!==before)throw new Error('Renderer mutated gameplay');
  const canvas=$('world'),rect=canvas.getBoundingClientRect(),ratio=rect.width/canvas.width,points={angler:world.worldToScreen(shorePersonFoot(sim.state))};
  if(frame.tackle){points.rod=world.worldToScreen(frame.tackle.rodTip);points.waterEntry=world.worldToScreen(frame.tackle.waterEntry);}
  if(frame.fishVisual.visible)points.fish=world.worldToScreen(frame.fishVisual.world);
  const ids=['boat-console','beach-cast','beach-reel','shore-drag-control','beach-twitch'];
  const controls=Object.fromEntries(ids.map(id=>{const el=$(id);if(!el)return[id,{visible:false}];const r=el.getBoundingClientRect();return[id,{visible:Boolean(!el.hidden&&el.getClientRects().length),x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}];}));
  return{...this.snapshot(),camera:frame.camera,cameraCSSScale:frame.camera.scale*ratio,points,safeBoundsCSS:Object.fromEntries(Object.entries(frame.actionCamera.safeBounds).map(([k,v])=>[k,v*ratio])),fishVisible:frame.fishVisual.visible,floatVisible:frame.tackle?.floatVisible||false,controls,frameMeanMs:times.reduce((a,b)=>a+b)/times.length,frameMaxMs:Math.max(...times),tideCalls:window.shoreTideCalls};
 }};`;
const browser=await chromium.launch({headless:true,channel:'chrome'}),frames=[],artifacts=[],errors=[];
let activePage,activeCase;
try{
 for(const scene of ['pacifica','half-moon-bay','benicia'])for(const [viewport,width,height] of [['phone',390,844],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  await context.addInitScript(value=>{window.shoreVisualNow=value;},epoch);
  const page=await context.newPage();activePage=page;page.on('pageerror',error=>errors.push({scene,viewport,message:error.message}));
  await page.route('**/pacifica-game.js*',async route=>{const response=await route.fetch(),source=await response.text();assert.equal(source.split("clockMode:'shared'").length-1,2);await route.fulfill({response,body:source.replaceAll("clockMode:'shared'","clockMode:'shared',now:()=>new Date(window.shoreVisualNow)")+fixture});});
  await page.route('**/benicia-data.js*',async route=>{const response=await route.fetch(),source=await response.text();assert.ok(source.includes('export function beniciaTide('));await route.fulfill({response,body:source.replace('export function beniciaTide(','function visualOriginalTide(')+`\nexport function beniciaTide(elapsed=0,environmentSeconds){if(window.shoreTrackTide)window.shoreTideCalls.push({elapsed,environmentSeconds});return visualOriginalTide(elapsed,environmentSeconds);}`});});
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();
  for(const condition of ['arrival','cast','fight']){
   activeCase=scene+'/'+viewport+'/'+condition;
   const initial=await page.evaluate(arrival=>window.dailyVisual.setup(arrival),condition==='arrival');
   if(condition==='arrival')assert.deepEqual(initial.player,await page.evaluate(()=>window.dailyVisual.arrivalPlayer));
   if(condition==='cast')await page.evaluate(()=>window.dailyVisual.cast());
   if(condition==='fight')await page.evaluate(()=>window.dailyVisual.fight());
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const frame=await page.evaluate(()=>window.dailyVisual.measure());
   assert.equal(frame.sharedWorld.date,'2026-09-30');assert.match(frame.sharedWorld.clock,/^12:/);assert.equal(frame.sea.climate,true,'production daily sea');assert.equal(frame.floatVisible,false,'Carolina has no bobber');
   if(scene==='benicia'){assert.ok(frame.crowdCount>0,'retain real public crowd');assert.ok(frame.tideCalls.length>0);assert.ok(frame.tideCalls.every(call=>call.environmentSeconds===frame.sea.environmentSeconds),'all renderer tide calls use the shared epoch');}
   for(const [name,p]of Object.entries(frame.points)){const b=frame.safeBoundsCSS;assert.ok(p.visible,activeCase+' '+name+' outside canvas');assert.ok(p.x>=b.left-1&&p.x<=b.right+1&&p.y>=b.top-1&&p.y<=b.bottom+1,activeCase+' '+name+' behind UI');}
   const c=frame.controls,action=c[condition==='arrival'?'beach-cast':'beach-reel'];if(condition!=='arrival')assert.ok(action.visible);if(action.visible){assert.ok(action.width>=44&&action.height>=44);assert.ok(action.x>=0&&action.right<=width&&action.bottom<=height);}assert.equal(c['shore-drag-control'].visible,condition!=='arrival');assert.equal(c['beach-twitch'].visible,false);
   if(condition!=='arrival')assert.ok(c['shore-drag-control'].right<=c['beach-reel'].x);
   const name=`visual-${scene}-${viewport}-${condition}.png`;await page.screenshot({path:out+name,style:'#toast{visibility:hidden!important}'});artifacts.push(name);frames.push({...frame,viewport,condition});console.log(activeCase+' captured');
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.equal(artifacts.length,18);
 for(const name of sourceFiles)assert.equal(digest(await fs.readFile(root+'dist/'+name)),sourceHashes[name],name+' changed during visual gate');
 const artifactHashes=Object.fromEntries(await Promise.all(artifacts.map(async name=>[name,digest(await fs.readFile(out+name))])));
 await fs.writeFile(out+'visual-review.json',JSON.stringify({status:'automated_checks_passed_pending_visual_review',instant,sourceHashes,artifactHashes,method:'Fresh constructor arrivals at California noon; fixed shared now provider advances only for actual cast/fight physics. Production daily sea, crowd and visitor schedule retained. Cast/fight fixtures move to a valid shoreline gap and use a mounted Carolina rig. Fights explicitly inject a known jacksmelt bite, then use the actual current one-button hold model and simulation; these images are not natural encounter/catch-rate evidence. Tide-call wrapper records arguments without changing results.',frames,artifacts,errors},null,2)+'\n');
 console.log(JSON.stringify({frames:frames.length,artifacts:artifacts.length,errors}));
}catch(error){if(activePage&&!activePage.isClosed())await activePage.screenshot({path:out+'visual-failure.png'});await fs.writeFile(out+'visual-failure.json',JSON.stringify({activeCase,error:String(error),frames,errors},null,2));throw error;}finally{await browser.close();}
