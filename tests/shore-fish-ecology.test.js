import test from 'node:test';
import assert from 'node:assert/strict';
import {shoreEncounterRates} from '../dist/shore-fish-ecology.js';

const trough={offshore:24,depth:2.2,habitat:'trough',troughDistance:24,barDistance:52,
 troughStrength:1,barStrength:0,channelStrength:.05,waveHeight:1.2,whitewater:.25,
 orbitalVelocity:.5,turbidity:.2,breakStrength:.1,currentX:.15,currentY:-.08};
const channel={...trough,offshore:60,depth:4,habitat:'channel',troughStrength:.05,
 channelStrength:1,whitewater:.12,turbidity:.1};
const bar={...trough,offshore:52,depth:.65,habitat:'bar',troughStrength:.03,
 barStrength:1,channelStrength:0,whitewater:.85,orbitalVelocity:1.25,turbidity:.75,breakStrength:.85};
const presentation={bottomContact:.9,stability:.9};
const perchOptions={sample:trough,bait:'sandcrab',rig:'carolina',presentation};
const bassOptions={sample:channel,bait:'anchovy',rig:'fishfinder',presentation};
const rate=(result,id)=>result.perSpecies.find(species=>species.id===id).ratePerSecond;

test('the preference index ranks a well matched presentation above a mismatched one',()=>{
 // Bite timing comes from the population model (tests/shore-technique.test.js);
 // this index only summarises habitat × presentation preferences.
 for(const options of [perchOptions,bassOptions]){
  const good=shoreEncounterRates(options),poor=shoreEncounterRates({...options,bait:options.bait==='sandcrab'?'anchovy':'sandcrab',rig:options.rig==='carolina'?'fishfinder':'carolina'});
  assert.ok(good.totalRatePerSecond>0&&good.totalRatePerSecond>poor.totalRatePerSecond*2);
 }
});

test('natural bait and hook size change absolute encounters as well as the fish mix',()=>{
 const proper=shoreEncounterRates(perchOptions);
 const fishBait=shoreEncounterRates({...perchOptions,bait:'anchovy'});
 const bigHook=shoreEncounterRates({...perchOptions,rig:'fishfinder'});
 assert.ok(rate(proper,'surfperch')>rate(fishBait,'surfperch')*10);
 assert.ok(rate(proper,'surfperch')>rate(bigHook,'surfperch')*4);
 // Fish pieces also legitimately target the newly supported white croaker.
 // Preserve the perch mismatch penalty without treating all other fish as wrong.
 assert.ok(proper.totalRatePerSecond>fishBait.totalRatePerSecond);
 assert.ok(rate(fishBait,'white_croaker')>rate(proper,'white_croaker')*8);
 assert.ok(proper.totalRatePerSecond>bigHook.totalRatePerSecond*3);
 const bass=shoreEncounterRates(bassOptions);
 const wrongBait=shoreEncounterRates({...bassOptions,bait:'sandcrab'});
 const smallHook=shoreEncounterRates({...bassOptions,rig:'carolina'});
 assert.ok(rate(bass,'striped_bass')>rate(wrongBait,'striped_bass')*7);
 assert.ok(rate(bass,'striped_bass')>rate(smallHook,'striped_bass')*3);
 assert.ok(bass.totalRatePerSecond>wrongBait.totalRatePerSecond*5);
 assert.ok(rate(bass,'halibut')>rate(wrongBait,'halibut')*20);
});

test('distance follows the actual trough rather than rewarding a longer cast',()=>{
 const close=shoreEncounterRates(perchOptions);
 const breaking=shoreEncounterRates({...perchOptions,sample:bar});
 for(const id of ['surfperch','redtail_surfperch','calico_surfperch'])assert.ok(rate(close,id)>rate(breaking,id)*8,id);
 const far=shoreEncounterRates({...perchOptions,sample:{...trough,offshore:90}});
 assert.ok(rate(close,'surfperch')>rate(far,'surfperch')*1000);
 const shifted=shoreEncounterRates({...perchOptions,sample:{...trough,offshore:40,troughDistance:40,barDistance:75}});
 const oldDistance=shoreEncounterRates({...perchOptions,sample:{...trough,offshore:24,troughDistance:40,barDistance:75}});
 assert.ok(rate(shifted,'surfperch')>rate(oldDistance,'surfperch'));
 const nearby=shoreEncounterRates({...perchOptions,sample:{...trough,offshore:24.01}});
 assert.ok(Math.abs(rate(nearby,'surfperch')/rate(close,'surfperch')-1)<.001,'no distance cliff');
});

