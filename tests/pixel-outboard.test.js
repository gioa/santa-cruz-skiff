import test from 'node:test';
import assert from 'node:assert/strict';
import {outboardPose} from '../dist/pixel-boat-geometry.js';
import {createVesselState,stepVessel} from '../dist/vessel-physics.js';

test('rendered motor axis follows actual propeller deflection and reverse does not flip the cowl',()=>{
 for(const steer of[-1,-.4,0,.4,1])for(const throttle of[.7,-.3]){
  const v=createVesselState();stepVessel(v,{dt:1/120,engine:true,throttle,steer});
  const motor=outboardPose(v.tiller),thrustSign=Math.sign(throttle);
  // Recover thrust from the first step, accounting for directional added water mass.
  const fx=v.vx*1.9,fz=v.vz*1.18,norm=Math.hypot(fx,fz);
  assert.ok(Math.abs(fx/norm-motor.forward.x*thrustSign)<1e-10);
  assert.ok(Math.abs(fz/norm-motor.forward.y*thrustSign)<1e-10);
  assert.equal(Math.sign(v.yawRate),Math.sign(steer*throttle)||0);
  assert.equal(Math.sign(motor.angle),Math.sign(steer));
 }
});
test('hand stays on the same rigid tiller grip across the complete swivel travel',()=>{
 for(let i=-100;i<=100;i++){
  const {angle,pivot,grip}=outboardPose(i/100),dx=grip.x-pivot.x,dy=grip.y-pivot.y;
  assert.ok(Math.abs(Math.hypot(dx,dy)-Math.hypot(5,11))<1e-12);
  assert.ok(Math.abs(dx*Math.cos(angle)+dy*Math.sin(angle)+5)<1e-12);
  assert.ok(Math.abs(-dx*Math.sin(angle)+dy*Math.cos(angle)+11)<1e-12);
 }
 assert.deepEqual(outboardPose(Infinity),outboardPose(0));
 assert.deepEqual(outboardPose(2),outboardPose(1));
});
