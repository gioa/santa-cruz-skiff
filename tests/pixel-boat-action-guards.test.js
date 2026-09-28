import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const run=(sim,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.1)sim.step(Math.min(.1,seconds-t),input);};
function ready(){
 const sim=new PixelSimulation({rng:()=>.05,patrolRng:()=>.9,profile:{version:2,credits:200}});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});assert.ok(sim.launchBoat().ok);run(sim,24.1);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.ok(sim.board().ok);assert.ok(sim.unmoor().ok);return sim;
}

test('retired anchor calls cannot change navigation or deployed tackle in any fishing phase',()=>{
 const sim=ready(),s=sim.state;assert.ok(sim.lowerRig().ok);run(sim,2);
 for(const fishState of ['sinking','waiting','bite','fight','landed'])for(const rodMount of ['hand','port','starboard']){
  Object.assign(s,{fishState,rodMount});const paid=s.paidLineMeters,point={...s.bobber};
  assert.equal(sim.toggleAnchor().ok,false);assert.equal(s.anchor,false);assert.equal(s.paidLineMeters,paid);assert.deepEqual(s.bobber,point);
 }
});

test('legacy rope, anchor and empty fuel flags do not block helm and clear on the next frame',()=>{
 const sim=ready(),s=sim.state;Object.assign(s,{anchor:true,moored:true,fuel:0});
 assert.ok(sim.toggleEngine().ok);assert.ok(sim.setThrottle(.3));sim.step(.1);assert.equal(s.anchor,false);assert.equal(s.moored,false);assert.equal(s.engine,true);assert.equal(s.throttle,.3);assert.equal(s.fuel,0);
});

test('dock rejects duplicate, paused or inspection attempts without restarting a live approach',()=>{
 const sim=ready(),s=sim.state;
 for(const patch of[{paused:true},{inspection:{phase:'checking'}}]){const before={};for(const key of Object.keys(patch))before[key]=s[key];Object.assign(s,patch);assert.equal(sim.dock().ok,false);assert.equal(s.docking,null);Object.assign(s,before);}
 assert.ok(sim.dock().ok);run(sim,1);const approach=s.docking,progress=approach.progress;assert.ok(progress>0);assert.equal(sim.dock().ok,false);assert.equal(s.docking,approach);assert.equal(s.docking.progress,progress);run(sim,4);assert.equal(s.mode,'walk');assert.equal(s.moored,true);
});

test('retired standing action cannot drop deployed tackle or interrupt holder helm handover',()=>{
 const sim=ready(),s=sim.state;assert.ok(sim.lowerRig().ok);run(sim,3);assert.ok(sim.setRodMount('port').ok);const paid=s.paidLineMeters,point={...s.bobber},stock=s.profile.stock.squid,fishState=s.fishState;
 assert.equal(sim.stand().ok,false);assert.equal(s.standing,false);assert.equal(s.paidLineMeters,paid);assert.deepEqual(s.bobber,point);assert.equal(s.profile.stock.squid,stock);assert.equal(s.fishState,fishState);assert.ok(sim.toggleEngine().ok);assert.equal(sim.setThrottle(.1),true);
 assert.equal(sim.stand().ok,false);assert.equal(s.engine,true);assert.equal(s.throttle,.1);assert.equal(s.paidLineMeters,paid);
});

test('legacy deck posture clears during a paused boat frame without dropping the line or catch',()=>{
 for(const fishState of['sinking','waiting','bite','fight','landed']){
  const sim=ready(),s=sim.state;assert.ok(sim.lowerRig().ok);run(sim,1);Object.assign(s,{standing:true,deckX:.7,deckZ:-1.8,fishState,fish:{name:'test fish',length:30,kg:1}});const point={...s.bobber},paid=s.paidLineMeters,fish=s.fish;
  sim.pause(true);sim.step(.1,{moveX:1,moveZ:1});assert.equal(s.standing,false);assert.deepEqual([s.deckX,s.deckZ],[0,.8]);assert.equal(s.fishState,fishState);assert.equal(s.fish,fish);assert.deepEqual(s.bobber,point);assert.equal(s.paidLineMeters,paid);assert.equal(s.engine,false);
 }
});

test('stale standing flags never block helm access',()=>{
 const sim=ready(),s=sim.state;s.standing=true;assert.ok(sim.toggleEngine().ok);assert.equal(sim.setThrottle(.2),true);assert.equal(sim.toggleEngine().ok,false);assert.equal(s.engine,true);sim.setThrottle(0);assert.ok(sim.toggleEngine().ok);assert.equal(sim.toggleAnchor().ok,false);sim.step(.1);assert.equal(s.standing,false);
});
