import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSingleLeverControl,leverForThrottle} from '../dist/pixel-single-lever.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,FISHING_SPOTS,HARBOR}=await import('../dist/pixel-sim.js');

function until(sim,predicate,seconds=90,input=()=>({})){for(let t=0;t<seconds&&!predicate();t+=.1)sim.step(.1,input());assert.ok(predicate(),JSON.stringify(sim.publicState()));}
function depart(){
 const sim=new PixelSimulation({profile:{version:2,credits:400},patrolRng:()=>.9});sim.start();sim.walkTo('counter');until(sim,()=>!sim.state.autoWalk);assert.equal(sim.atCounter,true);
 assert.equal(sim.buyGear('nautical_chart').ok,true);assert.equal(sim.equip('nautical_chart').ok,true);assert.equal(sim.launchBoat().ok,true);assert.equal(sim.walkTo('boarding').ok,true);until(sim,()=>!sim.state.autoWalk&&sim.state.launchStage==='afloat');assert.equal(sim.board().ok,true);assert.equal(sim.unmoor().ok,true);return sim;
}
function cruise(sim,helm,seconds){for(let t=0;t<seconds-1e-8;t+=.1)sim.step(.1,{steer:0,...helm.input()});}

test('natural launch, retained push/pull lever, neutral coasting and automatic navigation hand off without hidden thrust',()=>{
 const sim=depart(),helm=createSingleLeverControl();assert.equal(sim.toggleEngine().ok,true);assert.equal(helm.setLever(leverForThrottle(.62),sim.state.speed).ok,true);helm.setSteer(.04);const retained=helm.snapshot();cruise(sim,helm,12);
 assert.deepEqual(helm.snapshot(),retained,'sampling frames does not release friction-set controls');assert.equal(sim.state.engine,true);assert.ok(Math.abs(sim.state.throttle-.62)<1e-9);assert.ok(sim.state.speed>1);assert.ok(Math.hypot(sim.state.boatX-HARBOR.boatX,sim.state.boatZ-HARBOR.boatZ)>8);
 const beforeNeutral=sim.state.speed;assert.equal(helm.setLever(0,sim.state.speed).ok,true);sim.step(.1,helm.input());assert.equal(sim.state.throttle,0);assert.ok(sim.state.speed>beforeNeutral*.9,'neutral does not erase hull momentum');assert.equal(sim.state.engine,true);
 // Selecting a route must relinquish the old manual throttle source first.
 helm.reset();assert.deepEqual(helm.input(),{});assert.equal(sim.selectWaypoint(FISHING_SPOTS[0]).ok,true);const destination=sim.state.waypoint;cruise(sim,helm,8);assert.equal(sim.state.waypoint,destination);assert.ok(sim.state.throttle>0);assert.equal(helm.state.manual,false);
 // A genuine hand movement takes ownership back from the automatic route.
 assert.equal(helm.setLever(0,sim.state.speed).ok,true);helm.setSteer(-.3);sim.step(.1,helm.input());assert.equal(sim.state.waypoint,null);assert.equal(sim.state.throttle,0);assert.ok(sim.state.speed>0,'taking manual control still leaves momentum');
});

test('automatic route survives menu pause/resume with no movement or extra time while paused',()=>{
 const sim=depart(),helm=createSingleLeverControl();assert.equal(sim.selectWaypoint(FISHING_SPOTS[1]).ok,true);cruise(sim,helm,10);const destination=sim.state.waypoint,position={x:sim.state.boatX,z:sim.state.boatZ},route=structuredClone(sim.state.waterRoute),elapsed=sim.state.elapsed,gameElapsed=sim.state.gameElapsed;
 // Menu/blur input cancellation resets the physical control source without
 // calling the model's manual setThrottle(), which would cancel this route.
 helm.reset();sim.pause(true);cruise(sim,helm,8);assert.deepEqual({x:sim.state.boatX,z:sim.state.boatZ},position);assert.equal(sim.state.elapsed,elapsed);assert.equal(sim.state.gameElapsed,gameElapsed);assert.deepEqual(sim.state.waterRoute,route);assert.equal(sim.state.waypoint,destination);
 helm.reset();sim.pause(false);cruise(sim,helm,8);assert.equal(sim.state.waypoint,destination);assert.ok(sim.state.elapsed>elapsed);assert.ok(Math.hypot(sim.state.boatX-position.x,sim.state.boatZ-position.z)>2);assert.ok(sim.state.throttle>0);assert.deepEqual(helm.input(),{});
});

test('interrupting manual helm idles the vessel and does not reapply the old retained throttle after resume',()=>{
 const sim=depart(),helm=createSingleLeverControl();sim.toggleEngine();helm.setLever(leverForThrottle(.8),sim.state.speed);cruise(sim,helm,8);const before=sim.state.speed;
 helm.reset();assert.equal(sim.setThrottle(0),true);sim.pause(true);cruise(sim,helm,2);assert.equal(sim.state.throttle,0);assert.equal(sim.state.speed,before);assert.deepEqual(helm.input(),{});
 sim.pause(false);cruise(sim,helm,.3);assert.equal(sim.state.throttle,0);assert.equal(sim.state.engine,true);assert.ok(sim.state.speed<before&&sim.state.speed>0);assert.equal(helm.state.gear,'N');assert.equal(helm.state.manual,false);
});
