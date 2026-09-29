import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SABIKI_RIG} from '../dist/pixel-sabiki-data.js';
import {assessCatchLedger} from '../dist/fishing-regulations.js';
import {loseRig} from '../dist/pixel-consumables.js';
import {sabikiCatchMarkup} from '../dist/pixel-sabiki-ui.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {createSabikiSet,sabikiHookRate,sabikiSchoolAt,attachedSabikiFish}=await import('../dist/pixel-sabiki.js');
const {PixelSimulation,HARBOR,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
function seeded(seed=17){let x=seed;return()=>((x=Math.imul(1664525,x)+1013904223>>>0)/4294967296);}
function prepared(seed=17){const sim=new PixelSimulation({rng:seeded(seed),patrolRng:()=>.9,now:()=>new Date('2026-09-27T13:00:00Z')});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});sim.state.profile.credits=500;assert.ok(sim.buyGear('rod_sabiki').ok);assert.ok(sim.selectRod('rod_sabiki').ok);Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,boatX:FISHING_SPOTS[1].x,boatZ:FISHING_SPOTS[1].z});assert.ok(sim.lowerRig().ok);return sim;}
function run(sim,seconds,input={}){for(let t=0;t<seconds;t+=.05)sim.stepFishing(.05,input);}
function schoolUnder(sim){const p=sim.state.bobber;sim.setBaitSchools([{id:9,type:'bait',species:'anchovy-school',x:p.x,z:p.z,age:10,duration:120,depth:3.4,radius:8,thickness:1.3}]);}
function fishAtSchool(seed=17){const sim=prepared(seed);run(sim,16);sim.setReelMode('brake');schoolUnder(sim);run(sim,35);return sim;}

test('purchased Sabiki rod includes one real six-hook rig, supports replacement, and never gifts supplies on reload',()=>{
 const sim=prepared(),p=sim.state.profile;assert.equal(p.credits,380);assert.equal(p.loadout.rod,'rod_sabiki');assert.equal(sim.state.rig,'sabiki6');assert.equal(sim.publicState().hookCount,6);assert.equal(sim.publicState().hookSize,'#10');assert.equal(sim.hasElectricReel,false);assert.equal(sim.rodConsumableStatus().requiresBait,false);assert.equal(p.rigStock.sabiki6.length,0);assert.equal(sim.state.sabiki.hooks.length,6);
 const bait=p.stock.squid;sim.retrieve();assert.equal(p.stock.squid,bait);loseRig(p,'rod_sabiki');
 const saved=new PixelSimulation({saved:sim.snapshot()});saved.start(true);assert.equal(saved.rodConsumableStatus().rig.present,false);assert.equal(saved.rodConsumableStatus().rigStock.sabiki6,0);assert.equal(saved.replaceRig(undefined,'sabiki6').ok,false);
 Object.assign(saved.state,{mode:'walk',playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});assert.ok(saved.buyGear('rig_sabiki6').ok);assert.ok(saved.replaceRig(undefined,'sabiki6').ok);assert.equal(saved.rodConsumableStatus().rigStock.sabiki6,0);
});

test('bait-school distance and each individual hook depth control the encounter rate',()=>{
 const school=[{type:'bait',x:10,z:5,depth:4,thickness:.4,radius:8}],state={bobber:{x:10,z:5},lureDepth:4,pumping:false};
 const near=sabikiHookRate(school,state,0).rate,deep=sabikiHookRate(school,{...state,lureDepth:20},0).rate,far=sabikiHookRate(school,{...state,bobber:{x:80,z:5}},0).rate;
 assert.ok(near>far*100);assert.ok(near>deep*100);assert.ok(sabikiHookRate(school,state,5).rate<near*.1);
 assert.equal(sabikiHookRate(school,{...state,lureDepth:.1},0).rate,0);assert.equal(sabikiSchoolAt([{...school[0],type:'dolphins'}],state.bobber,4).strength,0);
 const rapid=sabikiHookRate(school,{...state,lureVerticalSpeedMps:2},0).rate;assert.ok(rapid<near*.4);
});

test('six independent hooks accumulate multiple baitfish while the rig stays in the school',()=>{
 const sim=fishAtSchool(),fish=attachedSabikiFish(sim.state);assert.ok(fish.length>=2&&fish.length<=6,`actual ${fish.length}`);assert.equal(new Set(fish.map(f=>f.hookIndex)).size,fish.length);assert.ok(fish.every(f=>f.latin==='Engraulis mordax'&&f.hookCount===6));assert.equal(sim.state.fishState,'fight');assert.ok(sim.state.rodLoadN>0);assert.equal(sim.state.stamina,100,'small fish do not require exhaustion');
 const count=fish.length;sim.setBaitSchools([]);run(sim,5);assert.ok(attachedSabikiFish(sim.state).length<=count,'leaving the school does not generate an automatic full string');
});

