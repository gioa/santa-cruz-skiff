import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createVesselState,stepVessel} from '../dist/vessel-physics.js';
import {trollingMotorForce} from '../dist/pixel-trolling-motor.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
function afloat(gear=[]){const sim=new PixelSimulation({rng:()=>.99,patrolRng:()=>.99});sim.start();const p=FISHING_SPOTS[1];Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,boatX:p.x,boatZ:p.z});Object.assign(sim.vessel,{x:p.x,z:p.z});sim.state.profile.owned.push(...gear);sim.state.packed.push(...gear);return sim;}
function run(sim,t,input={}){for(let i=0;i<t*10;i++)sim.step(.1,input);}
test('paper, GPS and motor have independent equipment-gated capabilities',()=>{
 for(const gear of [[],['nautical_chart'],['gps'],['trolling_motor'],['gps','trolling_motor'],['nautical_chart','trolling_motor']]){
  const sim=afloat(gear),n=sim.navigationInstruments();assert.equal(n.chart,gear.includes('nautical_chart')||gear.includes('gps'));assert.equal(Boolean(n.gpsPosition),gear.includes('gps'));assert.equal(n.autopilot,gear.includes('gps')&&gear.includes('trolling_motor'));assert.equal(sim.planWaypoint(FISHING_SPOTS[2]).ok,n.autopilot);assert.equal(sim.toggleTrollingMotor().ok,gear.includes('trolling_motor'));
 }
});
test('motor counters current through finite thrust; stronger flow can exceed its capacity',()=>{
 const simulate=(mode,current)=>{const v=createVesselState();for(let t=0;t<90;t+=.05){const m=trollingMotorForce(v,{mode,current});assert.ok(m.thrust<=245.000001);stepVessel(v,{dt:.05,currentX:current.x,currentZ:current.z,motorForceX:m.x,motorForceZ:m.z});}return Math.hypot(v.x,v.z);};
 const mild={x:0,z:.5},drift=simulate('off',mild),held=simulate('hold',mild),overwhelmed=simulate('hold',{x:0,z:2.5});assert.ok(drift>20);assert.ok(held<2);assert.ok(overwhelmed>10);
});
test('GPS route uses the electric motor, arrives, and then holds the destination',()=>{
 const sim=afloat(['gps','trolling_motor']),s=sim.state,target={x:s.boatX+60,z:s.boatZ+25};assert.ok(sim.selectWaypoint(target).ok);run(sim,160);assert.equal(s.waypoint,null);assert.equal(s.motorMode,'hold');assert.equal(s.throttle,0);assert.ok(Math.hypot(s.boatX-target.x,s.boatZ-target.z)<3);assert.ok(s.sailed>40);assert.ok(Math.abs(sim.vessel.thrustN)<.01,'outboard does not propel autopilot');run(sim,30);assert.ok(Math.hypot(s.boatX-target.x,s.boatZ-target.z)<3);
});
test('manual takeover, equipment removal, pause and resume cannot revive an old route',()=>{
 const sim=afloat(['gps','trolling_motor']),s=sim.state,target={x:s.boatX+80,z:s.boatZ+30};sim.selectWaypoint(target);run(sim,4);sim.pause(true);const p=[s.boatX,s.boatZ];run(sim,3);assert.deepEqual([s.boatX,s.boatZ],p);sim.pause(false);run(sim,1,{steer:.5});assert.equal(s.motorMode,'off');assert.equal(s.waypoint,null);
 sim.selectWaypoint(target);sim.equip('gps');assert.equal(s.waypoint,null);assert.equal(s.motorMode,'hold');assert.equal(s.motorTarget,null);sim.equip('trolling_motor');assert.equal(s.motorMode,'off');assert.equal(s.motorThrustN,0);
 sim.equip('gps');sim.equip('trolling_motor');sim.selectWaypoint(target);const restored=new PixelSimulation({saved:sim.snapshot()});restored.start(true);assert.equal(restored.state.motorMode,'off');assert.equal(restored.state.waypoint,null);assert.ok(restored.hasGear('gps'));assert.ok(restored.hasGear('trolling_motor'));
});
test('new paper-map saves stay paper through reload and never acquire GPS',()=>{
 const sim=afloat(['nautical_chart']),restored=new PixelSimulation({saved:sim.snapshot()});restored.start(true);assert.ok(restored.hasGear('nautical_chart'));assert.equal(restored.hasGear('gps'),false);assert.equal(restored.navigationInstruments().gpsPosition,null);assert.equal(restored.navigationInstruments().autopilot,false);
});
