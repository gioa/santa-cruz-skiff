import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProfile,fishReward,settleFish,cargoWeight} from '../dist/equipment.js';
import {fishSpecies} from '../dist/fish-species.js';
import {SMALL_FISH} from '../dist/pixel-small-fish.js';

globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,PIXEL_FISH}=await import('../dist/pixel-sim.js');
const now=()=>new Date('2026-09-28T19:00:00Z');
const oldHalibut=()=>({name:'加州比目鱼',length:47.2,kg:1.37,captureDepth:12.4,caughtAt:'2026-09-28T15:20:00Z',rig:{id:'slider',hookCount:1}});
function savedTrip(){
 const sim=new PixelSimulation({now,weatherSeed:27});sim.start();
 Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',boatX:300,boatZ:500,gameElapsed:4500,time:900,elapsed:900});
 sim.state.clock=sim.clock();return sim.snapshot();
}
function resume(saved,explicit=true){const sim=new PixelSimulation({saved,now});assert.equal(sim.start(explicit).ok,true);return sim;}
function savedLanding(fish=oldHalibut()){const saved=savedTrip();Object.assign(saved,{fishState:'landed',fish,fightTime:43.2});return saved;}

test('legacy discovery aliases migrate without adding points, while unknown keys remain stable through normalization',()=>{
 const previous=createProfile();previous.credits=287;previous.seen=['加州比目鱼','加州大比目鱼','California Halibut','Paralichthys californicus','条纹鲈','Unnamed Estuary Fish'];previous.settled=['legacy-1'];
 const before=structuredClone(previous),profile=createProfile(previous);
 assert.deepEqual(profile.seen,['california_halibut','striped_bass','unnamed estuary fish']);
 assert.equal(profile.credits,287);assert.deepEqual(profile.settled,['legacy-1']);assert.deepEqual(profile.transactions,before.transactions);
 profile.seen.push('new-discovery');profile.settled.push('new-receipt');profile.transactions.push({kind:'test'});
 assert.deepEqual(previous.seen,before.seen);assert.deepEqual(previous.settled,before.settled);assert.deepEqual(previous.transactions,before.transactions);
});

test('first-discovery reward follows species across old Chinese names, English names and reloads',()=>{
 let profile=createProfile();profile.seen=['加州比目鱼'];
 const canonical={catchId:'halibut-1',speciesId:'california_halibut',name:'加州大比目鱼',length:47.2,kg:1.37};
 assert.equal(settleFish(profile,canonical),fishReward(canonical),'direct legacy profiles cannot earn another discovery bonus');
 profile=createProfile(structuredClone(profile));
 const english={catchId:'halibut-2',name:'California Halibut',length:52,kg:2};
 assert.equal(settleFish(profile,english),fishReward(english));assert.deepEqual(profile.seen,['california_halibut']);
 const unknown={catchId:'unknown-1',name:'Unnamed Estuary Fish',length:25,kg:.3};
 assert.equal(settleFish(profile,unknown),fishReward(unknown)+15);assert.equal(profile.seen.at(-1),'unnamed estuary fish');
 assert.equal(settleFish(createProfile(structuredClone(profile)),{...unknown,catchId:'unknown-2',settled:false}),fishReward(unknown));
});

test('fresh profiles award one discovery bonus per biological species and keep the two surfperches distinct',()=>{
 const profile=createProfile();assert.deepEqual(profile.seen,[]);assert.equal(profile.credits,100);
 const first={catchId:'redtail-1',speciesId:'redtail_surfperch',length:25,kg:.3};
 const second={catchId:'redtail-2',name:'红尾海鲫',length:25,kg:.3};
 const barred={catchId:'barred-1',latin:'Amphistichus argenteus',length:25,kg:.3};
 assert.equal(settleFish(profile,first),fishReward(first)+15);assert.equal(settleFish(profile,second),fishReward(second));assert.equal(settleFish(profile,barred),fishReward(barred)+15);
 assert.deepEqual(profile.seen,['redtail_surfperch','barred_surfperch']);assert.deepEqual(createProfile().seen,[]);
});

