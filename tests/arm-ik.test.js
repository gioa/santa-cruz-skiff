import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {solveTwoBone} from '../dist/arm-ik.js';
import {createSeatedAngler} from '../dist/angler-model.js';
import {createSkiff} from '../dist/boat.js';
import {createFishingRod} from '../dist/fishing-rod.js';
import {createAnglerInteraction} from '../dist/angler-interaction.js';

const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('reachable wrists retain anatomical lengths and make exact prop contact',()=>{
 for(const side of[-1,1])for(let a=0;a<Math.PI*2;a+=.13){
  const shoulder=[side*.199,.965,-.275],target=[side*.21+Math.cos(a)*.12,.78+Math.sin(a)*.12,-.68],pole=[side*.48,.66,-.17];
  const result=solveTwoBone(shoulder,target,pole);
  assert.equal(result.reachable,true);assert.ok(distance(result.wrist,target)<1e-9);
  assert.ok(Math.abs(distance(shoulder,result.elbow)-.30)<1e-9);
  assert.ok(Math.abs(distance(result.elbow,result.wrist)-.27)<1e-9);
 }
});
test('unreachable props do not stretch arms or produce NaN at singular poses',()=>{
 for(const target of[[0,0,0],[0,5,0],[0,.57,0],[0,-.5,0]]){
  const r=solveTwoBone([0,0,0],target,[0,1,0]);
  assert.ok([...r.elbow,...r.wrist].every(Number.isFinite));
  assert.ok(Math.abs(distance([0,0,0],r.elbow)-.30)<1e-8);
  assert.ok(Math.abs(distance(r.elbow,r.wrist)-.27)<1e-8);
 }
 const far=solveTwoBone([0,0,0],[0,5,0],[0,-1,0]);assert.equal(far.reachable,false);assert.ok(far.reachError>4.4);
});
// Material canvases are irrelevant to the geometry/kinematics checks. The real
// application uses a browser canvas; this stub records no pixels or GPU calls.
globalThis.document??={createElement(){return{width:0,height:0,getContext(){return new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}};}};

test('same rendered hands stay attached to rotating world-space props in both cameras',()=>{
 const boat=new THREE.Group(),avatar=createSeatedAngler();boat.add(avatar);avatar.position.set(-.35,.055,1.72);
 const left=new THREE.Object3D(),right=new THREE.Object3D();boat.add(left,right);
 for(const firstPerson of[false,true])for(let a=0;a<Math.PI*2;a+=.22){
  boat.position.set(14,Math.sin(a)*.2,-300);boat.rotation.set(Math.sin(a)*.05,a,Math.cos(a)*.07);
  left.position.set(-.43,.95,1.04);left.rotation.set(-1.0,0,-.08);
  right.position.set(-.15,1.035+Math.cos(a)*.04,1.06+Math.sin(a)*.04);right.rotation.set(-1.0,0,-Math.PI/2);
  boat.updateWorldMatrix(true,true);avatar.userData.pose({time:a,dt:1/60,leftGrip:left,rightGrip:right,firstPerson});
  for(const [name,target]of[['left',left],['right',right]]){
   const hand=avatar.userData.hands[name],contact=hand.userData.gripSocket.getWorldPosition(new THREE.Vector3()),expected=target.getWorldPosition(new THREE.Vector3());
   assert.ok(contact.distanceTo(expected)<1e-7,`${name}: ${contact.distanceTo(expected)}`);
   assert.ok(1-Math.abs(hand.getWorldQuaternion(new THREE.Quaternion()).dot(target.getWorldQuaternion(new THREE.Quaternion())))<1e-7);
  }
  assert.equal(avatar.userData.head.visible,!firstPerson);assert.equal(avatar.userData.body.visible,true);
 }
});
test('standing moves pelvis and eyes while feet remain on deck',()=>{
 const avatar=createSeatedAngler(),start=avatar.userData.eyeSocket.getWorldPosition(new THREE.Vector3());
 for(let i=0;i<120;i++)avatar.userData.pose({time:i/60,dt:1/60,standing:true});
 const end=avatar.userData.eyeSocket.getWorldPosition(new THREE.Vector3());
 assert.ok(end.y-start.y>.39&&end.y-start.y<.40);assert.equal(avatar.userData.seated,false);
 assert.ok(avatar.userData.height>1.76&&avatar.userData.height<1.78);
 assert.ok(avatar.userData.hands.left.position.y<1.15);
});

// Check the authored boat and tackle, including their physical socket frames,
// rather than idealized targets that could conceal a misplaced grip.
test('real reel, cast follow-through and steering controls remain within human reach',()=>{
 const boat=createSkiff(),fisher=createSeatedAngler(),rod=createFishingRod();boat.add(fisher);
 const rig=createAnglerInteraction({boat,fisher,rod});
 const state={mode:'boat',moored:false,engine:false,standing:false,fishState:'idle',time:0,yaw:0,pitch:0,throttle:0,pfd:true,view:'third',deckX:0,deckZ:0,tension:0,castPower:0};
 const step=(count,options={})=>{for(let i=0;i<count;i++){state.time+=1/60;options.change?.(i);boat.rotation.set(Math.sin(state.time)*.05,state.time*.1,Math.cos(state.time)*.06);
  rig.update({state,dt:1/60,casting:state.castPower>0,reeling:state.fishState==='fight',pumping:state.tension>30,hasRod:true});
  const d=rig.diagnostics();for(const key of['leftContactMeters','rightContactMeters'])if(d[key]!==null)assert.ok(d[key]<.001,`${d.action} ${key} ${d[key]}m at ${state.time.toFixed(2)}s`);
 }};
 step(20);state.fishState='fight';step(500,{change:()=>{state.tension=20;state.yaw+=.017;}});
 state.fishState='idle';step(100,{change:i=>{state.castPower=i/99;}});state.castPower=0;state.fishState='sinking';step(60);
 state.fishState='fight';state.tension=70;step(60);state.standing=true;step(120);state.standing=false;step(120);
 state.engine=true;state.fishState='idle';step(120,{change:()=>{state.throttle=1;boat.userData.motor.rotation.y=.5;}});
 for(const tiller of[-.5,0,.5])for(const throttle of[0,.5,1]){boat.userData.motor.rotation.y=tiller;state.throttle=throttle;step(30);}
});

test('fingers fit actual cork, reel knob and wide tiller radii without moving the wrist',()=>{
 const avatar=createSeatedAngler();
 for(const hand of Object.values(avatar.userData.hands))for(const radius of[.014,.017,.028]){
  const wrist=hand.userData.wristOffset.clone();hand.userData.setGripRadius(radius);let minimum=Infinity;
  hand.userData.closed.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)minimum=Math.min(minimum,Math.hypot(p.getX(i),p.getZ(i)));});
  assert.ok(minimum>=radius+.001,`${radius}m handle penetrates ${minimum}m fingers`);assert.ok(minimum<radius+.003);assert.ok(hand.userData.wristOffset.equals(wrist));
 }
});
