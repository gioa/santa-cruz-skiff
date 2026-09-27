import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const run=(sim,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.1)sim.step(Math.min(.1,seconds-t),input);};
function ready(){
 const sim=new PixelSimulation({rng:()=>.05,patrolRng:()=>.9,profile:{version:2,credits:200}});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});assert.ok(sim.buyGear('anchor').ok);assert.ok(sim.equip('anchor').ok);assert.ok(sim.launchBoat().ok);run(sim,24.1);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.ok(sim.board().ok);assert.ok(sim.unmoor().ok);return sim;
}

test('a deployed hand-held rod blocks both anchor directions until the rod is secured in a side holder',()=>{
 const sim=ready();assert.ok(sim.lowerRig().ok);assert.equal(sim.toggleAnchor().ok,false);assert.equal(sim.state.anchor,false);assert.ok(sim.setRodMount('port').ok);assert.ok(sim.toggleAnchor().ok);assert.equal(sim.state.anchor,true);
 assert.ok(sim.setRodMount('hand').ok);assert.equal(sim.toggleAnchor().ok,false);assert.equal(sim.state.anchor,true);assert.ok(sim.setRodMount('starboard').ok);assert.ok(sim.toggleAnchor().ok);assert.equal(sim.state.anchor,false);
 sim.state.fishState='bite';assert.equal(sim.toggleAnchor().ok,false,'a bite needs rod attention even in the holder');assert.ok(sim.setRodMount('hand').ok);assert.ok(sim.hook().ok);assert.equal(sim.toggleAnchor().ok,false,'fighting fish cannot be interrupted by hauling anchor');
});

test('anchor obeys pause, inspection, seated posture, mooring and docking state, preserving engine/speed rules',()=>{
 const sim=ready(),s=sim.state;
 for(const patch of[{paused:true},{inspection:{phase:'checking'}},{standing:true},{moored:true},{docking:{progress:.2}},{fishState:'casting'},{fishState:'flight'},{fishState:'landed'}]){
  const before={};for(const key of Object.keys(patch))before[key]=s[key];Object.assign(s,patch);assert.equal(sim.toggleAnchor().ok,false,JSON.stringify(patch));assert.equal(s.anchor,false);Object.assign(s,before);
 }
 assert.ok(sim.toggleEngine().ok);assert.equal(sim.toggleAnchor().ok,false);assert.ok(sim.toggleEngine().ok);s.speed=.86;assert.equal(sim.toggleAnchor().ok,false);s.speed=0;assert.ok(sim.toggleAnchor().ok);assert.equal(s.anchor,true);
 sim.pause(true);assert.equal(sim.toggleAnchor().ok,false);assert.equal(s.anchor,true);sim.pause(false);assert.ok(sim.toggleAnchor().ok);assert.equal(s.anchor,false);
});

test('dock rejects duplicate, moored, paused or inspection attempts without restarting a live approach',()=>{
 const sim=ready(),s=sim.state;
 for(const patch of[{moored:true},{paused:true},{inspection:{phase:'checking'}}]){const before={};for(const key of Object.keys(patch))before[key]=s[key];Object.assign(s,patch);assert.equal(sim.dock().ok,false);assert.equal(s.docking,null);Object.assign(s,before);}
 assert.ok(sim.dock().ok);run(sim,1);const approach=s.docking,progress=approach.progress;assert.ok(progress>0);assert.equal(sim.dock().ok,false);assert.equal(s.docking,approach);assert.equal(s.docking.progress,progress);run(sim,4);assert.equal(s.mode,'walk');assert.equal(s.moored,true);
});

test('sitting down with a deployed rod preserves its tackle and enables holder helm handover',()=>{
 const sim=ready(),s=sim.state;assert.ok(sim.stand().ok);assert.equal(s.standing,true);assert.ok(sim.lowerRig().ok);run(sim,3);assert.ok(sim.setRodMount('port').ok);const paid=s.paidLineMeters,point={...s.bobber},stock=s.profile.stock.squid,fishState=s.fishState;
 assert.equal(sim.toggleEngine().ok,false,'standing crew cannot operate the tiller');assert.ok(sim.stand().ok);assert.equal(s.standing,false);assert.equal(s.engine,false);assert.equal(s.throttle,0);assert.equal(s.paidLineMeters,paid);assert.deepEqual(s.bobber,point);assert.equal(s.profile.stock.squid,stock);assert.equal(s.fishState,fishState);assert.ok(sim.toggleEngine().ok);
 assert.equal(sim.stand().ok,false,'standing up still requires the active rig to be retrieved');assert.equal(s.standing,false);
});

test('legacy standing fish states can safely sit down without dropping the line or catch',()=>{
 for(const fishState of['sinking','waiting','bite','fight','landed']){
  const sim=ready(),s=sim.state;assert.ok(sim.lowerRig().ok);run(sim,1);s.standing=true;s.fishState=fishState;s.fish={name:'test fish',length:30,kg:1};const point={...s.bobber},paid=s.paidLineMeters,fish=s.fish;
  assert.ok(sim.stand().ok,fishState);assert.equal(s.standing,false);assert.equal(s.fishState,fishState);assert.equal(s.fish,fish);assert.deepEqual(s.bobber,point);assert.equal(s.paidLineMeters,paid);assert.equal(s.engine,false);
 }
});
