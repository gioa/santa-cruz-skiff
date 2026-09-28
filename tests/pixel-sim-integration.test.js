import test from 'node:test';
import assert from 'node:assert/strict';
import {seatHook} from './helpers/pixel-hook.js';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {bearingDegrees,toGPS}=await import('../dist/pixel-geography.js');
const {depthAt}=await import('../dist/bathymetry.js');
const {assessCatchLedger}=await import('../dist/fishing-regulations.js');
const now=()=>new Date('2026-09-27T23:15:00Z');
function run(sim,seconds,input={}){for(let elapsed=0;elapsed<seconds-1e-7;elapsed+=.1)sim.step(Math.min(.1,seconds-elapsed),input);}
function until(sim,predicate,seconds=100,input={}){for(let elapsed=0;elapsed<seconds&&!predicate(sim.state);elapsed+=.1)sim.step(.1,input);assert.ok(predicate(sim.state),JSON.stringify(sim.publicState()));}
function prepared(gear=[],options={}){
 const sim=new PixelSimulation({now,rng:()=>.05,patrolRng:()=>.9,profile:{version:2,credits:2000},...options});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});sim.packStarter();
 for(const id of gear){assert.equal(sim.buyGear(id).ok,true,id);assert.equal(sim.equip(id).ok,true,id);}
 assert.equal(sim.launchBoat().ok,true);run(sim,24.1);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.equal(sim.board().ok,true);sim.unmoor();return sim;
}
function offshore(sim,index=1){const p=FISHING_SPOTS[index];Object.assign(sim.state,{boatX:p.x,boatZ:p.z,heading:0,speed:0,engine:false,anchor:false,moored:false});syncVessel(sim.vessel,{x:p.x,z:p.z,heading:0,clearMotion:true});}
function lower(sim){assert.equal(sim.lowerRig().ok,true);assert.equal(sim.state.fishState,'sinking');}
function stored(speciesId,extra={}){return{speciesId,name:speciesId,catchId:`${speciesId}-${Math.random()}`,length:60,kg:1,kept:true,caughtAt:'2026-09-27T13:00:00Z',caughtGPS:{lat:36.9505,lon:-122.0288},hookCount:1,lineCount:1,hasDescendingDevice:true,landingNetDiameterInches:20,...extra};}

test('purchased navigation tools require packing; starting without chart still permits manual boating and fishing',()=>{
 const sim=prepared();assert.equal(sim.selectWaypoint('sand').ok,false);assert.equal(sim.navigationInstruments().chart,false);assert.equal(sim.publicState().gps,null);assert.equal(sim.publicState().referenceDepth,null);assert.equal(sim.publicState().boat.heading,null);assert.equal(sim.publicState().speedKnots,null);
 assert.equal(sim.toggleEngine().ok,true);assert.equal(sim.setThrottle(.25),true);run(sim,3);assert.ok(sim.state.speed>0);sim.toggleEngine();until(sim,s=>Math.abs(s.speed)<.5,30);assert.equal(sim.lowerRig().ok,true);sim.retrieve();
 const equipped=prepared(['nautical_chart','compass','gps','sounder']);equipped.state.heading=.4;const nav=equipped.navigationInstruments();assert.equal(nav.heading,bearingDegrees(.4));assert.deepEqual(nav.gpsPosition,toGPS(equipped.state.boatX,equipped.state.boatZ));assert.equal(typeof nav.depth.value,'number');assert.equal(equipped.selectWaypoint('sand').ok,true);
 equipped.state.packed=equipped.state.packed.filter(id=>!['nautical_chart','compass','gps','sounder'].includes(id));assert.equal(equipped.selectWaypoint('dock').ok,false);assert.equal(equipped.navigationInstruments().gps,false);assert.equal(equipped.publicState().referenceDepth,null);
 equipped.state.packed.push('sounder');equipped.state.profile.owned=equipped.state.profile.owned.filter(id=>id!=='sounder');assert.equal(equipped.navigationInstruments().sounder,false,'packing an unowned item grants no instrument');
});

