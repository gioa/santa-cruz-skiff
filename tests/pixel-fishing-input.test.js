import test from 'node:test';
import assert from 'node:assert/strict';
import {rodPoseFromDrag,clockwiseTurns,createCrankInput} from '../dist/pixel-fishing-input.js';

test('touching the rod preserves its pose and relative drags adjust both axes without jumping',()=>{
 const pose={elevation:38,azimuth:-45};assert.deepEqual(rodPoseFromDrag(pose,0,0),pose);
 assert.deepEqual(rodPoseFromDrag(pose,50,-35,{width:200,height:140}),{elevation:59.25,azimuth:0});
 assert.deepEqual(rodPoseFromDrag(pose,-1000,1000),{elevation:5,azimuth:-110});assert.deepEqual(rodPoseFromDrag(pose,1000,-1000),{elevation:85,azimuth:110});
 assert.deepEqual(rodPoseFromDrag(pose,NaN,Infinity),pose);
});
test('clockwise crank travel crosses the angle seam without a full-turn jump or reverse winding',()=>{
 assert.ok(Math.abs(clockwiseTurns(170*Math.PI/180,-170*Math.PI/180)-20/360)<1e-12);
 assert.equal(clockwiseTurns(0,-Math.PI/2),0);assert.equal(clockwiseTurns(0,0),0);assert.equal(clockwiseTurns(NaN,0),0);
 let turns=0;for(let i=1;i<=64;i++)turns+=clockwiseTurns((i-1)/64*2*Math.PI,i/64*2*Math.PI);assert.ok(Math.abs(turns-1)<1e-12);
});
test('crank output conserves supplied travel, caps speed and ends on release/cancellation',()=>{
 const crank=createCrankInput();crank.turn(.2);assert.equal(crank.sample(.05),0);crank.start();crank.turn(.1);
 let consumed=0;for(let i=0;i<20;i++)consumed+=crank.sample(.01)*.01;assert.ok(Math.abs(consumed-.1)<1e-12);assert.equal(crank.sample(.1),0);
 crank.turn(1);assert.equal(crank.sample(.01),2);crank.stop();assert.equal(crank.sample(.1),0);assert.deepEqual(crank.snapshot(),{pending:0,active:false});
 crank.start();crank.turn(.3);assert.equal(crank.sample(.001),2);crank.stop();crank.start();assert.equal(crank.sample(.05),0,'a new pointer cannot inherit stale travel');
});
test('a stationary crank never turns into a latched reel action',()=>{
 const crank=createCrankInput();crank.start();crank.turn(.3);crank.sample(.001);assert.equal(crank.sample(.25),0);assert.equal(crank.snapshot().pending,0);
 assert.equal(crank.sample(NaN),0);crank.turn(-2);crank.turn(Infinity);assert.equal(crank.sample(.05),0);
});
