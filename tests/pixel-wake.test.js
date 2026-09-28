import test from 'node:test';
import assert from 'node:assert/strict';
import {wakeProfile,wakeOrigin} from '../dist/pixel-wake.js';
import {SKIFF_HULL_OUTLINE,SKIFF_DISPLAY_METERS_PER_PIXEL} from '../dist/pixel-boat-geometry.js';
test('wake expands, strengthens and lasts longer with actual speed, not engine power',()=>{
 for(const speed of[0,.1,NaN,Infinity])assert.equal(wakeProfile(speed).active,false);
 const slow=wakeProfile(.5),fast=wakeProfile(4);
 for(const key of['width','expansion','opacity','foam','duration'])assert.ok(fast[key]>slow[key],key);
 assert.ok(fast.spacing<slow.spacing);assert.deepEqual(wakeProfile(-2),wakeProfile(2));assert.deepEqual(wakeProfile(500),wakeProfile(5));
});
test('wake originates behind the moving hull across headings and reverse',()=>{
 assert.deepEqual(wakeOrigin(10,20,0,2),{x:10,z:20+34*SKIFF_DISPLAY_METERS_PER_PIXEL});
 const right=wakeOrigin(10,20,Math.PI/2,2);assert.ok(Math.abs(right.x-(10+34*SKIFF_DISPLAY_METERS_PER_PIXEL))<1e-9);assert.ok(Math.abs(right.z-20)<1e-9);
 assert.ok(wakeOrigin(10,20,0,-2).z<20);
});
test('shared shadow/sprite hull has a pointed bow and a narrowed flat transom',()=>{
 const bow=SKIFF_HULL_OUTLINE.filter(p=>p[1]===1);assert.deepEqual(bow,[[24,1]]);
 assert.deepEqual(SKIFF_HULL_OUTLINE.filter(p=>p[1]===78),[[39,78],[9,78]]);assert.ok(Object.isFrozen(SKIFF_HULL_OUTLINE));
});

import {createWakeTrail,crestPoints,foamPoint} from '../dist/pixel-wake.js';
const vessel=()=>({mode:'boat',launchStage:'afloat',boatX:100,boatZ:100,heading:0,speed:3,engine:true,throttle:.6,tiller:0});
test('world-space crests follow the travelled curve and do not rotate with later steering',()=>{
 const wake=createWakeTrail(),s=vessel();wake.update(s,.1);for(let i=0;i<20;i++){s.boatZ-=.3;wake.update(s,.1);}const first=wake.crests[0],origin={x:first.x,z:first.z,direction:{...first.direction}};
 for(let i=0;i<10;i++){s.heading+=.07;s.boatX-=Math.sin(s.heading)*.3;s.boatZ-=Math.cos(s.heading)*.3;wake.update(s,.1);}
 assert.deepEqual({x:first.x,z:first.z,direction:first.direction},origin);assert.ok(wake.crests.at(-1).direction.x>.4);assert.ok(crestPoints(first).every(p=>Number.isFinite(p.x)&&p.opacity>0));
});
test('reverse displacement trails the bow while prop wash reverses at the stern and follows tiller angle',()=>{
 const wake=createWakeTrail(),s={...vessel(),speed:-1,throttle:-.25,tiller:.7};wake.update(s,.1);for(let i=0;i<20;i++){s.boatZ+=.1;wake.update(s,.1);}
 assert.ok(wake.crests.every(w=>w.direction.z<0));assert.ok(wake.foam.every(w=>w.direction.z<0&&w.direction.x>0));assert.ok(wake.crests.at(-1).z<s.boatZ);assert.ok(wake.foam.at(-1).z>s.boatZ);assert.ok(foamPoint(wake.foam[0]).z<wake.foam[0].z);
});
test('neutral coasting keeps speed-generated crests, creates no prop wash and stationary neutral fades away',()=>{
 const wake=createWakeTrail(),s=vessel();wake.update(s,.1);for(let i=0;i<20;i++){s.boatZ-=.3;wake.update(s,.1);}s.throttle=0;const foamCount=wake.foam.length;for(let i=0;i<4;i++){s.boatZ-=.3;wake.update(s,.1);}assert.ok(wake.foam.length<=foamCount);assert.ok(wake.crests.some(w=>w.age<.3));
 s.speed=0;for(let i=0;i<130;i++)wake.update(s,.1);assert.equal(wake.crests.length,0);assert.equal(wake.foam.length,0);
});
test('distance-based wake density is stable across frame rates; pause, teleport and shore reset safely',()=>{
 function run(fps){const wake=createWakeTrail(),s=vessel();wake.update(s,1/fps);for(let i=0;i<fps*3;i++){s.boatZ-=3/fps;wake.update(s,1/fps);}return{wake,s};}
 const a=run(30),b=run(120);assert.ok(Math.abs(a.wake.crests.length-b.wake.crests.length)<=1);assert.ok(Math.abs(a.wake.foam.length-b.wake.foam.length)<=2);
 const before=structuredClone(a.wake.crests);a.s.paused=true;a.wake.update(a.s,.2);assert.deepEqual(a.wake.crests,before);a.s.paused=false;a.s.boatX+=100;a.wake.update(a.s,.1);assert.equal(a.wake.crests.length,0);a.s.mode='walk';a.wake.update(a.s,.1);assert.equal(a.wake.foam.length,0);
});
