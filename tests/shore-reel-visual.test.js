import test from 'node:test';
import assert from 'node:assert/strict';
import {shoreControlWords,stepShoreReelVisual} from '../dist/shore-reel-feedback.js';

test('a stationary or drifting unwound rig never spins a reel handle',()=>{
 const next=stepShoreReelVisual({handleAngle:35,bailAngle:60,spoolAngle:20},{handleRate:0,linePayoutRate:1,dragSlip:false},.1);
 assert.equal(next.handleAngle,35);assert.equal(next.bailAngle,60);assert.equal(next.spoolAngle,20);assert.equal(next.clickRate,0);
});
test('winding rotates the bail, while actual drag payout rotates the spool',()=>{
 const wind=stepShoreReelVisual({}, {handleRate:1,linePickupRate:.7},.1);
 assert.equal(wind.handleAngle,36);assert.ok(wind.bailAngle>wind.handleAngle);assert.equal(wind.spoolAngle,0);
 const payout=stepShoreReelVisual({}, {handleRate:0,linePayoutRate:.6,dragSlip:true},.1);
 assert.equal(payout.handleAngle,0);assert.ok(payout.spoolAngle<0);assert.ok(payout.clickRate>0);assert.equal(payout.slipping,true);
 const paused=stepShoreReelVisual(payout,{handleRate:1,linePayoutRate:1,dragSlip:true},0);
 assert.equal(paused.handleAngle,payout.handleAngle);assert.equal(paused.spoolAngle,payout.spoolAngle);
});
test('control descriptions communicate posture and cadence without numerical readouts',()=>{
 for(const controls of [{},{reelSpeed:.2,drag:.1,rodLift:0,rodSweep:-1},{reelSpeed:1,drag:1,rodLift:1,rodSweep:1}]){
  for(const word of Object.values(shoreControlWords(controls)))assert.doesNotMatch(word,/[0-9%]/);
 }
 assert.notEqual(shoreControlWords({reelSpeed:.2}).speed,shoreControlWords({reelSpeed:1}).speed);
});
