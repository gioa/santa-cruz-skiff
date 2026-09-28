import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,FISHING_SPOTS,HARBOR}=await import('../dist/pixel-sim.js');
const {createProfile,GEAR_CATALOG}=await import('../dist/equipment.js');
const {inventorySlots}=await import('../dist/pixel-inventory.js');
const {toGPS,fromGPS,MAP_BOUNDS}=await import('../dist/pixel-geography.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {clearWaterSegment}=await import('../dist/pixel-navigation.js');
function afloat(){
 const sim=new PixelSimulation({rng:()=>.99,patrolRng:()=>.99});sim.start();
 sim.state.profile.owned.push('gps','trolling_motor');sim.state.packed.push('gps','trolling_motor');
 const {x,z}=FISHING_SPOTS[1];Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',loaded:true,moored:false,boatX:x,boatZ:z});syncVessel(sim.vessel,{x,z,heading:0,clearMotion:true});return sim;
}
for(const owned of [['gps'],['nautical_chart'],['gps','nautical_chart']])for(const enabled of [false,true])test(`legacy ${owned.join('+')} / enabled ${enabled}: one device, both features, no charge`,()=>{
 const sim=afloat(),save=sim.snapshot();save.profile.credits=73;delete save.profile.navigationVersion;save.profile.owned=save.profile.owned.filter(id=>!['nautical_chart','gps','trolling_motor'].includes(id)).concat(owned);save.packed=save.packed.filter(id=>!['nautical_chart','gps','trolling_motor'].includes(id)).concat(enabled?owned:[]);save.profile.inventorySlots={pack:[null,...owned,'rod']};
 const restored=new PixelSimulation({saved:save});restored.start(true);
 assert.equal(restored.state.profile.credits,73);assert.equal(restored.state.profile.owned.filter(id=>id==='gps').length,1);assert.ok(!restored.state.profile.owned.includes('nautical_chart'));assert.ok(!restored.hasGear('trolling_motor'));
 assert.equal(restored.navigationInstruments().chart,enabled);assert.equal(restored.navigationInstruments().gps,enabled);assert.equal(restored.stats.hasGPS,enabled);assert.equal(restored.stats.hasChart,enabled);
 const slots=inventorySlots(restored.state.profile).pack;assert.equal(slots[1],'gps');assert.equal(slots.filter(id=>id==='gps').length,1);assert.ok(!slots.includes('nautical_chart'));
 const again=new PixelSimulation({saved:restored.snapshot()});again.start(true);assert.deepEqual(again.state.packed,restored.state.packed);assert.equal(again.state.profile.credits,73);
});
test('GPS includes chart, paper remains separate; starter does not own it and sounder stays independent',()=>{
 assert.equal(GEAR_CATALOG.filter(g=>g.id==='gps').length,1);assert.equal(GEAR_CATALOG.filter(g=>g.id==='nautical_chart').length,1);assert.ok(!createProfile().owned.includes('nautical_chart'));
 const sim=afloat();assert.ok(sim.navigationInstruments().gpsPosition);assert.equal(sim.navigationInstruments().sounder,false);assert.equal(sim.navigationInstruments().depth,null);
});
test('chart GPS pin follows real physics all the way to arbitrary open-water destination',()=>{
 const sim=afloat(),s=sim.state,start={x:s.boatX,z:s.boatZ},gps=toGPS(start.x+80,start.z+35),target=fromGPS(gps.lon,gps.lat);
 const before=sim.snapshot(),plan=sim.planWaypoint(target);assert.ok(plan.ok);assert.deepEqual(sim.snapshot(),before,'preview is read-only');
 assert.ok(sim.selectWaypoint(target).ok);assert.ok(Math.hypot(s.boatX-target.x,s.boatZ-target.z)>80,'no teleport');
 for(let i=0;i<1800&&s.waypoint;i++)sim.step(.1);
 assert.equal(s.waypoint,null,'reached pin');assert.ok(Math.hypot(s.boatX-target.x,s.boatZ-target.z)<15);assert.ok(s.sailed>40);assert.equal(s.throttle,0);assert.deepEqual(sim.navigationInstruments().gpsPosition,toGPS(s.boatX,s.boatZ));
});
test('invalid, land and outside-map pins cannot replace a valid route',()=>{
 const sim=afloat();assert.ok(sim.selectWaypoint(FISHING_SPOTS[2]).ok);
 for(const target of [null,{x:NaN,z:0},{x:0,z:0},{x:MAP_BOUNDS.maxX+20,z:0},{x:HARBOR.counterX,z:HARBOR.counterZ}]){
  const route=structuredClone(sim.state.waterRoute),pin=structuredClone(sim.state.waypoint);assert.equal(sim.selectWaypoint(target).ok,false);assert.deepEqual(sim.state.waterRoute,route);assert.deepEqual(sim.state.waypoint,pin);
 }
});
test('chart route around the wharf clears every segment; fishing and shore states reject departure',()=>{
 const sim=afloat(),s=sim.state;Object.assign(s,{boatX:-80,boatZ:100});syncVessel(sim.vessel,{x:-80,z:100,heading:0,clearMotion:true});
 const plan=sim.planWaypoint({x:80,z:100});assert.ok(plan.ok);assert.ok(plan.route.length>1);let last={x:s.boatX,z:s.boatZ};for(const point of plan.route){assert.ok(clearWaterSegment(last,point));last=point;}
 s.fishState='waiting';s.rodMount='hand';assert.equal(sim.planWaypoint(FISHING_SPOTS[1]).ok,false);s.rodMount='port';assert.equal(sim.planWaypoint(FISHING_SPOTS[1]).ok,true);
 s.mode='walk';assert.equal(sim.planWaypoint(FISHING_SPOTS[1]).ok,false);assert.deepEqual(sim.navigationInstruments().gpsPosition,toGPS(s.playerX,s.playerZ));
});
