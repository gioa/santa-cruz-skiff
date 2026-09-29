import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation,SPECIES} from '../dist/pacifica-sim.js';
import {SHORE_ECOLOGY,shoreEncounterRates} from '../dist/shore-fish-ecology.js';
import {finishShoreFlight} from './helpers/shore-cast.js';
import {schoolAtBait,awaitBite} from './helpers/shore-fish.js';

const sample={offshore:32,depth:3.5,habitat:'trough',troughDistance:24,barDistance:48,
 troughStrength:.7,barStrength:0,channelStrength:.25,whitewater:.12,orbitalVelocity:.3,turbidity:.1};
const options={sample,bait:'squid',rig:'carolina',month:6,hour:10,
 presentation:{depth:3.5,bottomContact:1,stability:.95}};
const rates=o=>shoreEncounterRates({...options,...o});
const rate=(result,id)=>result.perSpecies.find(row=>row.id===id).ratePerSecond;

test('all five encounter species can become named, persistent catches',()=>{
 const modelled=SPECIES.filter(f=>!f.legacy);assert.equal(modelled.length,5);
 assert.deepEqual(SHORE_ECOLOGY.map(f=>f.id),modelled.map(f=>f.id));
 for(const id of ['white_croaker','jacksmelt']){
  const spec=SPECIES.find(f=>f.id===id);assert.ok(spec.maxKg<1&&spec.minKg>0&&spec.lengthCm[1]<=45);
 }
});
test('white croaker favors small bottom bait over crab and oversized hooks without a distance cliff',()=>{
 const squid=rates({}),crab=rates({bait:'sandcrab'}),large=rates({rig:'fishfinder'});
 assert.ok(rate(squid,'white_croaker')>rate(crab,'white_croaker')*8);
 assert.ok(rate(crab,'white_croaker')>0);
 assert.ok(rate(squid,'white_croaker')>rate(large,'white_croaker')*4);
 assert.ok(rate(squid,'white_croaker')>rate(rates({presentation:{depth:1,bottomContact:0,stability:.95}}),'white_croaker'));
 assert.equal(rate(rates({month:1}),'white_croaker'),rate(rates({month:8}),'white_croaker'));
 const near=rate(rates({sample:{...sample,offshore:31.99}}),'white_croaker');
 assert.ok(Math.abs(near/rate(squid,'white_croaker')-1)<.001);
});
test('jacksmelt uses actual hook depth; float can fish without touching bottom and bottom crab still has incidental bites',()=>{
 const floating={depth:1,bottomContact:0,stability:.95,mode:'float'};
 const top=rates({rig:'float_rig',presentation:floating});
 const deep=rates({rig:'float_rig',presentation:{...floating,depth:5},sample:{...sample,depth:6}});
 assert.ok(rate(top,'jacksmelt')>rate(deep,'jacksmelt')*8);
 assert.ok(rate(top,'jacksmelt')>rate(rates({bait:'sandcrab'}),'jacksmelt')*10);
 assert.ok(rate(rates({bait:'sandcrab'}),'jacksmelt')>0);
 assert.equal(top.dominantSpeciesId,'jacksmelt');
 assert.ok(!/未贴底|沙底等待/.test(top.status));
 assert.equal(rates({rig:'float_rig',presentation:{...floating,depth:0}}).totalRatePerSecond,0);
 assert.equal(rates({rig:'float_rig',baitCondition:0,presentation:floating}).totalRatePerSecond,0);
 const rough=rates({rig:'float_rig',presentation:{...floating,stability:.2},sample:{...sample,whitewater:.9,orbitalVelocity:2}});
 assert.ok(top.totalRatePerSecond>rough.totalRatePerSecond*10);
 assert.ok(top.totalRatePerSecond<.004&&Math.exp(-top.totalRatePerSecond*300)>.3);
 assert.ok(rate(rates({rig:'float',presentation:floating,month:6}),'jacksmelt')>rate(rates({rig:'float',presentation:floating,month:1}),'jacksmelt')*1.8);
});

for(const sceneId of ['pacifica','half-moon-bay'])for(const id of ['white_croaker','jacksmelt']){
 test(`${sceneId}: ${id} bites through the school model, lands without mandatory exhaustion, and survives keep/reload/sale`,()=>{
  const sim=new PacificaSimulation({sceneId,rng:()=>.4,date:'2026-06-15',loreSeed:91,seaState:{waveHeightM:.35,wavePeriodS:8}});
  assert.ok(sim.buy('squid').ok);
  if(id==='jacksmelt'){
   assert.ok(sim.buy('float_rig').ok);assert.ok(sim.configureEquipment('float_rig').ok);
  }
  assert.ok(sim.equipBait('squid').ok);
  const x=1100;Object.assign(sim.state.player,{x,y:sim.world.shoreY(x)+25});
  assert.ok(sim.cast({power:.5}).ok);finishShoreFlight(sim);
  // A school of the target species beside the bait; the right rig and depth decide the bite.
  schoolAtBait(sim,id);awaitBite(sim,120,.025);
  assert.equal(sim.state.phase,'bite');assert.equal(sim.state.biteSpeciesId,id);
  assert.ok(sim.strike().ok);assert.equal(sim.state.fish.id,id);
  for(let t=0;t<60&&sim.state.phase==='fighting';t+=.025)sim.update(.025,{reel:sim.state.tension<.7});
  assert.equal(sim.state.phase,'landed');assert.ok(sim.state.fish.stamina>.32);
  const pending=new PacificaSimulation({sceneId,saved:sim.snapshot()});
  assert.equal(pending.state.phase,'landed');assert.equal(pending.state.fish.id,id);
  assert.ok(pending.resolveCatch(true).ok);
  const saved=new PacificaSimulation({sceneId,saved:pending.snapshot()});
  assert.equal(saved.state.catches.length,1);assert.equal(saved.state.catches[0].id,id);
  Object.assign(saved.state.player,saved.shop.door);
  const credits=saved.state.credits,value=saved.state.catches[0].value;
  assert.ok(saved.sellCatch().ok);assert.equal(saved.state.credits,credits+value);
  assert.equal(saved.sellCatch().count,0);assert.equal(saved.state.credits,credits+value);
 });
}
