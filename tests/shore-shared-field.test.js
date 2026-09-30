import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleShoreFishField,shoreFieldRandom,shoreFieldKey} from '../dist/shore-fish-field.js';
import {createPopulation,stepPopulation,serializePopulation,restorePopulation,resolveBite,disturb} from '../dist/fish-population.js';

const defs=[{id:'perch',school:[4,8],density:80,cruise:.3,burst:1.6,smell:1,sight:4,sightDrive:.8,wariness:.6,calmSeconds:40,patience:30,biteRate:1,lengthCm:[20,30],preferredDepth:()=>5.7,verticalReach:()=>1}];
const field={sceneId:'pacifica',date:'2026-09-30',timeSeconds:36000};
const world=(extra={})=>({sharedField:{...field},species:defs,center:{x:100,y:100},radius:110,cellSize:4,
 env:()=>({water:true,depth:6,currentX:0,currentY:0}),suitability:()=>1,feeding:()=>.9,light:1,turbidity:()=>0,...extra});
const baseline=pop=>pop.groups.filter(g=>g.mode==='roam').map(({id,x,y,depth,count,lengthCm,heading,hunger})=>({id,x,y,depth,count,lengthCm,heading,hunger}));
const at=(w,timeSeconds)=>({...w,sharedField:{...w.sharedField,timeSeconds}});
const inert={id:1,x:100,y:100,depth:5.7,scent:0,flash:0,motion:0,soakSeconds:0,appeal:()=>0};

test('daily spatial schools are pure, cached, and independent of query/species order',()=>{
 const w=world(),first=sampleShoreFishField(w);assert.ok(first.length>20);
 sampleShoreFishField(world({center:{x:9999,y:9999}}));sampleShoreFishField(world({sharedField:{...field,date:'2026-10-01'}}));
 assert.deepEqual(sampleShoreFishField(w),first);
 const second={...defs[0],id:'other'};
 assert.deepEqual(sampleShoreFishField(world({species:[defs[0],second]})),sampleShoreFishField(world({species:[second,defs[0]]})));
 assert.notDeepEqual(sampleShoreFishField(world({sharedField:{...field,date:'2026-10-01'}})),first);
 assert.notDeepEqual(sampleShoreFishField(world({sharedField:{...field,sceneId:'benicia'}})),first);
});

test('shared school ordering does not depend on device language or locale collation',t=>{
 t.mock.method(String.prototype,'localeCompare',()=>{throw new Error('A public school order cannot use device collation');});
 const w=world({species:[...defs,{...defs[0],id:'other_fish'}]}),schools=sampleShoreFishField(w),pop=createPopulation(1);
 stepPopulation(pop,.5,w);
 const ids=schools.map(g=>g.fieldId);
 assert.deepEqual(ids,[...ids].sort());assert.deepEqual(pop.groups.map(g=>g.fieldId),ids);
});

test('overlapping active areas return identical school identities and physical positions',()=>{
 const a=world(),b=world({center:{x:160,y:100}}),inside=(g,w)=>Math.hypot(g.x-w.center.x,g.y-w.center.y)<=w.radius;
 const fromA=sampleShoreFishField(a).filter(g=>inside(g,b)),fromB=sampleShoreFishField(b).filter(g=>inside(g,a));
 assert.ok(fromA.length>10);assert.deepEqual(fromA,fromB);
 const later=new Map(sampleShoreFishField(at(a,field.timeSeconds+1)).map(g=>[g.id,g]));
 for(const g of sampleShoreFishField(a)){const next=later.get(g.id);if(next)assert.ok(Math.hypot(next.x-g.x,next.y-g.y)<=defs[0].cruise+1e-8);}
 assert.ok(fromA.every(g=>g.depth>0&&g.depth<6));
});

test('shoreline fallback remains independent of active query radius',()=>{
 const chosen=sampleShoreFishField(world())[0],tile=chosen.id.split('|')[3].split(',').map(Number);
 const anchor={x:(tile[0]+shoreFieldRandom(chosen.id,'x'))*64,y:(tile[1]+shoreFieldRandom(chosen.id,'y'))*64};
 const env=(x,y)=>({water:Math.hypot(x-anchor.x,y-anchor.y)<1e-8,depth:6});
 const wide=sampleShoreFishField(world({center:anchor,radius:100,env})),narrow=sampleShoreFishField(world({center:anchor,radius:.05,env}));
 assert.equal(wide.length,1);assert.deepEqual(narrow,wide,'a dry trajectory falls back to the same valid anchor before radius filtering');
});

test('background schools ignore player RNG, harmless bait draws, and prior visited areas',()=>{
 const a=createPopulation(1),b=createPopulation(987654),w=world();
 b.clock=50000;
 stepPopulation(b,.5,world({center:{x:700,y:100},sharedField:{...field,timeSeconds:35000}}));
 for(let i=0;i<80;i++){
  const current=at(w,field.timeSeconds+i*.5);stepPopulation(a,.5,current);b.rng=(i*7919)>>>0;
  stepPopulation(b,.5,{...current,stimulus:{...inert,id:900+i}});
 }
 assert.deepEqual(baseline(a),baseline(b));
});