test('normal manual winding lands a real batch; retaining uses individual ledger records and is idempotent',()=>{
 const sim=fishAtSchool(),p=sim.state.profile,credits=p.credits,before=attachedSabikiFish(sim.state).length;run(sim,60,{reel:1.2});
 assert.equal(sim.state.fishState,'landed');const batch=sim.state.sabiki.landed;assert.ok(batch.length>=2&&batch.length<=6);assert.ok(batch.length>=before-1);assert.ok(sim.state.fightTime<60);assert.equal(p.credits,credits);
 const n=batch.length;assert.equal(sim.keepCatch().count,n);assert.equal(sim.state.catches.length,n);assert.equal(new Set(sim.state.catches.map(f=>f.catchId)).size,n);assert.equal(p.credits,credits,'retention does not bypass landing inspection');assert.equal(sim.state.sabiki,null);assert.equal(sim.state.fishState,'idle');assert.equal(sim.keepCatch().ok,false);assert.equal(sim.state.catches.length,n);assert.ok(sim.needsLandingInspection());
});

test('batch capacity failure is atomic, and release records every fish once',()=>{
 const sim=fishAtSchool();run(sim,60,{reel:1.2});const n=sim.state.sabiki.landed.length,credits=sim.state.profile.credits;sim.state.packed=sim.state.packed.filter(id=>id!=='cooler');assert.equal(sim.keepCatch().ok,false);assert.equal(sim.state.catches.length,0);assert.equal(sim.state.sabiki.landed.length,n);assert.equal(sim.state.profile.credits,credits);
 assert.equal(sim.releaseCatch().count,n);assert.ok(sim.state.catches.every(f=>!f.kept&&f.settled));const after=sim.state.profile.credits;assert.equal(sim.releaseCatch().ok,false);assert.equal(sim.state.profile.credits,after);
});

test('actual six-hook evidence follows every baitfish into the existing inspection rules',()=>{
 const sim=prepared();sim.retrieve();sim.state.catches.push({name:'蓝岩鱼',latin:'Sebastes mystinus',length:30,kg:.4,kept:true,settled:false,catchId:'previous',caughtAt:'2026-09-27T13:00:00Z',caughtGPS:{lat:36.94,lon:-122.02},hookCount:2,lineCount:1,hasDescendingDevice:true});assert.ok(sim.lowerRig().ok);run(sim,16);sim.setReelMode('brake');schoolUnder(sim);run(sim,35);run(sim,60,{reel:1.2});assert.ok(sim.keepCatch().ok);
 const bait=sim.state.catches.slice(1);assert.ok(bait.length>0);assert.ok(bait.every(f=>f.groundfishAboardAtCapture));assert.ok(assessCatchLedger(sim.state.catches).violations.some(v=>v.code==='groundfish_hook_limit'));
});

test('empty six-hook rigs cannot create a catch card and the mobile batch card offers clear all-fish actions',()=>{
 const sim=prepared();sim.state.sabiki=createSabikiSet(()=>.999);run(sim,6);run(sim,30,{reel:1.2});assert.equal(sim.state.fishState,'idle');assert.equal(sim.state.catches.length,0);
 const markup=sabikiCatchMarkup([{name:'北方鳀鱼',length:12,kg:.02}]);assert.match(markup,/全部收入冰箱/);assert.match(markup,/全部记录并放流/);assert.match(markup,/1 条/);
});

test('additional hooks can fill after the first fish; a single loose hook never drops the entire string',()=>{
 const sim=prepared(29);run(sim,16);sim.setReelMode('brake');schoolUnder(sim);let initial=0;
 for(let i=0;i<1200&&!initial;i++){sim.stepFishing(.05,{});initial=attachedSabikiFish(sim.state).length;}
 assert.ok(initial>0&&initial<6);run(sim,35);const fish=attachedSabikiFish(sim.state);assert.ok(fish.length>initial);assert.ok(fish.length<=6);
 const hooked=sim.state.sabiki.hooks.filter(h=>h.fish);sim.setBaitSchools([]);hooked[0].lossExposure=hooked[0].lossThreshold+1;sim.stepFishing(.05,{});assert.equal(attachedSabikiFish(sim.state).length,fish.length-1);assert.equal(sim.state.fishState,'fight');
 const before=structuredClone(sim.state.sabiki);sim.pause(true);sim.step(.25,{reel:1.2});assert.deepEqual(sim.state.sabiki,before);
});
