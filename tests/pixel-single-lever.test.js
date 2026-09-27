import test from 'node:test';
import assert from 'node:assert/strict';
import {createSingleLeverControl,leverFromDrag,leverForThrottle,LEVER_NEUTRAL_DEADBAND} from '../dist/pixel-single-lever.js';
import {createVesselState,stepVessel} from '../dist/vessel-physics.js';

const close=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
const neutral={gear:'N',throttle:0,steer:0,manual:false,lever:0};

test('untouched single lever yields to navigation and snapshots are detached',()=>{
 const control=createSingleLeverControl();assert.deepEqual(control.state,neutral);assert.deepEqual(control.input(),{});
 const state=control.state,snapshot=control.snapshot();state.gear='F';snapshot.lever=1;
 assert.deepEqual(control.state,neutral);
});

test('centre detent is true neutral and travel past it progressively combines gear and power',()=>{
 const control=createSingleLeverControl();
 for(const value of[-LEVER_NEUTRAL_DEADBAND,-.02,0,.02,LEVER_NEUTRAL_DEADBAND]){
  assert.ok(control.setLever(value).ok);assert.equal(control.state.gear,'N');assert.equal(control.state.lever,0);assert.equal(control.input().throttle,0);
 }
 for(const power of[.001,.1,.4,.75,1]){
  assert.ok(control.setLever(leverForThrottle(power)).ok);assert.equal(control.state.gear,'F');close(control.state.throttle,power);close(control.input().throttle,power);
 }
 assert.ok(control.setLever(0,3).ok);assert.equal(control.state.gear,'N');
 for(const power of[.001,.1,.4,.75,1]){
  assert.ok(control.setLever(leverForThrottle(power,'R')).ok);assert.equal(control.state.gear,'R');close(control.state.throttle,power);close(control.input().throttle,-.3*power);
 }
});

test('forward to reverse first cuts to neutral and never engages a queued request',()=>{
 const control=createSingleLeverControl();control.setLever(1);control.setSteer(.3);
 assert.equal(control.setLever(-1,2).ok,false);assert.deepEqual(control.state,{...neutral,manual:true,steer:.3});
 for(let frame=0;frame<600;frame++)assert.deepEqual(control.input(),{steer:.3,throttle:0});
 for(const speed of[-2,-.8,.8,2,NaN,Infinity,undefined,'0']){
  // Omitted/undefined speed deliberately uses the documented zero default.
  if(speed===undefined)continue;
  assert.equal(control.setLever(-1,speed).ok,false);assert.equal(control.state.gear,'N');assert.equal(control.state.lever,0);
 }
 assert.ok(control.setLever(-.7,.79).ok);assert.equal(control.state.gear,'R');assert.ok(control.input().throttle<0);
 assert.equal(control.setLever(.8,0).ok,false,'even at rest, reversing a powered lever first passes neutral');
 assert.equal(control.state.gear,'N');assert.ok(control.setLever(.8,0).ok);assert.equal(control.state.gear,'F');
});

test('same-direction adjustment stays usable at cruising speed and release holds both controls',()=>{
 const control=createSingleLeverControl();control.setLever(.6);control.setSteer(-.7);
 assert.ok(control.setLever(.4,3).ok);const held=control.snapshot();
 for(let frame=0;frame<240;frame++){assert.deepEqual(control.state,held);close(control.input().throttle,held.throttle);}
 control.setSteer(.2);close(control.state.throttle,held.throttle);close(control.state.lever,held.lever);
 assert.ok(control.setLever(0,6).ok);assert.equal(control.state.steer,.2);assert.equal(control.input().throttle,0);
});

test('relative lever dragging has no initial jump, no accumulated frame drift and bounded end stops',()=>{
 for(const start of[-1,-.4,0,.2,1])assert.equal(leverFromDrag(start,0),start);
 close(leverFromDrag(.2,24),.4);close(leverFromDrag(-.2,-24),-.4);
 close(leverFromDrag(.1,25,{travel:50}),.6);
 assert.equal(leverFromDrag(.5,900),1);assert.equal(leverFromDrag(.5,-900),-1);
 const drag=leverFromDrag(.3,20);for(let frame=0;frame<240;frame++)assert.equal(leverFromDrag(.3,20),drag);
 for(const delta of[NaN,Infinity,undefined,'20'])assert.equal(leverFromDrag(.4,delta),.4);
 for(const travel of[NaN,Infinity,0,-1,'30'])close(leverFromDrag(.4,12,{travel}),.5);
});

