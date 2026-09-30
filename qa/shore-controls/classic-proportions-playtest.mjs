import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/shaoshuai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=fileURLToPath(new URL('.',import.meta.url)),base=process.env.SHORE_QA_URL||'http://127.0.0.1:4213/dist/';
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[],frames=[],artifacts=[],cadenceChecks=[];
const sourceFiles=['pacifica-world.js','benicia-world.js','shore-action-view.js','shore-metric-art.js','shore-scale.js','shore-people.js','pacifica-game.js','shore-movement.js','shore-data.js','pacifica-sim.js','benicia-sim.js','shore-reel-input.js','pacifica.html','half-moon-bay.html','benicia.html','pacifica.css'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async name=>[name,createHash('sha256').update(await fs.readFile(fileURLToPath(new URL('../../dist/'+name,import.meta.url)))).digest('hex')])));
const sea={waveHeightM:.8,wavePeriodS:11,waveDirectionDeg:10,tideM:.8};
const reviewCode=`
import {shoreStandPosition as classicStandPosition} from './shore-movement.js';
import {shoreRodPose as classicRodPose,shoreActionCameraTarget as classicCameraTarget} from './shore-action-view.js';
import {drawShorePerson as classicDrawPerson} from './shore-people.js';
window.classicReview={arrivalPlayer:JSON.parse(JSON.stringify(sim.state.player)),arrivalOnPier:sim.state.onPier,cadenceFrames:[],recordCadence:false,setup(arrival=false){
 closeDialog();focused=false;resetInput();sim.clearLine();sim.rng=()=>.5;
 // Benicia 1384 is an authored gap between anglers; retain the real crowd.
 const s=sim.state,x=scene.id==='benicia'?1384:2440;
 if(arrival){Object.assign(s.player,this.arrivalPlayer);s.onPier=this.arrivalOnPier;}else{Object.assign(s.player,{...classicStandPosition(scene,x),walking:false});s.onPier=false;}s.walkTarget=null;s.walkRoute=[];
 s.activeRod='starter_rod';s.rodSupplies.starter_rod={id:'carolina_rig',condition:1,bait:{kind:'sandcrab',condition:1}};s.rig='carolina';
 s.seaState=${JSON.stringify(sea)};s.elapsed=47;sim.setFishingControls({reelSpeed:.6,rodLift:.35,rodSweep:0,drag:.5});
 sim.update(.025,{reel:false,crankRate:0});
 interactions.reset(s);world.focus(null);lastPhase=s.phase;updateUI();resize();
 // Crowd, regular, warden and shoreline geometry are retained. This fixture
 // selects only position, tackle, weather and the individual that bites.
 return this.snapshot();
},advance(seconds,input={}){for(let t=0;t<seconds;t+=.025)sim.update(Math.min(.025,seconds-t),input);},
 cast(power){
 this.castPower=power;
 let result;for(const direction of [0,.15,-.15,.35,-.35]){result=sim.cast({power,aim:direction});if(result.ok)break;}
 if(!result?.ok)throw new Error(result?.message||'Cast failed');
 const flight=sim.state.cast.flightDuration;this.advance(flight+.7,{reel:false,crankRate:0});
 if(!sim.state.cast||sim.state.phase==='walk')throw new Error('Actual cast did not land in water');
 lastPhase=sim.state.phase;updateUI();return this.snapshot();
},nearFish(){
 this.cast(.25);const s=sim.state;s.phase='bite';s.biteSpeciesId='jacksmelt';s.biteLengthCm=33;s.biteRemaining=8;
 const result=sim.strike();if(!result.ok)throw new Error(result.message);
 let strokes=createShoreReelInput(),near=null;
 for(let i=0;i<7200&&s.phase==='fighting';i++){
  if(i%24===0)strokes=tapShoreReelInput(strokes,{enabled:sim.canReel});
  const step=stepShoreReelInput(strokes,.025,{enabled:sim.canReel});strokes=step.state;
  sim.update(.025,{...step.input,twitch:i%100===0});
  if(s.phase==='fighting'&&s.lineDistance<8&&s.fightElapsed>3){near=JSON.parse(JSON.stringify(s));if(s.fishMotion.airHeight>.025||s.fishMotion.depth<.2)break;}
 }
 if(!near)throw new Error('No genuine near-fish fight snapshot before '+s.phase);
 // Replaying an actual recorded simulation state makes desktop/phone visual
 // review deterministic without inventing an airborne or visible fish pose.
 Object.assign(s,near);lastPhase=s.phase;updateUI();world.focus(null);return this.snapshot();
},snapshot(){const s=sim.state;return{scene:scene.id,phase:s.phase,elapsed:s.elapsed,sea:s.seaState,player:{...s.player},fixtureCastPower:s.cast?this.castPower:null,cast:s.cast?{origin:s.cast.origin,target:s.cast.target,distance:s.cast.distance,paidLength:s.cast.paidLength,aim:s.cast.aim}:null,lineDistance:s.lineDistance,fishMotion:s.fishMotion,fish:s.fish,crowdCount:s.crowd?.length||0,regularMode:s.regular?.mode||null};},
authoredHeight(){
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
 const ctx=canvas.getContext('2d');ctx.translate(48,72);classicDrawPerson(ctx,{style:'player',scale:1});
 const pixels=ctx.getImageData(0,0,96,96).data;let top=96,bottom=-1;
 for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(pixels[(y*96+x)*4+3]){top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return bottom-top+1;
},
startCadence(){
 this.setup();this.cast(.2);sim.state.inspection=null;sim.state.wardenNextAt=10000;
 focused=true;last=performance.now();return this.snapshot();
},
controls(){return{rangeIds:[...document.querySelectorAll('#boat-fishing input[type="range"]')].map(e=>e.id),obsoleteIds:['shore-reel-speed','shore-speed','reel-speed','shore-rod-pad','rod-pad','shore-rod-lift','rod-lift','shore-rod-sweep'].filter(id=>document.getElementById(id)),reelLabel:$('beach-reel-label').textContent};},
measure(){
 const before=JSON.stringify(sim.state);let shot;const times=[];
 for(let i=0;i<18;i++){const begin=performance.now();shot=world.draw(sim.state,sim.state.elapsed,{});times.push(performance.now()-begin);}lastWorldFrame=shot;
 if(JSON.stringify(sim.state)!==before)throw new Error('Renderer changed gameplay state');
 const rect=$('world').getBoundingClientRect(),ratio=rect.width/$('world').width,foot=world.worldToScreen(shorePersonFoot(sim.state));
 const points={angler:foot};if(shot.tackle){points.rod=world.worldToScreen(shot.tackle.rodTip);points.waterEntry=world.worldToScreen(shot.tackle.waterEntry);}
 if(shot.fishVisual.visible)points.fish=world.worldToScreen(shot.fishVisual.world);
 const safeBoundsCSS=Object.fromEntries(Object.entries(shot.actionCamera.safeBounds).map(([key,value])=>[key,value*ratio]));
 const authoredHeightWorld=this.authoredHeight(),playerDrawScale=window.classicPlayerDrawScale,playerHeightWorld=authoredHeightWorld*playerDrawScale,rod=classicRodPose(sim.state);
 return{...this.snapshot(),camera:shot.camera,cameraCSSScale:shot.camera.scale*ratio,authoredHeightWorld,playerDrawScale,playerHeightWorld,playerHeightCSS:playerHeightWorld*shot.camera.scale*ratio,rod:{butt:rod.butt,tip:rod.tip,tipWorld:rod.tipWorld,lengthM:rod.lengthM},points,fishVisible:shot.fishVisual.visible,floatVisible:shot.tackle?.floatVisible||false,safeBounds:shot.actionCamera.safeBounds,safeBoundsCSS,controls:this.controls(),frameMeanMs:times.reduce((a,b)=>a+b)/times.length,frameMaxMs:Math.max(...times)};
}};
const classicOriginalDraw=world.draw.bind(world);
world.draw=(state,time,options={})=>{
 const shot=classicOriginalDraw(state,time,options);
 if(window.classicReview.recordCadence){
  const canvas=$('world'),width=canvas.width,height=canvas.height,safe=shot.actionCamera.safeBounds,pad=Math.min(28,width*.08);
  const insets={top:safe.top-12,bottom:height-safe.bottom-12,left:safe.left-pad,right:width-safe.right-pad};
  const compact=innerWidth<720||innerHeight<520,available=Math.max(100,height-insets.top-insets.bottom);
  const baseScale=scene.id==='benicia'?(width<600?.88:1.05):Math.max(.25,compact?Math.min(.86,width/510,available/365):Math.min(.76,width/1150,available/680));
  // Recompute the fit from the same actual frame geometry, without any reel
  // input override. Retrieval can alter framing; input edges must not do so.
  const expected=classicCameraTarget(scene,state,{width,height,...insets,baseScale});
  window.classicReview.cadenceFrames.push({time:state.elapsed,phase:state.phase,reeling,handleRate:state.reelFeedback?.handleRate||0,lineDistance:state.lineDistance,actionFocus:options.actionFocus??null,focus:shot.actionCamera.focus,targetScale:shot.actionCamera.desiredScale,expectedGeometryScale:expected.scale,cameraScale:shot.camera.scale});
 }
 return shot;
};`;
async function settled(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function record(page,scene,viewport,condition){
 await settled(page);const result=await page.evaluate(()=>window.classicReview.measure());
 assert.deepEqual(result.sea,sea);assert.equal(result.floatVisible,false,'bottom rig must have no float');
 assert.equal(result.authoredHeightWorld,41,'original player silhouette is 41 world units tall');
 assert.equal(result.playerDrawScale,1,'renderer retains original authored player scale');
 assert.equal(result.playerHeightWorld,41,'player artwork is not reduced to metric height');
 assert.deepEqual(result.controls.rangeIds,['shore-drag'],'drag is the only fishing slider');assert.deepEqual(result.controls.obsoleteIds,[]);
 assert.equal(result.controls.reelLabel,'点击摇轮','tap controls retained');
 assert.ok(Number.isFinite(result.rod.tipWorld.height)&&result.rod.lengthM>0,'art rod retains physical endpoint metadata');
 for(const [name,p]of Object.entries(result.points)){
  assert.ok(p.visible,`${scene}/${viewport}/${condition} ${name} outside canvas`);
  const b=result.safeBoundsCSS;
  assert.ok(p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom,`${scene}/${viewport}/${condition} ${name} behind UI`);
 }
 frames.push({...result,viewport,condition});return result;
}
async function checkCadence(page,scene,viewport){
 const initial=await page.evaluate(()=>window.classicReview.startCadence());await page.waitForTimeout(650);
 await page.evaluate(()=>{window.classicReview.cadenceFrames=[];window.classicReview.recordCadence=true;});await page.waitForTimeout(150);
 await page.locator('#beach-reel').click();await page.waitForTimeout(650);
 await page.locator('#beach-reel').click();await page.waitForTimeout(650);
 const samples=await page.evaluate(()=>{window.classicReview.recordCadence=false;focused=false;return window.classicReview.cadenceFrames;});
 assert.ok(samples.length>15,'real animation frames recorded');
 assert.ok(samples.every(s=>s.phase==='waiting'),'short bottom rig remains deployed');
 const active=samples.filter(s=>s.reeling&&s.handleRate>0),inactive=samples.filter(s=>!s.reeling&&s.handleRate===0);
 assert.ok(active.length>3&&inactive.length>3,'real UI clicks produce finite active and idle strokes');
 assert.ok(samples.every(s=>s.actionFocus===null&&s.focus===.35),'individual strokes never change focus');
 const transitions=samples.slice(1).map((b,i)=>({a:samples[i],b})).filter(({a,b})=>a.reeling!==b.reeling);
 assert.ok(transitions.length>=4,'both start and stop edges captured');
 assert.ok(samples.every(s=>Number.isFinite(s.targetScale)&&Math.abs(s.targetScale-s.expectedGeometryScale)<1e-9),'zoom target follows only current geometry');
 cadenceChecks.push({scene,viewport,realButtonClicks:2,initialDistance:initial.lineDistance,endingDistance:samples.at(-1).lineDistance,frameCount:samples.length,activeFrames:active.length,inactiveFrames:inactive.length,strokeTransitions:transitions.length,focusValues:[...new Set(samples.map(s=>s.focus))],largestStrokeBoundaryTargetScaleChange:Math.max(...transitions.map(({a,b})=>Math.abs(b.targetScale-a.targetScale))),maximumGeometryResidual:Math.max(...samples.map(s=>Math.abs(s.targetScale-s.expectedGeometryScale))),transitions});
}
try{
 for(const scene of ['pacifica','half-moon-bay','benicia'])for(const [name,width,height]of[['phone',390,844],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'no-preference'});
  await context.addInitScript(()=>{let seed=82371;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
  const page=await context.newPage();page.on('pageerror',e=>errors.push({scene,viewport:name,message:e.message}));
  await page.route('**/shore-people.js*',async route=>{
   const response=await route.fetch(),source=await response.text();
   assert.ok(source.includes('export function drawShorePerson('));
   await route.fulfill({response,body:source.replace('export function drawShorePerson(','function classicOriginalDrawShorePerson(')+`\nexport function drawShorePerson(ctx,options={}){if(ctx.canvas?.id==='world'&&(options.style||'player')==='player')window.classicPlayerDrawScale=options.scale??1;return classicOriginalDrawShorePerson(ctx,options);}`});
  });
  await page.route('**/pacifica-game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+reviewCode});});
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();
  const prefix=`classic-proportions-${scene}-${name}`;
  const arrival=await page.evaluate(()=>({constructor:window.classicReview.arrivalPlayer,actual:window.classicReview.setup(true).player}));assert.deepEqual(arrival.actual,arrival.constructor,'fresh constructor arrival remains unchanged');
  await record(page,scene,name,'arrival');
  await page.screenshot({path:out+prefix+'-arrival.png',style:'#toast{visibility:hidden!important}'});artifacts.push(prefix+'-arrival.png');
  const castImages=[];
  for(const [kind,power]of[['short',.2],['full',1]]){
   await page.evaluate(()=>window.classicReview.setup());await page.evaluate(power=>window.classicReview.cast(power),power);await record(page,scene,name,kind+'-cast');
   const buffer=await page.screenshot({style:'#toast{visibility:hidden!important}'});castImages.push(buffer.toString('base64'));
  }
  // Two full-resolution actual browser captures in one labelled artifact.
  const sheet=await context.newPage();await sheet.setViewportSize({width:width*2,height:height+30});
  await sheet.setContent(`<style>html,body{margin:0;background:#183e45;color:#f5e5bb;font:14px system-ui}main{display:flex}.frame{width:${width}px}.label{height:30px;display:grid;place-items:center}img{display:block;width:${width}px;height:${height}px}</style><main>${castImages.map((data,i)=>`<div class="frame"><div class="label">${scene} · ${i?'Full cast':'Short cast'} · actual bottom rig</div><img src="data:image/png;base64,${data}"></div>`).join('')}</main>`);
  await sheet.bringToFront();await sheet.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));await settled(sheet);
  await sheet.screenshot({path:out+prefix+'-casts.png'});artifacts.push(prefix+'-casts.png');await sheet.close();
  await page.evaluate(()=>window.classicReview.setup());await page.evaluate(()=>window.classicReview.nearFish());await record(page,scene,name,'near-fish');
  await page.screenshot({path:out+prefix+'-near-fish.png',style:'#toast{visibility:hidden!important}'});artifacts.push(prefix+'-near-fish.png');
  await checkCadence(page,scene,name);
  await context.close();console.log(scene+' '+name+' classic proportions and reel cadence captured');
 }
 assert.deepEqual(errors,[]);assert.equal(artifacts.length,18);
 for(const name of sourceFiles)assert.equal(createHash('sha256').update(await fs.readFile(fileURLToPath(new URL('../../dist/'+name,import.meta.url)))).digest('hex'),sourceHashes[name],name+' changed during visual gate; rerun');
 const result={sourceHashes,sea,fixtures:'Fresh constructor arrivals; shoreStandPosition helper for real short/full casts and recorded fights; NPCs retained; original 41-world-unit artwork; finite tap strokes; no invented fish pose. Cadence uses actual button clicks and unchanged production frame loop; target zoom checked against each frame geometry.',artifacts,frames,cadenceChecks,errors,visualReview:'Pending image inspection'};
 await fs.writeFile(out+'classic-proportions-review.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({artifacts:artifacts.length,conditions:frames.length,errors,frames:frames.map(({scene,viewport,condition,cameraCSSScale,frameMeanMs,fishVisible,crowdCount})=>({scene,viewport,condition,cameraCSSScale,frameMeanMs,fishVisible,crowdCount}))},null,2));
}finally{await browser.close();}
