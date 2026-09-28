import test from 'node:test';
import assert from 'node:assert/strict';
import {fishEncounter,weightedEncounterFish,MONTHLY_AVAILABILITY,monthlyAvailability} from '../dist/pixel-fish-ecology.js';
import {RIG_PROFILES,rigSpeciesKey} from '../dist/fishing-rigs.js';
import {USABLE_CONDITION} from '../dist/pixel-consumables.js';

const ids=['blue','copper','halibut','mackerel','lingcod','vermilion','salmon','seabass','bonito','croaker','sanddab'];
const fishes=ids.map(id=>({id}));
const sand={habitat:'sand',bottomDepth:20,lureDepth:19.7,month:9,waterTemp:14,rig:'bottom',bait:'squid',freshness:1};
const rate=(id,env)=>fishEncounter([{id}],{...sand,...env}).ratePerSecond;

test('sandy-bottom lingcod is incidental; mapped structure has far higher encounters',()=>{
 const beach=rate('lingcod'),reef=rate('lingcod',{habitat:'reef'});
 assert.ok(beach>0);
 assert.ok(reef>beach*75);
 assert.ok(rate('croaker')>beach*100);
 assert.ok(rate('lingcod',{habitat:'unknown'})<reef*.15);
});

test('mapped artificial structures behave like mixed habitat without changing unknown survey gaps',()=>{
 const artificial=fishEncounter(fishes,{...sand,habitat:'artificial'});
 assert.deepEqual(artificial,fishEncounter(fishes,{...sand,habitat:'mixed'}));
 assert.ok(rate('lingcod',{habitat:'artificial'})>rate('lingcod',{habitat:'unknown'})*4);
 assert.ok(rate('lingcod',{habitat:'artificial'})<rate('lingcod',{habitat:'reef'}));
});

test('unknown habitat with poor presentation stays slow even if a conditional species share is large',()=>{
 const one=[{id:'lingcod'}],poor={...sand,habitat:'unknown',rig:'float',lureDepth:2,bait:'shrimp'};
 const good={...sand,habitat:'reef',rig:'jig',pumping:true,lureVerticalSpeedMps:.52};
 const p=fishEncounter(one,poor),g=fishEncounter(one,good);
 assert.equal(p.weights[0]/p.totalWeight,1);
 assert.equal(weightedEncounterFish(one,poor,()=>.5),one[0]);
 assert.ok(p.ratePerSecond>0&&p.ratePerSecond<g.ratePerSecond/1000);
});

test('absolute water depth matters independently of being near the bottom',()=>{
 const deep=rate('vermilion',{habitat:'reef',bottomDepth:45,lureDepth:44.7});
 const shallow=rate('vermilion',{habitat:'reef',bottomDepth:3,lureDepth:2.7});
 assert.ok(deep>shallow*60);
 assert.ok(shallow>0);
 assert.ok(rate('sanddab',{bottomDepth:45,lureDepth:44.7})>rate('sanddab',{bottomDepth:8,lureDepth:7.7})*30);
});

test('halibut require near-bottom presentation even over the right sand and depth',()=>{
 const appropriate={rig:'slider',bait:'anchovy',boatSpeedMps:.3};
 assert.ok(rate('halibut',appropriate)>rate('halibut',{...appropriate,lureDepth:5})*100);
});

test('stationary squid strips stay possible but much weaker than slowly drifting baitfish for halibut',()=>{
 const staticSquid=rate('halibut',{rig:'bottom',bait:'squid',boatSpeedMps:0});
 const driftingFish=rate('halibut',{rig:'slider',bait:'anchovy',boatSpeedMps:.3});
 assert.ok(staticSquid>0);
 assert.ok(driftingFish>staticSquid*25);
 assert.ok(rate('halibut',{rig:'slider',bait:'squid',boatSpeedMps:.3})>staticSquid*5);
});

