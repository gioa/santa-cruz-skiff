import test from 'node:test';
import assert from 'node:assert/strict';
import {seatHook} from './helpers/pixel-hook.js';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {isFishingFocus,focusRodPoseFromDrag}=await import('../dist/pixel-fight-focus.js');
const run=(sim,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.1)sim.step(Math.min(.1,seconds-t),input);};
const until=(sim,predicate,seconds=100,input={})=>{for(let t=0;t<seconds&&!predicate(sim.state);t+=.1)sim.step(.1,input);assert.ok(predicate(sim.state),`state ${sim.state.fishState} did not reach expected transition`);};
function ready(){
 const sim=new PixelSimulation({rng:()=>.05,patrolRng:()=>.9,conditions:{currentMps:0}});assert.ok(sim.start().ok);Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});assert.ok(sim.launchBoat().ok);run(sim,24.1);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.ok(sim.board().ok);assert.ok(sim.unmoor().ok);
 const p=FISHING_SPOTS[1];Object.assign(sim.state,{boatX:p.x,boatZ:p.z});syncVessel(sim.vessel,{x:p.x,z:p.z,clearMotion:true});return sim;
}
function bite(sim,{mounted=false,natural=false}={}){
 if(mounted)assert.ok(sim.setRodMount('port').ok);assert.ok(sim.lowerRig().ok);assert.equal(isFishingFocus(sim.state),false);if(!natural)sim.state.biteAt=.5;until(sim,s=>s.fishState==='bite');assert.equal(isFishingFocus(sim.state),true);
}

test('focus is derived only from a bite, fight or unresolved catch aboard the rented afloat boat',()=>{
 const sim=ready(),base=structuredClone(sim.state);
 for(const fishState of['idle','casting','flight','sinking','waiting','bite','fight','landed'])for(const rodMount of['hand','port','starboard'])assert.equal(isFishingFocus({...base,fishState,rodMount}),['bite','fight','landed'].includes(fishState),`${fishState}/${rodMount}`);
 for(const patch of[{mode:'walk'},{mode:'intro'},{mode:'swim'},{rentalPaid:false},{launchStage:'stored'},{launchStage:'lowering'},{moored:true},{docking:{progress:.5}},{inspection:{phase:'checking'}}])assert.equal(isFishingFocus({...base,fishState:'fight',...patch}),false,JSON.stringify(patch));
 assert.equal(isFishingFocus({...base,fishState:'fight',inspection:{phase:'approaching'}}),true,'a distant approaching patrol does not interrupt the fish');assert.equal(isFishingFocus(),false);
});

test('focus selection never changes fish, line, engine or pause state',()=>{
 const sim=ready();bite(sim);const before=structuredClone(sim.state);for(let i=0;i<500;i++)assert.equal(isFishingFocus(sim.state),true);assert.deepEqual(sim.state,before);
});

test('a natural hand-held bite enters focus and stays through hooking, real reeling and the keep decision',()=>{
 const sim=ready();bite(sim,{natural:true});const paid=sim.state.paidLineMeters,bait=sim.state.profile.stock.squid;assert.ok(sim.hook().ok);assert.equal(sim.state.paidLineMeters,paid);assert.equal(isFishingFocus(sim.state),true);
 until(sim,s=>s.fishState==='landed',240,{reel:1.2});assert.ok(sim.state.fightTime>0,'a shallow small fish may land quickly, but focus cannot skip the physical fight');assert.ok(sim.state.paidLineMeters<paid,'actual winding must shorten the line before landing');assert.equal(isFishingFocus(sim.state),true);assert.equal(sim.retrieve().ok,false,'the catch decision is still pending');assert.equal(isFishingFocus(sim.state),true);
 assert.ok(sim.keepCatch().ok);assert.equal(isFishingFocus(sim.state),false);assert.equal(sim.state.catches.length,1);assert.equal(sim.state.catches[0].kept,true);assert.equal(sim.state.profile.stock.squid,bait);
});

