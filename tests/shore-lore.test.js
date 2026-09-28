import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {shoreClues,knownShoreZones} from '../dist/shore-lore.js';
const advance=(sim,seconds)=>{for(let t=0;t<seconds;t+=.1)sim.update(.1);};
function meet(seed=12345,sceneId='pacifica'){
 const sim=new PacificaSimulation({loreSeed:seed,sceneId});
 sim.state.player.y=sim.world.shoreY(sim.state.player.x)+70;
 for(let t=0;t<1200&&!sim.state.shoreLore.encounter;t+=.1)sim.update(.1);
 assert.ok(sim.state.shoreLore.encounter);return sim;
}
function near(sim){const e=sim.state.shoreLore.encounter;Object.assign(sim.state.player,{x:e.x,y:e.y+20});return e;}
test('both beaches and legacy saves start with no information or known destinations',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const sim=new PacificaSimulation({sceneId,loreSeed:42});assert.deepEqual(sim.state.shoreLore.notes,[]);assert.deepEqual(knownShoreZones(sim.scene,sim.state.shoreLore),[]);assert.equal(sim.state.shoreLore.encounter,null);
  const save=sim.snapshot();delete save.shoreLore;const old=new PacificaSimulation({saved:save,sceneId,loreSeed:42});assert.equal(old.state.shoreLore.notes.length,0);
 }
});
test('encounter positions, first times and willingness differ across random seeds without using fishing RNG',()=>{
 const times=new Set(),places=new Set(),topics=new Set();let fishingRolls=0;
 for(let seed=1;seed<=30;seed++){
  const sim=new PacificaSimulation({loreSeed:seed*7247,rng:()=>{fishingRolls++;return .5;}});sim.state.player.y=sim.world.shoreY(sim.state.player.x)+70;
  times.add(sim.state.shoreLore.nextAt);
  for(let t=0;t<1200&&!sim.state.shoreLore.encounter;t+=.1)sim.update(.1);
  const e=sim.state.shoreLore.encounter;assert.ok(e);assert.ok(sim.onSand(e.x,e.y));places.add(Math.round(e.x));topics.add(e.clueId===null?'smalltalk':'information');
 }
 assert.ok(times.size>20);assert.ok(places.size>20);assert.deepEqual(topics,new Set(['information','smalltalk']));assert.equal(fishingRolls,0);
});
test('one conversation reveals one fragment, repeat interaction cannot harvest more and unknown zones stay hidden',()=>{
 const sim=meet(),e=near(sim);e.clueId=shoreClues(sim.scene)[0].id;
 const rng=sim.state.shoreLore.rngState,result=sim.talkAngler(e.id);assert.equal(result.fresh,true);assert.equal(sim.state.shoreLore.notes.length,1);
 for(let i=0;i<20;i++)assert.equal(sim.talkAngler(e.id).fresh,false);
 assert.equal(sim.state.shoreLore.notes.length,1);assert.equal(sim.state.shoreLore.rngState,rng);assert.equal(knownShoreZones(sim.scene,sim.state.shoreLore).length,1);assert.equal(sim.state.shoreLore.notes[0].topic,'terrain');
});
test('not every greeting offers information, and conversations require proximity and a stowed rod',()=>{
 const sim=meet(),e=sim.state.shoreLore.encounter;e.clueId=null;
 sim.state.player.x=20;assert.equal(sim.talkAngler(e.id).ok,false);near(sim);sim.state.phase='waiting';assert.equal(sim.talkAngler(e.id).ok,false);sim.state.phase='walk';
 const r=sim.talkAngler(e.id);assert.equal(r.ok,true);assert.equal(r.fresh,false);assert.equal(sim.state.shoreLore.notes.length,0);assert.match(r.text,/安静/);
});
test('saving preserves the encounter outcome, notes, random stream and next opportunity',()=>{
 const sim=meet(9011),e=near(sim);e.clueId=shoreClues(sim.scene)[1].id;sim.talkAngler(e.id);
 const resumed=new PacificaSimulation({saved:sim.snapshot()});assert.deepEqual(resumed.state.shoreLore,sim.state.shoreLore);near(resumed);assert.equal(resumed.talkAngler(e.id).fresh,false);
 assert.equal(resumed.state.shoreLore.notes.length,1);assert.equal(resumed.state.shoreLore.notes[0].topic,'bait');
 const other=new PacificaSimulation({sceneId:'half-moon-bay',saved:sim.snapshot(),loreSeed:42});assert.equal(other.state.shoreLore.notes.length,0);
});
test('an unanswered angler leaves and old ids cannot reveal information remotely',()=>{
 const sim=meet(),e=sim.state.shoreLore.encounter;sim.state.shoreLore.nextAt=e.expiresAt+500;
 advance(sim,e.expiresAt-sim.state.elapsed+.2);assert.equal(sim.state.shoreLore.encounter,null);assert.equal(sim.talkAngler(e.id).ok,false);assert.equal(sim.state.shoreLore.notes.length,0);
});
test('notes from malformed or unrelated saved zones are discarded, never unlock a complete chart',()=>{
 const sim=new PacificaSimulation({loreSeed:22}),save=sim.snapshot();save.shoreLore.notes=[{id:'fake:terrain'},{id:'north:bait',angler:999},{id:'north:bait'}];
 const restored=new PacificaSimulation({saved:save});assert.equal(restored.state.shoreLore.notes.length,1);assert.equal(restored.state.shoreLore.notes[0].angler,2);assert.deepEqual(knownShoreZones(sim.scene,restored.state.shoreLore).map(z=>z.id),['north']);
});
