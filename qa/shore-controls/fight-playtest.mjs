import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/shaoshuai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=fileURLToPath(new URL('.',import.meta.url)),base=process.env.SHORE_QA_URL||'http://127.0.0.1:4213/dist/';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'no-preference'});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
// Fixtures choose location, tackle and hooked individual. All subsequent fish
// depth, air height, gravity, splash, tension and landing come from real updates.
await page.route('**/pacifica-game.js*',async route=>{
 const response=await route.fetch();
 await route.fulfill({response,body:await response.text()+`
window.fightProof={sim,world,events:[],steps:0,maxAir:0,
 setup({id='jacksmelt',length=33,pier=false}={}){
  closeDialog();focused=false;resetInput();sim.clearLine();sim.rng=()=>.5;
  const s=sim.state,x=pier?scene.pier.tip.x:2440,y=pier?scene.pier.tip.y:scene.shoreY(x)+24;
  Object.assign(s.player,{x,y});s.onPier=pier;s.inspection=null;s.elapsed=0;s.wardenNextAt=10000;
  s.rodSupplies[s.activeRod]={id:'carolina_rig',condition:1,bait:{kind:'sandcrab',condition:1}};s.rig='carolina';
  s.seaState={waveHeightM:.65,wavePeriodS:10,waveDirectionDeg:10,tideM:.8};
  sim.setFishingControls({reelSpeed:.6,rodLift:id==='jacksmelt'?1:.35,rodSweep:0,drag:.5});
  interactions.reset(s);world.focus(null);this.events=[];this.steps=0;this.maxAir=0;
  let cast;for(const aim of [.15,-.35,.6,-.75,0]){cast=sim.cast({power:.6,aim});if(cast.ok)break;}
  if(!cast.ok)throw new Error(cast.message);
  for(let t=0;t<s.cast.flightDuration+.05;t+=.025)sim.update(.025,{reel:false});
  for(let t=0;t<(pier?12:2);t+=.025)sim.update(.025,{reel:false});
  if(!s.cast)throw new Error('Fixture tackle left water before strike');
  s.phase='bite';s.biteSpeciesId=id;s.biteLengthCm=length;
  const strike=sim.strike();if(!strike.ok)throw new Error(strike.message);
  // Select a vigorous individual without replacing physical motion state.
  s.fishMotion.variation=.1;
  lastPhase=s.phase;syncInsets();updateUI();return this.snapshot();
 },step(dt=.025){
  const before=sim.state.fishMotion,wasJump=before?.jumpActive,depth=before?.depth;
  sim.update(dt,{reel:true});this.steps++;
  // Accelerate test time while still exercising the real moving camera and
  // canvas during the fight, rather than drawing only the selected endpoint.
  if(this.steps%4===0)lastWorldFrame=world.draw(sim.state,sim.state.elapsed,{reducedMotion:false,actionFocus:true});
  const s=sim.state,m=s.fishMotion;if(m){
   if(m.depth>0&&m.airHeight>0)throw new Error('Fish is both submerged and airborne');
   if(!wasJump&&m.jumpActive){if(depth>.08)throw new Error('Jump teleported from deep water: '+depth);this.events.push({kind:'launch',time:s.fightElapsed,previousDepth:depth});}
   if(wasJump&&!m.jumpActive)this.events.push({kind:'splash',time:s.fightElapsed,splash:m.splash});
   this.maxAir=Math.max(this.maxAir,m.airHeight);
  }
  return this.snapshot();
 },untilJump(){for(let i=0;i<2400&&sim.state.phase==='fighting';i++){this.step();if(sim.state.fishMotion?.airHeight>.12)return this.snapshot();}throw new Error('No physically generated surface jump');},
 untilLanding(){for(let i=0;i<12000&&sim.state.phase==='fighting';i++)this.step();if(sim.state.phase!=='landed')throw new Error('Did not land: '+sim.state.phase+' / '+sim.state.message);lastPhase=sim.state.phase;updateUI();return this.snapshot();},
 snapshot(){const s=sim.state;return{phase:s.phase,fish:s.fish,lineDistance:s.lineDistance,fishMotion:s.fishMotion,waterDepth:s.shoreSample?.depth,controls:s.fishingControls,fightElapsed:s.fightElapsed,steps:this.steps,maxAir:this.maxAir,events:this.events};},
 frame(){return lastWorldFrame;},showCatch(){if(sim.state.phase!=='landed')throw new Error('Fish must really land');openCatch();updateUI();}
};`});
});
async function settle(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function screenshot(name){await page.screenshot({path:out+name+'.png',style:'#toast{visibility:hidden!important}'});}
async function continuous(){assert.equal(await page.locator('#world').isVisible(),true);assert.equal(await page.locator('#fight-view').count(),0);const state=await page.locator('#beach-state').textContent();assert.equal(JSON.parse(state).view,'shore');}
try{
 for(const scene of ['pacifica','half-moon-bay']){
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();
  const initial=await page.evaluate(()=>window.fightProof.setup());await settle();await continuous();
  const jumping=await page.evaluate(()=>window.fightProof.untilJump());await settle();await continuous();
  const frame=await page.evaluate(()=>window.fightProof.frame());
  assert.equal(jumping.phase,'fighting');assert.equal(jumping.fishMotion.jumpActive,true);assert.ok(jumping.fishMotion.airHeight>.12);assert.equal(jumping.fishMotion.depth,0);
  assert.equal(frame.fishVisual.visible,true);assert.equal(frame.fishVisual.kind,'jacksmelt');assert.equal(frame.tackle.floatVisible,false);
  assert.ok(Math.abs(frame.fishVisual.airHeight-jumping.fishMotion.airHeight)<1e-8);
  assert.ok(Math.abs(frame.tackle.attachment.y-frame.fishVisual.world.y)<1e-8,'actual airborne fish and line stay attached');
  assert.equal(frame.actionCamera.mode,'fighting');
  await screenshot(scene+'-jacksmelt-physical-jump');
  const landed=await page.evaluate(()=>window.fightProof.untilLanding());await settle();await continuous();
  assert.equal(landed.phase,'landed');assert.ok(landed.lineDistance<=3);assert.equal(landed.fishMotion.jumpActive,false);
  assert.ok(landed.events.some(e=>e.kind==='splash'&&e.splash>.8),'real ballistic arc reenters with splash');
  await page.evaluate(()=>window.fightProof.showCatch());await settle();await screenshot(scene+'-jacksmelt-landed');
  checks.push({scene,initialDepth:initial.fishMotion.depth,initialDistance:initial.lineDistance,jumpAt:jumping.fightElapsed,capturedAirHeight:jumping.fishMotion.airHeight,maxAirHeight:landed.maxAir,landedAt:landed.fightElapsed,energyAtLanding:landed.fishMotion.energy,events:landed.events,continuousView:true,floatVisible:false,lineAttached:true});
 }
 await page.goto(base+'benicia.html');await page.locator('#start-btn').click();
 const initial=await page.evaluate(()=>window.fightProof.setup({id:'chinook_salmon',length:80,pier:true}));await settle();await continuous();
 const landed=await page.evaluate(()=>window.fightProof.untilLanding());await settle();await continuous();
 assert.equal(landed.phase,'landed');assert.ok(landed.waterDepth>4,'actual pier remains over deep water');assert.ok(landed.fishMotion.depth<.8,'loaded winding raised salmon above bed');assert.equal(landed.fishMotion.jumpActive,false);
 await page.evaluate(()=>window.fightProof.showCatch());await settle();await screenshot('benicia-pier-salmon-landed');
 checks.push({scene:'benicia',species:'chinook_salmon',initialDepth:initial.fishMotion.depth,waterDepthAtLanding:landed.waterDepth,fishDepthAtLanding:landed.fishMotion.depth,landedAt:landed.fightElapsed,energyAtLanding:landed.fishMotion.energy,continuousView:true});
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'fight-results.json',JSON.stringify({checks,errors},null,2));
 console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
