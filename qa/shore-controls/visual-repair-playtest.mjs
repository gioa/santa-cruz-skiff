import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('.',import.meta.url)),base=process.env.SHORE_QA_URL||'http://127.0.0.1:4213/dist/';
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[],frames=[],artifacts=[];
const sourceFiles=['pacifica-world.js','benicia-world.js','shore-action-view.js','shore-metric-art.js','pacifica-game.js','shore-movement.js','shore-data.js','pacifica-sim.js'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async name=>[name,createHash('sha256').update(await fs.readFile(fileURLToPath(new URL('../../dist/'+name,import.meta.url)))).digest('hex')])));
const sea={waveHeightM:.8,wavePeriodS:11,waveDirectionDeg:10,tideM:.8};
const reviewCode=`
window.visualReview={arrivalPlayer:JSON.parse(JSON.stringify(sim.state.player)),arrivalOnPier:sim.state.onPier,setup(arrival=false){
 closeDialog();focused=false;resetInput();sim.clearLine();sim.rng=()=>.5;
 const s=sim.state,x=scene.id==='benicia'?1438:2440;
 if(arrival){Object.assign(s.player,this.arrivalPlayer);s.onPier=this.arrivalOnPier;}else{Object.assign(s.player,{x,y:scene.shoreY(x)+SHORE_MOVEMENT.stand,walking:false});s.onPier=false;}s.walkTarget=null;s.walkRoute=[];
 s.activeRod='starter_rod';s.rodSupplies.starter_rod={id:'carolina_rig',condition:1,bait:{kind:'sandcrab',condition:1}};s.rig='carolina';
 s.seaState=${JSON.stringify(sea)};s.elapsed=47;sim.setFishingControls({reelSpeed:.6,rodLift:.35,rodSweep:0,drag:.5});
 sim.update(.025,{reel:false,crankRate:0});
 interactions.reset(s);world.focus(null);lastPhase=s.phase;updateUI();resize();
 // Crowd, regular, warden and shoreline geometry are retained. This fixture
 // selects only position, tackle, weather and the individual that bites.
 return this.snapshot();
},advance(seconds,input={}){for(let t=0;t<seconds;t+=.025)sim.update(Math.min(.025,seconds-t),input);},
 cast(power){
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
},snapshot(){const s=sim.state;return{scene:scene.id,phase:s.phase,elapsed:s.elapsed,sea:s.seaState,player:{...s.player},cast:s.cast?{origin:s.cast.origin,target:s.cast.target,distance:s.cast.distance,paidLength:s.cast.paidLength,aim:s.cast.aim}:null,lineDistance:s.lineDistance,fishMotion:s.fishMotion,fish:s.fish,crowdCount:s.crowd?.length||0,regularMode:s.regular?.mode||null};},
measure(){
 const before=JSON.stringify(sim.state);let shot;const times=[];
 for(let i=0;i<18;i++){const begin=performance.now();shot=world.draw(sim.state,sim.state.elapsed,{});times.push(performance.now()-begin);}lastWorldFrame=shot;
 if(JSON.stringify(sim.state)!==before)throw new Error('Renderer changed gameplay state');
 const rect=$('world').getBoundingClientRect(),ratio=rect.width/$('world').width,foot=world.worldToScreen(shorePersonFoot(sim.state));
 const points={angler:foot};if(shot.tackle){points.rod=world.worldToScreen(shot.tackle.rodTip);points.waterEntry=world.worldToScreen(shot.tackle.waterEntry);}
 if(shot.fishVisual.visible)points.fish=world.worldToScreen(shot.fishVisual.world);
 const safeBoundsCSS=Object.fromEntries(Object.entries(shot.actionCamera.safeBounds).map(([key,value])=>[key,value*ratio]));
 return{...this.snapshot(),camera:shot.camera,cameraCSSScale:shot.camera.scale*ratio,playerHeightCSS:1.75*3.2*shot.camera.scale*ratio,points,fishVisible:shot.fishVisual.visible,floatVisible:shot.tackle?.floatVisible||false,safeBounds:shot.actionCamera.safeBounds,safeBoundsCSS,frameMeanMs:times.reduce((a,b)=>a+b)/times.length,frameMaxMs:Math.max(...times)};
}};`;
async function settled(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function record(page,scene,viewport,condition){
 await settled(page);const result=await page.evaluate(()=>window.visualReview.measure());
 assert.deepEqual(result.sea,sea);assert.equal(result.floatVisible,false,'bottom rig must have no float');
 for(const [name,p]of Object.entries(result.points)){
  assert.ok(p.visible,`${scene}/${viewport}/${condition} ${name} outside canvas`);
  const b=result.safeBoundsCSS;
  assert.ok(p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom,`${scene}/${viewport}/${condition} ${name} behind UI`);
 }
 frames.push({...result,viewport,condition});return result;
}
try{
 for(const scene of ['pacifica','half-moon-bay','benicia'])for(const [name,width,height]of[['phone',390,844],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'no-preference'});
  await context.addInitScript(()=>{let seed=82371;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
  const page=await context.newPage();page.on('pageerror',e=>errors.push({scene,viewport:name,message:e.message}));
  await page.route('**/pacifica-game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+reviewCode});});
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();
  const prefix=`visual-repair-${scene}-${name}`;
  await page.evaluate(()=>window.visualReview.setup(true));await record(page,scene,name,'arrival');
  await page.screenshot({path:out+prefix+'-arrival.png',style:'#toast{visibility:hidden!important}'});artifacts.push(prefix+'-arrival.png');
  const castImages=[];
  for(const [kind,power]of[['short',0],['full',1]]){
   await page.evaluate(()=>window.visualReview.setup());await page.evaluate(power=>window.visualReview.cast(power),power);await record(page,scene,name,kind+'-cast');
   const buffer=await page.screenshot({style:'#toast{visibility:hidden!important}'});castImages.push(buffer.toString('base64'));
  }
  // Two full-resolution actual browser captures in one labelled artifact.
  const sheet=await context.newPage();await sheet.setViewportSize({width:width*2,height:height+30});
  await sheet.setContent(`<style>html,body{margin:0;background:#183e45;color:#f5e5bb;font:14px system-ui}main{display:flex}.frame{width:${width}px}.label{height:30px;display:grid;place-items:center}img{display:block;width:${width}px;height:${height}px}</style><main>${castImages.map((data,i)=>`<div class="frame"><div class="label">${scene} · ${i?'Full cast':'Short cast'} · actual bottom rig</div><img src="data:image/png;base64,${data}"></div>`).join('')}</main>`);
  await sheet.screenshot({path:out+prefix+'-casts.png'});artifacts.push(prefix+'-casts.png');await sheet.close();
  await page.evaluate(()=>window.visualReview.setup());await page.evaluate(()=>window.visualReview.nearFish());await record(page,scene,name,'near-fish');
  await page.screenshot({path:out+prefix+'-near-fish.png',style:'#toast{visibility:hidden!important}'});artifacts.push(prefix+'-near-fish.png');
  await context.close();console.log(scene+' '+name+' visual conditions captured');
 }
 assert.deepEqual(errors,[]);assert.equal(artifacts.length,18);
 for(const name of sourceFiles)assert.equal(createHash('sha256').update(await fs.readFile(fileURLToPath(new URL('../../dist/'+name,import.meta.url)))).digest('hex'),sourceHashes[name],name+' changed during visual gate; rerun');
 const result={sourceHashes,sea,fixtures:'Arrival uses fresh constructor position; casts/fights use shoreline fixture. Actual casts and recorded fights; NPCs retained; finite tap strokes; no invented fish pose',artifacts,frames,errors,visualReview:'Pending image inspection'};
 await fs.writeFile(out+'visual-repair-review.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({artifacts:artifacts.length,conditions:frames.length,errors,frames:frames.map(({scene,viewport,condition,cameraCSSScale,frameMeanMs,fishVisible,crowdCount})=>({scene,viewport,condition,cameraCSSScale,frameMeanMs,fishVisible,crowdCount}))},null,2));
}finally{await browser.close();}
