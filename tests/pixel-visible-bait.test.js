import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {schoolFish,baitFishCandidates}=await import('../dist/pixel-small-fish.js');
const {fishEncounter}=await import('../dist/pixel-fish-ecology.js');
const {fishSpriteKind}=await import('../dist/pixel-fish-art.js');
const {fishFightKind,createFishFight,stepFishFight}=await import('../dist/pixel-fish-fight.js');
const {identifyRegulatedSpecies}=await import('../dist/fishing-regulations.js');
const {PixelSimulation,HARBOR,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {createWildlife,drawWildlife}=await import('../dist/pixel-wildlife.js');
const school=(species='anchovy-school',extra={})=>({id:123,type:'bait',species,x:100,z:100,radius:3,density:.8,depth:2,thickness:.6,visualFishCount:12,age:10,duration:1000,seed:128,heading:0,speed:.1,phase:0,followers:[],members:1,...extra});
const env=(fish,extra={})=>({point:{x:fish.x,z:fish.z},lureDepth:fish.depth,rig:'sabiki',lureVerticalSpeedMps:.2,...extra});
const total=a=>a.reduce((n,f)=>n+f.encounterWeight,0);
test('every visible school member has stable identity, species, length, mass and a bounded depth',()=>{
 for(const kind of['anchovy-school','sardine-school','mackerel-school']){const e=school(kind),a=schoolFish(e),b=schoolFish({...e,age:11});assert.equal(a.length,12);assert.equal(new Set(a.map(f=>f.schoolSlot)).size,12);assert.ok(a.every(f=>f.depth>0&&f.kg>0&&f.length>=f.min&&f.length<=f.max));assert.deepEqual(a.map(f=>[f.schoolSlot,f.length,f.kg]),b.map(f=>[f.schoolSlot,f.length,f.kg]));assert.notEqual(a[0].x,b[0].x);assert.notEqual(fishSpriteKind(a[0]),'unknown');assert.ok(identifyRegulatedSpecies(a[0]));}
});
test('all three visible species can take the existing small feather rig at their drawn location',()=>{
 for(const kind of['anchovy-school','sardine-school','mackerel-school']){const e=school(kind);for(const fish of schoolFish(e)){const candidates=baitFishCandidates([e],env(fish));assert.ok(candidates.some(f=>f.schoolSlot===fish.schoolSlot&&f.encounterWeight>0));}}
});
test('wrong depth, absent/expired school and depleted fish cannot produce baitfish; large hooks are much less effective',()=>{
 const e=school(),fish=schoolFish(e)[0],good=total(baitFishCandidates([e],env(fish)));assert.ok(good>0);
 for(const schools of[[],[school('anchovy-school',{age:1001})],[{...e,removedFish:Array.from({length:12},(_,i)=>i)}]])assert.equal(baitFishCandidates(schools,env(fish)).length,0);
 assert.equal(baitFishCandidates([e],env(fish,{lureDepth:20})).length,0);assert.equal(baitFishCandidates([e],env(fish,{point:{x:500,z:500}})).length,0);
 assert.ok(total(baitFishCandidates([e],env(fish,{rig:'bottom'})))<good*.05);assert.ok(total(baitFishCandidates([e],env(fish,{rig:'feather40'})))<good*.01);
 assert.equal(fishEncounter(baitFishCandidates([e],env(fish)),{rig:'sabiki',bottomDepth:20,lureDepth:2,freshness:0}).ratePerSecond,0);
});
test('rendered body positions come from the exact catchable entities; removal affects both',()=>{
 const e=school(),fish=schoolFish(e),seen=[],ctx={canvas:{width:900,height:900},fillRect(){},save(){},restore(){},translate(){},rotate(){}};
 drawWildlife(ctx,[e],{project:(x,z)=>{seen.push({x,z});return{x,y:z};},scale:6});for(const f of fish)assert.ok(seen.some(p=>p.x===f.x&&p.z===f.z));
 seen.length=0;drawWildlife(ctx,[{...e,removedFish:[0]}],{project:(x,z)=>{seen.push({x,z});return{x,y:z};},scale:6});assert.ok(!seen.some(p=>p.x===fish[0].x&&p.z===fish[0].z));assert.equal(schoolFish({...e,removedFish:[0]}).length,11);
});
test('baitfish fight has small fast movement and no compulsory long fight or surface jump',()=>{
 const fish=schoolFish(school())[0],fight=createFishFight(fish);assert.equal(fishFightKind(fish),'baitfish');for(let t=0;t<20;t+=.1){const next=stepFishFight(fish,fight,{time:t,dt:.1,lureDepth:.1});assert.ok(next.pullN<1);assert.equal(next.motion.jumpActive,false);assert.ok(next.motion.runSpeedMps<.2);}
});
function ready(){const sim=new PixelSimulation({rng:()=>.25,patrolRng:()=>.99,conditions:{windKnots:0,waveHeight:0}});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});assert.ok(sim.buyGear('rig_sabiki').ok);assert.ok(sim.replaceRig(undefined,'sabiki').ok);assert.ok(sim.launchBoat().ok);for(let i=0;i<250;i++)sim.step(.1);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.ok(sim.board().ok);const p=FISHING_SPOTS[0];Object.assign(sim.state,{boatX:p.x,boatZ:p.z});syncVessel(sim.vessel,{x:p.x,z:p.z,clearMotion:true});return sim;}
test('visible sardines run through real lower, bite, hook, retrieve, keep/release and removal lifecycle',()=>{
 for(const kind of['anchovy-school','sardine-school','mackerel-school'])for(const keep of[false,true]){
 const sim=ready();assert.ok(sim.lowerRig().ok);for(let i=0;i<55;i++)sim.step(.1);sim.setReelMode('brake');const s=sim.state,patch=school(kind,{x:s.bobber.x,z:s.bobber.z,depth:s.lureDepth,radius:1.4,visualFishCount:48});sim.setBaitSchools([patch]);
 let caught=false;
 for(let i=0;i<1600;i++){
  sim.step(.05,s.fishState==='bite'||s.fishState==='fight'?{reel:1.2}:{});
  if(s.fishState==='fight'&&s.fish.baitfish){assert.equal(s.fish.latin,schoolFish(patch)[0].latin);assert.ok(s.schoolRemovals[123].includes(s.fish.schoolSlot));caught=true;}
  if(s.fishState==='landed')break;
 }
 assert.ok(caught,'the actual encounter picker must select and seat a visible baitfish');assert.equal(s.fishState,'landed');assert.ok(s.fightTime<25);const slot=s.fish.schoolSlot,weight=s.fish.kg;assert.ok(weight>0&&weight<.3);
 assert.ok((keep?sim.keepCatch():sim.releaseCatch()).ok);assert.equal(s.catches.length,1);assert.equal(s.catches[0].kept,keep);assert.equal(s.catches[0].schoolSlot,slot);
 sim.setBaitSchools([patch]);assert.ok(!schoolFish(s.baitSchools[0]).some(f=>f.schoolSlot===slot));
 const wildlife=createWildlife({seed:4,habitat:()=>({water:true,depth:20})});wildlife.events.push({...patch});wildlife.update(s,.1,{});assert.ok(wildlife.events[0].removedFish.includes(slot));assert.equal(wildlife.snapshot()[0].remainingFish,47);
 sim.setBaitSchools([]);assert.deepEqual(s.schoolRemovals,{});
 }
});
test('no permanently boat-attached decorative fish loop remains',async()=>{const source=await readFile(new URL('../dist/pixel-world.js',import.meta.url),'utf8');assert.ok(!source.includes('Schools are only visual'));assert.ok(!source.includes('focusX+Math.sin(a)*10-7'));});
