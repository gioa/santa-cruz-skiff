import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {shoreArrivalPosition,shoreStandPosition} from '../dist/shore-movement.js';

const originalArrivals=[{x:1130,y:823},{x:1100,y:865}];
const displacedArrival=scene=>({x:1133.2,y:scene.shoreY(1130)+16.2*3.2});
const position=sim=>({x:sim.state.player.x,y:sim.state.player.y});
const create=(sceneId,saved)=>sceneId==='benicia'?new BeniciaSimulation({saved,rng:()=>.5,date:'2026-09-28'}):new PacificaSimulation({sceneId,saved,rng:()=>.5,date:'2026-09-28'});
function legacySave(sceneId,point){
 const sim=create(sceneId),saved=sim.snapshot();saved.shoreLayoutRevision=1;saved.player={...point};return saved;
}

test('revision 1 beach arrivals and nearby parked saves return to the original entrance once',()=>{
 for(const sceneId of ['pacifica','half-moon-bay'])for(const version of [1,2,3,4])for(const old of [displacedArrival(create(sceneId).scene)])for(const offset of [{x:0,y:0},{x:9,y:12}]){
  const saved=legacySave(sceneId,{x:old.x+offset.x,y:old.y+offset.y});saved.version=version;const sim=create(sceneId,saved);
  assert.deepEqual(position(sim),shoreArrivalPosition(sim.scene));assert.ok(sim.nearShop);assert.ok(sim.onSand(sim.state.player.x,sim.state.player.y));
  const current=sim.snapshot();assert.equal(current.shoreLayoutRevision,2);
  assert.deepEqual(position(create(sceneId,current)),position(sim),'normal reload stays at the restored entrance');
 }
});

test('arrival migration preserves equipment, bait, money and recorded fishing progress',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const original=create(sceneId);original.state.credits=500;
  assert.ok(original.buy('squid').ok);assert.ok(original.equipBait('squid').ok);assert.ok(original.buy('sealed_reel').ok);
  original.state.catches=[{id:'surfperch',catchId:7,length:26,weightKg:.44,caughtDate:'2026-09-28'}];
  original.state.keptLog=[{catchId:7,species:'surfperch',date:'2026-09-28'}];
  original.state.stats={caught:4,kept:2,released:2,sold:1,casts:9,missed:3};original.state.nextCatchId=8;original.state.fineDebt=17;
  const expected=create(sceneId,original.snapshot()).snapshot(),legacy=structuredClone(expected);legacy.shoreLayoutRevision=1;legacy.player=displacedArrival(original.scene);
  const restored=create(sceneId,legacy).snapshot();
  for(const key of ['credits','inventory','bait','rodSupplies','rigStock','inventorySlots','activeRod','activeReel','upgrades','catches','catchHistory','keptLog','stats','nextCatchId','fineDebt','fishingDate','fishingControls'])assert.deepEqual(restored[key],expected[key],key);
 }
});

test('revision 1 positions outside the displaced entrance and near-water fishing positions stay unchanged',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const sim=create(sceneId);
  for(const p of [{...displacedArrival(sim.scene),x:displacedArrival(sim.scene).x+16.1},...originalArrivals,{x:600,y:920},shoreStandPosition(sim.scene,2440)]){
   const restored=create(sceneId,legacySave(sceneId,p));assert.deepEqual(position(restored),p);
  }
  const pier=sim.scene.pier;if(pier){const saved=legacySave(sceneId,pier.tip);saved.onPier=true;saved.pierVisit={time:3,patrolAt:null};const restored=create(sceneId,saved);assert.equal(restored.onPier,true);assert.deepEqual(position(restored),pier.tip);}
 }
});

test('unmarked, current and newer layout saves retain legitimate visits to the displaced entrance',()=>{
 for(const sceneId of ['pacifica','half-moon-bay'])for(const revision of [undefined,0,2,3]){
  const p=displacedArrival(create(sceneId).scene),saved=legacySave(sceneId,p);saved.shoreLayoutRevision=revision;
  assert.deepEqual(position(create(sceneId,saved)),p);
 }
});

test('Benicia saves at the same coordinates are never moved by the beach layout migration',()=>{
 for(const p of [...originalArrivals,displacedArrival(create('pacifica').scene),displacedArrival(create('half-moon-bay').scene)])assert.deepEqual(position(create('benicia',legacySave('benicia',p))),p);
});

test('metric-era shoreline saves keep their chosen fishing location and gear with only inland clearance restored',()=>{
 for(const sceneId of ['pacifica','half-moon-bay','benicia'])for(const revision of [0,1])for(const offset of [0,4,19.9]){
  const sim=create(sceneId),saved=sim.snapshot(),x=sceneId==='benicia'?1800:2440;
  saved.shoreLayoutRevision=revision;saved.player={x,y:sim.scene.shoreY(x)+offset};saved.credits=347;
  const restored=create(sceneId,saved),after=restored.snapshot();
  assert.deepEqual(position(restored),shoreStandPosition(sim.scene,x));assert.equal(restored.canCast,true);
  assert.equal(after.credits,347);
  for(const key of ['inventory','rodSupplies','rigStock','inventorySlots','activeRod','activeReel','catches'])assert.deepEqual(after[key],saved[key],key);
  assert.deepEqual(position(create(sceneId,after)),position(restored),'the correction runs once');
 }
});

test('shoreline correction excludes current layouts, wet positions, invalid edges and pier saves',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const sim=create(sceneId),x=2440;
  for(const [revision,p]of [[2,{x,y:sim.scene.shoreY(x)+4}],[1,{x,y:sim.scene.shoreY(x)-1}],[1,{x:1,y:sim.scene.shoreY(1)+4}]]){
   const saved=legacySave(sceneId,p);saved.shoreLayoutRevision=revision;
   assert.deepEqual(position(create(sceneId,saved)),sim.scene.spawn,'invalid saves use the existing fallback');
  }
 }
 const sim=create('pacifica'),p={x:sim.scene.pier.x,y:sim.scene.shoreY(sim.scene.pier.x)+4},saved=legacySave('pacifica',p);saved.onPier=true;
 const restored=create('pacifica',saved);assert.equal(restored.onPier,true);assert.deepEqual(position(restored),p);
});
