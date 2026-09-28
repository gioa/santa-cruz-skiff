import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {castRange,planCast,stepCast}=await import('../dist/pixel-casting.js');
const {rodTipPosition,stepFishingLine,MAX_PAID_LINE_METERS}=await import('../dist/pixel-fishing-physics.js');
const {boatActions}=await import('../dist/pixel-boat-actions.js');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,(a.height||0)-(b.height||0));
function ready(){const sim=new PixelSimulation({rng:()=>.5,patrolRng:()=>.99,conditions:{currentMps:0}});sim.start();const p=FISHING_SPOTS[1];Object.assign(sim.state,{mode:'boat',boatX:p.x,boatZ:p.z,heading:0,launchStage:'afloat',rentalPaid:true,moored:false,loaded:true});syncVessel(sim.vessel,{...p,heading:0,clearMotion:true});return sim;}
function splash(sim,dt=.05){for(let t=0;t<5&&sim.state.fishState==='flight';t+=dt)sim.step(dt);assert.equal(sim.state.fishState,'sinking');}
test('tap cast flies to a chosen water point; pays actual diagonal line incrementally without duplicating bait',()=>{
 const sim=ready(),s=sim.state,target={x:s.boatX-15,z:s.boatZ+4},stock=structuredClone(s.profile.stock);assert.ok(sim.castTo(target).ok);assert.equal(s.fishState,'flight');assert.ok(s.paidLineMeters<1);let last=s.paidLineMeters,air=false;
 for(let i=0;i<80&&s.fishState==='flight';i++){sim.step(.025);assert.ok(s.paidLineMeters>=last);assert.ok(s.paidLineMeters<=MAX_PAID_LINE_METERS);assert.ok(s.paidLineMeters>=dist(s.rodTip,s.bobber)-1e-6);if(s.bobber.height>3)air=true;last=s.paidLineMeters;}
 assert.ok(air);assert.equal(s.fishState,'sinking');assert.deepEqual({x:s.bobber.x,z:s.bobber.z},target);assert.equal(s.bobber.height,0);assert.equal(s.floatPosition,null);assert.ok(Math.abs(s.paidLineMeters-dist(s.rodTip,s.bobber)-.08)<.02);assert.deepEqual(s.profile.stock,stock);assert.equal(s.casts,1);
});
test('spool length depends on three-dimensional tackle position, not horizontal distance plus full seabed depth',()=>{
 const sim=ready(),s=sim.state;sim.castTo({x:s.boatX-12,z:s.boatZ});splash(sim);const splashLine=s.paidLineMeters;
 s.biteAt=Infinity;s.snagThreshold=Infinity;for(let i=0;i<200;i++)Object.assign(s,stepFishingLine(s,{dt:.05,environment:{bottomDepth:40},current:{x:0,z:0}}));
 assert.ok(s.lureDepth>2);assert.ok(s.paidLineMeters>splashLine);assert.ok(s.paidLineMeters<25);assert.ok(Math.abs(s.paidLineMeters-dist(s.rodTip,s.bobber))<.2);
 const paid=s.paidLineMeters;s.reelMode='brake';for(let i=0;i<100;i++)Object.assign(s,stepFishingLine(s,{dt:.05,environment:{bottomDepth:40}}));assert.equal(s.paidLineMeters,paid);assert.ok(dist(s.rodTip,s.bobber)<=paid+1e-6);
 s.crankRate=1.2;for(let i=0;i<80;i++)Object.assign(s,stepFishingLine(s,{dt:.05,environment:{bottomDepth:40}}));assert.ok(s.paidLineMeters<paid-2);
});
test('far taps use a finite rig/rod range, keeping the requested bearing',()=>{
 const sim=ready(),s=sim.state;for(const rig of ['bottom','slider','jig','float','dropper','sabiki','feather40']){const state={...s,rig,rigWeightGrams:undefined},p=planCast(state,{x:s.boatX-1000,z:s.boatZ});assert.ok(p.ok&&p.limited);assert.equal(p.flight.end.z,s.boatZ);assert.ok(Math.abs(Math.hypot(p.flight.end.x-s.boatX,p.flight.end.z-s.boatZ)-castRange(state))<1e-8);assert.ok(castRange(state)<=32);}
 assert.ok(castRange({...s,rig:'jig',rigWeightGrams:42})>castRange({...s,rig:'feather40',rigWeightGrams:113}));
});
test('land, pier corridors, invalid and inside-hull taps do not deploy a rig',()=>{
 const sim=ready(),s=sim.state,before=s.casts;for(const target of [null,{x:NaN,z:0},{x:s.boatX,z:s.boatZ},{x:0,z:0}])assert.equal(sim.castTo(target).ok,false);assert.equal(s.fishState,'idle');assert.equal(s.casts,before);
 const p=planCast({...s,boatX:0,boatZ:0},{x:20,z:0},{isWater:(x)=>x<5||x>10});assert.equal(p.ok,false);
});
test('casts cannot start while mounted, driving, moving fast, fighting, paused, unpaid or missing bait',()=>{
 for(const patch of [{rodMount:'port'},{engine:true,throttle:.2},{speed:1.1},{fishState:'fight'},{paused:true},{rentalPaid:false}]){const sim=ready();Object.assign(sim.state,patch);assert.equal(sim.castTo({x:sim.state.boatX-12,z:sim.state.boatZ}).ok,false);assert.equal(sim.state.casts,0);}
 const sim=ready();sim.state.baitOnHook.condition=0;assert.equal(sim.castTo({x:sim.state.boatX-12,z:sim.state.boatZ}).ok,false);
});
test('flight blocks helm and repeat casts; pausing or old release calls do not erase the airborne tackle',()=>{
 const sim=ready(),s=sim.state,target={x:s.boatX-14,z:s.boatZ};sim.castTo(target);sim.step(.1);const flight=structuredClone(s.castFlight),line=s.paidLineMeters;sim.pause(true);sim.step(.1);assert.deepEqual(s.castFlight,flight);assert.equal(s.paidLineMeters,line);sim.pause(false);assert.equal(sim.releaseCast().ok,false);assert.deepEqual(s.castFlight,flight);assert.equal(sim.castTo(target).ok,false);assert.equal(s.casts,1);splash(sim);
 const a=boatActions({...s,fishState:'flight'},{canLower:true});assert.equal(a.cast,false);assert.equal(a.reel,false);assert.equal(a.engine,false);assert.equal(a.mount,false);assert.equal(a.reelInstrument,true);
});
test('close and far casts reach their intended surface location consistently at different frame rates',()=>{
 for(const range of [4,12,22])for(const dt of [1/60,.1,.25]){const sim=ready(),s=sim.state,target={x:s.boatX-range,z:s.boatZ};sim.castTo(target);splash(sim,dt);assert.ok(Math.hypot(s.bobber.x-target.x,s.bobber.z-target.z)<1e-6);assert.ok(s.paidLineMeters>=dist(s.rodTip,s.bobber));assert.ok(s.paidLineMeters<range+3);}
});
test('cast presentation stays at the real water endpoint when flight becomes a submerged rig',async()=>{
 const {getRodCurve,getFishingLine}=await import('../dist/pixel-rod-geometry.js');const sim=ready(),s=sim.state;sim.castTo({x:s.boatX-15,z:s.boatZ});const f=structuredClone(s.castFlight),rod=getRodCurve(s),project=(x,z)=>({x:x*6,y:z*6});
 const air={...s,castFlight:{...f,t:f.duration},bobber:{...f.end}};const airborne=getFishingLine(air,rod,{project});const wet={...air,fishState:'sinking',castFlight:null,lineEntry:{...f.end}};const submerged=getFishingLine(wet,rod,{project});assert.deepEqual(airborne.end,submerged.end);assert.equal(submerged.showFloat,false);
});
test('reeling a cast back returns to idle and vertical lowering still starts beside the tip',()=>{
 const sim=ready(),s=sim.state;sim.castTo({x:s.boatX-10,z:s.boatZ});splash(sim);s.biteAt=Infinity;s.snagThreshold=Infinity;for(let i=0;i<1600&&s.fishState!=='idle';i++)sim.step(.05,{reel:1.2});assert.equal(s.fishState,'idle');assert.equal(s.paidLineMeters,0);assert.equal(s.castLine,false);assert.ok(sim.lowerRig().ok);assert.equal(s.castLine,false);assert.equal(s.bobber.x,s.rodTip.x);assert.equal(s.bobber.z,s.rodTip.z);
});
