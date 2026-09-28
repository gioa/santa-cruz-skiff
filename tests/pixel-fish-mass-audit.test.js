import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fishMassKg,FISH_MASS_MODELS} from '../dist/pixel-fish-mass.js';
import {SMALL_FISH,schoolFish} from '../dist/pixel-small-fish.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PIXEL_FISH,PixelSimulation}=await import('../dist/pixel-sim.js');
// Independently tabulated source predictions, rounded at the game's resolution.
// Catch ruler is TL except bonito (FL); input cm, expected output whole kg.
const fixtures=[
 ['Sebastes mystinus',30.5,.46],['Sebastes caurinus',55.88,3.57],
 ['Sebastes caurinus',57,3.8],['Sebastes miniatus',55.88,2.82],
 ['Ophiodon elongatus',53,1.34],['Paralichthys californicus',81.28,6.1],
 ['Scomber japonicus',31.5,.275],['Engraulis mordax',12,.011],
 ['Sardinops sagax',18,.046],['Oncorhynchus tshawytscha',70,4.12],
 ['Atractoscion nobilis',98.5,8.62],['Sarda chiliensis lineolata',50,1.66],
 ['Genyonemus lineatus',25,.18],['Citharichthys sordidus',24.6,.14],
];
for(const [latin,cm,kg]of fixtures)test(`${latin}: ${cm} cm source benchmark = ${kg} kg`,()=>assert.equal(fishMassKg({latin},cm),kg));
test('every catchable species has a specific model, stays finite and increases over its playable size range',()=>{
 const species=[...PIXEL_FISH,...Object.values(SMALL_FISH)];
 assert.equal(new Set(species.map(f=>f.latin)).size,13);
 for(const f of species){
  assert.ok(Object.hasOwn(FISH_MASS_MODELS,f.latin),f.latin);let previous=0;
  for(let l=f.min;l<=f.max;l+=.1){const kg=fishMassKg(f,l);assert.ok(Number.isFinite(kg)&&kg>0&&kg>=previous,`${f.latin} ${l}`);previous=kg;}
  assert.equal(fishMassKg(f,f.max),fishMassKg({...f,min:1,max:300,weight:999,referenceLength:1},f.max),'spawn range / legacy anchors cannot change mass');
 }
});
test('visible mackerel and regular mackerel produce identical masses, including rounding',()=>{
 const adult=PIXEL_FISH.find(f=>f.latin==='Scomber japonicus'),school=SMALL_FISH['mackerel-school'];
 for(let l=15;l<=38;l+=.1)assert.equal(fishMassKg(adult,l),fishMassKg(school,l));
 const visible=schoolFish({id:'test',species:'mackerel-school',type:'bait',age:10,duration:60,x:0,z:0,visualFishCount:20});
 assert.equal(visible.length,20);for(const f of visible)assert.equal(f.kg,fishMassKg(adult,f.length));
});
test('actual bite generation uses species mass for both normal catches and bait schools',()=>{
 for(const f of [...PIXEL_FISH,...Object.values(SMALL_FISH).map(f=>({...f,length:f.min}))]){
  const sim=new PixelSimulation({rng:()=>.5});
  sim.fishingCandidates=()=>[f];
  // Exercise production size/mass assignment, without depending on habitat RNG.
  sim.rigEnvironment=()=>({habitat:f.spot||'sand',depth:10,bait:f.bait||'squid',rig:'bottom',month:7});
  const caught=sim.ensureBitingFish();
  assert.ok(caught,`production bite for ${f.latin}`);assert.equal(caught.kg,fishMassKg({latin:caught.latin},caught.length));
 }
});
test('unknown species and invalid lengths cannot silently acquire a generic specimen weight',()=>{
 for(const l of[NaN,Infinity,-1,0])assert.equal(fishMassKg({latin:'Sebastes caurinus'},l),0);
 assert.equal(fishMassKg({latin:'unknown',weight:10,referenceLength:50},50),0);
 assert.equal(fishMassKg(null,50),0);assert.equal(fishMassKg({latin:'toString'},50),0);
});
