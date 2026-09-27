import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FishingPatrol} from '../dist/fish-patrol.js';

function rng(seed){let a=seed>>>0;return()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};}
function state(){return{mode:'boat',launchStage:'afloat',moored:false,boatX:-220,boatZ:-310,heading:0,speed:0,paused:false,catches:[{name:'test fish',kept:true,settled:false}],inspection:null};}
function run(violations,seed=17){const p=new FishingPatrol({rng:rng(seed)}),s=state(),events=[];for(let t=0;t<1000;t++)events.push(...p.update(s,1,{assessment:{violations}}));return{p,s,events};}

test('natural clock has a five-minute grace and produces a deterministic encounter',()=>{
  const p=new FishingPatrol({rng:rng(17)}),s=state();for(let t=0;t<300;t++)assert.deepEqual(p.update(s,1),[]);assert.equal(s.inspection,null);
  const a=run([]),b=run([]);assert.deepEqual(a.events,b.events);assert.equal(a.events.filter(e=>e.type==='inspection-start').length,1);assert.equal(a.events.filter(e=>e.type==='inspection-result').length,1);
});
test('legal and illegal cargo are inspected at exactly the same time and probability',()=>{
  const a=run([]),b=run([{code:'undersize',catchId:'fish-1'}]);assert.deepEqual(a.events.map(e=>[e.type,e.id]),b.events.map(e=>[e.type,e.id]));
  assert.deepEqual(a.events.find(e=>e.type==='inspection-result').violations,[]);assert.deepEqual(b.events.find(e=>e.type==='inspection-result').violations,[{code:'undersize',catchId:'fish-1'}]);
  assert.equal(b.s.catches[0].kept,true);assert.equal(b.s.catches[0].settled,false);
});
test('checking uses the current injected assessment after eight seconds',()=>{
  const p=new FishingPatrol({rng:rng(17)}),s=state();let began=false;for(let t=0;t<900&&!began;t++)began=p.update(s,1).some(e=>e.type==='inspection-start');assert.equal(began,true);
  let inspected=null;for(let t=0;t<9;t++){const events=p.update(s,1,{assessment:()=>({violations:[{code:'current-cargo'}]})});inspected=events.find(e=>e.type==='inspection-result')||inspected;}assert.equal(inspected.violations[0].code,'current-cargo');
});
test('pause freezes the clock, approach and checking',()=>{
  const p=new FishingPatrol({rng:rng(17)}),s=state();s.paused=true;for(let t=0;t<20;t++)assert.deepEqual(p.update(s,60),[]);assert.equal(p.activeBoatSeconds,0);assert.equal(s.inspection,null);
  s.paused=false;for(let t=0;t<1000&&!s.inspection;t++)p.update(s,1);const snapshot=JSON.stringify(s.inspection);s.paused=true;p.update(s,60);assert.equal(JSON.stringify(s.inspection),snapshot);
});
test('released or already settled catches do not trigger an inspection',()=>{
  for(const catchState of[{kept:false,settled:false},{kept:true,settled:true}]){const p=new FishingPatrol({rng:rng(17)}),s=state();s.catches=[catchState];for(let t=0;t<20;t++)assert.deepEqual(p.update(s,60),[]);assert.equal(s.inspection,null);assert.equal(p.considerDock(s),false);}
});
test('return spot check is one independent draw per trip and can cover a late catch',()=>{
  let draws=0;const p=new FishingPatrol({rng:()=>{draws++;return .1;}}),s=state();assert.equal(p.considerDock(s),true);assert.equal(s.inspection.reason,'dock');const count=draws;assert.equal(p.considerDock(s),false);assert.equal(draws,count);
  const miss=new FishingPatrol({rng:()=>.8}),other=state();assert.equal(miss.considerDock(other),false);assert.equal(miss.considerDock(other),false);
  p.resetTrip();s.inspection=null;assert.equal(p.considerDock(s),true);
});
test('patrol does not materialize on blocked water or mutate unrelated game state',()=>{
  const p=new FishingPatrol({rng:rng(17),isWater:()=>false}),s=state();s.engine=true;s.credits=23;for(let t=0;t<20;t++)p.update(s,60);assert.equal(s.inspection,null);assert.equal(s.engine,true);assert.equal(s.credits,23);assert.equal(s.catches.length,1);
});
test('an expired empty-cooler opportunity does not trigger on the first late catch',()=>{
  const p=new FishingPatrol({rng:rng(17)}),s=state();s.catches=[];for(let t=0;t<1000;t++)p.update(s,1);s.catches=[{kept:true,settled:false}];assert.deepEqual(p.update(s,1),[]);assert.equal(s.inspection,null);
});
test('a water endpoint across a long barrier is rejected in favor of a reachable approach side',()=>{
  const values=[.1,.1,.1,.65,.1],isWater=(x,z)=>Math.abs(x)>5;let draw=0;
  const p=new FishingPatrol({rng:()=>values[draw++]??.2,isWater}),s=state();Object.assign(s,{boatX:-20,boatZ:0,heading:Math.PI});
  assert.equal(p.considerDock(s),true);assert.ok(s.inspection.x<-5,'the first candidate across the barrier must not be accepted');
  const target=p.sideTargets(s).find(t=>t.side===s.inspection.side);assert.ok(target);for(let i=0;i<=300;i++){const t=i/300;assert.ok(isWater(s.inspection.x+(target.x-s.inspection.x)*t,s.inspection.z+(target.z-s.inspection.z)*t));}
  let checked=false;for(let t=0;t<50;t++){const events=p.update(s,1);checked||=events.some(e=>e.type==='inspection-start');if(s.inspection)assert.ok(s.inspection.x<-5);}assert.equal(checked,true);
});
test('movement checks its water corridor and cannot jump a thin obstruction between valid endpoints',()=>{
  const isWater=(x,z)=>Math.abs(x)>.4,p=new FishingPatrol({rng:rng(17),isWater}),position={x:-1,z:0,heading:0};
  for(let i=0;i<40;i++){const before={x:position.x,z:position.z};p.navigate(position,{x:1,z:0},7.5,.25);assert.ok(position.x<-.4);for(let j=0;j<=12;j++){const f=j/12;assert.ok(isWater(before.x+(position.x-before.x)*f,before.z+(position.z-before.z)*f));}}
});
test('actual Santa Cruz wharf regression: patrol can reach the west-side boat and return berth without crossing pier',async()=>{
  const previousFetch=globalThis.fetch;globalThis.fetch=async url=>new Response(await readFile(url));
  try{
    const {onLand,onPier}=await import('../dist/geography.js');const {harborWaterBlocked}=await import('../dist/harbor-layout.js');const isWater=(x,z)=>!onLand(x,z)&&!onPier(x,z)&&!harborWaterBlocked(x,z);
    for(const [x,z,heading]of[[-48.8,-112.2,0],[-48.8,-112.2,Math.PI*.8],[-38,-52.6,0],[-38,-52.6,Math.PI*.8]]){
      const seeded=rng(17);let draws=0;const p=new FishingPatrol({rng:()=>++draws<=2?.1:seeded(),isWater}),s=state();Object.assign(s,{boatX:x,boatZ:z,heading});
      assert.ok(isWater(x,z));assert.equal(p.considerDock(s),true,`reachable spawn at ${x},${z}`);
      const target=p.sideTargets(s).find(t=>t.side===s.inspection.side);assert.ok(target);
      const length=Math.hypot(target.x-s.inspection.x,target.z-s.inspection.z),steps=Math.ceil(length/.4);for(let i=0;i<=steps;i++){const f=i/steps;assert.ok(isWater(s.inspection.x+(target.x-s.inspection.x)*f,s.inspection.z+(target.z-s.inspection.z)*f),'entire initial approach stays on the water side of the wharf');}
      let start=false,result=false;for(let i=0;i<240;i++){const old=s.inspection?{x:s.inspection.x,z:s.inspection.z}:null,events=p.update(s,.25);start||=events.some(e=>e.type==='inspection-start');result||=events.some(e=>e.type==='inspection-result');if(s.inspection){assert.ok(isWater(s.inspection.x,s.inspection.z));if(old)for(let j=0;j<=6;j++){const f=j/6;assert.ok(isWater(old.x+(s.inspection.x-old.x)*f,old.z+(s.inspection.z-old.z)*f),'patrol movement never cuts through a pier or stair');}}}
      assert.equal(start,true);assert.equal(result,true);
    }
  }finally{globalThis.fetch=previousFetch;}
});
