import test from 'node:test';
import assert from 'node:assert/strict';
import {stepFishingLine,rodTipPosition} from '../dist/pixel-fishing-physics.js';
import {rigHydrodynamics} from '../dist/pixel-rig-hydrodynamics.js';
import {fishingScenePoint} from '../dist/pixel-fishing-projection.js';
import {surfaceCurrentConditions} from '../dist/surface-current.js';
import {createWakeTrail} from '../dist/pixel-wake.js';
function rig(extra={}){const s={rig:'bottom',rigWeightGrams:85,boatX:0,boatZ:0,heading:0,rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'free',paidLineMeters:80,lureDepth:5,...extra};const tip=rodTipPosition(s);s.bobber={x:tip.x,z:tip.z,height:-s.lureDepth};return s;}
test('uniform co-drift is Galilean invariant for suspended tackle, independent of depth',()=>{
 for(const depth of[3,15]){const a=rig({lureDepth:depth}),b=rig({lureDepth:depth});for(let i=0;i<100;i++){
 b.boatX+=.05;b.boatZ-=.02;
 Object.assign(a,stepFishingLine(a,{dt:.1,environment:{bottomDepth:100}}));
 Object.assign(b,stepFishingLine(b,{dt:.1,environment:{bottomDepth:100},current:{x:.5,z:-.2},velocity:{vx:.5,vz:-.2}}));
 }
 assert.ok(Math.abs(b.bobber.x-a.bobber.x-5)<1e-7);assert.ok(Math.abs(b.bobber.z-a.bobber.z+2)<1e-7);assert.ok(Math.abs(b.lureDepth-a.lureDepth)<1e-7);assert.ok(Math.abs(a.rodLoadN-b.rodLoadN)<1e-7);
 }
});
test('grounded weight resists weak current and stronger flow can move lighter tackle',()=>{
 function run(weight,current,dt=.1){let s=rig({lureDepth:9.7,rigWeightGrams:weight,rigVelocity:{vx:0,vz:0}}),x=s.bobber.x;for(let t=0;t<20-dt/2;t+=dt)Object.assign(s,stepFishingLine(s,{dt,environment:{bottomDepth:10,habitat:'sand'},current:{x:current,z:0}}));return s.bobber.x-x;}
 assert.equal(run(85,.05),0);assert.equal(run(340,.05),0);const light=run(28,.5),heavy=run(340,.5);assert.ok(light>.2);assert.ok(heavy<light*.25);assert.ok(Math.abs(run(28,.5,1/60)-light)<.04);
});
test('a rig accelerates through water rather than instantly matching flow; heavier rig accelerates slower',()=>{
 const args={dt:.1,current:{x:.6,z:0},velocity:{vx:0,vz:0},lineMeters:0,dragArea:.001};const a=rigHydrodynamics({...args,weightGrams:28}),b=rigHydrodynamics({...args,weightGrams:340});assert.ok(a.vx>0&&a.vx<.6);assert.ok(b.vx<a.vx);
});
test('a fixed snag remains in the same map position as the boat moves',()=>{
 const hook={x:20,z:30};for(const boatX of[0,1,50])assert.deepEqual(fishingScenePoint({boatX,boatZ:-10},hook),hook);
});
test('existing wake drifts with water, while co-drift alone creates no wake',()=>{
 const wake=createWakeTrail(),s={mode:'boat',launchStage:'afloat',boatX:0,boatZ:0,heading:0,speed:2,throttle:0};wake.update(s,.1);for(let i=0;i<20;i++){s.boatZ-=.2;wake.update(s,.1);}const crest=wake.crests.at(-1),x=crest.x,z=crest.z;s.speed=0;wake.update(s,.1,{x:.5,z:-.2});assert.ok(Math.abs(crest.x-x-.05)<1e-9);assert.ok(Math.abs(crest.z-z+.02)<1e-9);
 const drift=createWakeTrail();s.boatX=s.boatZ=0;drift.update(s,.1,{x:1,z:0});for(let i=0;i<30;i++){s.boatX+=.1;drift.update(s,.1,{x:1,z:0});}assert.equal(drift.crests.length,0);assert.equal(drift.foam.length,0);
});
test('surface vector converts north to negative world z and rejects stale, future, missing and invalid observations',()=>{
 const now=Date.parse('2026-09-27T12:00:00Z'),sample={eastMps:.3,northMps:.4,observedAt:'2026-09-27T11:00:00Z',source:'NOAA'};assert.equal(surfaceCurrentConditions(sample,now).currentZ,-.4);assert.ok(surfaceCurrentConditions(sample,now).currentFresh);
 for(const s of[null,{...sample,observedAt:'2026-09-26T00:00:00Z'},{...sample,observedAt:'2026-09-28T00:00:00Z'},{...sample,eastMps:NaN},{...sample,northMps:300}]){const c=surfaceCurrentConditions(s,now);assert.equal(c.currentFresh,false);assert.equal(c.currentX,0);assert.equal(c.currentZ,0);assert.match(c.currentStatus,/暂按无流模拟/);}
});
