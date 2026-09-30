import test from 'node:test';
import assert from 'node:assert/strict';
import {SHORE_FIGHT_PROFILES,shoreFightProfile,createShoreFightMotion,stepShoreFightMotion} from '../dist/shore-fish-fight.js';
import {SPECIES} from '../dist/pacifica-sim.js';

const controls={waterDepth:3,lineDistance:18,tension:.45,rodLift:.5,reelSpeed:.5,drag:.45,surfLoad:.25};
function trace(fish,{seconds=30,dt=1/60,depth=2,seed=2,input=controls,initial}={}){
 let state=initial||createShoreFightMotion(fish,{depth,seed});const rows=[];
 for(let i=0;i<Math.round(seconds/dt);i++){state=stepShoreFightMotion(state,fish,{...input,dt});rows.push(state);}
 return {state,rows};
}
const fish=(speciesId,weightKg=.4)=>({speciesId,weightKg});

test('every supported shore and bank fish has an explicit distinct profile',()=>{
 assert.equal(SPECIES.length,13);
 for(const species of SPECIES)assert.ok(SHORE_FIGHT_PROFILES[species.speciesId],species.speciesId);
 assert.equal(new Set(Object.values(SHORE_FIGHT_PROFILES).map(p=>JSON.stringify(p))).size,13);
 assert.equal(shoreFightProfile({id:'surfperch'}),SHORE_FIGHT_PROFILES.redtail_surfperch);
 assert.equal(shoreFightProfile({id:'surfperch',speciesId:'barred_surfperch'}),SHORE_FIGHT_PROFILES.barred_surfperch);
});

test('mass changes resistance and species has more than a shared sine wave',()=>{
 const stats=(id,weight)=>{const {rows}=trace(fish(id,weight),{seconds:12,input:{...controls,tension:0}});return {maxPull:Math.max(...rows.map(s=>s.pull)),maxRun:Math.max(...rows.map(s=>s.run)),trace:rows.map(s=>s.run.toFixed(3)).join(',')};};
 const small=stats('striped_bass',.4),large=stats('striped_bass',5);
 assert.ok(large.maxPull>small.maxPull*1.5);assert.ok(large.maxRun>small.maxRun);
 assert.ok(stats('jacksmelt',.25).maxPull>stats('white_croaker',.25).maxPull*1.8,'jacksmelt is a lively fish for its size');
 assert.equal(new Set(SPECIES.map(s=>stats(s.speciesId,.4).trace)).size,13);
});

test('loaded reeling tires fish while slack waiting does not empty energy',()=>{
 const f=fish('striped_bass',2);
 const slack=trace(f,{seconds:45,input:{...controls,tension:0}}).state;
 const worked=trace(f,{seconds:45,input:{...controls,tension:.55,reelSpeed:1,rodLift:.75,drag:.7}}).state;
 assert.equal(slack.energy,1);assert.ok(worked.energy<.6);
 const lightDrag=trace(f,{seconds:20,input:{...controls,drag:.1}}).state;
 const heavyDrag=trace(f,{seconds:20,input:{...controls,drag:.9}}).state;
 assert.ok(heavyDrag.energy<lightDrag.energy);
});

test('near-bank rod pressure raises the fish and force decays with exhaustion',()=>{
 const f=fish('striped_bass',2),near={...controls,lineDistance:4,tension:.6,reelSpeed:1};
 const lowered=trace(f,{seconds:3,input:{...near,rodLift:0}}).state;
 const lifted=trace(f,{seconds:3,input:{...near,rodLift:1}}).state;
 assert.ok(lifted.depth<lowered.depth*.8);
 const energetic=stepShoreFightMotion(createShoreFightMotion(f,{energy:1}),f,{...controls,dt:.1});
 const tired=stepShoreFightMotion(createShoreFightMotion(f,{energy:.03}),f,{...controls,dt:.1});
 assert.ok(tired.pull<energetic.pull*.4);assert.ok(tired.run<energetic.run*.4);
});

test('jacksmelt can leap only after continuous ascent and returns with a splash',()=>{
 const f=fish('jacksmelt',.3),input={...controls,waterDepth:4,lineDistance:10,tension:.55,rodLift:1,reelSpeed:.7};
 let initial=createShoreFightMotion(f,{depth:3,seed:2});initial.jumpCooldown=0;initial.variation=.1;
 const {rows}=trace(f,{seconds:16,input,initial});
 assert.ok(rows.some(s=>s.airHeight>.1),'some vigorous jacksmelt breach');
 let prior=initial,launches=0,landings=0;
 for(const state of rows){
  assert.ok(!(state.depth>0&&state.airHeight>0));
  assert.ok(Math.abs((state.airHeight-state.depth)-(prior.airHeight-prior.depth))<.065,'no surface teleport');
  if(!prior.jumpActive&&state.jumpActive){launches++;assert.ok(prior.depth<.05,'jump launches from actual surface');}
  if(prior.jumpActive&&!state.jumpActive){landings++;assert.ok(state.splash>.8);assert.ok(state.jumpCooldown>0);}
  prior=state;
 }
 assert.ok(launches>0&&landings>0);assert.ok(launches<=2,'cooldown prevents continuous hopping');
});