test('handheld GPS follows walking position rather than the moored boat and jumping cannot change it',()=>{
 const sim=prepared(['gps']);Object.assign(sim.state,{mode:'walk',playerX:HARBOR.spawnX,playerZ:HARBOR.spawnZ});const gps=toGPS(HARBOR.spawnX,HARBOR.spawnZ);assert.deepEqual(sim.navigationInstruments().gpsPosition,gps);assert.equal(sim.jump().ok,false);assert.deepEqual(sim.navigationInstruments().gpsPosition,gps);assert.equal(sim.state.swim,null);
});

test('offshore navigation covers about twice the geography while fuel and vessel speed stay unscaled and both modes share the 2x clock',()=>{
 const fast=prepared(),real=prepared([],{navigationScale:()=>1}),departureTime=fast.state.elapsed;for(const sim of[fast,real]){offshore(sim);sim.toggleEngine();sim.setThrottle(.7);run(sim,60);}
 assert.ok(fast.state.sailed/real.state.sailed>1.8&&fast.state.sailed/real.state.sailed<2.2);assert.equal(fast.state.clock,real.state.clock);assert.ok(Math.abs(fast.state.elapsed-departureTime-60)<1e-7);assert.ok(Math.abs(fast.state.speed-real.state.speed)<.05);assert.ok(Math.abs(fast.state.fuel-real.state.fuel)<1e-8);assert.equal(fast.state.navigationScale,2);
 fast.toggleEngine();run(fast,.1);assert.equal(fast.state.navigationScale,1);assert.equal(fast.jump().ok,false);const before=fast.state.elapsed;run(fast,2);assert.ok(Math.abs(fast.state.elapsed-before-2)<1e-6);assert.equal(fast.state.mode,'boat');
});

test('premade rig weights and suspended depth selection stay distinct and valid',()=>{
 const sim=prepared(['rig_dropper','rig_sabiki','rig_float','rig_jig']);assert.equal(sim.setRig({rig:'dropper'}).ok,true);assert.equal(sim.state.rigWeightGrams,113);assert.equal(sim.publicState().hookCount,2);assert.equal(sim.setRig({weightGrams:170}).ok,false);
 assert.equal(sim.setRig({rig:'float',fishingDepthMeters:4}).ok,true);assert.equal(sim.state.rigWeightGrams,7);assert.equal(sim.state.fishingDepthMeters,4);assert.equal(sim.setRig({rig:'sabiki'}).ok,true);assert.equal(sim.state.rigWeightGrams,28);assert.equal(sim.state.fishingDepthMeters,6);
 const heavy=prepared(['rig_float','sinker_heavy']);assert.equal(heavy.setRig({weightGrams:170}).ok,false);assert.equal(heavy.setRig({rig:'float',weightGrams:113}).ok,false,'a seven-gram float cannot carry a heavy bottom sinker');assert.equal(heavy.setRig({rig:'float'}).ok,true);
});

test('all premade rigs enter the water directly beneath the rod tip by hand or from either side holder',()=>{
 const sim=prepared(['rig_dropper','rig_slider','rig_jig','rig_float','rig_sabiki']);offshore(sim);
 for(const rig of['bottom','dropper','slider','jig','float','sabiki']){
  assert.equal(sim.setRig({rig}).ok,true,rig);if(rig!=='sabiki'&&!sim.state.baitOnHook)assert.equal(sim.replaceBait().ok,true);
  for(const mount of['hand','port','starboard']){
   assert.equal(sim.setRodMount(mount).ok,true);const supplies=structuredClone({stock:sim.state.profile.stock,rigStock:sim.state.profile.rigStock,rodSupplies:sim.state.profile.rodSupplies});
   assert.equal(sim.lowerRig().ok,true,`${rig}/${mount}`);assert.equal(sim.state.fishState,'sinking');assert.equal(sim.state.casting,false);assert.equal(sim.state.castFlight,null);assert.deepEqual(sim.state.bobber,{x:sim.state.rodTip.x,z:sim.state.rodTip.z,height:0});assert.deepEqual(sim.state.lineEntry,sim.state.bobber);assert.ok(sim.state.lineDistance<8,'no projected cast distance');
   assert.deepEqual({stock:sim.state.profile.stock,rigStock:sim.state.profile.rigStock,rodSupplies:sim.state.profile.rodSupplies},supplies);assert.equal(sim.retrieve().ok,true);
  }
 }
});

