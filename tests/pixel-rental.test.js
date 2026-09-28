import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,BOAT_RENTAL_PRICE,FISHING_SPOTS,hasSavedBoatRental}=await import('../dist/pixel-sim.js');
const now=()=>new Date('2026-09-27T20:00:00Z');
const position=s=>({x:s.playerX,z:s.playerZ});
function run(sim,seconds){for(let t=0;t<seconds-1e-8;t+=.1)sim.step(Math.min(.1,seconds-t));}
function begin(credits=100){const sim=new PixelSimulation({now,patrolRng:()=>.9,profile:{version:2,credits}});sim.start();return sim;}
function counter(sim){sim.walkTo('counter');for(let t=0;t<30&&sim.state.autoWalk;t+=.1)sim.step(.1);assert.equal(sim.atCounter,true);}
function landing(sim){assert.equal(sim.walkTo('boarding').ok,true);for(let t=0;t<60&&sim.state.autoWalk;t+=.1)sim.step(.1);assert.ok(Math.hypot(sim.state.playerX-HARBOR.boardingX,sim.state.playerZ-HARBOR.boardingZ)<1e-6);}
const rentalTransactions=sim=>sim.state.profile.transactions.filter(t=>t.kind==='boat_rental');

test('a new trip starts with an unpaid boat ashore and rescue cannot launch it for free',()=>{
 const sim=begin();assert.equal(BOAT_RENTAL_PRICE,15);assert.equal(sim.state.version,5);assert.equal(sim.state.profile.version,2);assert.equal(sim.state.launchStage,'stored');assert.equal(sim.publicState().rentalPaid,false);assert.equal(sim.publicState().rentalPrice,15);assert.equal(sim.launchBoat().ok,false,'payment happens at the counter');assert.equal(sim.board().ok,false);
 const credits=sim.state.profile.credits;sim.rescue();run(sim,30);assert.equal(sim.state.launchStage,'stored');assert.equal(sim.state.rentalPaid,false);assert.equal(sim.state.profile.credits,credits);assert.equal(rentalTransactions(sim).length,0);landing(sim);assert.equal(sim.board().ok,false);
});

test('counter payment starts a timed launch exactly once, including repeated requests',()=>{
 const sim=begin();counter(sim);assert.equal(sim.launchBoat().ok,true);assert.equal(sim.state.profile.credits,85);assert.equal(sim.state.rentalPaid,true);assert.equal(sim.state.launchStage,'lowering');assert.equal(sim.state.launchProgress,0);assert.deepEqual(rentalTransactions(sim).map(t=>t.delta),[-15]);
 run(sim,3);const progress=sim.state.launchProgress;sim.launchBoat();assert.equal(sim.state.launchProgress,progress);assert.equal(sim.state.profile.credits,85);assert.equal(rentalTransactions(sim).length,1);
 Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.equal(sim.board().ok,false);run(sim,21.1);assert.equal(sim.state.launchStage,'afloat');assert.equal(sim.board().ok,true);assert.equal(sim.unmoor().ok,true);sim.rescue();counter(sim);assert.equal(sim.launchBoat().ok,true);assert.equal(rentalTransactions(sim).length,1);assert.equal(sim.state.profile.credits,85);
});

test('insufficient credits never become a free rental or negative balance; exact payment is allowed',()=>{
 for(const credits of[0,14]){const sim=begin(credits);counter(sim);const result=sim.launchBoat();assert.equal(result.ok,false);assert.match(result.message,/15.*不足/);assert.equal(sim.state.profile.credits,credits);assert.equal(sim.state.rentalPaid,false);assert.equal(sim.state.launchStage,'stored');assert.equal(rentalTransactions(sim).length,0);sim.rescue();assert.equal(sim.state.launchStage,'stored');}
 const exact=begin(15);counter(exact);assert.equal(exact.launchBoat().ok,true);assert.equal(exact.state.profile.credits,0);assert.equal(exact.state.rentalPaid,true);
});