test('trolling caps actual and visual forward travel, blocks reverse and neutralizes an old reverse command',()=>{
 const control=createSingleLeverControl(),limits={reverseAllowed:false,maxForward:.28};
 assert.ok(control.setLever(1,0,limits).ok);close(control.state.throttle,.28);close(control.input().throttle,.28);close(control.state.lever,leverForThrottle(.28));
 assert.ok(control.setLever(leverForThrottle(.1),1.1,limits).ok);close(control.input().throttle,.1);
 assert.equal(control.setLever(-.5,0,limits).ok,false);assert.equal(control.state.gear,'N');assert.equal(control.state.lever,0);
 assert.ok(control.setLever(-1,0).ok);assert.equal(control.setLever(-1,0,limits).ok,false);assert.equal(control.input().throttle,0);
 control.setLever(1);assert.ok(control.setLever(control.state.lever,2,limits).ok);close(control.input().throttle,.28);
});

test('invalid lever input fails to neutral and zero power never displays an engaged forward gear',()=>{
 const control=createSingleLeverControl();
 for(const value of[NaN,Infinity,-Infinity,undefined,null,'1']){
  control.setLever(1);assert.equal(control.setLever(value).ok,false);assert.equal(control.state.gear,'N');assert.equal(control.state.lever,0);assert.equal(control.input().throttle,0);
 }
 for(const maxForward of[0,-1,NaN,Infinity,'1']){
  assert.equal(control.setLever(1,0,{maxForward}).ok,false);assert.equal(control.state.gear,'N');assert.equal(control.state.throttle,0);
 }
 assert.ok(control.setLever(900).ok);assert.equal(control.state.lever,1);assert.equal(control.input().throttle,1);
 control.setLever(0);assert.ok(control.setLever(-900).ok);assert.equal(control.state.lever,-1);assert.equal(control.input().throttle,-.3);
 control.setSteer(4);assert.equal(control.state.steer,1);control.setSteer(-4);assert.equal(control.state.steer,-1);control.setSteer(NaN);assert.equal(control.state.steer,0);
 for(const gear of['N','P',undefined])assert.equal(leverForThrottle(0,gear),0);
 assert.equal(leverForThrottle(.7,'P'),0);
});

test('reset releases manual ownership for navigation and the next untouched frame does not restart drive',()=>{
 const control=createSingleLeverControl();control.setLever(.8);control.setSteer(.7);
 assert.ok(control.reset().ok);assert.deepEqual(control.state,neutral);
 for(let frame=0;frame<120;frame++)assert.deepEqual(control.input(),{});
 control.reset();assert.deepEqual(control.state,neutral);
});

test('actual vessel gains forward momentum, coasts in neutral, and accelerates astern only after a fresh low-speed shift',()=>{
 const control=createSingleLeverControl(),vessel=createVesselState();let time=0;
 const run=seconds=>{for(let t=0;t<seconds;t+=1/60){time+=1/60;stepVessel(vessel,{dt:1/60,time,engine:true,...control.input(),sampleWater:()=>0});}};
 control.setLever(1);run(6);assert.ok(vessel.speed>.8);const underway=vessel.speed;
 assert.equal(control.setLever(-1,vessel.speed).ok,false);run(1/60);assert.ok(vessel.speed>underway*.97,'neutral does not erase the hull momentum');
 for(let t=0;t<180&&Math.abs(vessel.speed)>=.8;t+=1)run(1);
 assert.ok(Math.abs(vessel.speed)<.8);assert.equal(control.state.gear,'N');assert.equal(control.input().throttle,0);
 assert.ok(control.setLever(-1,vessel.speed).ok);run(12);assert.ok(vessel.speed<-.1,'fresh reverse input engages the actual outboard');
});
