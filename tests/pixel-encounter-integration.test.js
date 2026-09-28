import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,PIXEL_FISH}=await import('../dist/pixel-sim.js');
const {fromGPS}=await import('../dist/pixel-geography.js');
const {fishEncounter}=await import('../dist/pixel-fish-ecology.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
function ready(rig='bottom'){
 const sim=new PixelSimulation({rng:()=>.5,patrolRng:()=>.9,conditions:{windKnots:0,currentMps:0},now:()=>new Date('2026-09-27T16:00:00Z')});sim.start();
 Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
 if(rig==='feather40'){assert.ok(sim.buyGear('rig_feather40').ok);assert.ok(sim.replaceRig(undefined,'feather40').ok);}
 Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,boatX:-60,boatZ:-80,anchor:false});syncVessel(sim.vessel,{x:-60,z:-80,heading:0,clearMotion:true});
 return sim;
}

test('lure position samples actual mapped bottom and never inherits the nearest named reef',()=>{
 const sim=ready();
 for(const [lon,lat,kind,mapped]of[[-122.0288,36.9505,'reef',true],[-122.0118,36.9585,'sand',true],[-121.9845,36.9515,'unknown',false]]){
  const p=fromGPS(lon,lat);sim.state.bobber={...p,height:-2};sim.state.lureDepth=2;const env=sim.rigEnvironment();
  assert.equal(env.habitat,kind);assert.equal(env.substrateMapped,mapped);assert.ok(env.bottomDepth>0);
 }
 sim.state.bobber={x:-60,z:-80,height:-2};assert.equal(sim.rigEnvironment().habitat,'sand');assert.equal(sim.rigEnvironment().substrateContextual,true);
});

test('the simulation integrates species encounter hazards instead of generic attraction seconds',()=>{
 const sim=ready();assert.ok(sim.lowerRig().ok);sim.state.biteAt=Infinity;sim.state.snagThreshold=Infinity;
 let expected=0;
 for(let i=0;i<300;i++){
  const env=sim.rigEnvironment();sim.step(.1);expected+=.1*fishEncounter(PIXEL_FISH,{...env,lureDepth:sim.state.lureDepth}).ratePerSecond;
 }
 assert.ok(sim.state.biteTimer>0&&sim.state.biteTimer<1,'30 real seconds must not become 30 units of generic attraction');
 assert.ok(Math.abs(sim.state.biteTimer-expected)<.005,'hazard integration uses the same local fish model as species selection');
});

test('actual bait form and ground drift are distinct from relative hydrodynamic flow',()=>{
 const sim=ready();Object.assign(sim.vessel,{vx:.3,vz:.4});Object.assign(sim.conditions,{currentX:.6,currentZ:.4});sim.state.anchor=false;
 let env=sim.rigEnvironment();assert.equal(env.bait,'squid');assert.equal(env.baitForm,'strip');assert.equal(env.month,9);assert.equal(env.driftSpeedMps,.5);assert.equal(env.currentMps,.3);assert.equal(env.boatSpeedMps,0,'relative flow already includes vessel motion');
 sim.state.anchor=true;env=sim.rigEnvironment();assert.equal(env.driftSpeedMps,.5,'a retired anchor flag cannot remove the actual seabed search drift');assert.equal(env.anchored,false);
 const feather=ready('feather40');env=feather.rigEnvironment();assert.equal(env.bait,'feather');assert.equal(env.baitTipped,false);assert.equal(env.tipFreshness,0);
 assert.ok(feather.replaceBait(undefined,'squid').ok);env=feather.rigEnvironment();assert.equal(env.bait,'squid');assert.equal(env.baitTipped,true);assert.equal(env.tipFreshness,1);
});


test('encounter month changes at Santa Cruz midnight, not UTC midnight',()=>{
 const sim=ready();sim.state.dayStartAt='2026-09-30T13:00:00.000Z';
 sim.state.gameElapsed=13*3600;assert.equal(sim.rigEnvironment().month,9);
 sim.state.gameElapsed=18*3600;assert.equal(sim.rigEnvironment().month,10);
});