test('current flowing past an anchored boat does not turn static bait into drift fishing',()=>{
 const still=rate('halibut',{rig:'slider',bait:'anchovy',boatSpeedMps:0,currentMps:0});
 assert.equal(rate('halibut',{rig:'slider',bait:'anchovy',boatSpeedMps:0,currentMps:.6}),still);
 assert.equal(rate('halibut',{rig:'slider',bait:'anchovy',boatSpeedMps:.6,currentMps:.6,anchored:true}),still);
 assert.ok(rate('halibut',{rig:'slider',bait:'anchovy',driftSpeedMps:.3})>still*6);
});

test('vertical reeling alone does not imitate horizontal search with a dead halibut bait',()=>{
 assert.equal(rate('halibut',{retrieveSpeedMps:.6}),rate('halibut',{retrieveSpeedMps:0}));
 assert.ok(rate('halibut',{rig:'jig',pumping:true,lureVerticalSpeedMps:.52})>rate('halibut',{rig:'jig',pumping:false})*4);
});

test('fast motoring is worse than a controlled halibut drift',()=>{
 const base={rig:'slider',bait:'anchovy'};
 assert.ok(rate('halibut',{...base,boatSpeedMps:.3})>rate('halibut',{...base,boatSpeedMps:2})*25);
});

test('reef feather40 works without natural bait and benefits from lifting the lure',()=>{
 const base={rig:'feather40',habitat:'reef',bait:'squid'};
 assert.ok(rate('copper',{...base,pumping:true,lureVerticalSpeedMps:.52})>rate('copper',base)*2.5);
 assert.equal(rate('copper',{...base,bait:'shrimp'}),rate('copper',base));
 assert.ok(rate('copper',{...base,pumping:true,lureVerticalSpeedMps:.52})>rate('halibut',{...base,pumping:true,lureVerticalSpeedMps:.52})*100);
});

test('held pumping input gives no continuing jig bonus after the lure stops moving',()=>{
 const base={rig:'feather40',habitat:'reef',pumping:false,lureVerticalSpeedMps:0};
 assert.equal(rate('copper',{...base,pumping:true}),rate('copper',base));
 assert.ok(rate('copper',{...base,pumping:true,lureVerticalSpeedMps:.52})>rate('copper',base)*2.5);
 assert.equal(rate('copper',{...base,lureVerticalSpeedMps:-.52}),rate('copper',{...base,lureVerticalSpeedMps:.52}));
});

test('small feather rig is productive in the mackerel layer, not interchangeable with the bottom 4/0 rig',()=>{
 const water={lureDepth:5,pumping:true,lureVerticalSpeedMps:.52};
 assert.ok(rate('mackerel',{...water,rig:'sabiki'})>rate('mackerel',{...water,rig:'feather40'})*4);
 assert.ok(rate('mackerel',{...water,rig:'sabiki'})>rate('mackerel',{lureDepth:19.7,rig:'bottom'})*50);
});

test('optional real feather tips affect species affinity only while usable and explicitly attached',()=>{
 const base={rig:'feather40',habitat:'reef',bait:'squid',pumping:true,lureVerticalSpeedMps:.52};
 const plain=rate('copper',base),tipped=rate('copper',{...base,baitTipped:true,tipFreshness:1});
 assert.ok(tipped>plain&&tipped<plain*1.3);
 assert.equal(rate('copper',{...base,tipFreshness:1}),plain);
 assert.equal(rate('copper',{...base,baitTipped:true,tipFreshness:0}),plain);
 assert.equal(rate('copper',{...base,baitTipped:true,tipFreshness:USABLE_CONDITION}),plain);
 assert.equal(rate('copper',{...base,baitTipped:true,tipFreshness:USABLE_CONDITION/2}),plain);
 assert.ok(rate('copper',{...base,baitTipped:true,tipFreshness:.5})<tipped);
 assert.notEqual(tipped/plain,rate('halibut',{...base,baitTipped:true,tipFreshness:1})/rate('halibut',base));
});

