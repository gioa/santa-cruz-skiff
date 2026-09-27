import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const {walkAllowed,walkBlocked,walkHeight}=await import('../dist/harbor-layout.js');
const {planGroundWalk,walkingSegmentOpen}=await import('../dist/pixel-walking-path.js');
const from={x:HARBOR.spawnX,z:HARBOR.spawnZ},behindBuilding={x:12,z:-72};
function arrive(sim,dt=.1){
 let last={x:sim.state.playerX,z:sim.state.playerZ},height=walkHeight(last.x,last.z);
 for(let t=0;t<90&&sim.state.autoWalk;t+=dt){
  sim.step(dt);const s=sim.state,next={x:s.playerX,z:s.playerZ},nextHeight=walkHeight(next.x,next.z);
  assert.equal(s.mode,'walk');assert.equal(walkAllowed(next.x,next.z),true);assert.equal(walkBlocked(next.x,next.z),false);assert.ok(Math.hypot(next.x-last.x,next.z-last.z)<=2.90*dt+1e-7,'walking never teleports');assert.ok(Math.abs(nextHeight-height)<.5,'does not jump between wharf and landing');last=next;height=nextHeight;
 }
 assert.equal(sim.state.autoWalk,false);return last;
}

test('a default-budget local route walks around real wharf buildings and reaches the clicked ground',()=>{
 assert.equal(walkingSegmentOpen(from,behindBuilding),false,'the direct line crosses mapped building footprints');
 const begin=performance.now(),planned=planGroundWalk(from,behindBuilding);
 assert.ok(planned.route,'a real detour must succeed within the default search and smoothing budget');assert.ok(planned.route.length>1);assert.ok(planned.expanded>0&&planned.expanded<=1600);
 // The wall-time budget is an implementation guard; geometry/caps are the
 // correctness assertions rather than a timing-sensitive CPU benchmark.
 assert.ok(performance.now()-begin<1000,'path planning returns promptly');
 for(const dt of[1/60,.25]){
  const sim=new PixelSimulation();sim.start();assert.equal(sim.walkTo(behindBuilding).action,'walking-ground');assert.equal(sim.publicState().autoWalking,true);assert.deepEqual(sim.publicState().walkDestination,behindBuilding);
  assert.deepEqual(arrive(sim,dt),behindBuilding);assert.equal(sim.state.arrival,'ground');assert.equal(sim.publicState().autoWalking,false);assert.equal(sim.publicState().walkDestination,null);
  for(let t=0;t<2;t+=dt)sim.step(dt);assert.deepEqual({x:sim.state.playerX,z:sim.state.playerZ},behindBuilding);
 }
});

test('valid new clicks replace the destination and joystick control cancels the remaining route',()=>{
 const sim=new PixelSimulation();sim.start();assert.equal(sim.walkTo(behindBuilding).ok,true);sim.step(.1);
 const replacement={x:-13,z:-46};assert.equal(sim.walkTo(replacement).ok,true);assert.deepEqual(sim.publicState().walkDestination,replacement);
 sim.step(.1,{moveZ:1});assert.equal(sim.state.autoWalk,false);assert.equal(sim.state.walkRoute.length,0);assert.equal(sim.publicState().walkDestination,null);assert.equal(sim.state.arrival,null);
 const stopped={x:sim.state.playerX,z:sim.state.playerZ};sim.step(.1);assert.deepEqual({x:sim.state.playerX,z:sim.state.playerZ},stopped);
});

test('water, building interiors and unbounded far clicks are rejected without moving toward them',()=>{
 for(const target of[{x:-40,z:-55},{x:-2,z:-60},{x:1e9,z:1e9},{x:NaN,z:0}]){
  const sim=new PixelSimulation();sim.start();assert.equal(sim.walkTo(target).ok,false);for(let t=0;t<2;t+=.1)sim.step(.1);assert.deepEqual({x:sim.state.playerX,z:sim.state.playerZ},from);assert.equal(sim.state.autoWalk,false);
 }
 assert.equal(planGroundWalk(from,behindBuilding,{maxExpanded:1,maxMilliseconds:1000}).expanded,1);
 assert.equal(planGroundWalk(from,behindBuilding,{maxExpanded:1,maxMilliseconds:1000}).route,null,'search has a fixed node cap');
 assert.equal(planGroundWalk(from,behindBuilding,{maxMilliseconds:0}).reason,'budget','time budget prevents a long synchronous search');
});

test('named counter and narrow-stair boarding destinations retain their arrival semantics',()=>{
 const sim=new PixelSimulation();sim.start();assert.equal(sim.walkTo('counter').ok,true);arrive(sim);assert.equal(sim.state.arrival,'counter');
 sim.launchBoat();assert.equal(sim.walkTo('boarding').ok,true);arrive(sim);assert.equal(sim.state.arrival,'boarding');assert.ok(Math.hypot(sim.state.playerX-HARBOR.boardingX,sim.state.playerZ-HARBOR.boardingZ)<1e-7);
 assert.equal(sim.walkTo('counter').ok,true);arrive(sim);assert.equal(sim.state.arrival,'counter');
});