test('settled fish and catch receipts prevent duplicate rewards after a rename or reload',()=>{
 const profile=createProfile(),fish={...oldHalibut(),catchId:'paid-1'};settleFish(profile,fish);
 const restored=createProfile(structuredClone(profile)),before=structuredClone(restored);
 assert.equal(settleFish(restored,{...fish,name:'加州大比目鱼',settled:false}),0);
 assert.equal(settleFish(restored,{...fish,catchId:'paid-flag-only',settled:true}),0);
 assert.deepEqual(restored,before);
});

test('boat and forage templates share catalog identity while retaining their distinct size populations',()=>{
 assert.equal(PIXEL_FISH.length,11);
 for(const fish of [...PIXEL_FISH,...Object.values(SMALL_FISH)]){
  const species=fishSpecies(fish);assert.ok(species);assert.equal(fish.speciesId,species.id);assert.equal(fish.name,species.name);assert.equal(fish.commonName,species.commonName);assert.equal(fish.latin,species.latin);
 }
 const adult=PIXEL_FISH.find(f=>f.speciesId==='pacific_mackerel'),school=SMALL_FISH['mackerel-school'];
 assert.equal(adult.speciesId,school.speciesId);assert.deepEqual([adult.min,adult.max],[25,38]);assert.deepEqual([school.min,school.max],[15,26]);assert.equal(school.id,'mackerel');assert.equal(school.baitfish,true);
});

test('restored catch ledger normalizes identities but preserves measurement, receipts and nested capture evidence',()=>{
 const saved=savedTrip();saved.catches=[{...oldHalibut(),catchId:'old-released',kept:false,settled:true,reward:39},{...oldHalibut(),catchId:'old-cargo',kept:true},{name:'Unknown Coastal Fish',catchId:'unknown-cargo',kg:.6,length:31,kept:true}];
 saved.profile.seen=['加州比目鱼'];saved.profile.settled=['old-released'];saved.profile.credits=139;
 const before=structuredClone(saved),sim=resume(saved);
 assert.equal(sim.state.catches[0].speciesId,'california_halibut');assert.equal(sim.state.catches[0].name,'加州大比目鱼');
 for(let i=0;i<saved.catches.length;i++)for(const key of ['catchId','kg','length','kept','settled','reward','captureDepth','caughtAt','rig'])assert.deepEqual(sim.state.catches[i][key],saved.catches[i][key]);
 assert.equal(sim.state.catches[2].name,'Unknown Coastal Fish');assert.equal(sim.state.catches[2].speciesId,undefined);
 assert.equal(sim.state.profile.credits,139);assert.deepEqual(sim.state.profile.settled,['old-released']);assert.deepEqual(sim.unsettledCargo().map(f=>f.catchId),['old-cargo','unknown-cargo']);
 sim.state.catches[0].rig.hookCount=2;sim.state.catches[1].settled=true;
 assert.deepEqual(saved.catches,before.catches,'live changes do not mutate the saved snapshot');
});

test('unresolved landed fish survives repeated explicit legacy and automatic daily continuations',()=>{
 for(const explicit of [true,false]){
  let saved=savedLanding();if(explicit)delete saved.dayCycleVersion;
  const before=structuredClone(saved);
  for(let reload=0;reload<3;reload++){
   const sim=resume(saved,explicit);assert.equal(sim.state.fishState,'landed');assert.equal(sim.state.fish.speciesId,'california_halibut');assert.equal(sim.state.fish.name,'加州大比目鱼');
   assert.equal(sim.state.fish.kg,1.37);assert.equal(sim.state.fish.length,47.2);assert.deepEqual(sim.state.fish.rig,before.fish.rig);assert.equal(sim.state.fightTime,43.2);
   assert.equal(sim.state.gameElapsed,before.gameElapsed);assert.equal(sim.state.profile.credits,before.profile.credits);assert.deepEqual(sim.state.catches,[]);
   assert.equal(sim.state.fishFight,null);assert.equal(sim.state.castLine,false);assert.equal(sim.state.paidLineMeters,0);
   saved=sim.snapshot();
  }
 }
});

