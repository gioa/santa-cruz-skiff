import test from 'node:test';
import assert from 'node:assert/strict';
import {RIG_PROFILES,rigSinkRate,stepRigLure,lureAttraction,rigSnagRisk,rigFishWeights,weightedRigFish,rigSpeciesKey} from '../dist/fishing-rigs.js';

const fish=[
  {latin:'Sebastes mystinus'}, {latin:'Sebastes caurinus'},
  {latin:'Paralichthys californicus'}, {latin:'Scomber japonicus'}, {latin:'Ophiodon elongatus'},
];
function settle(options,seconds=120,dt=.1){let state={depth:0,pumpHeight:0};for(let t=0;t<seconds;t+=dt)state=stepRigLure({...options,...state,dt});return state;}

test('the provided feather and dropper rigs never silently add unrestricted hooks',()=>{
  assert.equal(RIG_PROFILES.sabiki.hooks,2);
  assert.equal(RIG_PROFILES.dropper.hooks,2);
  for(const rig of Object.values(RIG_PROFILES))assert.ok(rig.hooks>=1&&rig.hooks<=2);
});

test('sinker mass counters current but thicker line increases blowback',()=>{
  const flow={rig:'bottom',bottomDepth:22,currentMps:.8,lineOutMeters:30};
  assert.ok(rigSinkRate({...flow,weightGrams:170})>rigSinkRate({...flow,weightGrams:28}));
  assert.ok(rigSinkRate({...flow,currentMps:0})>rigSinkRate(flow));
  const light=settle({...flow,weightGrams:28}),heavy=settle({...flow,weightGrams:170});
  assert.ok(heavy.depth>light.depth+5);
  assert.ok(heavy.lineAngleDeg<light.lineAngleDeg);
  const thin=stepRigLure({...flow,dt:1,lineDiameterMm:.15}),thick=stepRigLure({...flow,dt:1,lineDiameterMm:.6});
  assert.ok(thick.lineAngleDeg>thin.lineAngleDeg);
});

test('float holds a set layer while a bottom rig reaches the seabed',()=>{
  const float=settle({rig:'float',bottomDepth:18,floatDepth:3});
  const bottom=settle({rig:'bottom',bottomDepth:18});
  assert.ok(Math.abs(float.depth-3)<.02);
  assert.equal(float.bottomContact,false);
  assert.ok(bottom.depth>17.5);
  assert.equal(bottom.bottomContact,true);
  assert.ok(settle({rig:'sabiki',bottomDepth:18}).depth<9);
});

test('paid-out line constrains depth and does not teleport a suspended lure',()=>{
  const limited=settle({rig:'jig',bottomDepth:30,lineOutMeters:8,currentMps:.2});
  assert.ok(limited.depth<8&&limited.depth>0);
  const adjusted=stepRigLure({rig:'float',bottomDepth:20,depth:12,floatDepth:2,dt:.1});
  assert.ok(adjusted.depth>11,'moving a stop shall not instantly teleport the lure');
  const paused=stepRigLure({rig:'bottom',bottomDepth:20,depth:4,dt:0,pumping:true});
  assert.equal(paused.depth,4);
  assert.equal(paused.pumpHeight,0);
});

test('a held rod lift has a finite stroke, releases, and retrieve lifts the lure',()=>{
  const bottom=settle({rig:'jig',bottomDepth:16});
  let raised=bottom;
  for(let i=0;i<100;i++)raised=stepRigLure({...raised,rig:'jig',bottomDepth:16,pumping:true,dt:.1});
  assert.equal(raised.pumpHeight,.8);
  assert.ok(raised.depth>14.7&&raised.depth<bottom.depth-.5);
  let released=raised;
  for(let i=0;i<100;i++)released=stepRigLure({...released,rig:'jig',bottomDepth:16,pumping:false,dt:.1});
  assert.equal(released.pumpHeight,0);
  assert.ok(Math.abs(released.depth-bottom.depth)<.03);
  const retrieved=stepRigLure({...bottom,rig:'jig',bottomDepth:16,retrieveSpeedMps:1.4,dt:1});
  assert.ok(retrieved.depth<bottom.depth);
  assert.ok(lureAttraction({rig:'jig',pumping:true})>lureAttraction({rig:'jig'}));
});

test('rock dragging is hazardous, lifting clear reduces the snag hazard',()=>{
  const base={rig:'slider',bottomDepth:18,depth:17.9,currentMps:.35};
  assert.ok(rigSnagRisk({...base,habitat:'reef'})>rigSnagRisk({...base,habitat:'sand'})*10);
  assert.ok(rigSnagRisk({...base,habitat:'reef',depth:14})<rigSnagRisk({...base,habitat:'reef'})*.05);
  assert.ok(rigSnagRisk({...base,habitat:'reef',currentMps:.9})>rigSnagRisk({...base,habitat:'reef',currentMps:.05}));
});

test('presentation, fish layer, habitat and action alter the catch mix without fish locks',()=>{
  const sand=rigFishWeights(fish,{rig:'slider',habitat:'sand',bottomDepth:15,lureDepth:14.8,bait:'anchovy'});
  assert.equal(sand.indexOf(Math.max(...sand)),2,'sand-bottom slider favours halibut');
  const float=rigFishWeights(fish,{rig:'float',habitat:'sand',bottomDepth:18,lureDepth:3,bait:'sardine'});
  assert.equal(float.indexOf(Math.max(...float)),3,'surface presentation favours mackerel');
  const reef=rigFishWeights(fish,{rig:'jig',habitat:'reef',bottomDepth:22,lureDepth:21,bait:'jig',pumping:true});
  assert.equal(reef.indexOf(Math.max(...reef)),4,'worked soft plastics favour lingcod on structure');
  const still=rigFishWeights(fish,{rig:'jig',habitat:'reef',bottomDepth:22,lureDepth:21,bait:'jig'});
  assert.ok(reef[4]>still[4]*1.5);
  for(const rig of Object.keys(RIG_PROFILES))for(const habitat of ['sand','reef','kelp'])for(const lureDepth of [.1,7,19.8]){
    assert.ok(rigFishWeights(fish,{rig,habitat,bottomDepth:20,lureDepth}).every(w=>Number.isFinite(w)&&w>0));
  }
});

test('normal simulation frame rates produce matching depth and finite malformed-input results',()=>{
  const options={rig:'bottom',bottomDepth:18,currentMps:.25};
  const coarse=settle(options,12,.1),fine=settle(options,12,1/60);
  assert.ok(Math.abs(coarse.depth-fine.depth)<.09);
  const bad=stepRigLure({rig:'not-a-rig',bottomDepth:NaN,depth:Infinity,dt:Infinity,weightGrams:-10,currentMps:NaN});
  assert.ok(Object.values(bad).every(v=>typeof v!=='number'||Number.isFinite(v)));
  assert.deepEqual(rigFishWeights([],{}),[]);
  assert.equal(weightedRigFish([],{}),undefined);
  assert.equal(weightedRigFish(fish,{},()=>0),fish[0]);
  assert.equal(weightedRigFish(fish,{},()=>1),fish.at(-1));
  assert.equal(rigSpeciesKey(fish[4]),'lingcod');
});
