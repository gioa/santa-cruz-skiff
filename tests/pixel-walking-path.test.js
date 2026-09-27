import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const {walkAllowed,walkBlocked,walkHeight}=await import('../dist/harbor-layout.js');
const {planGroundWalk,walkingSegmentOpen,createGroundWalkSearch}=await import('../dist/pixel-walking-path.js');
const from={x:HARBOR.spawnX,z:HARBOR.spawnZ},behindBuilding={x:12,z:-72};
function arrive(sim,dt=.1){
 let last={x:sim.state.playerX,z:sim.state.playerZ},height=walkHeight(last.x,last.z);
 for(let t=0;t<90&&sim.state.autoWalk;t+=dt){
  sim.step(dt);const s=sim.state,next={x:s.playerX,z:s.playerZ},nextHeight=walkHeight(next.x,next.z);
  assert.equal(s.mode,'walk');assert.equal(walkAllowed(next.x,next.z),true);assert.equal(walkBlocked(next.x,next.z),false);assert.ok(Math.hypot(next.x-last.x,next.z-last.z)<=2.90*dt+1e-7,'walking never teleports');assert.ok(Math.abs(nextHeight-height)<.5,'does not jump between wharf and landing');last=next;height=nextHeight;
 }
 assert.equal(sim.state.autoWalk,false);return last;
}

test('a node-bounded local route walks around real wharf buildings and reaches the clicked ground',()=>{
 assert.equal(walkingSegmentOpen(from,behindBuilding),false,'the direct line crosses mapped building footprints');
 const planned=planGroundWalk(from,behindBuilding);
 assert.ok(planned.route,'reachable geometry is not rejected because a CPU is cold or slow');assert.ok(planned.route.length>1);assert.ok(planned.expanded>0&&planned.expanded<=1600);
 for(const dt of[1/60,.25]){
  const sim=new PixelSimulation();sim.start();assert.equal(sim.walkTo(behindBuilding).action,'walking-ground');assert.equal(sim.publicState().autoWalking,true);assert.deepEqual(sim.publicState().walkDestination,behindBuilding);
  assert.deepEqual(arrive(sim,dt),behindBuilding);assert.equal(sim.state.arrival,'ground');assert.equal(sim.publicState().autoWalking,false);assert.equal(sim.publicState().walkDestination,null);
  for(let t=0;t<2;t+=dt)sim.step(dt);assert.deepEqual({x:sim.state.playerX,z:sim.state.playerZ},behindBuilding);
 }
});

test('valid new clicks replace the destination and joystick control cancels the remaining route',()=>{
 const sim=new PixelSimulation();sim.start();assert.equal(sim.walkTo(behindBuilding).ok,true);assert.equal(sim.state.walkPending,true);const pending=sim.walkSearch;
 const replacement={x:-13,z:-46};assert.equal(sim.walkTo(replacement).ok,true);assert.deepEqual(sim.publicState().walkDestination,replacement);assert.notEqual(sim.walkSearch,pending);assert.equal(sim.state.walkPending,false);
 sim.step(.1,{moveZ:1});assert.equal(sim.state.autoWalk,false);assert.equal(sim.state.walkRoute.length,0);assert.equal(sim.publicState().walkDestination,null);assert.equal(sim.state.arrival,null);
 const stopped={x:sim.state.playerX,z:sim.state.playerZ};sim.step(.1);assert.deepEqual({x:sim.state.playerX,z:sim.state.playerZ},stopped);
 sim.walkTo(behindBuilding);assert.equal(sim.state.walkPending,true);sim.step(.1,{moveZ:1});assert.equal(sim.walkSearch,null);assert.equal(sim.state.walkPending,false);assert.equal(sim.state.walkTarget,null);
});