test('unrented shopping preserves the rental budget; already rented trips can spend the remaining credits',()=>{
 const sim=begin();counter(sim);assert.equal(sim.buyGear('rod_light').ok,true);assert.equal(sim.state.profile.credits,15);assert.equal(sim.launchBoat().ok,true);assert.equal(sim.state.profile.credits,0);
 const reserved=begin(29);counter(reserved);assert.equal(reserved.buyGear('rig_slider').ok,false);assert.equal(reserved.state.profile.credits,29);assert.equal(reserved.state.profile.owned.includes('rig_slider'),false);assert.equal(reserved.state.profile.transactions.length,0);
 const rented=begin(60);counter(rented);rented.launchBoat();assert.equal(rented.buyGear('leader_heavy').ok,true);assert.equal(rented.state.profile.credits,5);
});

test('resuming a paid launch preserves its partial progress and does not charge twice or skip the hoist',()=>{
 const sim=begin();counter(sim);sim.launchBoat();run(sim,7);const saved=sim.snapshot(),restored=new PixelSimulation({saved,now});restored.start(true);assert.equal(restored.state.version,5);assert.equal(restored.state.rentalPaid,true);assert.equal(restored.state.launchStage,'lowering');assert.equal(restored.state.launchProgress,saved.launchProgress);assert.equal(restored.state.profile.credits,85);assert.equal(rentalTransactions(restored).length,1);
 restored.rescue();assert.equal(restored.state.launchStage,'lowering');assert.equal(restored.state.launchProgress,saved.launchProgress);Object.assign(restored.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.equal(restored.board().ok,false);run(restored,16);assert.equal(restored.state.launchStage,'lowering');run(restored,1.1);assert.equal(restored.state.launchStage,'afloat');assert.equal(restored.board().ok,true);assert.equal(rentalTransactions(restored).length,1);
});

test('legacy boats already afloat or being lowered keep their rental; an old stored boat still needs payment',()=>{
 const original=begin().snapshot();
 for(const version of[undefined,4])for(const entry of[{mode:'boat',launchStage:'afloat'},{mode:'walk',launchStage:'afloat'},{mode:'walk',launchStage:'lowering',launchProgress:.4}]){
  const saved={...original,version,...entry};delete saved.rentalPaid;const sim=new PixelSimulation({saved,now});sim.start(true);assert.equal(sim.state.rentalPaid,true);assert.equal(sim.state.version,5);assert.equal(sim.state.launchStage,entry.launchStage);if(entry.launchStage==='lowering')assert.equal(sim.state.launchProgress,.4);assert.equal(sim.state.profile.credits,100);assert.equal(rentalTransactions(sim).length,0,'migration never fabricates a payment transaction');
 }
 const stored={...original,version:4,launchStage:'stored'};delete stored.rentalPaid;const sim=new PixelSimulation({saved:stored,now});sim.start(true);assert.equal(sim.state.rentalPaid,false);counter(sim);assert.equal(sim.launchBoat().ok,true);assert.equal(sim.state.profile.credits,85);
});

test('version-five floating flags without payment recover ashore and all propulsion entries reject unpaid use',()=>{
 for(const stage of['afloat','lowering']){
  const saved={...begin(14).snapshot(),mode:'boat',launchStage:stage,launchProgress:.6,rentalPaid:false,boatX:100,boatZ:-300,loaded:true,engine:true,throttle:1,moored:false,anchor:true};const sim=new PixelSimulation({saved,now});sim.start(true);
  assert.equal(sim.state.mode,'walk');assert.deepEqual(position(sim.state),{x:HARBOR.spawnX,z:HARBOR.spawnZ});assert.equal(sim.state.launchStage,'stored');assert.equal(sim.state.launchProgress,0);assert.equal(sim.state.rentalPaid,false);assert.equal(sim.state.moored,true);assert.equal(sim.state.loaded,false);assert.equal(sim.state.engine,false);assert.equal(sim.state.anchor,false);assert.equal(sim.state.profile.credits,14);
 }
 const sim=begin();Object.assign(sim.state,{mode:'boat',launchStage:'afloat',moored:false});assert.equal(sim.setThrottle(1),false);assert.equal(sim.selectWaypoint(FISHING_SPOTS[0]).ok,false);assert.equal(sim.startCast().ok,false);assert.equal(sim.unmoor().ok,false);sim.step(.1,{throttle:1});assert.equal(sim.state.engine,false);assert.equal(sim.state.launchStage,'stored');assert.equal(sim.state.speed,0);
});

test('starting a new trip from a paid save needs a new rental while continuing that save does not',()=>{
 const sim=begin();counter(sim);sim.launchBoat();run(sim,24.1);const saved=sim.snapshot();delete saved.dayCycleVersion;const continued=new PixelSimulation({saved,now});continued.start(true);assert.equal(continued.state.rentalPaid,true);assert.equal(continued.state.launchStage,'afloat');assert.equal(continued.state.profile.credits,85);
 const fresh=new PixelSimulation({saved,now});fresh.start(false);assert.equal(fresh.state.rentalPaid,false);assert.equal(fresh.state.launchStage,'stored');assert.equal(fresh.state.profile.credits,85);counter(fresh);fresh.launchBoat();assert.equal(fresh.state.profile.credits,70);assert.equal(rentalTransactions(fresh).length,2);
});

test('a poor player cannot overwrite a usable paid voyage by starting an unaffordable new trip',()=>{
 const original=begin(0).snapshot();delete original.dayCycleVersion;
 for(const previous of[{version:5,rentalPaid:true,mode:'walk',launchStage:'afloat'},{version:4,mode:'boat',launchStage:'afloat'},{version:4,mode:'walk',launchStage:'lowering',launchProgress:.6}]){
  const saved={...original,...previous},before=JSON.stringify(saved),sim=new PixelSimulation({saved,now});assert.equal(hasSavedBoatRental(saved),true);const result=sim.start(false);assert.equal(result.ok,false);assert.match(result.message,/继续上次已租航程/);assert.equal(sim.state.mode,'intro');assert.equal(sim.state.profile.credits,0);assert.equal(JSON.stringify(saved),before,'failed new trip preserves the old save');
  assert.equal(sim.start(true).ok,true);assert.equal(sim.state.rentalPaid,true);assert.equal(sim.state.profile.credits,0);assert.equal(sim.state.launchStage,previous.launchStage);if(previous.launchStage==='lowering')assert.equal(sim.state.launchProgress,.6);
 }
 const unpaid={...original,version:4,launchStage:'stored'},sim=new PixelSimulation({saved:unpaid,now});assert.equal(hasSavedBoatRental(unpaid),false);assert.equal(sim.start(false).ok,true);counter(sim);assert.equal(sim.launchBoat().ok,false);assert.equal(sim.state.profile.credits,0);assert.equal(sim.state.rentalPaid,false);
});


test('repeatable starter supplies preserve unpaid rental funds and never refill a worn installed rig',()=>{
 for(const id of ['bait','tackle']){
  const sim=begin(26);counter(sim);sim.state.profile.stock.squid=0;sim.state.profile.rigStock.bottom=[];const before=structuredClone(sim.state.profile);assert.equal(sim.buyGear(id).ok,false);assert.deepEqual(sim.state.profile,before);
  sim.state.profile.credits=27;assert.equal(sim.buyGear(id).ok,true);assert.equal(sim.state.profile.credits,15);assert.equal(sim.state.profile.stock.squid,id==='bait'?12:0);assert.equal(sim.state.profile.rigStock.bottom.length,id==='tackle'?1:0);assert.equal(sim.launchBoat().ok,true);assert.equal(sim.state.profile.credits,0);assert.equal(sim.buyGear(id).ok,false);
 }
});