test('clients entering within the same civil tick sample the same background',()=>{
 const a=createPopulation(1),b=createPopulation(2),w=world();
 stepPopulation(a,.025,at(w,36000.01));stepPopulation(b,.025,at(w,36000.43));
 assert.deepEqual(baseline(a),baseline(b));
 const clock=a.clock;stepPopulation(a,.025,at(w,36000.49));assert.equal(a.clock,clock,'no repeated decisions inside the same tick');
 stepPopulation(a,.025,at(w,36000.53));stepPopulation(b,.1,at(w,36000.54));assert.deepEqual(baseline(a),baseline(b));
});

test('per-school decisions and bite length ignore unrelated mutable RNG and cast serials',()=>{
 const a=createPopulation(3),b=createPopulation(999),w=world();stepPopulation(a,.5,w);stepPopulation(b,.5,w);
 const target=a.groups.find(g=>Math.hypot(g.x-100,g.y-100)<70),bait={...inert,x:target.x,y:target.y,scent:1,flash:1,motion:1,soakSeconds:120,appeal:()=>1};
 let biteA,biteB;
 for(let i=1;i<=120&&!biteA;i++){
  const current=at(w,36000+i*.5);b.rng=i;
  biteA=stepPopulation(a,.5,{...current,stimulus:{...bait,id:1}}).find(e=>e.type==='bite');
  biteB=stepPopulation(b,.5,{...current,stimulus:{...bait,id:9127}}).find(e=>e.type==='bite');
  assert.deepEqual(biteA,biteB);
 }
 assert.ok(biteA,'real school tracks, inspects and bites');
});

test('local fright and depletion remain effective without changing the shared background',()=>{
 const p=createPopulation(1),w=world();stepPopulation(p,.5,w);
 const g=p.groups[0],id=g.id,canonical=sampleShoreFishField(w).find(s=>s.id===id);
 disturb(p,{x:g.x+.1,y:g.y,radius:4,strength:1},defs);assert.equal(g.mode,'flee');
 stepPopulation(p,.5,at(w,36000.5));assert.ok(p.groups.find(s=>s.id===id).alarm>0);
 const count=g.count;
 for(let i=0;i<count;i++){p.pendingBite={group:id,species:g.species,lengthCm:g.lengthCm};resolveBite(p,'hooked',defs);}
 stepPopulation(p,.5,at(w,36001));assert.equal(p.groups.some(s=>s.id===id),false);assert.equal(p.sharedDepleted[id],count);
 assert.equal(sampleShoreFishField(w).find(s=>s.id===id).count,canonical.count,'shared field was never mutated');
 const saved=serializePopulation(p),restored=restorePopulation(saved,88,['perch']);
 stepPopulation(restored,.025,at(w,36001.1));assert.equal(restored.groups.some(s=>s.id===id),false,'same-tick reload synchronizes without respawning removed fish');
 stepPopulation(restored,.5,world({center:{x:800,y:100},sharedField:{...field,timeSeconds:36001.5}}));
 stepPopulation(restored,.5,at(w,36002));assert.equal(restored.groups.some(s=>s.id===id),false,'reload and leaving/returning do not regenerate depleted fish');
 assert.equal(serializePopulation(restored).sharedDepleted[id],count);
});

test('new date samples new background while an active bite and prior depletion survive rollover',()=>{
 const p=createPopulation(7),w=world();stepPopulation(p,.5,w);
 const g=p.groups[0],id=g.id;p.pendingBite={group:id,species:g.species,lengthCm:g.lengthCm};g.mode='inspect';g.target=1;
 const next=world({sharedField:{...field,date:'2026-10-01',timeSeconds:0},stimulus:{...inert}});p.lastStimulus=1;
 stepPopulation(p,.5,next);assert.ok(p.groups.some(s=>s.id===id),'engaged old-day fish is retained');
 resolveBite(p,'hooked',defs);assert.equal(p.sharedDepleted[id],1);
 assert.ok(p.groups.some(s=>s.fieldId.startsWith(shoreFieldKey(next.sharedField))));
 p.sharedDepleted['shore-field-1|pacifica|2025-01-01|0,0|perch|0']=2;
 stepPopulation(p,.5,at(next,.5));
 assert.equal(p.sharedDepleted['shore-field-1|pacifica|2025-01-01|0,0|perch|0'],undefined,'inactive historical depletion is pruned');assert.equal(p.sharedDepleted[id],1,'active previous-day fish keeps its depletion');
 const old=p.groups.find(s=>s.id===id);old.alarm=0;old.ignoreUntil=0;old.mode='roam';
 stepPopulation(p,.5,at(next,1));assert.equal(p.sharedDepleted[id],undefined,'previous-day depletion is pruned once its local overlay ends');
});

test('legacy population callers retain their seeded engine and have no shared ledger',()=>{
 const w=world();delete w.sharedField;const a=createPopulation(3),b=createPopulation(3);
 for(let i=0;i<20;i++){stepPopulation(a,.5,w);stepPopulation(b,.5,w);}
 assert.deepEqual(serializePopulation(a),serializePopulation(b));assert.equal(a.sharedDepleted,undefined);assert.ok(a.groups.every(g=>Number.isInteger(g.id)));
 assert.equal(shoreFieldRandom('fish',1,'bite'),shoreFieldRandom('fish',1,'bite'));assert.notEqual(shoreFieldRandom('fish',1,'bite'),shoreFieldRandom('fish',1,'sense'));
});
