import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createFishingRod} from '../dist/fishing-rod.js';

// Geometry tests need no browser or WebGL. Canvas is used only for the cork albedo.
globalThis.document??={createElement:()=>({getContext:()=>({fillRect(){}})})};
const close=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);

test('reel hand contact tracks the real crank circle without tumbling around the spindle',()=>{
 const rod=createFishingRod(),{crank,reelGripSocket,update}=rod.userData;
 rod.position.set(4,2,-8);rod.rotation.set(.3,-.6,.2);rod.updateMatrixWorld(true);
 const restRotation=reelGripSocket.getWorldQuaternion(new THREE.Quaternion());
 for(let i=0;i<100;i++){
  update({dt:.02,reeling:true});rod.updateMatrixWorld(true);
  const hand=rod.worldToLocal(reelGripSocket.getWorldPosition(new THREE.Vector3()));
  close(hand.x,.127);close(Math.hypot(hand.y-.386,hand.z-.068),.053);
  close(hand.y,.386+Math.cos(crank.rotation.x)*.053);close(hand.z,.068+Math.sin(crank.rotation.x)*.053);
  close(1-Math.abs(restRotation.dot(reelGripSocket.getWorldQuaternion(new THREE.Quaternion()))),0);
 }
});

test('reel crank and geared spool have identical motion at 30 and 120 fps',()=>{
 const a=createFishingRod(),b=createFishingRod();
 for(let i=0;i<30*12;i++)a.userData.update({dt:1/30,reeling:true,bend:.12});
 for(let i=0;i<120*12;i++)b.userData.update({dt:1/120,reeling:true,bend:.12});
 for(const part of['crank','spool'])close(a.userData[part].rotation.x,b.userData[part].rotation.x);
 const angle=a.userData.crank.rotation.x;a.userData.update({dt:.1,reeling:false});close(a.userData.crank.rotation.x,angle);
});

test('line passes every bent guide centre and terminates at the live tip socket',()=>{
 const rod=createFishingRod(),{guides,guideLine,tipSocket,update}=rod.userData;
 for(const bend of[0,.03,.16,.3]){
  update({bend});rod.updateMatrixWorld(true);const line=guideLine.geometry.attributes.position;
  guides.forEach((guide,i)=>{
   const centre=new THREE.Vector3(0,0,guide.userData.offset).applyQuaternion(guide.quaternion).add(guide.position);
   assert.ok(centre.distanceTo(new THREE.Vector3().fromBufferAttribute(line,i+2))<1e-6);
  });
  assert.ok(tipSocket.position.distanceTo(new THREE.Vector3().fromBufferAttribute(line,line.count-1))<1e-6);
  close(guides.at(-1).position.z,-3*bend);
 }
});

test('rod blank remains one connected indexed mesh across maximum bending and grip stays fixed',()=>{
 const rod=createFishingRod(),{blank,gripSocket,update}=rod.userData,g=blank.geometry;
 assert.ok(g.index.count>2000);assert.equal(g.attributes.position.count,43*11);
 const initial=gripSocket.position.clone();
 for(const bend of[0,.2,.5]){
  update({bend});assert.ok(gripSocket.position.equals(initial));
  for(const n of g.attributes.position.array)assert.ok(Number.isFinite(n));
  // Adjacent rings remain centimetres apart; none of the blank segments detach.
  for(let ring=1;ring<43;ring++){
   const before=new THREE.Vector3().fromBufferAttribute(g.attributes.position,(ring-1)*11),after=new THREE.Vector3().fromBufferAttribute(g.attributes.position,ring*11);
   assert.ok(before.distanceTo(after)<.10);
  }
 }
});