test('vertical lure descent uses water depth and real time; lift has finite stroke',()=>{
 const sim=prepared(['rig_float','rig_jig']);offshore(sim);lower(sim);sim.state.biteAt=1e6;sim.state.snagThreshold=Infinity;sim.state.lineDistance=.4;const bottom=depthAt(sim.state.bobber.x,sim.state.bobber.z);run(sim,55);assert.ok(sim.state.lureDepth>Math.min(8,bottom-1));assert.ok(sim.state.paidLineMeters>sim.state.lureDepth);assert.ok(sim.state.rigPresentation.bottomContact);
 sim.retrieve();assert.ok(sim.lowerRig().ok);sim.state.biteAt=1e6;sim.state.snagThreshold=Infinity;run(sim,30);sim.setReelMode('brake');run(sim,2,{reel:.5});const rest=sim.state.lureDepth;run(sim,2,{pump:true});const lifted=sim.state.lureDepth;run(sim,6,{pump:true});assert.ok(rest-lifted>.4,'a taut vertical rig follows the finite tip stroke');assert.ok(Math.abs(sim.state.lureDepth-lifted)<.3,'held pump cannot lift forever');run(sim,3);assert.ok(sim.state.lureDepth>lifted+.2);
 sim.retrieve();sim.setRig({rig:'float',bait:'squid',fishingDepthMeters:2});lower(sim);sim.state.biteAt=1e6;sim.state.snagThreshold=Infinity;run(sim,20);assert.ok(Math.abs(sim.state.lureDepth-2)<.25);const before=sim.state.paidLineMeters;run(sim,1,{reel:true});assert.ok(sim.state.paidLineMeters<before);assert.equal(sim.state.reeling,true);
});

test('hook stamps Pacific six-am date, capture position and actual carried tackle; keeping undersized fish is allowed',()=>{
 const sim=prepared(['rig_dropper']);offshore(sim);sim.setRig({rig:'dropper',bait:'squid'});lower(sim);until(sim,s=>s.fishState==='bite',100);const requestedAt=sim.captureTimestamp();seatHook(sim);const stamp=sim.captureTimestamp(),gps=toGPS(sim.state.bobber.x,sim.state.bobber.z);assert.ok(Date.parse(stamp)>Date.parse(requestedAt),'capture evidence must use actual seating time, not the button press');assert.equal(sim.state.dayStartAt,'2026-09-27T13:00:00.000Z');assert.equal(sim.state.fish.caughtAt,stamp);assert.deepEqual(sim.state.fish.caughtGPS,gps);assert.equal(sim.state.fish.hookCount,2);assert.equal(sim.state.fish.rig.id,'dropper');assert.equal(sim.state.fish.hasDescendingDevice,true);assert.equal(sim.state.fish.landingNetDiameterInches,20);
 Object.assign(sim.state.fish,{name:'加州大比目鱼',latin:'Paralichthys californicus',length:40,kg:1});sim.state.fishState='landed';const credits=sim.state.profile.credits;assert.equal(sim.keepCatch().ok,true);assert.equal(sim.state.profile.credits,credits);assert.equal(sim.state.catches.at(-1).kept,true);assert.equal(sim.state.lastInspection,null);assert.ok(assessCatchLedger(sim.state.catches).violations.some(v=>v.code==='undersize'));
});

test('new/resumed game dates use real Pacific date at 06:00, including winter offset, and preserve original catch evidence',()=>{
 const sim=prepared();sim.state.catches.push(stored('lingcod'));const saved=sim.snapshot(),resumed=new PixelSimulation({saved,now:()=>new Date('2026-12-01T04:00:00Z')});resumed.start(true);assert.equal(resumed.state.dayStartAt,'2026-11-30T14:00:00.000Z');assert.equal(resumed.state.clock,'06:00:00');assert.equal(resumed.state.catches[0].caughtAt,'2026-09-27T13:00:00Z');assert.equal(resumed.captureTimestamp(),'2026-11-30T14:00:00.000Z');
});