test('water, building interiors and unbounded far clicks are rejected without moving toward them',()=>{
 for(const target of[{x:-40,z:-55},{x:-2,z:-60},{x:1e9,z:1e9},{x:NaN,z:0}]){
  const sim=new PixelSimulation();sim.start();assert.equal(sim.walkTo(target).ok,false);for(let t=0;t<2;t+=.1)sim.step(.1);assert.deepEqual({x:sim.state.playerX,z:sim.state.playerZ},from);assert.equal(sim.state.autoWalk,false);
 }
 assert.equal(planGroundWalk(from,behindBuilding,{maxExpanded:1,maxMilliseconds:1000}).expanded,1);
 assert.equal(planGroundWalk(from,behindBuilding,{maxExpanded:1,maxMilliseconds:1000}).route,null,'search has a fixed node cap');
 assert.equal(planGroundWalk(from,behindBuilding,{maxMilliseconds:0}).reason,'budget','time budget prevents a long synchronous search');
 const sim=new PixelSimulation();sim.start();sim.walkTo(behindBuilding);assert.equal(sim.state.walkPending,true);assert.equal(sim.walkTo({x:-40,z:-55}).ok,false);assert.equal(sim.walkSearch,null);assert.equal(sim.state.walkTarget,null);assert.equal(sim.state.autoWalk,false);
});

test('slow CPUs spread the same reachable search over frames; pausing stops work and searching never adds movement',()=>{
 class SlowFrameSimulation extends PixelSimulation{walkSearchNow(){this.clockReads=(this.clockReads||0)+1;return this.clockReads*10;}}
 const sim=new SlowFrameSimulation();sim.start();sim.walkTo(behindBuilding);assert.equal(sim.publicState().walkPending,true);assert.deepEqual(sim.publicState().walkDestination,behindBuilding);
 const dt=1/60;sim.step(dt);assert.equal(sim.state.walkPending,true);assert.deepEqual({x:sim.state.playerX,z:sim.state.playerZ},from);const reads=sim.clockReads,elapsed=sim.state.elapsed,search=sim.walkSearch;
 sim.pause(true);for(let n=0;n<30;n++)sim.step(dt);assert.equal(sim.clockReads,reads);assert.equal(sim.state.elapsed,elapsed);assert.equal(sim.walkSearch,search);assert.equal(sim.state.walkPending,true);sim.pause(false);
 let frames=1;while(sim.state.walkPending&&frames<2000){const last={x:sim.state.playerX,z:sim.state.playerZ};sim.step(dt);frames++;assert.ok(Math.hypot(sim.state.playerX-last.x,sim.state.playerZ-last.z)<=2.90*dt+1e-7);}
 assert.ok(frames>2&&frames<2000);assert.equal(sim.state.walkPending,false);assert.equal(sim.state.autoWalk,true);assert.ok(sim.clockReads*10>45,'CPU budget spans many frames instead of expiring the route');assert.ok(Math.abs(sim.state.elapsed-frames*dt)<1e-7);assert.ok(sim.state.walked<=2.90*dt+1e-7,'pending time is not converted into walking distance');assert.deepEqual(arrive(sim,dt),behindBuilding);assert.equal(sim.state.arrival,'ground');
});

test('pending searches are discarded safely on save/resume and capped failure clears the target',()=>{
 const sim=new PixelSimulation();sim.start();sim.walkTo(behindBuilding);const saved=sim.snapshot();assert.equal(saved.walkPending,true);assert.equal(Object.hasOwn(saved,'walkSearch'),false);assert.doesNotThrow(()=>JSON.stringify(saved));
 const resumed=new PixelSimulation({saved});resumed.start(true);assert.equal(resumed.state.walkPending,false);assert.equal(resumed.state.walkTarget,null);assert.equal(resumed.walkSearch,null);assert.equal(resumed.state.autoWalk,false);
 sim.walkSearch=createGroundWalkSearch(from,behindBuilding,{maxExpanded:1});for(let i=0;i<10&&sim.state.walkPending;i++)sim.step(.1);assert.equal(sim.state.walkPending,false);assert.equal(sim.state.autoWalk,false);assert.equal(sim.state.walkTarget,null);assert.equal(sim.publicState().walkDestination,null);assert.deepEqual({x:sim.state.playerX,z:sim.state.playerZ},from);
});

test('named counter and narrow-stair boarding destinations retain their arrival semantics',()=>{
 const sim=new PixelSimulation();sim.start();assert.equal(sim.walkTo('counter').ok,true);arrive(sim);assert.equal(sim.state.arrival,'counter');
 sim.launchBoat();assert.equal(sim.walkTo('boarding').ok,true);arrive(sim);assert.equal(sim.state.arrival,'boarding');assert.ok(Math.hypot(sim.state.playerX-HARBOR.boardingX,sim.state.playerZ-HARBOR.boardingZ)<1e-7);
 assert.equal(sim.walkTo('counter').ok,true);arrive(sim);assert.equal(sim.state.arrival,'counter');
});
