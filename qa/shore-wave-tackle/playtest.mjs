import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('.',import.meta.url));
const base=process.env.SHORE_QA_URL||'http://127.0.0.1:4213/dist/';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'no-preference'});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
// Test-only deterministic scenarios; no fixture is shipped in dist/.
await page.route('**/pacifica-game.js*',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:await response.text()+`
window.waveQA={sim,world,fightView,setup({phase='waiting',rig='float',hs=2.1,elapsed=40,tension,pier=false}={}){
  closeDialog();focused=false;resetInput();
  const s=sim.state,x=pier?scene.pier.tip.x:2440,y=pier?scene.pier.tip.y:scene.shoreY(x)+24;
  const origin={x,y:y-18},target={x:x+24,y:pier?y-80:scene.shoreY(x+24)-40*3.2};
  const distance=Math.hypot(target.x-origin.x,target.y-origin.y)/3.2;
  Object.assign(s,{phase,elapsed,rig,onPier:pier,player:{x,y},inspection:null,
    seaState:{waveHeightM:hs,wavePeriodS:14,waveDirectionDeg:20,tideM:.6},
    cast:{origin,target,distance,fightDistance:distance,flightDuration:1},lineDistance:distance,
    fish:phase==='fighting'?{id:'jacksmelt',weightKg:.3,length:24,run:.1,stamina:.8}:null,
    presentation:{mode:rig==='float'?'float':'bottom',depth:rig==='float'?1:2,stability:.6,bottomContact:rig==='float'?0:1}});
  s.rodSupplies[s.activeRod]={id:rig==='float'?'float_rig':rig==='fishfinder'?'fishfinder_rig':'carolina_rig',condition:1,bait:{kind:'sandcrab',condition:1}};
  s.shoreSample=sampleShore(scene,target.x,target.y,elapsed,s.seaState);
  s.tension=tension??(.04+Math.hypot(s.shoreSample.currentX,s.shoreSample.currentY)*.1+s.shoreSample.waveLoad*.12);
  lastPhase=phase;syncFightFocus();syncInsets();updateUI();
  return this.render();
},render(){
  const s=sim.state,before=JSON.stringify(s),options={reducedMotion:reducedMotion.matches};
  const overhead=world.draw(s,s.elapsed,options);
  fightView.draw(s,0,{...options,active:shoreFightActive(s),paused:true});updateUI();
  if(JSON.stringify(s)!==before)throw new Error('Renderer mutated gameplay state');
  return{overhead:overhead.tackle,close:fightView.snapshot(),elapsed:s.elapsed,sample:s.shoreSample};
},crestTime(){
  const s=sim.state,p=s.cast.target,a=sampleShore(scene,p.x,p.y,0,s.seaState);
  return (Math.ceil(a.wavePhase/(2*Math.PI))+4)*a.wavePeriod-a.wavePhase*a.wavePeriod/(2*Math.PI);
}};`});
});
const setup=options=>page.evaluate(options=>window.waveQA.setup(options),options);
async function shot(name){
  await page.screenshot({path:out+name+'.png',style:'#fight-view{filter:none!important} #toast{visibility:hidden!important}'});
}
try{
  for(const scene of ['pacifica','half-moon-bay']){
    await page.goto(base+scene+'.html');await page.locator('#start-btn').click();
    await setup({});const crest=await page.evaluate(()=>window.waveQA.crestTime());
    for(const rig of ['carolina','fishfinder']){
      const waiting=await setup({rig,elapsed:crest});
      assert.equal(waiting.overhead.floatVisible,false);
      assert.ok(waiting.overhead.entryWorld.y>waiting.overhead.terminalPosition.y,'line enters water before bottom tackle');
      if(rig==='carolina')await shot(scene+'-bottom-overhead');
      const fighting=await setup({rig,phase:'fighting',elapsed:crest});
      assert.equal(fighting.close.floatVisible,false);
      assert.deepEqual(fighting.overhead.entryWorld,fighting.close.entryWorld);
      if(rig==='carolina')await shot(scene+'-bottom-fight');
    }
    const a=await setup({elapsed:crest}),b=await setup({elapsed:crest+7});
    assert.ok(a.overhead.surfaceHeight>0&&b.overhead.surfaceHeight<0);
    assert.ok(a.overhead.waterEntry.y<b.overhead.waterEntry.y);
    assert.deepEqual(a.overhead.line.at(-1),a.overhead.attachment);
    const low=await setup({elapsed:crest,tension:.08}),high=await setup({elapsed:crest,tension:.8});
    assert.ok(high.overhead.bend>low.overhead.bend);
    await setup({elapsed:crest});await shot(scene+'-float-overhead');
    const fightCrest=await setup({phase:'fighting',elapsed:crest}),fightTrough=await setup({phase:'fighting',elapsed:crest+7});
    assert.ok(fightCrest.close.floatVisible&&fightTrough.close.floatVisible);
    assert.ok(fightCrest.close.lineEntry.y<fightTrough.close.lineEntry.y);
    await setup({phase:'fighting',elapsed:crest});await shot(scene+'-float-fight');
    for(const phase of ['waiting','fighting']){
      const calmA=await setup({phase,hs:0,elapsed:4}),calmB=await setup({phase,hs:0,elapsed:17});
      assert.deepEqual(calmA.overhead,calmB.overhead);
      if(phase==='fighting')assert.deepEqual(calmA.close.linePoints,calmB.close.linePoints);
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    const frozenA=await setup({phase:'fighting',elapsed:4}),frozenB=await setup({phase:'fighting',elapsed:17});
    assert.deepEqual(frozenA.close.waterContact,frozenB.close.waterContact);
    assert.deepEqual(frozenA.overhead.waterEntry,frozenB.overhead.waterEntry);
    await page.emulateMedia({reducedMotion:'no-preference'});
    for(const [width,height] of [[320,568],[844,390],[1440,1000]]){
      await page.setViewportSize({width,height});
      const s=await setup({phase:'fighting',rig:'carolina',elapsed:crest,tension:.65});
      assert.equal(s.close.floatVisible,false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for(const point of [s.close.lineEntry,s.close.rodTip])assert.ok(point.x>=0&&point.x<=width&&point.y>=0&&point.y<=height);
    }
    await shot(scene+'-bottom-desktop');await page.setViewportSize({width:390,height:844});
    checks.push({scene,crestTime:crest,overheadRise:a.overhead.surfaceHeight-b.overhead.surfaceHeight,
      fightRisePixels:fightTrough.close.lineEntry.y-fightCrest.close.lineEntry.y,
      checks:['Carolina and fish-finder stay submerged without bobbers or terminal markers','Both cameras share bottom-line water entry','Crest/trough float and line attachment','Tension bends waiting rod','Calm no bob','Reduced motion freezes contact','Bottom and float rigs across 4 viewport sizes','Rendering preserves gameplay state']});
  }
  await page.goto(base+'pacifica.html');await page.locator('#start-btn').click();
  const pier=await setup({phase:'fighting',pier:true});assert.equal(pier.close.ground,'pier');
  await shot('pacifica-pier');
  assert.deepEqual(errors,[]);
  await fs.writeFile(out+'results.json',JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