test('patrol randomness is independent of fishing RNG and never reveals an inspection result before checking ends',()=>{
 let draws=0;const sim=prepared([],{rng:()=>{draws++;return .1;},patrolRng:()=>0});offshore(sim);sim.state.catches.push(stored('blue_rockfish'));const before=draws;assert.equal(sim.patrol.considerDock(sim.state),true);assert.equal(draws,before);assert.equal(sim.state.inspection.phase,'approaching');assert.equal(sim.state.events.some(e=>e.action==='inspection'),false);until(sim,s=>s.inspection?.phase==='checking',30);assert.equal(sim.state.lastInspection,null);assert.equal(sim.state.events.some(e=>e.action==='inspection'),false);assert.equal(sim.toggleEngine().ok,false);assert.equal(sim.setThrottle(1),false);run(sim,2,{throttle:1});assert.equal(sim.state.engine,false);assert.equal(sim.state.throttle,0);until(sim,s=>s.lastInspection,15);assert.equal(sim.state.lastInspection.confiscated.length,0);assert.equal(sim.state.events.filter(e=>e.action==='inspection').length,1);assert.equal(draws,before);
});

test('inspection assesses current ledger at result, confiscates only current violating cargo, and preserves daily history',()=>{
 const sim=prepared([],{patrolRng:()=>0});offshore(sim);const legal=stored('blue_rockfish'),illegal=stored('california_halibut',{length:40}),old=stored('lingcod',{length:30,settled:true,reward:25}),legacy={name:'铜岩鱼',length:20,kg:1,kept:true,catchId:'legacy'};sim.state.catches.push(legal,illegal,old,legacy);const credits=sim.state.profile.credits;sim.patrol.considerDock(sim.state);until(sim,s=>s.inspection?.phase==='checking',30);assert.equal(illegal.confiscated,undefined);until(sim,s=>s.lastInspection,15);
 assert.equal(illegal.confiscated,true);assert.equal(illegal.settled,true);assert.equal(illegal.reward,0);assert.equal(legal.settled,undefined);assert.equal(old.confiscated,undefined);assert.equal(legacy.confiscated,undefined);assert.equal(sim.state.profile.credits,credits);assert.equal(sim.state.lastInspection.confiscated.length,1);assert.equal(sim.state.catches.length,4);assert.equal(assessCatchLedger(sim.state.catches).daily['2026-09-27'].species.california_halibut,1);assert.equal(sim.publicState().catches[1].confiscated,true);
});

test('dock checks keep updating through docking and block counter trading until finished; one draw per trip',()=>{
 const sim=prepared([],{patrolRng:()=>0});sim.patrol.isWater=()=>true;const f=stored('california_halibut',{length:40});sim.state.catches.push(f);assert.equal(sim.dock().ok,true);assert.equal(sim.state.inspection.phase,'approaching');assert.equal(sim.patrol.considerDock(sim.state),false);until(sim,s=>s.mode==='walk',10);Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});assert.equal(sim.trade().ok,false);assert.equal(f.settled,undefined);until(sim,s=>s.lastInspection,30);assert.equal(f.confiscated,true);assert.equal(sim.trade().total,0);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.equal(sim.board().ok,true);assert.equal(sim.patrol.dockConsidered,false,'new boarded voyage resets one dock chance');
});

test('paused inspection and resumed pending inspection cannot be bypassed by trading',()=>{
 const sim=prepared([],{patrolRng:()=>0});offshore(sim);sim.state.catches.push(stored('lingcod',{length:30}));sim.patrol.considerDock(sim.state);until(sim,s=>s.inspection?.phase==='checking',30);const elapsed=sim.state.inspection.elapsed;sim.pause(true);run(sim,10);assert.equal(sim.state.inspection.elapsed,elapsed);const restored=new PixelSimulation({saved:sim.snapshot(),now,patrolRng:()=>0});restored.start(true);assert.equal(restored.state.inspection.phase,'checking');Object.assign(restored.state,{mode:'walk',playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});assert.equal(restored.trade().ok,false);until(restored,s=>s.lastInspection,15);assert.equal(restored.state.catches[0].confiscated,true);
});
