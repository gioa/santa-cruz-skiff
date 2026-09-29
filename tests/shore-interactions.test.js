import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {createShoreInteractions,nearbyShoreInteraction} from '../dist/shore-interactions.js';

function fixture(sceneId='pacifica',saved){
 const sim=new PacificaSimulation({sceneId,saved,loreSeed:42,rng:()=>.99,date:'2026-09-28'});
 sim.state.shoreLore.nextAt=1e9;
 const events=createShoreInteractions(sim.scene);events.reset(sim.state);
 return{sim,events};
}
function walkUntil(sim,events,predicate,input={},limit=20){
 const found=[];
 for(let t=0;t<limit&&!predicate();t+=.05){sim.update(.05,input);const e=events.step(sim.state);if(e)found.push(e);}
 assert.ok(predicate(),'walking did not reach its expected endpoint');
 return found;
}
function move(sim,events,point,options){Object.assign(sim.state.player,point);return events.step(sim.state,options);}
const offset=(point,dy)=>({x:point.x,y:point.y+dy});
function angler(sim,id=1){
 const x=2400,y=sim.scene.shoreY(x)+80;
 return{id,x,y,angler:0,expiresAt:sim.state.elapsed+100,clueId:null,talked:false};
}

test('both beaches spawn in shopping range without opening the shop; walking to its door triggers once',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const{sim,events}=fixture(sceneId);
  assert.equal(sim.nearShop,true,'existing transaction radius includes the arrival area');
  assert.equal(nearbyShoreInteraction(sim.scene,sim.state),null,'arrival area is outside the doorway');
  for(let n=0;n<20;n++){sim.update(.05);assert.equal(events.step(sim.state),null);}
  assert.equal(sim.walkTo(sim.shop.door.x,sim.shop.door.y).ok,true);
  const found=walkUntil(sim,events,()=>sim.state.walkTarget===null);
  assert.deepEqual(found.map(e=>e.kind),['shop']);
  assert.equal(nearbyShoreInteraction(sim.scene,sim.state)?.kind,'shop','E can reopen a nearby shop');
  for(let n=0;n<20;n++){sim.update(.05);assert.equal(events.step(sim.state),null,'standing at the door must not reopen it');}
 }
});

test('resuming at a doorway suppresses an automatic popup but preserves explicit nearby interaction',()=>{
 const original=fixture().sim;Object.assign(original.state.player,original.shop.door);
 const{sim,events}=fixture('pacifica',original.snapshot());
 assert.equal(events.step(sim.state),null);
 assert.equal(move(sim,events,offset(sim.shop.door,3)),null,'small movement after resume must not reopen');
 assert.equal(nearbyShoreInteraction(sim.scene,sim.state)?.kind,'shop');
 assert.equal(move(sim,events,offset(sim.shop.door,70)),null);
 assert.equal(move(sim,events,offset(sim.shop.door,38))?.kind,'shop','leaving and returning starts a new visit');
 events.reset(sim.state);
 assert.equal(move(sim,events,offset(sim.shop.door,20)),null,'reset also consumes an already occupied doorway');
});

test('doorway hysteresis tolerates boundary movement and rearms only after leaving the visit area',()=>{
 const{sim,events}=fixture();const door=sim.shop.door;
 assert.equal(move(sim,events,offset(door,40))?.kind,'shop');
 for(const dy of [40.5,39.5,60,40,64,39])assert.equal(move(sim,events,offset(door,dy)),null);
 assert.equal(move(sim,events,offset(door,64.1)),null);
 assert.equal(move(sim,events,offset(door,40))?.kind,'shop');
});

test('manual walking cancels an automatic route and entering the door on foot still works',()=>{
 const{sim,events}=fixture();assert.equal(sim.walkTo(sim.shop.door.x,sim.shop.door.y).ok,true);
 sim.update(.05,{x:-1});assert.equal(events.step(sim.state),null);
 assert.equal(sim.state.walkTarget,null);assert.deepEqual(sim.state.walkRoute,[]);
 for(let n=0;n<20;n++){sim.update(.05);assert.equal(events.step(sim.state),null);}
 const dx=sim.shop.door.x-sim.state.player.x,dy=sim.shop.door.y-sim.state.player.y,d=Math.hypot(dx,dy);
 const found=walkUntil(sim,events,()=>Math.hypot(sim.state.player.x-sim.shop.door.x,sim.state.player.y-sim.shop.door.y)<30,{x:dx/d,y:dy/d});
 assert.deepEqual(found.map(e=>e.kind),['shop']);
});

test('paused moves and blocked phases never defer a surprise event until normal play resumes',()=>{
 const cases=[{paused:true},...['casting','waiting','bite','fighting','landed'].map(phase=>({phase})),{inspection:{id:1}},{leavingPier:true}];
 for(const blocked of cases){
  const{sim,events}=fixture();const door=sim.shop.door;
  if(blocked.phase)sim.state.phase=blocked.phase;
  if(blocked.inspection)sim.state.inspection=blocked.inspection;
  if(blocked.leavingPier)sim.state.leavingPier=true;
  assert.equal(move(sim,events,offset(door,30),{paused:Boolean(blocked.paused)}),null);
  if(!blocked.paused)assert.equal(nearbyShoreInteraction(sim.scene,sim.state),null);
  Object.assign(sim.state,{phase:'walk',inspection:null,leavingPier:false});
  assert.equal(move(sim,events,offset(door,25)),null,'resuming within the same visit does not trigger');
  move(sim,events,offset(door,70));
  assert.equal(move(sim,events,offset(door,35))?.kind,'shop');
 }
});

