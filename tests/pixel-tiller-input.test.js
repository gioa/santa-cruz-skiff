import test from 'node:test';
import assert from 'node:assert/strict';
import {TILLER_MAX_ANGLE,THROTTLE_TWIST_SWEEP,tillerFromPointer,throttleFromDrag,throttleFromTwist} from '../dist/pixel-tiller-input.js';
import {createVesselState,stepVessel} from '../dist/vessel-physics.js';
import {ITEM_ICON_IDS,drawItemIcon} from '../dist/pixel-item-icons.js';

const radians=degrees=>degrees*Math.PI/180;
const close=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

test('the fixed tiller pivots through a bounded arc rather than translating like a joystick',()=>{
 const centre=tillerFromPointer(0,-84);assert.equal(centre.steer,0);assert.equal(centre.x,0);assert.equal(centre.y,-84);
 for(const sign of[-1,1]){
  const stop=tillerFromPointer(sign*500,-20);close(stop.angle,sign*TILLER_MAX_ANGLE);close(stop.steer,sign);
  const half=tillerFromPointer(sign*Math.sin(TILLER_MAX_ANGLE/2)*84,-Math.cos(TILLER_MAX_ANGLE/2)*84);
  close(half.steer,sign*.5);close(Math.hypot(half.x,half.y),84);
 }
 const small=tillerFromPointer(25,-70,{length:84}),large=tillerFromPointer(50,-140,{length:168});
 close(small.steer,large.steer);close(large.x,small.x*2);close(large.y,small.y*2);
});

test('physical vessel integration confirms handle right turns bow left, at 60 Hz and 10 Hz',()=>{
 const sail=(side,dt)=>{
  const vessel=createVesselState(),input=tillerFromPointer(side*35,-84);
  for(let t=0;t<8-dt/2;t+=dt)stepVessel(vessel,{dt,time:t+dt,engine:true,throttle:.55,steer:input.steer,sampleWater:()=>0});
  return vessel;
 };
 for(const dt of[1/60,.1]){
  const rightHand=sail(1,dt),leftHand=sail(-1,dt);
  assert.ok(rightHand.heading>.2&&rightHand.x<0,'right-hand grip movement turns bow/displacement to port');
  assert.ok(leftHand.heading<-.2&&leftHand.x>0,'left-hand grip movement turns bow/displacement to starboard');
  close(rightHand.heading,-leftHand.heading);close(rightHand.x,-leftHand.x);close(rightHand.z,leftHand.z);
 }
 const fast=sail(1,1/60),slow=sail(1,.1);close(fast.heading,slow.heading,1e-8);close(fast.x,slow.x,1e-8);
});

test('invalid and pivot-centre touches are finite neutral commands, never full lock',()=>{
 for(const [dx,dy] of[[0,0],[1,-1],[NaN,-80],[40,Infinity],[undefined,-60]]){
  const result=tillerFromPointer(dx,dy);assert.equal(result.steer,0);assert.ok(Object.values(result).every(Number.isFinite));
 }
 assert.equal(tillerFromPointer(0,50).steer,0);
 const behind=tillerFromPointer(-50,50);close(behind.steer,-1);
 const malformed=tillerFromPointer(25,-50,{length:NaN,maxAngle:0,deadRadius:Infinity});
 assert.ok(Object.values(malformed).every(Number.isFinite));assert.ok(Math.abs(malformed.steer)<=1);
});

test('throttle uses pointerdown value plus displacement with no initial jump or frame accumulation',()=>{
 for(const start of[0,.08,.4,.9,1])assert.equal(throttleFromDrag(start,0),start);
 close(throttleFromDrag(.3,25),.55);close(throttleFromDrag(.3,-20),.1);
 assert.equal(throttleFromDrag(.3,500),1);assert.equal(throttleFromDrag(.3,-500),0);
 close(throttleFromDrag(.3,25,{travel:50}),.8);close(throttleFromDrag(.5,20,{invert:true}),.3);
 const position=throttleFromDrag(.2,30);for(let frame=0;frame<120;frame++)assert.equal(throttleFromDrag(.2,30),position);
 assert.equal(throttleFromDrag(.4,NaN),.4);assert.equal(throttleFromDrag(.4,Infinity),.4);
});

test('twist throttle keeps its grab value and crosses the angular seam without power spikes',()=>{
 for(const angle of[-Math.PI,-1,0,1,Math.PI])assert.equal(throttleFromTwist(.37,angle,angle),.37);
 close(throttleFromTwist(.2,0,THROTTLE_TWIST_SWEEP/2),.7);
 close(throttleFromTwist(.4,radians(179),radians(-179)),.42);
 close(throttleFromTwist(.4,radians(-179),radians(179)),.38);
 close(throttleFromTwist(.4,radians(179),radians(-179),{invert:true}),.38);
 assert.equal(throttleFromTwist(.4,NaN,1),.4);assert.equal(throttleFromTwist(.4,1,Infinity),.4);
});

test('steering and throttle remain independent and neutral does not erase boat momentum',()=>{
 const throttle=throttleFromDrag(.2,35),grip=tillerFromPointer(30,-84),vessel=createVesselState({speed:2});
 assert.equal(throttle,.55);assert.equal(Object.hasOwn(grip,'throttle'),false);
 stepVessel(vessel,{dt:1/60,engine:true,throttle,steer:grip.steer});const speed=vessel.speed,heading=vessel.heading;
 stepVessel(vessel,{dt:1/60,engine:true,throttle:0,steer:0});
 assert.ok(vessel.speed>speed*.97,'controller neutral removes drive; physics still coasts');
 assert.notEqual(vessel.heading,heading,'rotational inertia is not set to zero');
});

test('seabed anchor has dedicated pixel art distinct from the drift parachute',()=>{
 const paint=id=>{
  const pixels=Array(32*32).fill(null),ctx={fillStyle:null,imageSmoothingEnabled:true,clearRect(){pixels.fill(null);},fillRect(x,y,w,h){for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)if(row>=0&&row<32&&col>=0&&col<32)pixels[row*32+col]=this.fillStyle;}};
  const canvas={style:{},getContext:()=>ctx};drawItemIcon(canvas,id);assert.equal(canvas.width,32);assert.equal(ctx.imageSmoothingEnabled,false);return pixels;
 };
 assert.ok(ITEM_ICON_IDS.includes('anchor'));assert.ok(ITEM_ICON_IDS.includes('sea_anchor'));
 const anchor=paint('anchor'),drogue=paint('sea_anchor');assert.ok(anchor.filter(Boolean).length>200);
 assert.notDeepEqual(anchor,drogue);assert.ok(anchor.includes('#79959a'),'anchor is visibly galvanized steel');
});