test('retaining a restored landing creates one cargo item and cannot duplicate or pay it on a later reload',()=>{
 const sim=resume(savedLanding({...oldHalibut(),catchId:'pending-kept'}));
 assert.equal(sim.keepCatch().ok,true);assert.equal(sim.keepCatch().ok,false);assert.equal(sim.releaseCatch().ok,false);
 assert.equal(sim.state.catches.length,1);assert.equal(sim.state.catches[0].catchId,'pending-kept');assert.equal(cargoWeight(sim.state.catches),1.37);assert.equal(sim.state.profile.credits,100);
 const restored=resume(sim.snapshot());assert.equal(restored.state.fishState,'idle');assert.equal(restored.state.fish,null);assert.equal(restored.state.catches.length,1);assert.equal(restored.keepCatch().ok,false);
 const fish=restored.state.catches[0],reward=settleFish(restored.state.profile,fish);assert.equal(reward,fishReward(fish)+15);
 const paid=resume(restored.snapshot());assert.equal(paid.state.catches.length,1);assert.equal(paid.state.profile.credits,100+reward);assert.equal(cargoWeight(paid.state.catches),0);assert.equal(settleFish(paid.state.profile,{...paid.state.catches[0],settled:false}),0);
});

test('releasing a restored landing rewards it once and the processed fish stays absent on refresh',()=>{
 const sim=resume(savedLanding());assert.equal(sim.releaseCatch().ok,true);
 const recorded=structuredClone(sim.state.catches[0]),credits=sim.state.profile.credits;
 assert.equal(recorded.speciesId,'california_halibut');assert.equal(recorded.settled,true);assert.equal(recorded.kept,false);assert.ok(recorded.catchId);assert.equal(credits,100+fishReward(recorded)+15);
 assert.equal(sim.releaseCatch().ok,false);assert.equal(sim.keepCatch().ok,false);
 for(let i=0,saved=sim.snapshot();i<3;i++){
  const restored=resume(saved);assert.equal(restored.state.fishState,'idle');assert.equal(restored.state.fish,null);assert.deepEqual(restored.state.catches,[recorded]);assert.equal(restored.state.profile.credits,credits);assert.equal(restored.releaseCatch().ok,false);saved=restored.snapshot();
 }
});

test('stale landed snapshots already represented by cargo, settlement or a decision cannot be restored twice',()=>{
 const cases=[
  saved=>{saved.catches=[{...saved.fish,kept:true}];},
  saved=>{saved.profile.settled=['pending-duplicate'];},
  saved=>{saved.fish.settled=true;},
  saved=>{saved.fish.kept=true;},
  saved=>{saved.fish.kept=false;},
  saved=>{saved.fish.confiscated=true;},
 ];
 for(const modify of cases){const saved=savedLanding({...oldHalibut(),catchId:'pending-duplicate'});modify(saved);const sim=resume(saved);assert.equal(sim.state.fishState,'idle');assert.equal(sim.state.fish,null);assert.equal(sim.keepCatch().ok,false);assert.equal(sim.releaseCatch().ok,false);assert.equal(sim.state.catches.length,saved.catches.length);assert.equal(sim.state.profile.credits,saved.profile.credits);}
});

test('an interrupted fight is safely retrieved without inventing a landing or reward',()=>{
 const saved=savedLanding();Object.assign(saved,{fishState:'fight',fishFight:{stamina:.4},castLine:true,lineDistance:20,paidLineMeters:24,reeling:true});
 const sim=resume(saved);assert.equal(sim.state.fishState,'idle');assert.equal(sim.state.fish,null);assert.equal(sim.state.fishFight,null);assert.equal(sim.state.castLine,false);assert.equal(sim.state.reeling,false);assert.equal(sim.state.paidLineMeters,0);assert.deepEqual(sim.state.catches,[]);assert.equal(sim.state.profile.credits,saved.profile.credits);
});

test('a full cooler leaves the restored fish pending so it can still be released after another refresh',()=>{
 const saved=savedLanding();saved.catches=[{name:'蓝岩鱼',catchId:'full-cooler',kg:8,length:60,kept:true}];const sim=resume(saved);
 assert.equal(sim.keepCatch().ok,false);assert.equal(sim.state.fishState,'landed');assert.equal(sim.state.catches.length,1);assert.equal(sim.state.profile.credits,100);
 const restored=resume(sim.snapshot());assert.equal(restored.releaseCatch().ok,true);assert.equal(restored.state.catches.length,2);assert.equal(restored.state.catches.filter(f=>f.catchId==='full-cooler').length,1);assert.equal(cargoWeight(restored.state.catches),8);assert.equal(restored.state.fish,null);
});
