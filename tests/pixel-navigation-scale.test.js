import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {NAVIGATION_COMPRESSION,NAVIGATION_HARBOR_RADIUS,NAVIGATION_OFFSHORE_RADIUS,navigationStepScale,navigationSubsteps,compressedDistance}=await import('../dist/pixel-navigation-scale.js');
const {PixelSimulation,HARBOR,FISHING_SPOTS,GEAR_CATALOG}=await import('../dist/pixel-sim.js');
const {hullPenetration}=await import('../dist/pixel-navigation.js');

const home={x:HARBOR.boatX,z:HARBOR.boatZ};
const offshore={mode:'boat',engine:true,fishState:'idle',speed:2,boatX:home.x-600,boatZ:home.z};
const near=(distance,speed=2)=>({...offshore,speed,boatX:home.x-distance});

test('offshore passage is half scale with a smooth full-scale berth transition',()=>{
  assert.equal(NAVIGATION_COMPRESSION,.5);
  assert.equal(navigationStepScale(near(0)),1);
  assert.equal(navigationStepScale(near(NAVIGATION_HARBOR_RADIUS)),1);
  assert.equal(navigationStepScale(near(NAVIGATION_OFFSHORE_RADIUS)),2);
  const midway=navigationStepScale(near((NAVIGATION_HARBOR_RADIUS+NAVIGATION_OFFSHORE_RADIUS)/2));
  assert.equal(midway,1.5);
  for(const edge of[NAVIGATION_HARBOR_RADIUS,NAVIGATION_OFFSHORE_RADIUS])assert.ok(Math.abs(navigationStepScale(near(edge-.001))-navigationStepScale(near(edge+.001)))<.00001);
  assert.equal(navigationStepScale({...offshore,speed:.35}),1);
  assert.equal(navigationStepScale({...offshore,speed:-1.5}),1);
  assert.ok(navigationStepScale({...offshore,speed:.75})>1&&navigationStepScale({...offshore,speed:.75})<2);
});

test('walking, swimming, anchor, fishing and close manoeuvring never receive acceleration',()=>{
  for(const patch of[{mode:'walk'},{mode:'swim'},{paused:true},{anchor:true},{moored:true},{standing:true},{docking:{}},{engine:false},{casting:true},...['casting','flight','sinking','waiting','bite','fight','landed'].map(fishState=>({fishState}))])assert.equal(navigationStepScale({...offshore,...patch}),1,JSON.stringify(patch));
  for(const bad of[null,{}, {...offshore,boatX:NaN},{...offshore,boatZ:Infinity},{...offshore,speed:NaN}])assert.equal(navigationStepScale(bad),1);
  assert.equal(navigationStepScale(near(15)),1);
});

test('chart distance is explicitly game scale and keeps the uncompressed dock metres',()=>{
  assert.equal(compressedDistance(home,{x:home.x+10,z:home.z}),10);
  assert.ok(Math.abs(compressedDistance({x:home.x+100,z:home.z},{x:home.x+500,z:home.z})-200)<1e-10);
  const far={x:home.x+600,z:home.z},distance=compressedDistance(home,far);
  assert.ok(distance>300&&distance<350);
  assert.ok(Math.abs(distance-compressedDistance(far,home))<1e-8);
  assert.equal(compressedDistance(home,home),0);
  assert.equal(compressedDistance({x:NaN,z:0},home),0);
});

test('low frame rates retain scaled navigation time in bounded collision substeps',()=>{
  const pieces=navigationSubsteps(offshore,.25);
  assert.equal(pieces.length,5);
  assert.ok(pieces.every(dt=>dt>0&&dt<=.1));
  assert.ok(Math.abs(pieces.reduce((a,b)=>a+b,0)-.5)<1e-12);
  assert.ok(Math.abs(navigationSubsteps(near(10),.1)[0]-.1)<1e-12);
  assert.deepEqual(navigationSubsteps(offshore,NaN),[]);
  assert.deepEqual(navigationSubsteps(offshore,0),[]);
});