test('a trolling bite stays focused through pickup, winding into the fish and landing',()=>{
 const sim=ready();assert.ok(sim.setRodMount('starboard').ok);assert.ok(sim.lowerRig().ok);sim.state.biteAt=.5;assert.ok(sim.toggleEngine().ok);assert.ok(sim.setThrottle(.15));until(sim,s=>s.fishState==='bite');assert.equal(isFishingFocus(sim.state),true);assert.equal(sim.state.rodMount,'starboard');assert.equal(sim.state.throttle,0);assert.equal(sim.hook().ok,false);assert.equal(isFishingFocus(sim.state),true);
 assert.ok(sim.setRodMount('hand').ok);assert.equal(sim.state.engine,false);assert.equal(isFishingFocus(sim.state),true);assert.ok(sim.hook().ok);assert.equal(isFishingFocus(sim.state),true);until(sim,s=>s.fishState==='landed',240,{reel:1.2});assert.equal(isFishingFocus(sim.state),true);assert.ok(sim.releaseCatch().ok);assert.equal(isFishingFocus(sim.state),false);assert.equal(sim.state.catches[0].kept,false);
});

test('missed bites, broken lines and cleared tackle leave focus through their actual model transitions',()=>{
 const missed=ready();bite(missed);missed.state.biteHold.threshold=.02;until(missed,s=>s.fishState==='idle',15);assert.equal(missed.state.misses,1);assert.equal(isFishingFocus(missed.state),false);
 const broken=ready();bite(broken);seatHook(broken);broken.escape('break');assert.equal(broken.state.breaks,1);assert.equal(isFishingFocus(broken.state),false);
 const retrieved=ready();bite(retrieved);assert.ok(retrieved.retrieve().ok);assert.equal(isFishingFocus(retrieved.state),false);assert.equal(retrieved.state.paidLineMeters,0);
});

test('menus keep the focused camera while pausing all fishing progress',()=>{
 const sim=ready();bite(sim);for(const stage of['bite','fight','landed']){
  if(stage==='fight')seatHook(sim);if(stage==='landed')until(sim,s=>s.fishState==='landed',240,{reel:1.2});sim.pause(true);const before=structuredClone(sim.state);assert.equal(isFishingFocus(sim.state),true);run(sim,10,{reel:2,pump:true});assert.deepEqual(sim.state,before);assert.equal(isFishingFocus(sim.state),true);sim.pause(false);
 }
 assert.ok(sim.releaseCatch().ok);assert.equal(isFishingFocus(sim.state),false);
});

test('rescue returns to the normal harbour view and a newly resumed day cannot retain a stale focus',()=>{
 const sim=ready();bite(sim);seatHook(sim);const saved=sim.snapshot();assert.ok(sim.rescue().ok);assert.equal(sim.state.mode,'walk');assert.equal(isFishingFocus(sim.state),false);
 const resumed=new PixelSimulation({saved,patrolRng:()=>.9});assert.ok(resumed.start(true).ok);assert.equal(resumed.state.fishState,'idle');assert.equal(isFishingFocus(resumed.state),false);
});

test('first-person dragging is relative, lifts toward an upward touch, and remains usable across phone sizes',()=>{
 const pose={elevation:38,azimuth:-45};for(const viewport of[{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  assert.deepEqual(focusRodPoseFromDrag(pose,0,0,viewport),pose);const next=focusRodPoseFromDrag(pose,50,-60,viewport);assert.ok(next.elevation>pose.elevation+15&&next.elevation<pose.elevation+35);assert.ok(next.azimuth>pose.azimuth);
  assert.deepEqual(focusRodPoseFromDrag(pose,1e4,-1e4,viewport),{elevation:85,azimuth:110});assert.deepEqual(focusRodPoseFromDrag(pose,-1e4,1e4,viewport),{elevation:5,azimuth:-110});
 }
 assert.deepEqual(focusRodPoseFromDrag(pose,NaN,Infinity),pose);assert.deepEqual(focusRodPoseFromDrag(pose,50,-60,{width:NaN,height:Infinity}),focusRodPoseFromDrag(pose,50,-60));assert.deepEqual(pose,{elevation:38,azimuth:-45});
});
