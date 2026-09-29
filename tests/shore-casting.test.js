import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {shoreCastPower,shoreCastPosition,SHORE_CAST_CHARGE_MS} from '../dist/shore-casting.js';

function simAt({sceneId='pacifica',offset=25,rod='starter_rod',rig='carolina_rig',bait='sandcrab',pier=false}={}){
 const sim=new PacificaSimulation({sceneId,rng:()=>.5,loreSeed:1,date:'2026-09-28'}),s=sim.state;
 s.activeRod=rod;s.rodSupplies[rod]={id:rig,condition:1,bait:{kind:bait,condition:1}};
 const x=1100;Object.assign(s.player,pier?sim.scene.pier.tip:{x,y:sim.world.shoreY(x)+offset});s.onPier=pier;
 return sim;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function land(sim){for(let t=0;t<12&&sim.state.phase==='casting';t+=.025)sim.update(.025);}

test('a tap is a five-metre lob; power increases real flight rather than enforcing minimum offshore range',()=>{
 const sim=simAt(),tap=sim.previewCast(),mid=sim.previewCast({power:.5}),full=sim.previewCast({power:1});
 assert.ok(tap.distance>=3&&tap.distance<=6);assert.ok(tap.offshoreDistance>0&&tap.offshoreDistance<4);
 assert.ok(mid.distance>=15&&mid.distance<=25);assert.ok(full.distance>=30&&full.distance<=46);
 assert.ok(tap.flightDuration<mid.flightDuration&&mid.flightDuration<full.flightDuration);
 assert.ok(tap.apexHeight<3&&full.apexHeight<16);
 assert.equal(shoreCastPower(0),0);assert.equal(shoreCastPower(90),.05);
 assert.equal(shoreCastPower(SHORE_CAST_CHARGE_MS/2),.5);assert.equal(shoreCastPower(9999),1);
});
test('aim rotates one physical range and inland setback consumes it',()=>{
 const nearShore=simAt(),farInland=simAt({offset:100});
 const a=nearShore.previewCast({power:.5}),b=farInland.previewCast({power:.5});
 near(a.distance,b.distance);assert.ok(a.offshoreDistance>b.offshoreDistance);assert.equal(b.landing,'sand');
 for(const aim of [-1,-.5,0,.5,1]){
  const cast=nearShore.previewCast({power:.5,aim});near(cast.distance,a.distance);
  near(Math.hypot(cast.target.x-cast.origin.x,cast.target.y-cast.origin.y)/3.2,cast.distance);
 }
});
test('rod and baited payload affect range; overload does not grant a distance bonus',()=>{
 const light=simAt(),heavy=simAt({rig:'fishfinder_rig'}),surf=simAt({rod:'surf_rod',rig:'fishfinder_rig'});
 const a=light.previewCast({power:1}),b=heavy.previewCast({power:1}),c=surf.previewCast({power:1});
 assert.ok(b.payloadGrams>85&&b.loadRatio>2);assert.match(b.loadLabel,/超过/);
 assert.ok(b.distance<a.distance*.5);assert.ok(c.distance>50&&c.distance<70);assert.ok(c.loadRatio<1);
 const squid=simAt({bait:'squid'}).previewCast({power:1});assert.ok(squid.distance<a.distance);
 light.state.upgrades.push('surf_rod');near(light.previewCast({power:1}).distance,a.distance);
});
test('preview is read-only; actual cast and visible trajectory have identical endpoints',()=>{
 const sim=simAt(),before=JSON.stringify(sim.state),plan=sim.previewCast({power:.5,aim:.2});
 assert.equal(JSON.stringify(sim.state),before);assert.ok(sim.cast({power:.5,aim:.2}).ok);
 assert.deepEqual(sim.state.cast,plan);near(sim.state.lineDistance,plan.distance);
 const start=shoreCastPosition(plan,0),end=shoreCastPosition(plan,plan.flightDuration);
 near(start.x,plan.origin.x);near(start.y,plan.origin.y);assert.ok(start.height>0);
 near(end.x,plan.target.x);near(end.y,plan.target.y);near(end.height,0);
 let last=0;for(const p of plan.trajectory){assert.ok(p.t>=last&&p.height>=0);last=p.t;}
 land(sim);assert.equal(sim.state.phase,'waiting');
 assert.ok(Math.hypot(sim.state.cast.target.x-plan.target.x,sim.state.cast.target.y-plan.target.y)<.1);
});
test('dry and pier-deck casts do not teleport to water, spend bait or draw an encounter',()=>{
 for(const setup of [{offset:100},{pier:true}]){
  const sim=simAt(setup);if(setup.pier)Object.assign(sim.state.player,{x:sim.scene.pier.x,y:sim.scene.pier.top+200});
  // The warden's schedule has its own roll; fix it so only fishing rolls are counted.
  sim.state.wardenNextAt=1e9;let rolls=0;sim.rng=()=>{rolls++;return .5;};
  const before=JSON.stringify(sim.state.rodSupplies),plan=sim.previewCast();
  assert.notEqual(plan.landing,'water');assert.ok(sim.cast().ok);assert.deepEqual(sim.state.cast.target,plan.target);
  land(sim);assert.equal(sim.state.phase,'walk');assert.equal(sim.state.cast,null);
  assert.equal(sim.population.pendingBite,null);assert.equal(sim.fishWorld().stimulus,null);assert.equal(sim.state.fish,null);assert.equal(rolls,0);
  assert.equal(JSON.stringify(sim.state.rodSupplies),before);assert.equal(sim.state.stats.casts,1);
 }
});
test('pier height extends airborne time without a free sideways offset',()=>{
 const beach=simAt().previewCast({power:.5}),pier=simAt({pier:true}).previewCast({power:.5});
 near(pier.origin.x,pier.target.x);assert.ok(pier.flightDuration>beach.flightDuration);
 assert.ok(pier.distance>beach.distance&&pier.distance<beach.distance+8);assert.equal(pier.landing,'water');
});
test('invalid controls and world-edge throws stay finite and cannot fish outside the map',()=>{
 const sim=simAt();for(const power of [-100,Infinity,NaN,100])for(const aim of [-100,Infinity,NaN,100]){
  const cast=sim.previewCast({power,aim});assert.ok(cast.distance>0&&cast.distance<100);
  assert.ok(cast.trajectory.every(p=>Object.values(p).every(Number.isFinite)));
 }
 sim.state.player.x=25;sim.state.player.y=sim.world.shoreY(25)+25;
 assert.ok(sim.cast({power:1,aim:-1}).ok);assert.equal(sim.state.cast.landing,'boundary');land(sim);
 assert.equal(sim.state.phase,'walk');assert.equal(sim.fishWorld().stimulus,null);
});
