import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stepBottomSnag,stepSnagAbrasion,BOTTOM_SNAG_GRACE_SECONDS} from '../dist/pixel-snag.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation}=await import('../dist/pixel-sim.js');
const {fromGPS}=await import('../dist/pixel-geography.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {boatActions}=await import('../dist/pixel-boat-actions.js');
const env={rig:'bottom',weightGrams:85,bottomDepth:10,habitat:'reef',currentMps:0,waveHeight:0,windKnots:0};
const atBottom=()=>({rigPresentation:{bottomContact:true},lureDepth:9.7,lineSlackMeters:.6,reelMode:'free',retrieveRate:0,bottomSlackSeconds:0,snagExposure:0,snagThreshold:Infinity});
function risk(seconds,patch={},dt=.1){const s=atBottom();for(let t=0;t<seconds-1e-8;t+=dt)Object.assign(s,stepBottomSnag(s,{...env,...patch},Math.min(dt,seconds-t)));return s;}
function ready(lon=-122.0288,lat=36.9505){
 const sim=new PixelSimulation({rng:()=>.8,patrolRng:()=>.9,conditions:{currentMps:0,windKnots:0,waveHeight:0}});sim.start();const p=fromGPS(lon,lat);
 Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',loaded:true,moored:false,boatX:p.x,boatZ:p.z});syncVessel(sim.vessel,{x:p.x,z:p.z,clearMotion:true});assert.ok(sim.lowerRig().ok);sim.state.biteAt=Infinity;return sim;
}
function run(sim,seconds,input={}){for(let t=0;t<seconds-1e-8;t+=.05)sim.step(.05,input);}

test('seabed contact has a grace period, accumulated risk is independent of frame interval',()=>{
 assert.equal(risk(BOTTOM_SNAG_GRACE_SECONDS).snagExposure,0);assert.ok(risk(12).snagExposure>0);
 assert.ok(Math.abs(risk(40,{},1/60).snagExposure-risk(40,{},.1).snagExposure)<1e-10);
 const s=risk(20);s.rigPresentation.bottomContact=false;Object.assign(s,stepBottomSnag(s,env,.1));assert.equal(s.bottomSlackSeconds,0);assert.equal(s.snagRiskPerSecond,0);
 s.rigPresentation.bottomContact=true;s.retrieveRate=.6;assert.equal(stepBottomSnag(s,env,.1).bottomSlackSeconds,0,'promptly winding removes the unattended-bottom condition');
});

test('mapped rock structure, prolonged slack, wind and waves control risk without inventing rocks on sand',()=>{
 const calm=risk(30),rough=risk(30,{waveHeight:2.5,windKnots:22}),flow=risk(30,{currentMps:.8});
 assert.ok(rough.snagExposure>calm.snagExposure*2);assert.ok(flow.snagExposure>calm.snagExposure);
 assert.ok(risk(30,{habitat:'mixed'}).snagExposure<calm.snagExposure);
 for(const habitat of['sand','mud','unknown'])assert.equal(risk(600,{habitat}).snagExposure,0,habitat);
 const lifted=atBottom();lifted.rigPresentation.bottomContact=false;lifted.lureDepth=7;assert.equal(stepBottomSnag(lifted,env,.2).snagRiskPerSecond,0);
});

test('abrasion needs loaded movement; backing off or releasing line arrests wear',()=>{
 const s={snagged:true,lineSlackMeters:0,rodLoadN:14,crankRate:1.2,snagAbrasion:.2};
 assert.ok(stepSnagAbrasion(s,{dt:.1}).snagAbrasion>.2);
 for(const patch of[{snagged:false},{lineSlackMeters:.5},{rodLoadN:.2},{crankRate:0}])assert.equal(stepSnagAbrasion({...s,...patch},{dt:.1}).snagAbrasion,.2);
 assert.ok(stepSnagAbrasion(s,{dt:.1,waveHeight:2}).snagAbrasion>stepSnagAbrasion(s,{dt:.1}).snagAbrasion);
});

test('rock snag keeps the physical rig attached until sustained winding abrades and breaks it',()=>{
 const sim=ready(),s=sim.state;assert.equal(sim.rigEnvironment().habitat,'reef');
 let touched=false,contactTime=0;
 for(let t=0;t<180&&!s.snagged;t+=.05){sim.step(.05);if(s.rigPresentation?.bottomContact){touched=true;contactTime+=.05;if(contactTime<4)assert.equal(s.snagged,false);}}
 assert.ok(touched);assert.ok(s.snagged);assert.equal(sim.rodConsumableStatus().rig.present,true);assert.equal(s.breaks,0);assert.equal(s.fishState,'waiting');
 const point={...s.snagPoint},spares=sim.rodConsumableStatus().rigStock.bottom,bait=sim.state.profile.stock.squid;
 assert.equal(sim.canOperateHelm,false);assert.equal(boatActions(s).drag,true);assert.equal(boatActions({...s,rodMount:'port'}).engine,false);assert.equal(sim.toggleEngine().ok,false);
 run(sim,2,{reel:1.2});assert.deepEqual(s.bobber,point);assert.ok(s.rodBend>.5);assert.ok(s.rodLoadN>5);assert.equal(s.fishState,'waiting');
 for(let t=0;t<100&&s.snagged;t+=.05)sim.step(.05,{reel:1.2});
 assert.equal(s.fishState,'idle');assert.equal(s.breaks,1);assert.equal(sim.rodConsumableStatus().rig.present,false);assert.equal(s.baitOnHook,null);assert.equal(s.rodLoadN,0);assert.equal(s.rodBend,0);assert.equal(s.snagPoint,null);assert.equal(s.snagAbrasion,0);assert.equal(s.paidLineMeters,0);
 assert.equal(sim.rodConsumableStatus().rigStock.bottom,spares,'loss does not silently fit another rig');assert.equal(s.profile.stock.squid,bait,'loss does not automatically consume another bait');assert.equal(sim.lowerRig().ok,false);
 assert.ok(sim.replaceRig(undefined,'bottom').ok);assert.ok(sim.replaceBait(undefined,'squid').ok);assert.ok(sim.lowerRig().ok);assert.equal(s.snagged,false);assert.equal(s.bottomSlackSeconds,0);
});

test('timely lifting avoids a rock snag and clean sand cannot trigger the rock snag lifecycle',()=>{
 const sim=ready(),s=sim.state;s.snagThreshold=.00001;for(let t=0;t<80&&!s.rigPresentation?.bottomContact;t+=.05)sim.step(.05);
 assert.ok(s.rigPresentation.bottomContact);run(sim,2,{reel:1.2});assert.equal(s.snagged,false);assert.equal(s.rigPresentation.bottomContact,false);sim.setReelMode('brake');run(sim,30);assert.equal(s.snagged,false);
 const sand=ready(-122.0118,36.9585);sand.state.snagThreshold=.00001;assert.equal(sand.rigEnvironment().habitat,'sand');run(sand,180);assert.equal(sand.state.snagged,false);assert.equal(sand.rodConsumableStatus().rig.present,true);
});

test('pause and resume do not replay a stale snag or duplicate lost supplies',()=>{
 const sim=ready(),s=sim.state;for(let t=0;t<180&&!s.snagged;t+=.05)sim.step(.05);assert.ok(s.snagged);run(sim,2,{reel:1.2});sim.pause(true);
 const before=sim.snapshot();run(sim,5,{reel:2});assert.equal(s.snagAbrasion,before.snagAbrasion);assert.equal(s.paidLineMeters,before.paidLineMeters);
 const resumed=new PixelSimulation({saved:sim.snapshot()});resumed.start(true);assert.equal(resumed.state.snagged,false);assert.equal(resumed.state.snagPoint,null);assert.equal(resumed.state.bottomSlackSeconds,0);assert.equal(resumed.state.snagAbrasion,0);assert.equal(resumed.state.rodLoadN,0);assert.equal(resumed.rodConsumableStatus().rig.present,true);
});
