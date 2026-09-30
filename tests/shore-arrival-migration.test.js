import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {shoreArrivalPosition,shoreStandPosition} from '../dist/shore-movement.js';

const legacyArrivals=[{x:1130,y:823},{x:1100,y:865}];
const position=sim=>({x:sim.state.player.x,y:sim.state.player.y});
const create=(sceneId,saved)=>sceneId==='benicia'?new BeniciaSimulation({saved,rng:()=>.5,date:'2026-09-28'}):new PacificaSimulation({sceneId,saved,rng:()=>.5,date:'2026-09-28'});
function legacySave(sceneId,point){
 const sim=create(sceneId),saved=sim.snapshot();delete saved.shoreLayoutRevision;saved.player={...point};return saved;
}

test('old beach arrivals and nearby parked saves resume at the relocated shop once',()=>{
 for(const sceneId of ['pacifica','half-moon-bay'])for(const version of [1,2,3,4])for(const old of legacyArrivals)for(const offset of [{x:0,y:0},{x:9,y:12}]){
  const saved=legacySave(sceneId,{x:old.x+offset.x,y:old.y+offset.y});saved.version=version;const sim=create(sceneId,saved);
  assert.deepEqual(position(sim),shoreArrivalPosition(sim.scene));assert.ok(sim.nearShop);assert.ok(sim.onSand(sim.state.player.x,sim.state.player.y));
  const current=sim.snapshot();assert.equal(current.shoreLayoutRevision,1);
  assert.deepEqual(position(create(sceneId,current)),position(sim),'normal reload stays at the new arrival');
 }
});

test('arrival migration preserves equipment, bait, money and recorded fishing progress',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const original=create(sceneId);original.state.credits=500;
  assert.ok(original.buy('squid').ok);assert.ok(original.equipBait('squid').ok);assert.ok(original.buy('sealed_reel').ok);
  original.state.catches=[{id:'surfperch',catchId:7,length:26,weightKg:.44,caughtDate:'2026-09-28'}];
  original.state.keptLog=[{catchId:7,species:'surfperch',date:'2026-09-28'}];
  original.state.stats={caught:4,kept:2,released:2,sold:1,casts:9,missed:3};original.state.nextCatchId=8;original.state.fineDebt=17;
  const expected=create(sceneId,original.snapshot()).snapshot(),legacy=structuredClone(expected);delete legacy.shoreLayoutRevision;legacy.player={...legacyArrivals[0]};
  const restored=create(sceneId,legacy).snapshot();
  for(const key of ['credits','inventory','bait','rodSupplies','rigStock','inventorySlots','activeRod','activeReel','upgrades','catches','catchHistory','keptLog','stats','nextCatchId','fineDebt','fishingDate','fishingControls'])assert.deepEqual(restored[key],expected[key],key);
 }
});

test('legacy positions beyond the two small arrival areas and near-water fishing positions stay unchanged',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const sim=create(sceneId);
  for(const p of [...legacyArrivals.map(a=>({x:a.x+16.1,y:a.y})),{x:600,y:920},shoreStandPosition(sim.scene,2440)]){
   const restored=create(sceneId,legacySave(sceneId,p));assert.deepEqual(position(restored),p);
  }
  const pier=sim.scene.pier;if(pier){const saved=legacySave(sceneId,pier.tip);saved.onPier=true;saved.pierVisit={time:3,patrolAt:null};const restored=create(sceneId,saved);assert.equal(restored.onPier,true);assert.deepEqual(position(restored),pier.tip);}
 }
});

test('current and newer layout saves retain legitimate later visits to old arrival coordinates',()=>{
 for(const sceneId of ['pacifica','half-moon-bay'])for(const revision of [1,2])for(const p of legacyArrivals){
  const saved=legacySave(sceneId,p);saved.shoreLayoutRevision=revision;assert.deepEqual(position(create(sceneId,saved)),p);
 }
});

test('Benicia saves at the same coordinates are never moved by the beach layout migration',()=>{
 for(const p of legacyArrivals)assert.deepEqual(position(create('benicia',legacySave('benicia',p))),p);
});
