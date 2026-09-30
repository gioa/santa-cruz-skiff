import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {shoreProfile} from '../dist/shore-data.js';
import {castToOffshore, finishShoreFlight} from './helpers/shore-cast.js';
import {schoolAtBait, awaitBite} from './helpers/shore-fish.js';
import {serializePopulation} from '../dist/fish-population.js';

function setup({rng=()=>.5,sceneId='pacifica',seaState={waveHeightM:.4,wavePeriodS:9},saved}={}){
  const sim=new PacificaSimulation({rng,sceneId,seaState,saved,date:'2026-09-28',loreSeed:91});
  const x=2440;Object.assign(sim.state.player,{x,y:sim.world.shoreY(x)+25});
  return sim;
}
function cast(sim){
  const p=shoreProfile(sim.scene,sim.state.player.x,sim.state.elapsed,sim.state.seaState);
  castToOffshore(sim,Math.min(p.troughDistance,sim.previewCast({power:1}).offshoreDistance-.5));
}
function advance(sim,seconds,frame=.1){for(let t=0;t<seconds-1e-9;t+=frame)sim.update(Math.min(frame,seconds-t));}

test('a typical cast has no promised bite, and fish will not take a bait that is still sinking',()=>{
  for(const sceneId of ['pacifica','half-moon-bay']){
    const sim=setup({sceneId});cast(sim);finishShoreFlight(sim);
    assert.equal(sim.state.presentation.bottomContact,0);
    schoolAtBait(sim,'surfperch');
    // Fish follow and inspect the falling rig, but a bait off the bottom does not appeal to them.
    for(let t=0;t<60&&sim.state.presentation.bottomContact<.2;t+=.1){sim.update(.1);assert.notEqual(sim.state.phase,'bite');}
    assert.equal(sim.state.biteSpeciesId,null);
    assert.equal(sim.strike().ok,false);
    awaitBite(sim,60);
    assert.equal(sim.state.biteSpeciesId,'surfperch');
  }
});
test('reloading keeps the same fish in the same places instead of rerolling them',()=>{
  const sim=setup();advance(sim,40);
  const before=serializePopulation(sim.population);
  assert.ok(before.groups.length>0,'the beach has fish');
  const restored=setup({saved:sim.snapshot(),rng:()=>{throw new Error('reload rerolled fish');}});
  assert.deepEqual(serializePopulation(restored.population).groups,before.groups);
  assert.equal(restored.population.rng,sim.population.rng);
});
test('frame rate and paused updates do not change when or which fish bites',()=>{
  const runs=[];
  for(const frame of [.025,.1,.25]){
    const sim=setup({rng:()=>.02});cast(sim);
    const before=JSON.stringify(sim.state);sim.update(0);assert.equal(JSON.stringify(sim.state),before);
    for(let t=0;t<900&&sim.state.phase!=='bite';t+=frame)sim.update(frame);
    assert.equal(sim.state.phase,'bite');
    runs.push([Math.round((sim.state.elapsed+sim.state.biteRemaining-3.2)*1000)/1000,sim.state.biteSpeciesId,sim.state.biteLengthCm]);
  }
  assert.deepEqual(runs[1],runs[0]);assert.deepEqual(runs[2],runs[0]);
});
test('a bite locks its species and size before strike, and synthetic bite state cannot invent a fish',()=>{
  const sim=setup({rng:()=>.0001});cast(sim);finishShoreFlight(sim);
  schoolAtBait(sim,'surfperch',{lengthCm:30});awaitBite(sim,60);
  const visitor=sim.state.biteSpeciesId,length=sim.state.biteLengthCm;
  assert.ok(Math.abs(length-30)<30*.35,'the biter comes from the school cohort');
  sim.rng=()=>.99999;
  assert.ok(sim.strike().ok);assert.equal(sim.state.fish.id,visitor);assert.ok(Math.abs(sim.state.fish.length-length)<.11);
  assert.equal(sim.population.groups[0].count,11,'the hooked fish left its school');
  sim.clearLine();sim.state.phase='bite';assert.equal(sim.strike().ok,false);assert.equal(sim.state.fish,null);
});
test('spent bait attracts nothing and washout cannot be reset by retrieve',()=>{
  const sim=setup({rng:()=>.999999});cast(sim);advance(sim,15);
  const supply=sim.state.rodSupplies.starter_rod;supply.bait.condition=.08001;
  advance(sim,1);assert.ok(supply.bait.condition<=.08);
  assert.equal(sim.fishWorld().stimulus,null);
  schoolAtBait(sim,'surfperch');advance(sim,60);
  assert.equal(sim.state.phase,'waiting');
  sim.retrieve();assert.equal(sim.cast().ok,false);
});
test('calendar is saved and changes seasonal availability without reinterpreting elapsed physical time',()=>{
  const sim=setup();sim.state.fishingDate='2026-01-01';cast(sim);advance(sim,15);
  const winter=sim.encounterRates().perSpecies.find(f=>f.id==='striped_bass').factors.season;
  sim.state.fishingDate='2026-08-01';
  const summer=sim.encounterRates().perSpecies.find(f=>f.id==='striped_bass').factors.season;
  assert.ok(summer>winter*5);
  const saved=sim.snapshot(),restored=setup({saved});assert.equal(restored.state.fishingDate,'2026-08-01');
  assert.equal(restored.state.elapsed,sim.state.elapsed);
});
