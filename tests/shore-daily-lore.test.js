import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {getShoreScene,shoreZone} from '../dist/shore-data.js';
import {createShoreLore,shoreDailyVisitors,stepShoreLore} from '../dist/shore-lore.js';

const date='2026-09-30',midnight=Date.parse(date+'T07:00:00Z');
const publicFields=e=>e&&Object.fromEntries(['id','publicKey','publicDeparture','x','y','angler','clueId'].map(key=>[key,e[key]]));

test('an explicit zero daily seed or restored zero stream cannot fall back to device randomness',()=>{
 const scene=getShoreScene('pacifica'),first=createShoreLore(scene,null,0,0);
 assert.deepEqual(createShoreLore(scene,null,0,0),first);
 assert.deepEqual(createShoreLore(scene,{version:1,rngState:0},0),createShoreLore(scene,{version:1,rngState:0},0));
 assert.equal(first.rngState,270369,'zero initializes the fixed nonzero xorshift state');
});
function fixture(sceneId='pacifica',loreSeed=12,timeSeconds=32520){
 const clock={ms:midnight+timeSeconds*1000};
 const sim=new PacificaSimulation({sceneId,loreSeed,clockMode:'shared',now:()=>new Date(clock.ms),regular:false});
 return{sim,clock};
}
function knownVisit(sceneId='pacifica'){
 const scene=getShoreScene(sceneId);
 for(let timeSeconds=32430;timeSeconds<36000;timeSeconds+=240){
  const e=shoreDailyVisitors(scene,{sceneId,date,timeSeconds}).find(e=>e.clueId);
  if(e)return{timeSeconds,e};
 }
 assert.fail('Expected a scheduled visitor who shares a clue');
}
function standNear(sim,e){Object.assign(sim.state.player,{x:e.x,y:e.y+20});stepShoreLore(sim);return sim.state.shoreLore.encounter;}

test('same public world and location give the same visitor despite elapsed time, RNG and personal history',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const {timeSeconds,e}=knownVisit(sceneId),a=fixture(sceneId,123,timeSeconds).sim,b=fixture(sceneId,8129,timeSeconds).sim;
  a.state.elapsed=7;b.state.elapsed=9182;
  b.state.shoreLore.nextAt=1e9;b.state.shoreLore.serial=982;
  a.rng=b.rng=()=>{throw new Error('Public visitors must not draw personal fishing RNG');};
  const rngA=a.state.shoreLore.rngState,rngB=b.state.shoreLore.rngState;
  const first=standNear(a,e),second=standNear(b,e);
  assert.deepEqual(publicFields(first),publicFields(second));
  assert.equal(first.expiresAt-a.state.elapsed,second.expiresAt-b.state.elapsed);
  assert.equal(a.state.shoreLore.rngState,rngA);assert.equal(b.state.shoreLore.rngState,rngB);
  assert.equal(b.state.shoreLore.serial,982);assert.equal(b.state.shoreLore.nextAt,1e9);
  // Taking a different walk cannot reroll the public person or clue.
  for(const point of [{x:20,y:1050},{x:sceneId==='pacifica'?6200:7400,y:950},{x:e.x+80,y:e.y+30}]){Object.assign(b.state.player,point);stepShoreLore(b);}
  assert.deepEqual(publicFields(standNear(b,e)),publicFields(first));
 }
});

test('daily schedule changes by date and timed slot, with stable positions within a visit',()=>{
 const {timeSeconds,e}=knownVisit(),scene=getShoreScene('pacifica'),world={sceneId:scene.id,date,timeSeconds};
 const current=shoreDailyVisitors(scene,world);
 assert.notDeepEqual(shoreDailyVisitors(scene,{...world,date:'2026-10-01'}),current);
 assert.notDeepEqual(shoreDailyVisitors(scene,{...world,timeSeconds:timeSeconds+240}),current);
 const later=shoreDailyVisitors(scene,{...world,timeSeconds:e.publicDeparture-.001}).find(next=>next.publicKey===e.publicKey);
 assert.deepEqual(later,e,'a visitor stands in the same place until departure');
 assert.equal(shoreDailyVisitors(scene,{...world,timeSeconds:e.publicDeparture}).some(next=>next.publicKey===e.publicKey),false);
});

test('shared conversation memory is personal and cannot be harvested by walking away or reloading',()=>{
 const {timeSeconds,e}=knownVisit(),{sim,clock}=fixture('pacifica',52,timeSeconds),other=fixture('pacifica',19,timeSeconds).sim;
 standNear(sim,e);standNear(other,e);
 const inventory={...sim.state.inventory},first=sim.talkAngler(e.id);
 assert.equal(first.fresh,true);assert.equal(sim.state.shoreLore.encounter.talked,true);
 assert.equal(other.state.shoreLore.encounter.talked,false);assert.equal(other.state.shoreLore.notes.length,0);
 Object.assign(sim.state.player,{x:20,y:1050});stepShoreLore(sim);assert.equal(sim.state.shoreLore.encounter,null);
 standNear(sim,e);assert.equal(sim.state.shoreLore.encounter.talked,true);assert.equal(sim.talkAngler(e.id).fresh,false);
 const resumed=new PacificaSimulation({saved:sim.snapshot(),clockMode:'shared',now:()=>new Date(clock.ms),regular:false});
 standNear(resumed,e);assert.equal(resumed.state.shoreLore.encounter.talked,true);assert.equal(resumed.talkAngler(e.id).fresh,false);
 assert.equal(resumed.state.shoreLore.notes.filter(n=>n.id===e.clueId).length,1);
 assert.deepEqual(resumed.state.inventory,inventory);
 assert.equal(other.talkAngler(e.id).fresh,true,'another player can discover the same public clue independently');
});

test('a paused stale visitor cannot be talked to after civil departure, even without a simulation tick',()=>{
 const {timeSeconds,e}=knownVisit(),{sim,clock}=fixture('pacifica',52,timeSeconds);
 standNear(sim,e);const elapsed=sim.state.elapsed;
 clock.ms=midnight+e.publicDeparture*1000;
 assert.equal(sim.talkAngler(e.id).ok,false);
 assert.equal(sim.state.elapsed,elapsed);assert.equal(sim.state.shoreLore.notes.length,0);
});

test('public beach visitors stay on safe sand in their zone and do not replace Benicia regulars',()=>{
 let count=0;
 for(const sceneId of ['pacifica','half-moon-bay']){
  const {sim}=fixture(sceneId);
  for(const day of [date,'2026-10-01','2026-10-02'])for(let timeSeconds=30;timeSeconds<86400;timeSeconds+=720){
   for(const e of shoreDailyVisitors(sim.scene,{sceneId,date:day,timeSeconds})){
    count++;assert.ok(sim.onSand(e.x,e.y));
    assert.equal(e.publicKey.split(':')[3],shoreZone(sim.scene,e.x).id);
    if(sim.scene.pier)assert.ok(Math.abs(e.x-sim.scene.pier.x)>=70);
    assert.ok(e.angler>=0&&e.angler<3);assert.ok(e.publicDeparture>timeSeconds&&e.publicDeparture-timeSeconds<=240);
   }
  }
 }
 assert.ok(count>1000);
 const {sim}=fixture('benicia');stepShoreLore(sim);
 assert.deepEqual(shoreDailyVisitors(sim.scene,sim.sharedWorld),[]);assert.equal(sim.state.shoreLore.encounter,null);
});