test('an angler appearing next to the player does not interrupt; approaching from outside starts one valid conversation',()=>{
 const{sim,events}=fixture();const e=angler(sim);Object.assign(sim.state.player,offset(e,25));events.reset(sim.state);
 sim.state.shoreLore.encounter=e;
 assert.equal(events.step(sim.state),null,'new encounter appearing in range is quiet');
 assert.equal(move(sim,events,offset(e,20)),null);
 assert.equal(nearbyShoreInteraction(sim.scene,sim.state)?.anglerId,e.id);
 move(sim,events,offset(e,90));assert.equal(nearbyShoreInteraction(sim.scene,sim.state),null);
 const found=walkUntil(sim,events,()=>Math.hypot(sim.state.player.x-e.x,sim.state.player.y-e.y)<50,{y:-1});
 assert.deepEqual(found.map(item=>[item.kind,item.anglerId]),[['angler',e.id]]);
 assert.equal(sim.talkAngler(found[0].anglerId).ok,true,'discovery radius must satisfy the real conversation guard');
 for(const dy of [56,79,54,30])assert.equal(move(sim,events,offset(e,dy)),null);
 move(sim,events,offset(e,81));
 assert.equal(move(sim,events,offset(e,55))?.kind,'angler');
});

test('NPC expiration and replacement discard old encounter identity without triggering at rest',()=>{
 const{sim,events}=fixture();const e=angler(sim);sim.state.shoreLore.encounter=e;
 Object.assign(sim.state.player,offset(e,100));events.reset(sim.state);
 assert.equal(move(sim,events,offset(e,54))?.anglerId,1);
 sim.state.elapsed=e.expiresAt;
 assert.equal(events.step(sim.state),null);assert.equal(nearbyShoreInteraction(sim.scene,sim.state),null);
 const next={...e,id:2,expiresAt:sim.state.elapsed+100};sim.state.shoreLore.encounter=next;
 assert.equal(events.step(sim.state),null);
 assert.equal(move(sim,events,offset(next,40)),null);
 assert.equal(nearbyShoreInteraction(sim.scene,sim.state)?.anglerId,2);
 move(sim,events,offset(next,100));
 assert.equal(move(sim,events,offset(next,40))?.anglerId,2);
});

test('the closed gate is silent on approach; E/tap beside it is the only way on',()=>{
 const{sim,events}=fixture();const gate=sim.scene.pier.gate;
 Object.assign(sim.state.player,offset(gate,100));events.reset(sim.state);
 assert.equal(sim.walkTo(gate.x,gate.y).ok,true);
 const found=walkUntil(sim,events,()=>sim.state.walkTarget===null);
 assert.deepEqual(found.map(e=>e.kind),[],'no notice or prompt appears at the gate');
 assert.equal(sim.onPier,false,'arrival alone cannot cross the fence');
 assert.equal(nearbyShoreInteraction(sim.scene,sim.state)?.kind,'pier');
 assert.equal(sim.enterPier().ok,true);
 assert.equal(Math.round(Math.hypot(sim.state.player.x-gate.x,sim.state.player.y-gate.y)),52);
 assert.equal(events.step(sim.state),null,'switching onto the pier synchronizes occupancy');
 assert.equal(nearbyShoreInteraction(sim.scene,sim.state),null,'entry is outside the return trigger');
 const exits=walkUntil(sim,events,()=>Math.hypot(sim.state.player.x-gate.x,sim.state.player.y-gate.y)<30,{y:1});
 assert.deepEqual(exits.map(e=>e.kind),['pier-exit']);
 assert.equal(sim.onPier,true,'event reporting must not eject before the controller handles it');
 assert.equal(nearbyShoreInteraction(sim.scene,sim.state)?.kind,'pier-exit');
 for(const dy of [-35,-53,-34])assert.equal(move(sim,events,offset(gate,dy)),null);
 move(sim,events,offset(gate,-55));
 assert.equal(move(sim,events,offset(gate,-34))?.kind,'pier-exit');
 sim.ejectFromPier();assert.equal(events.step(sim.state),null,'return or patrol ejection cannot reopen the gate notice');
 assert.equal(move(sim,events,offset(gate,1)),null);
 assert.equal(nearbyShoreInteraction(sim.scene,sim.state)?.kind,'pier');
});

test('walking back and forth at the gate never raises an event',()=>{
 const{sim,events}=fixture();const gate=sim.scene.pier.gate;
 move(sim,events,offset(gate,100));
 for(const dy of [42,43,67,41,68,40,68.1,42,0])assert.equal(move(sim,events,offset(gate,dy)),null);
 assert.equal(nearbyShoreInteraction(sim.scene,sim.state)?.kind,'pier','E beside the gate still reaches it');
});

test('Half Moon Bay does not inherit Pacifica pier interactions',()=>{
 const{sim,events}=fixture('half-moon-bay');const pacifica=fixture().sim;
 for(const dy of [100,42,0,-30]){
  assert.equal(move(sim,events,offset(pacifica.scene.pier.gate,dy)),null);
  assert.equal(nearbyShoreInteraction(sim.scene,sim.state),null);
 }
 sim.state.onPier=true;
 assert.equal(events.step(sim.state),null);
 assert.equal(nearbyShoreInteraction(sim.scene,sim.state),null,'malformed pier state cannot fabricate a location');
});