// A production navigationScale hook, when present, can be overridden to compare
// the exact same route/force/collision code with compression enabled or disabled.
// Before integration, this harness wraps the original stepBoat equivalently.
class PassageSimulation extends PixelSimulation{
  constructor(compressed){super({rng:()=>.1});this.compressed=compressed;}
  navigationScale(){return this.compressed?navigationStepScale(this.state):1;}
  stepBoat(dt,input){return super.stepBoat(typeof PixelSimulation.prototype.navigationScale==='function'?dt:dt*this.navigationScale(),input);}
}
function until(sim,condition,dt,limit=800,observe=()=>{}){
  let elapsed=0;
  while(!condition()&&elapsed<limit){sim.step(dt);elapsed+=dt;observe();}
  assert.ok(condition(),`passage timed out: ${JSON.stringify(sim.publicState())}`);
  return elapsed;
}
function depart(sim,dt){
  assert.equal(sim.start().ok,true);assert.equal(sim.walkTo('counter').ok,true);
  until(sim,()=>sim.atCounter&&!sim.state.walkRoute.length,dt,30);
  assert.equal(sim.packStarter().ok,true);
  // Optional navigation hardware is bought and carried if this edition gates
  // chart assistance. Keep the physical voyage comparison independent of price.
  sim.state.profile.credits=10000;
  for(const item of GEAR_CATALOG.filter(g=>g.id==='trolling_motor'||['chart','gps','compass','navigation'].includes(g.slot)||/^(chart|gps|compass)(_|$)/.test(g.id))){
    if(!sim.state.profile.owned.includes(item.id))assert.equal(sim.buyGear(item.id).ok,true);
    if(!sim.state.packed.includes(item.id))assert.equal(sim.equip(item.id).ok,true);
  }
  assert.equal(sim.launchBoat().ok,true);assert.equal(sim.walkTo('boarding').ok,true);
  until(sim,()=>!sim.state.walkRoute.length&&sim.state.launchStage==='afloat',dt,90);
  assert.equal(sim.board().ok,true);assert.equal(sim.unmoor().ok,true);
}
function voyage(compressed,dt){
  const sim=new PassageSimulation(compressed);depart(sim,dt);
  const departureElapsed=sim.state.elapsed,departureWalked=sim.state.walked;
  let maxSpeed=0,maxStep=0,prior={x:sim.state.boatX,z:sim.state.boatZ};
  const observe=()=>{
    assert.equal(hullPenetration(sim.vessel),0,'the full hull must remain outside coast, wharf and landing');
    maxSpeed=Math.max(maxSpeed,Math.abs(sim.state.speed));
    maxStep=Math.max(maxStep,Math.hypot(sim.state.boatX-prior.x,sim.state.boatZ-prior.z));
    prior={x:sim.state.boatX,z:sim.state.boatZ};
  };
  assert.equal(sim.selectWaypoint(FISHING_SPOTS[0]).ok,true);
  const out=until(sim,()=>sim.state.arrival==='fishing',dt,1600,observe);
  assert.ok(Math.abs(sim.state.speed)<1.1);
  assert.equal(sim.state.motorMode,'hold');
  assert.equal(sim.selectWaypoint('dock').ok,true);
  const back=until(sim,()=>sim.state.arrival==='dock',dt,1600,observe);
  assert.ok(Math.abs(sim.state.speed)<1.1);
  assert.ok(Math.abs(sim.state.elapsed-departureElapsed-out-back)<1e-6,'QA active time must use unscaled wall time');
  assert.equal(sim.state.walked,departureWalked);
  assert.ok(maxSpeed>.8&&maxSpeed<2);
  assert.ok(maxStep<=maxSpeed*dt*(compressed?2:1)+.01,'no route teleport or inflated position jump');
  return{out,back,maxSpeed,departureElapsed,departureWalked};
}

test('real waterRoute voyages take about half the wall time, keep knots and arrive safely at 60 Hz and .1 s steps',()=>{
  const results=[];
  for(const dt of[1/60,.1]){
    const normal=voyage(false,dt),compressed=voyage(true,dt);
    assert.equal(compressed.departureElapsed,normal.departureElapsed,'walking and crane timing are unchanged');
    assert.equal(compressed.departureWalked,normal.departureWalked);
    for(const leg of['out','back'])assert.ok(compressed[leg]/normal[leg]>.49&&compressed[leg]/normal[leg]<.63,`${leg} ratio ${compressed[leg]/normal[leg]}`);
    assert.ok(Math.abs(normal.maxSpeed-compressed.maxSpeed)<.015,'reported physical speed is not multiplied');
    results.push(compressed);
  }
  assert.ok(Math.abs(results[0].out-results[1].out)<1);
  assert.ok(Math.abs(results[0].back-results[1].back)<1);
});