test('depth matters independently of distance and sand morphology',()=>{
 const normal=shoreEncounterRates(perchOptions);
 const deep=shoreEncounterRates({...perchOptions,sample:{...trough,depth:14}});
 assert.ok(rate(normal,'surfperch')>rate(deep,'surfperch')*1e6);
 const halibut=shoreEncounterRates(bassOptions);
 const shallow=shoreEncounterRates({...bassOptions,sample:{...channel,depth:.3}});
 assert.ok(rate(halibut,'halibut')>rate(shallow,'halibut')*5);
});

test('summer bass availability differs from winter and retains resident perch',()=>{
 const summer=shoreEncounterRates({...bassOptions,month:8});
 const winter=shoreEncounterRates({...bassOptions,month:1});
 assert.ok(rate(summer,'striped_bass')>rate(winter,'striped_bass')*10);
 assert.ok(rate(summer,'halibut')>rate(winter,'halibut')*5);
 const winterPerch=shoreEncounterRates({...perchOptions,month:1});
 assert.ok(rate(winterPerch,'surfperch')>=rate(shoreEncounterRates(perchOptions),'surfperch'));
 assert.ok(rate(shoreEncounterRates({...bassOptions,hour:6}),'striped_bass')>
  rate(shoreEncounterRates({...bassOptions,hour:12}),'striped_bass')*1.7);
});

test('waves, bottom contact, stability and damaged bait suppress real encounter rates',()=>{
 const calm=shoreEncounterRates(bassOptions);
 const rough=shoreEncounterRates({...bassOptions,sample:{...channel,
  waveHeight:3.5,whitewater:.95,orbitalVelocity:2.5,turbidity:.95}});
 assert.ok(rate(calm,'halibut')>rate(rough,'halibut')*10);
 assert.ok(rate(rough,'halibut')>0,'exposed beaches are not a biological exclusion');
 const dragging=shoreEncounterRates({...bassOptions,presentation:{bottomContact:.2,stability:.15}});
 assert.ok(calm.totalRatePerSecond>dragging.totalRatePerSecond*20);
 const damaged=shoreEncounterRates({...bassOptions,baitCondition:.2});
 assert.ok(calm.totalRatePerSecond>damaged.totalRatePerSecond*7);
 assert.match(dragging.status,/贴底|拖动/);
});

test('no water, usable bait, rig, substrate, or bottom contact means zero without a species floor',()=>{
 for(const options of [
  {},{...perchOptions,sample:null},{...perchOptions,sample:{...trough,offshore:0}},
  {...perchOptions,sample:{...trough,depth:0}},
  {...perchOptions,baitCondition:0},{...perchOptions,baitCondition:.08},
  {...perchOptions,bait:'unavailable'},{...perchOptions,rig:'missing'},
  {...perchOptions,sample:{...trough,habitat:'land'}},
 ]){
  const result=shoreEncounterRates(options);
  assert.equal(result.totalRatePerSecond,0);
  assert.ok(result.perSpecies.every(species=>species.ratePerSecond===0));
  assert.equal(result.dominantSpeciesId,null);
  assert.equal(result.medianWaitSeconds,Infinity);
 }
});

test('the per-species rates sum to the encounter rate and inputs remain untouched',()=>{
 const sample=Object.freeze({...channel}),input=Object.freeze({...bassOptions,sample});
 const result=shoreEncounterRates(input);
 assert.equal(result.totalRatePerSecond,result.perSpecies.reduce((sum,species)=>sum+species.ratePerSecond,0));
 assert.equal(result.dominantSpeciesId,'striped_bass');
 assert.deepEqual(shoreEncounterRates({...input,rig:{id:'fishfinder_rig'},bait:{kind:'anchovy'}}),result);
 for(const species of result.perSpecies){
  assert.ok(Number.isFinite(species.ratePerSecond)&&species.ratePerSecond>=0);
  assert.ok(Object.values(species.factors).every(value=>Number.isFinite(value)&&value>=0));
 }
});