test('salmon and bonito favor moving fish/lure presentations over static squid',()=>{
 for(const id of ['salmon','bonito']){
  const water={bottomDepth:45,lureDepth:15,month:8,waterTemp:18};
  const good=rate(id,{...water,rig:id==='salmon'?'slider':'jig',bait:'anchovy',boatSpeedMps:1});
  assert.ok(good>rate(id,{...water,bait:'squid',boatSpeedMps:0})*30,id);
 }
});

test('12-month availability is complete and does not turn winter residents or incidental migrants off',()=>{
 for(const id of ids){
  assert.equal(MONTHLY_AVAILABILITY[id].length,12);
  for(let month=1;month<=12;month++)assert.ok(monthlyAvailability(id,month)>0,id);
 }
 assert.equal(monthlyAvailability('copper',1),monthlyAvailability('copper',8));
 assert.ok(rate('halibut',{month:6})>rate('halibut',{month:1})*3);
 assert.ok(rate('mackerel',{month:9})>rate('mackerel',{month:2})*3);
 assert.ok(rate('salmon',{month:5})>rate('salmon',{month:12})*6);
 assert.ok(rate('seabass',{month:9})>rate('seabass',{month:2})*6);
 assert.ok(rate('bonito',{month:9,waterTemp:18})>rate('bonito',{month:2,waterTemp:11})*100);
});

test('all valid rig/species combinations keep a positive incidental opportunity',()=>{
 for(const rig of Object.keys(RIG_PROFILES))for(const month of [1,6,12]){
  const result=fishEncounter(fishes,{...sand,rig,month,habitat:'sand'});
  assert.ok(result.weights.every(w=>w>0&&Number.isFinite(w)),`${rig}, month ${month}`);
 }
});

test('the same singleton can be selected at every encounter but bad methods still encounter it much less often',()=>{
 const one=[{id:'halibut'}],poor={...sand},good={...sand,rig:'slider',bait:'anchovy',boatSpeedMps:.3};
 assert.equal(weightedEncounterFish(one,poor,()=>.9),one[0]);
 assert.equal(weightedEncounterFish(one,good,()=>.9),one[0]);
 assert.ok(fishEncounter(one,good).ratePerSecond>fishEncounter(one,poor).ratePerSecond*25);
 // Absolute species rate must not change when unrelated species are present.
 const all=fishEncounter(fishes,good),single=fishEncounter(one,good);
 assert.equal(all.weights[ids.indexOf('halibut')],single.weights[0]);
});

test('selecting encounters respects the weights used for encounter timing',()=>{
 const env={...sand,bottomDepth:8,lureDepth:7.7},r=fishEncounter(fishes,env),counts={};
 for(let i=0;i<10000;i++){
  const fish=weightedEncounterFish(fishes,env,()=>(i+.5)/10000);
  counts[fish.id]=(counts[fish.id]||0)+1;
 }
 for(let i=0;i<fishes.length;i++)assert.ok(Math.abs((counts[fishes[i].id]||0)/10000-r.weights[i]/r.totalWeight)<.0002);
 assert.ok(counts.croaker>7000);
 assert.ok((counts.lingcod||0)<50);
});

test('empty waters, no attractant and out-of-water hooks cannot generate fish',()=>{
 for(const changes of [{freshness:0},{lureDepth:0},{bottomDepth:0}]){
  assert.equal(fishEncounter(fishes,{...sand,...changes}).ratePerSecond,0);
  assert.equal(weightedEncounterFish(fishes,{...sand,...changes}),undefined);
 }
 assert.equal(fishEncounter([],sand).ratePerSecond,0);
 assert.equal(weightedEncounterFish([],sand),undefined);
});

test('new local soft-bottom fish map correctly from latin names',()=>{
 assert.equal(rigSpeciesKey({latin:'Genyonemus lineatus'}),'croaker');
 assert.equal(rigSpeciesKey({latin:'Citharichthys sordidus'}),'sanddab');
});
