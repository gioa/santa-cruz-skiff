import test from 'node:test';
import assert from 'node:assert/strict';
import {createTillerControl} from '../dist/pixel-helm-state.js';

test('untouched helm yields to other navigation controls and exposes detached snapshots',()=>{
 const helm=createTillerControl();assert.deepEqual(helm.state,{gear:'N',throttle:0,steer:0,manual:false});assert.deepEqual(helm.input(),{});
 const view=helm.state,saved=helm.snapshot();view.gear='R';saved.throttle=1;
 assert.deepEqual(helm.state,{gear:'N',throttle:0,steer:0,manual:false});
});

test('holding and releasing the grip preserves friction-set steering and power until changed',()=>{
 const helm=createTillerControl();assert.equal(helm.shift('F').ok,true);helm.setSteer(.45);helm.setThrottle(.6);
 const held=helm.snapshot();
 for(let frame=0;frame<120;frame++)assert.deepEqual(helm.input(),{steer:.45,throttle:.6});
 assert.deepEqual(helm.state,held,'sampling without new input does not spring-centre or lower throttle');
 helm.setSteer(-.25);assert.equal(helm.state.throttle,.6,'moving the arm does not twist the throttle');
 helm.setThrottle(.3);assert.equal(helm.state.steer,-.25,'twisting the throttle does not move the arm');
});

test('neutral blocks throttle engagement but still permits independent steering',()=>{
 const helm=createTillerControl();const result=helm.setThrottle(.8);assert.equal(result.ok,false);assert.match(result.message,/挂挡/);
 assert.deepEqual(helm.state,{gear:'N',throttle:0,steer:0,manual:true});
 helm.setSteer(.7);assert.deepEqual(helm.input(),{steer:.7,throttle:0});assert.equal(helm.state.gear,'N');
});

test('gear changes require idle throttle, neutral passage and a slow hull',()=>{
 const helm=createTillerControl();helm.shift('F');helm.setThrottle(.6);
 assert.equal(helm.shift('R',0).ok,false);assert.equal(helm.state.gear,'F');assert.equal(helm.state.throttle,.6);
 helm.setThrottle(.08);const before=helm.snapshot();assert.equal(helm.shift('R',0).ok,false);assert.deepEqual(helm.state,before,'even idle F-to-R must pass neutral');
 assert.equal(helm.shift('N',3).ok,true);assert.equal(helm.state.throttle,0);
 for(const speed of[-2,-.8,.8,2]){assert.equal(helm.shift('R',speed).ok,false);assert.equal(helm.state.gear,'N');}
 assert.equal(helm.shift('R',.79).ok,true);helm.setThrottle(.5);assert.deepEqual(helm.input(),{steer:0,throttle:-.15});
 assert.equal(helm.shift('F',0).ok,false);helm.shift('N');assert.equal(helm.shift('F',-.79).ok,true);
});

test('reselecting the current gear never cuts power or changes the steering state',()=>{
 const helm=createTillerControl();helm.shift('F');helm.setThrottle(.85);helm.setSteer(-.2);const before=helm.snapshot();
 assert.equal(helm.shift('F',4).ok,true);assert.deepEqual(helm.snapshot(),before);
 helm.shift('N');helm.shift('R');helm.setThrottle(.7);const reverse=helm.snapshot();
 assert.equal(helm.shift('R',-2).ok,true);assert.deepEqual(helm.snapshot(),reverse);
});

test('explicit neutral cuts drive at any speed while reset clears all manual state',()=>{
 const helm=createTillerControl();helm.shift('F');helm.setThrottle(1);helm.setSteer(-.8);
 assert.equal(helm.shift('N',8).ok,true);assert.deepEqual(helm.state,{gear:'N',throttle:0,steer:-.8,manual:true});
 assert.deepEqual(helm.input(),{steer:-.8,throttle:0});
 helm.reset();assert.deepEqual(helm.state,{gear:'N',throttle:0,steer:0,manual:false});assert.deepEqual(helm.input(),{});
 helm.reset();assert.deepEqual(helm.state,{gear:'N',throttle:0,steer:0,manual:false});
});

test('clamps control travel, caps reverse at thirty percent, and rejects unknown gears',()=>{
 const helm=createTillerControl();helm.shift('F');helm.setSteer(5);helm.setThrottle(8);
 assert.deepEqual(helm.input(),{steer:1,throttle:1});helm.setSteer(-5);helm.setThrottle(-2);assert.deepEqual(helm.input(),{steer:-1,throttle:0});
 helm.shift('N');helm.shift('R');helm.setThrottle(1);assert.equal(helm.input().throttle,-.3);
 const before=helm.snapshot();assert.equal(helm.shift('P',0).ok,false);assert.deepEqual(helm.snapshot(),before);
 helm.setSteer(NaN);helm.setThrottle(Infinity);assert.deepEqual(helm.input(),{steer:0,throttle:0});
 helm.shift('N');assert.equal(helm.shift('F',NaN).ok,false);assert.equal(helm.shift('F',Infinity).ok,false);assert.equal(helm.state.gear,'N');
});
