import test from 'node:test';
import assert from 'node:assert/strict';
import {createVesselState,stepVessel,stepVesselMotion,syncVessel,sampleHullWater,vesselWind,vesselAutopilot} from '../dist/vessel-physics.js';

function run(v,seconds,dt,options={}){for(let t=dt;t<seconds+dt/2;t+=dt)stepVessel(v,{dt,time:t,...options});return v;}
const flat=()=>0;
test('8 hp reaches plausible 5–7 knot displacement speed without instant acceleration',()=>{
 const v=createVesselState();stepVessel(v,{dt:.1,engine:true,throttle:1});assert.ok(v.speed>0&&v.speed<.03);
 run(v,60,1/60,{engine:true,throttle:1,payloadKg:20,sampleWater:flat});
 assert.ok(v.speed*1.94384>5&&v.speed*1.94384<7,`speed ${v.speed*1.94384} kn`);
});
test('neutral retains momentum then water drag dissipates it; no permanent artificial drift',()=>{
 const v=createVesselState({speed:3});stepVessel(v,{dt:.1});assert.ok(v.speed>2.7&&v.speed<3);
 run(v,90,1/60);assert.ok(Math.abs(v.speed)<.002);assert.ok(-v.z>8&&-v.z<25);
 const still=createVesselState();run(still,120,1/30,{anchor:false});assert.equal(still.x,0);assert.equal(still.z,0);
});
test('extra carried mass reduces acceleration and increases displacement',()=>{
 const light=run(createVesselState(),5,1/60,{engine:true,throttle:.8}),heavy=run(createVesselState(),5,1/60,{engine:true,throttle:.8,payloadKg:150});
 assert.ok(light.speed>heavy.speed+.15);assert.ok(heavy.y<light.y-.035);assert.ok(heavy.massKg>light.massKg);
});
test('30 fps and 120 fps integrate the same powered turn and wave motion',()=>{
 const options={engine:true,throttle:.8,steer:.22,payloadKg:32,windX:4,windZ:-2,sampleWater:(x,z,t)=>Math.sin(x*.14+z*.06+t*.8)*.28};
 const a=run(createVesselState(),40,1/30,options),b=run(createVesselState(),40,1/120,options);
 for(const key of ['x','z','heading','speed','y','pitch','roll'])assert.ok(Math.abs(a[key]-b[key])<1e-7,`${key}: ${a[key]} != ${b[key]}`);
});
test('engine cutoff coasts and turn inertia decays rather than snapping heading',()=>{
 const v=run(createVesselState(),20,1/60,{engine:true,throttle:.8,steer:.5});
 const yaw=v.yawRate,heading=v.heading,speed=v.speed;assert.ok(yaw>.1);
 stepVessel(v,{dt:1/60,engine:false,steer:0});assert.ok(v.speed>speed*.95);assert.ok(v.yawRate>yaw*.9);assert.notEqual(v.heading,heading);
 run(v,45,1/60);assert.ok(Math.abs(v.yawRate)<.002);
});
test('anchor rode holds a bounded location in wind and has no passive forward creep in calm water',()=>{
 const calm=run(createVesselState({x:20,z:-70}),180,1/30,{anchor:true});assert.equal(calm.x,20);assert.equal(calm.z,-70);
 const windy=run(createVesselState(),180,1/30,{anchor:true,windX:7,windZ:3});
 assert.ok(Math.hypot(windy.x-windy.anchorX,windy.z-windy.anchorZ)<7,`anchor distance ${Math.hypot(windy.x-windy.anchorX,windy.z-windy.anchorZ)}`);
 assert.ok(Math.hypot(windy.vx,windy.vz)<.025);assert.ok(windy.anchorTension>0);
 const oldAnchor=windy.anchorX;stepVessel(windy,{dt:.1,anchor:false});assert.equal(windy.anchorX,null);assert.ok(Number.isFinite(oldAnchor));
});
test('hull pose follows actual local water slope, including a rotated hull',()=>{
 const v=createVesselState(),water=(x,z)=>.06*x-.04*z+.2;
 const sample=sampleHullWater(v,water);assert.ok(Math.abs(sample.roll-Math.atan(.06))<1e-12);assert.ok(Math.abs(sample.pitch-Math.atan(.04))<1e-12);
 for(let i=0;i<600;i++)stepVesselMotion(v,{dt:1/60,time:i/60,sampleWater:water});
 assert.ok(Math.abs(v.y-.2)<.001);assert.ok(Math.abs(v.roll-Math.atan(.06))<.001);assert.ok(Math.abs(v.pitch-Math.atan(.04))<.001);
 v.heading=Math.PI/2;const rotated=sampleHullWater(v,water);assert.ok(Math.abs(rotated.pitch+Math.atan(.06))<1e-12);assert.ok(Math.abs(rotated.roll-Math.atan(.04))<1e-12);
});
test('standing on the starboard gunwale heels the hull toward that side',()=>{
 const v=createVesselState();for(let i=0;i<300;i++)stepVesselMotion(v,{dt:1/60,crewX:.7});
 assert.ok(v.roll<-.16&&v.roll>-.3);assert.ok(Math.abs(v.pitch)<.001);
});
test('bounded substeps remain finite during long rough-water simulation and stalls',()=>{
 const v=createVesselState();for(let i=0;i<2400;i++)stepVessel(v,{dt:i%60===0?4:1/30,time:i/30,engine:true,throttle:Math.sin(i*.01),steer:Math.sin(i*.003),payloadKg:200,windX:15,windZ:-10,sampleWater:(x,z,t)=>Math.sin(x*.2+t)*1.2+Math.sin(z*.3+t*1.5)*.35});
 for(const key of ['x','z','vx','vz','heading','yawRate','y','vy','pitch','roll'])assert.ok(Number.isFinite(v[key]),key);
 assert.ok(Math.abs(v.roll)<=.55);assert.ok(Math.abs(v.pitch)<=.45);assert.ok(Math.hypot(v.vx,v.vz)<6);
 const before=structuredClone(v);stepVessel(v,{dt:0,anchor:true,engine:true,throttle:1});assert.deepEqual(v,before);
});
test('wind convention, collision reset and autopilot do not invent motion',()=>{
 const w=vesselWind(10,134);assert.ok(Math.abs(w.windX)<1e-12);assert.ok(Math.abs(w.windZ-5.14444)<1e-6);
 const v=run(createVesselState(),15,1/60,{engine:true,throttle:1,steer:.5});syncVessel(v,{x:10,z:20,heading:1,speed:0,clearMotion:true});assert.equal(v.vx,0);assert.equal(v.vz,0);assert.equal(v.yawRate,0);assert.equal(v.x,10);assert.equal(v.z,20);
 const a=createVesselState();const control=vesselAutopilot(a,{x:-50,z:-50});assert.ok(control.steer>0);assert.equal(a.heading,0);
});
test('autopilot reaches a real-scale waypoint through tiller forces without setting heading',()=>{
 const v=createVesselState(),target={x:70,z:-140};let arrived=false;
 for(let i=0;i<12000;i++){const c=vesselAutopilot(v,target,{final:true});if(c.arrived){arrived=true;break;}stepVessel(v,{dt:1/60,time:i/60,engine:true,...c});}
 assert.ok(arrived,`missed point from ${v.x}, ${v.z}`);assert.ok(Math.hypot(v.x-target.x,v.z-target.z)<4);assert.ok(v.speed<.85,`arrival speed ${v.speed} m/s`);
});
