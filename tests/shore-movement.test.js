import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {SHORE_MOVEMENT as M,shoreStandPosition,shoreWalkBoundaryY,shorePierExitPosition} from '../dist/shore-movement.js';
import {nearbyShoreInteraction} from '../dist/shore-interactions.js';
import {beniciaCrowd,crowdCastConflict} from '../dist/benicia-crowd.js';
const create=id=>id==='benicia'?new BeniciaSimulation({rng:()=>.99}):new PacificaSimulation({sceneId:id,rng:()=>.99});
const run=(sim,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.05)sim.update(.05,input);};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('walking covers 1.6 metres per second cardinally and diagonally at every shore scene',()=>{
 for(const id of ['pacifica','half-moon-bay','benicia'])for(const input of [{x:1},{x:1,y:1}]){
  const sim=create(id);Object.assign(sim.state.player,{x:600,y:900});const from={...sim.state.player};
  run(sim,4,input);assert.ok(Math.abs(distance(from,sim.state.player)/3.2-6.4)<1e-7,id);
 }
});

test('following the steep Benicia bank keeps the body dry without an unearned speed boost',()=>{
 const sim=create('benicia');Object.assign(sim.state.player,shoreStandPosition(sim.scene,1270));
 for(let t=0;t<80;t+=.05){
  const before={...sim.state.player};sim.update(.05,{x:1,y:-1});
  assert.ok(distance(before,sim.state.player)<=1.6*3.2*.05+1e-6,'bank clamp cannot teleport player');
  assert.ok(sim.state.player.y>=shoreWalkBoundaryY(sim.scene,sim.state.player.x)-1e-6);
  for(const x of [sim.state.player.x-.32*3.2,sim.state.player.x+.32*3.2])assert.ok(sim.state.player.y>sim.scene.shoreY(x));
 }
 assert.ok(sim.state.player.x>1290,'the slope remains traversable');
});

test('near-water standing positions allow physically short tap casts on each shore',()=>{
 for(const [id,x]of [['pacifica',730],['half-moon-bay',730],['benicia',450]]){
  const sim=create(id);Object.assign(sim.state.player,shoreStandPosition(sim.scene,x));sim.state.crowd=[];
  assert.ok(sim.canCast);assert.ok(sim.onSand(sim.state.player.x,sim.state.player.y));
  const cast=sim.previewCast({power:0,aim:0});assert.equal(cast.landing,'water',id);assert.ok(cast.distance>0&&cast.distance<10);
 }
});

test('new arrivals are within a few steps of shop or gate while existing saved positions are retained',()=>{
 for(const id of ['pacifica','half-moon-bay','benicia']){
  const sim=create(id),destination=id==='benicia'?sim.scene.pier.gate:sim.shop.door;
  assert.ok(distance(sim.state.player,destination)/3.2<=2.5+1e-8);
  if(id!=='benicia'){assert.ok(sim.nearShop);assert.equal(nearbyShoreInteraction(sim.scene,sim.state),null);}
  Object.assign(sim.state.player,{x:600,y:920});const restored=id==='benicia'?new BeniciaSimulation({saved:sim.snapshot()}):new PacificaSimulation({sceneId:id,saved:sim.snapshot()});
  assert.deepEqual({x:restored.state.player.x,y:restored.state.player.y},{x:600,y:920});
 }
});

test('shop collision matches its seven-metre artwork and arrival can walk around it to the water',()=>{
 const sim=create('pacifica'),b=sim.building;
 assert.ok(Math.abs((b.right-b.left-2*M.bodyRadius)/3.2-7)<1e-9);
 const target=shoreStandPosition(sim.scene,sim.shop.door.x);assert.ok(sim.walkTo(target.x,target.y).ok);
 for(let t=0;t<100&&sim.state.walkTarget;t+=.05){sim.update(.05);const p=sim.state.player;assert.ok(!(p.x>b.left&&p.x<b.right&&p.y>b.top&&p.y<b.bottom));}
 assert.equal(sim.state.walkTarget,null);assert.ok(distance(sim.state.player,target)<.2*3.2);
});

test('both pier deck entries have a reachable exit and preserve physical walking clearance',()=>{
 for(const id of ['pacifica','benicia']){
  const sim=create(id);Object.assign(sim.state.player,sim.scene.pier.gate);assert.ok(sim.enterPier().ok);
  assert.equal(nearbyShoreInteraction(sim.scene,sim.state)?.kind,'pier-exit');
  const p=shorePierExitPosition(sim.scene);assert.ok(sim.walkPierTo(p.x,p.y).ok);
  assert.ok(sim.leavePier().ok);run(sim,.2);assert.equal(sim.onPier,false);
 }
});

test('Benicia locals walk at human speed and protect a personal casting space rather than a ten-metre exclusion zone',()=>{
 let checked=false;
 for(let block=1;block<8;block++){
  const a=beniciaCrowd(block*140+1,51,9),b=beniciaCrowd(block*140+1.1,51,9);
  for(const n of a.filter(n=>n.walking)){
   const next=b.find(p=>p.id===n.id);if(!next)continue;
   assert.ok(Math.abs(distance(n,next)/3.2/.1-1.6)<1e-8);checked=true;
  }
 }
 assert.ok(checked);
 const n={x:100,y:100,mode:'watching'};
 assert.equal(crowdCastConflict({player:{x:100,y:103},crowd:[n]}, {x:100,y:20}),n);
 assert.equal(crowdCastConflict({player:{x:100,y:110},crowd:[n]}, {x:100,y:20}),null);
});