test('jumps are species-, energy-, individual-, depth- and water-aware',()=>{
 const jumpInput={...controls,waterDepth:4,lineDistance:10,tension:.55,rodLift:1,reelSpeed:.6};
 for(const id of Object.keys(SHORE_FIGHT_PROFILES).filter(id=>!SHORE_FIGHT_PROFILES[id].jump)){
  const f=fish(id),initial={...createShoreFightMotion(f,{depth:0}),jumpCooldown:0,variation:0};
  assert.ok(trace(f,{seconds:18,input:jumpInput,initial}).rows.every(s=>!s.jumpActive&&s.airHeight===0),id);
 }
 for(const [energy,variation,waterDepth] of [[.1,.1,4],[1,.99,4],[1,.1,.1]]){
  const f=fish('jacksmelt'),initial={...createShoreFightMotion(f,{depth:0,energy}),jumpCooldown:0,variation};
  assert.ok(trace(f,{seconds:5,input:{...jumpInput,waterDepth},initial}).rows.every(s=>!s.jumpActive));
 }
 const f=fish('chinook_salmon',5),initial={...createShoreFightMotion(f,{depth:.01}),jumpCooldown:0,variation:.1};
 assert.ok(trace(f,{seconds:5,input:jumpInput,initial}).rows.some(s=>s.jumpActive));
 assert.equal(stepShoreFightMotion({...initial,depth:4},f,{...jumpInput,dt:.1}).jumpActive,false);
 const unknown={speciesId:'unlisted_fish',id:'chinook_salmon',weightKg:5};
 assert.equal(shoreFightProfile(unknown).jump,false,'unknown authoritative identity does not inherit a stale salmon ID');
});

test('flatfish can make a submerged bank-side dive without acquiring a jump',()=>{
 const f=fish('california_halibut',3),s=createShoreFightMotion(f,{depth:.6});
 const next=stepShoreFightMotion(s,f,{...controls,lineDistance:8,rodLift:0,reelSpeed:1,dt:.1});
 assert.equal(next.surfaceStartleUsed,true);assert.equal(next.phase,'dive');assert.ok(next.depth>s.depth);
 assert.equal(next.airHeight,0);assert.equal(next.jumpActive,false);
});

test('all species stay finite, below the bed limit, bounded laterally and deterministic',()=>{
 for(const species of SPECIES){
  const f=fish(species.speciesId,.6),initial=createShoreFightMotion(f,{depth:.4,seed:7});
  const before=JSON.stringify(initial);
  const a=trace(f,{seconds:8,initial,input:{...controls,waterDepth:.7}}),b=trace(f,{seconds:8,initial,input:{...controls,waterDepth:.7}});
  assert.equal(JSON.stringify(initial),before,'pure step does not mutate previous state');assert.deepEqual(a,b);
  for(const s of a.rows){
   for(const key of ['depth','airHeight','run','pull','energy','headShake','lateral','diveVelocity'])assert.ok(Number.isFinite(s[key]),`${species.id} ${key}`);
   assert.ok(s.depth>=0&&s.depth<=.7);assert.ok(Math.abs(s.lateral)<=controls.lineDistance*.25);assert.ok(s.pull>=0&&s.pull<=1);
  }
 }
});

test('phone and desktop steps agree and pause never advances motion',()=>{
 const f=fish('jacksmelt',.3),input={...controls,waterDepth:2,rodLift:1,tension:.6,lineDistance:8};
 const fine=trace(f,{seconds:20,dt:1/60,input}),coarse=trace(f,{seconds:20,dt:.1,input});
 for(const key of ['depth','airHeight','energy','lateral','elapsed'])assert.ok(Math.abs(fine.state[key]-coarse.state[key])<1e-8,key);
 const before=createShoreFightMotion(f);assert.deepEqual(stepShoreFightMotion(before,f,{...input,dt:0,time:100}),before);
 const moved=stepShoreFightMotion(before,f,{...input,dt:.1,time:1e9});
 assert.ok(Math.abs(moved.elapsed-.1)<1e-12,'fight clock does not jump with scene clock');
});


test('loaded winding can raise a fish beside a deep pier without equating line radius to water depth',()=>{
 for(const id of ['chinook_salmon','california_halibut','pile_perch']){
  const f=fish(id,3),input={...controls,waterDepth:12,lineDistance:2.5,tension:.5,rodLift:.35,reelSpeed:.6};
  const held=trace(f,{seconds:50,depth:8,input:{...input,reelSpeed:0}}).state;
  const wound=trace(f,{seconds:50,depth:8,input}).state;
  assert.ok(held.depth>2,`${id} held submerged`);assert.ok(wound.depth<.8,`${id} can be raised for landing`);
  assert.equal(wound.airHeight,0,'vertical pickup cannot hoist a fish magically into the air');
 }
 const f=fish('chinook_salmon',3),input={...controls,waterDepth:10,lineDistance:2.5,tension:.5,reelSpeed:.6};
 const low=trace(f,{seconds:12,depth:6,input:{...input,rodLift:.15}}).state;
 const high=trace(f,{seconds:12,depth:6,input:{...input,rodLift:.85}}).state;
 assert.ok(high.depth<low.depth,'higher loaded rod raises fish more quickly');
});
