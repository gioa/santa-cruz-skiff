import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {assessCatchLedger}=await import('../dist/fishing-regulations.js');
const now=()=>new Date('2026-09-27T19:00:00Z');
const run=(sim,seconds)=>{for(let t=0;t<seconds-1e-8;t+=.1)sim.step(Math.min(.1,seconds-t));};
const until=(sim,predicate,seconds=20)=>{for(let t=0;t<seconds&&!predicate(sim.state);t+=.1)sim.step(.1);assert.ok(predicate(sim.state));};
const fish=(id,length=60,extra={})=>({speciesId:'california_halibut',name:'加州大比目鱼',latin:'Paralichthys californicus',catchId:id,length,kg:1,kept:true,caughtAt:'2026-09-27T13:00:00Z',caughtGPS:{lat:36.9505,lon:-122.0288},hookCount:1,lineCount:1,hasDescendingDevice:true,landingNetDiameterInches:20,...extra});
function ready(credits=300){const sim=new PixelSimulation({now,patrolRng:()=>.99999,profile:{version:2,credits}});sim.start();Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',loaded:true,moored:false,boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,heading:0,speed:0});syncVessel(sim.vessel,{x:HARBOR.boatX,z:HARBOR.boatZ,heading:0,clearMotion:true});return sim;}
const counter=sim=>Object.assign(sim.state,{mode:'walk',playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
function landing(sim){assert.equal(sim.dock().ok,true);until(sim,s=>s.mode==='walk');assert.equal(sim.state.inspection.reason,'landing');assert.equal(sim.state.inspection.phase,'checking');}

test('every actual landing starts exactly one mandatory check, independent of RNG, water routes and cargo legality',()=>{
 for(const cargo of[[],[fish('legal')],[fish('small',40)]]){
  const sim=ready();sim.patrol.isWater=()=>false;sim.state.catches=cargo;landing(sim);const id=sim.state.inspection.id;
  assert.equal(sim.state.lastInspection,null);run(sim,2);counter(sim);assert.equal(sim.trade().ok,false);assert.equal(sim.state.inspection.id,id);assert.ok(sim.state.inspection.elapsed>=2);
  until(sim,s=>s.landingInspection?.status==='complete');assert.equal(sim.state.lastInspection.id,id);run(sim,20);assert.equal(sim.state.landingInspectionSerial,1);
  Object.assign(sim.state,{mode:'boat',moored:false});landing(sim);assert.notEqual(sim.state.inspection.id,id,'each new completed docking gets its own check');
 }
});

test('undersized halibut is retained freely, confiscated once on landing and never exchanged for credits',()=>{
 const sim=ready(),small=fish('under',40),legal=fish('legal');sim.state.catches=[small,legal];assert.ok(assessCatchLedger(sim.state.catches).violations.some(v=>v.code==='undersize'));
 const before=sim.state.profile.credits;landing(sim);counter(sim);assert.equal(sim.trade().action,'inspection-required');assert.equal(small.settled,undefined);
 until(sim,s=>s.landingInspection?.status==='complete');assert.equal(small.confiscated,true);assert.equal(small.reward,0);assert.equal(legal.confiscated,true);assert.equal(legal.reward,0);assert.equal(sim.state.lastInspection.confiscated.length,2);assert.match(sim.state.lastInspection.findings[0].detail,/15.7 in.*22 in/);assert.equal(sim.state.profile.credits,before-100);assert.equal(sim.state.lastInspection.fine,100);assert.equal(sim.state.lastInspection.paid,100);assert.equal(sim.state.lastInspection.debt,0);
 const exchange=sim.trade();assert.equal(exchange.count,0);assert.equal(exchange.total,0);assert.equal(sim.state.profile.transactions.some(t=>t.kind==='fish_trade'&&t.catchId===small.catchId),false);const earned=sim.state.profile.credits;
 assert.equal(sim.trade().total,0);assert.equal(sim.state.profile.credits,earned);assert.equal(sim.state.profile.transactions.filter(t=>t.kind==='inspection_fine').length,1);
});

test('old counter saves, rescue and stale clearance cannot bypass mandatory pre-trade inspection',()=>{
 for(const route of['counter','rescue','stale']){
  const sim=ready();sim.state.catches=[fish(route,40)];if(route==='rescue')sim.rescue();else counter(sim);
  if(route==='stale'){sim.state.landingInspection={id:'old',status:'complete'};sim.state.catches[0].landingInspectionId='old';}
  counter(sim);const first=sim.trade();assert.equal(first.ok,false);assert.equal(first.total,0);assert.equal(sim.state.inspection.reason,'landing');const id=sim.state.inspection.id;run(sim,3);sim.trade();assert.equal(sim.state.inspection.id,id,'pressing trade cannot reset inspection');
  const resumed=new PixelSimulation({saved:sim.snapshot(),now,patrolRng:()=>.99});resumed.start(true);counter(resumed);assert.equal(resumed.trade().ok,false);until(resumed,s=>s.landingInspection?.status==='complete');assert.equal(resumed.state.catches[0].confiscated,true);
  const paid=resumed.state.profile.credits,last=structuredClone(resumed.state.lastInspection),again=new PixelSimulation({saved:resumed.snapshot(),now});again.start(true);counter(again);run(again,12);assert.equal(again.trade().total,0);assert.equal(again.state.profile.credits,paid);assert.deepEqual(again.state.lastInspection,last);
 }
});

test('legal checked cargo stays cleared across reload while newly added cargo requires a new check',()=>{
 const sim=ready();sim.state.catches=[fish('first')];landing(sim);until(sim,s=>s.landingInspection?.status==='complete');const serial=sim.state.landingInspectionSerial;
 const resumed=new PixelSimulation({saved:sim.snapshot(),now});resumed.start(true);counter(resumed);assert.equal(resumed.trade().count,1);assert.equal(resumed.state.landingInspectionSerial,serial);
 resumed.state.catches.push(fish('second',61,{caughtAt:'2026-09-27T13:10:00Z'}));assert.equal(resumed.trade().ok,false);assert.equal(resumed.state.landingInspectionSerial,serial+1);until(resumed,s=>s.landingInspection?.status==='complete');assert.equal(resumed.trade().count,1);
});

test('fine shortfalls persist without negative credits and later legitimate earnings repay debt first',()=>{
 const sim=ready(25);sim.state.catches=[fish('small',40),fish('legal')];landing(sim);until(sim,s=>s.landingInspection?.status==='complete');assert.equal(sim.state.profile.credits,0);assert.equal(sim.state.profile.fineDebt,75);assert.equal(sim.state.lastInspection.paid,25);
 const resumed=new PixelSimulation({saved:sim.snapshot(),now});resumed.start(true);counter(resumed);assert.equal(resumed.trade().count,0);resumed.state.catches.push(fish('new-legal',61,{caughtAt:'2026-09-28T14:00:00Z'}));assert.equal(resumed.trade().ok,false);until(resumed,s=>s.landingInspection?.status==='complete');const r=resumed.trade();assert.equal(r.count,1);assert.equal(r.finePayment,Math.min(75,r.grossTotal));assert.equal(r.total,r.grossTotal-r.finePayment);assert.equal(resumed.state.profile.fineDebt,75-r.finePayment);assert.equal(resumed.state.profile.credits,r.total);
 const debt=resumed.state.profile.fineDebt;resumed.state.fish=fish('released',70,{kept:false});resumed.state.fishState='landed';const result=resumed.releaseCatch();assert.equal(result.ok,true);assert.ok(resumed.state.profile.fineDebt<=debt);assert.match(result.message,/入账/);assert.equal(resumed.state.profile.transactions.filter(t=>t.kind==='inspection_fine').length,1);
});

test('paused shore checks preserve progress and impose no penalty before the result',()=>{
 const sim=ready();sim.state.catches=[fish('small',40)];landing(sim);run(sim,3);const elapsed=sim.state.inspection.elapsed,balance=sim.state.profile.credits;sim.pause(true);run(sim,20);assert.equal(sim.state.inspection.elapsed,elapsed);assert.equal(sim.state.profile.credits,balance);assert.equal(sim.state.catches[0].confiscated,undefined);sim.pause(false);until(sim,s=>s.landingInspection?.status==='complete');assert.equal(sim.state.profile.credits,balance-100);
});


test('water patrol confiscates all carried fish but preserves released and previously settled catches',()=>{
 const sim=ready();sim.patrol.isWater=()=>true;
 const small=fish('small',40),legal=fish('legal'),released=fish('released',60,{kept:false}),sold=fish('sold',60,{settled:true,caughtAt:'2026-09-26T13:00:00Z'});
 sim.state.catches=[small,legal,released,sold];sim.state.inspection={id:'water-test',reason:'water',phase:'checking',x:sim.state.boatX+11,z:sim.state.boatZ,side:1,elapsed:7.9};
 sim.stepPatrol(.2);const report=sim.state.lastInspection;
 assert.equal(report.reason,'water');assert.equal(report.fine,100);assert.equal(report.confiscated.length,2);assert.equal(legal.confiscated,true);assert.equal(released.confiscated,undefined);assert.equal(sold.confiscated,undefined);
 assert.equal(report.findings.length,1);assert.equal(report.acknowledged,false);
 const resumed=new PixelSimulation({saved:sim.snapshot(),now});resumed.start(true);assert.deepEqual(resumed.state.lastInspection,report);run(resumed,20);assert.equal(resumed.state.profile.transactions.filter(t=>t.kind==='inspection_fine').length,1);
});
