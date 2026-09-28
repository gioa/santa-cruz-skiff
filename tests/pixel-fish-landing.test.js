import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation}=await import('../dist/pixel-sim.js');
const {beginFishLanding,stepFishLanding}=await import('../dist/pixel-fish-landing.js');
const {fightViewGeometry}=await import('../dist/pixel-fight-view.js');
const {boatActions}=await import('../dist/pixel-boat-actions.js');
const {rodTipPosition}=await import('../dist/pixel-fishing-physics.js');
const {createFishFight,stepFishFight}=await import('../dist/pixel-fish-fight.js');
const {stepFishingLine}=await import('../dist/pixel-fishing-physics.js');
function side(){const s={mode:'boat',rentalPaid:true,launchStage:'afloat',fishState:'fight',fish:{kg:.3,length:24,fightKind:'rockfish'},boatX:0,boatZ:0,heading:0,rodMount:'hand',rodElevation:45,rodAzimuth:70,rodBend:.4,reelMode:'brake',paidLineMeters:3,lureDepth:.3,bobber:{x:1.5,z:0,height:-.3},lineEntry:{x:1.5,z:0,height:0},fishMotion:{headShake:.2},profile:{}};s.rodTip=rodTipPosition(s);return s;}
test('landing lifts the actual fish above the gunwale before bringing it inside and completing',()=>{
 for(const dt of [1/60,.05,.1]){
  const s=side();s.fishLanding=beginFishLanding(s);let peak=0,raised=false,settleSeconds=0;
  while(s.fishState!=='landed'){
   Object.assign(s,stepFishLanding(s,dt));peak=Math.max(peak,s.bobber.height);if(s.fishLanding.phase==='settle')settleSeconds+=dt;
   const g=fightViewGeometry(390,844,s);
   if(s.fishLanding.phase==='aboard'&&!raised){assert.ok(s.bobber.height>1);assert.ok(g.hookPoint.y<g.railY-100);raised=true;}
   assert.equal(s.paidLineMeters,3,'handling does not invent spool travel');
  }
  assert.ok(peak>1.14);assert.ok(settleSeconds>.35);assert.equal(s.bobber.x,s.boatX);assert.equal(s.bobber.z,s.boatZ);assert.equal(s.fishLanding.phase,'complete');
  const g=fightViewGeometry(390,844,s);assert.ok(g.hookPoint.y>g.railY);assert.ok(g.surfaceFish);
 }
});
test('capture decisions wait for landing completion and pausing freezes handling',()=>{
 const sim=new PixelSimulation({rng:()=>.5});sim.start();const s=sim.state;Object.assign(s,side(),{profile:s.profile});s.fishLanding=beginFishLanding(s);
 assert.equal(sim.keepCatch().ok,false);assert.equal(boatActions(s).reel,false);assert.equal(boatActions(s).adjustPose,false);assert.equal(boatActions(s).take,false);
 sim.pause(true);const before=structuredClone(s.fishLanding);sim.step(.1,{reel:2});assert.deepEqual(s.fishLanding,before);sim.pause(false);
 for(let i=0;i<40;i++)sim.stepFishing(.1,{reel:2});assert.equal(s.fishState,'landed');assert.equal(boatActions(s).catch,true);assert.equal(sim.keepCatch().ok,true);assert.equal(s.fishLanding,null);assert.equal(s.catches.length,1);
});
test('small fish swim both fore/aft and laterally even during quiet intervals without large runs',()=>{
 for(const kind of ['rockfish','sanddab','croaker','baitfish']){
  const fish={fightKind:kind,kg:kind==='baitfish'?.03:.3},f=createFishFight(fish),motions=[];
  for(let time=0;time<20;time+=.1){const r=stepFishFight(fish,f,{time,lureDepth:8});if(r.motion.phase==='glide')motions.push(r.motion);}
  assert.ok(motions.some(m=>m.foreAftMps>.001)&&motions.some(m=>m.foreAftMps<-.001),kind);
  assert.ok(motions.some(m=>m.lateralMps>.001)&&motions.some(m=>m.lateralMps<-.001),kind);
  assert.ok(motions.every(m=>Math.abs(m.foreAftMps)<.15&&Math.abs(m.lateralMps)<.15));
 }
});
test('quiet swimming moves the real hooked body while conserving line and respecting its length',()=>{
 const s=side();Object.assign(s,{fish:{fightKind:'rockfish',kg:.3},paidLineMeters:12,lureDepth:8,crankRate:0,drag:.65,rig:'bottom'});s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:s.rodTip.height-12};const start={...s.bobber};
 for(let i=0;i<40;i++)Object.assign(s,stepFishingLine(s,{dt:.05,environment:{bottomDepth:30},fishPullN:1,fishMotion:{foreAftMps:.08,lateralMps:.06,runSpeedMps:0,diveMps:0}}));
 assert.ok(Math.hypot(s.bobber.x-start.x,s.bobber.z-start.z)>.05);assert.equal(s.paidLineMeters,12);assert.ok(Math.hypot(s.bobber.x-s.rodTip.x,s.bobber.z-s.rodTip.z,s.bobber.height-s.rodTip.height)<=12+1e-6);
});
