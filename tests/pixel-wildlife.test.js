import test from 'node:test';
import assert from 'node:assert/strict';
import {createWildlife,wildlifeSeason,WILDLIFE_TUNING} from '../dist/pixel-wildlife.js';

const boat=Object.freeze({mode:'boat',boatX:600,boatZ:-500,elapsed:120,moored:false,fishState:'waiting',catches:Object.freeze([])});
const openSea=()=>({water:true,depth:38});
function model(options={}){return createWildlife({seed:91234,month:9,origin:{x:0,z:0},habitat:openSea,...options});}
function advance(m,seconds,{state=boat,conditions={windKnots:3,waveHeight:.4},observe=()=>{}}={}){for(let t=0;t<seconds;t++){m.update(state,1,conditions);observe(m,t+1);}return m;}
function firstEncounter({state=boat,conditions={},habitat=()=>({water:true,depth:4})}={}){const m=model({habitat});for(let t=1;t<=7200;t++){m.update(state,1,conditions);if(m.history.length)return{time:t,event:m.history[0]};}return null;}

test('same seed produces the same ecology without consuming the fishing RNG or changing catches',()=>{
  const oldRandom=Math.random;Math.random=()=>{throw Error('The fishing/global RNG must not be touched');};
  try{const a=advance(model(),1200),b=advance(model(),1200);assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(a.history,b.history);assert.notDeepEqual(a.history,advance(model({seed:654321}),1200).history);assert.equal(boat.fishState,'waiting');assert.deepEqual(boat.catches,[]);}finally{Math.random=oldRandom;}
});
test('intro, pause and zero/invalid frame durations do not accumulate encounters',()=>{
  for(const state of[{...boat,paused:true},{...boat,mode:'intro'}]){const m=advance(model(),3600,{state});assert.equal(m.history.length,0);}
  const m=model();for(const dt of[0,-1,NaN,Infinity])m.update(boat,dt,{});assert.equal(m.history.length,0);
});
test('pausing an existing encounter freezes age and movement, then resumes naturally',()=>{
  const m=model();for(let t=0;t<1200&&!m.events.length;t++)m.update(boat,1,{});assert.ok(m.events.length);const snapshot=m.snapshot();m.update({...boat,paused:true},60,{});assert.deepEqual(m.snapshot(),snapshot);m.update(boat,1,{});assert.notDeepEqual(m.snapshot(),snapshot);
});
test('land, unknown bathymetry, shallow water and the dock do not spawn offshore encounters',()=>{
  for(const habitat of[()=>({water:false,depth:40}),()=>({water:true,depth:null}),()=>({water:true,depth:2}),()=>({water:true,depth:40,distanceFromHarbor:20})])assert.equal(advance(model({habitat}),3600).history.length,0);
  assert.equal(advance(model(),3600,{state:{...boat,moored:true}}).history.length,0);
  const shallow=advance(model({habitat:()=>({water:true,depth:4})}),3600);assert.ok(shallow.history.length);assert.ok(shallow.history.every(e=>e.type==='bait'));
});
test('encounters stay within the supplied water boundary and concurrency remains bounded',()=>{
  const water=(x,z)=>x>520&&x<680&&z>-580&&z<-420,m=model({habitat:(x,z)=>({water:water(x,z),depth:38})});
  advance(m,7200,{observe:m=>{assert.ok(m.events.length<=2);for(const e of m.events){assert.ok(water(e.x,e.z));assert.ok(Number.isFinite(e.heading));assert.ok(e.members>0);}}});assert.ok(m.history.length);
});
test('season rules constrain whale species and preserve year-round dolphin possibilities',()=>{
  assert.equal(wildlifeSeason(1).humpback,0);assert.equal(wildlifeSeason(9).gray,0);assert.ok(wildlifeSeason(9).dolphins>wildlifeSeason(3).dolphins);
  assert.ok(Array.from({length:12},(_,i)=>wildlifeSeason(i+1).dolphins).every(n=>n>0));
  assert.deepEqual(wildlifeSeason(-4),wildlifeSeason(1));assert.deepEqual(wildlifeSeason(100),wildlifeSeason(12));assert.deepEqual(wildlifeSeason(NaN),wildlifeSeason(9));
  const winter=advance(model({month:1}),14400).history.filter(e=>e.type==='whale');assert.ok(winter.length);assert.ok(winter.every(e=>e.species==='gray'));
  const summer=advance(model({month:8,habitat:()=>({water:true,depth:30})}),14400).history.filter(e=>e.type==='whale');assert.ok(summer.length);assert.ok(summer.every(e=>e.species==='humpback'));
});
test('rough seas and darkness lower visual encounter frequency without modifying habitat',()=>{
  const calm=firstEncounter(),rough=firstEncounter({conditions:{waveHeight:3,windKnots:25}}),night=firstEncounter({state:{...boat,elapsed:17*3600}});
  assert.ok(calm&&rough&&night);assert.ok(rough.time>calm.time*2);assert.ok(night.time>calm.time*4);
});
test('minimum eligible waiting times prevent rapid repeated dolphins and whales',()=>{
  const m=model(),seen=new Set(),encounters=[];advance(m,7200,{conditions:{waveHeight:0,windKnots:0},observe:m=>{for(const e of m.history)if(!seen.has(e.id)){seen.add(e.id);encounters.push(e);}}});
  for(const[type,minimum]of[['bait',60],['dolphins',200],['whale',700]]){const times=encounters.filter(e=>e.type===type).map(e=>e.elapsed).sort((a,b)=>a-b);assert.ok(times.length>0,`${type} is possible`);assert.ok(times[0]>=minimum);for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=minimum,`${type} is not a repeated rapid spawn`);}
  assert.equal(WILDLIFE_TUNING.illustrative,true);assert.equal(WILDLIFE_TUNING.notObservedProbabilities,true);assert.equal(WILDLIFE_TUNING.maximumActive,2);
});
test('history and telemetry snapshots are defensive copies',()=>{
  const m=advance(model(),1200);const history=m.history;assert.ok(history.length);history[0].name='changed';assert.notEqual(m.history[0].name,'changed');
  const snapshot=m.snapshot();if(snapshot.length){snapshot[0].x=999999;assert.notEqual(m.snapshot()[0].x,999999);}
});
