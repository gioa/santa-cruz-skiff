import test from 'node:test';
import assert from 'node:assert/strict';
import {stepFishingLine,rodTipPosition} from '../dist/pixel-fishing-physics.js';
import {getRodCurve,getFishingLine} from '../dist/pixel-rod-geometry.js';

function scenario(dt=1/30,current={x:0,z:0}){
 const s={boatX:0,boatZ:0,heading:0,rig:'bottom',rigWeightGrams:85,rodMount:'starboard',rodElevation:45,rodAzimuth:70,paidLineMeters:15,lureDepth:12,reelMode:'brake',fishState:'waiting',rigVelocity:{vx:current.x,vz:current.z}};
 const tip=rodTipPosition(s);s.bobber={x:tip.x,z:tip.z,height:-12};const frames=[];
 for(let phase=0;phase<4;phase++){
  const duration=[10,20,10,20][phase];
  for(let n=0;n<Math.round(duration/dt);n++){
   const heading=phase<2?0:phase===2?(n+1)*dt/duration*Math.PI/2:Math.PI/2,speed=phase===1||phase===2?1:0;
   s.heading=heading;const velocity={vx:current.x-Math.sin(heading)*speed,vz:current.z-Math.cos(heading)*speed};s.boatX+=velocity.vx*dt;s.boatZ+=velocity.vz*dt;
   Object.assign(s,stepFishingLine(s,{dt,environment:{bottomDepth:60,habitat:'sand'},velocity,current}));
   assert.equal(s.paidLineMeters,15,'towing cannot invent paid-out line');
  }
  frames.push(structuredClone(s));
 }
 return frames;
}
const horizontal=s=>Math.hypot(s.bobber.x-s.rodTip.x,s.bobber.z-s.rodTip.z);

test('tackle trails on acceleration, retains lateral lag through a turn and settles after stopping',()=>{
 const [still,tow,turn,stop]=scenario();
 assert.ok(horizontal(still)<.01);assert.ok(tow.bobber.z-tow.rodTip.z>8);assert.ok(tow.lureDepth<still.lureDepth-2);
 assert.ok(turn.bobber.x-turn.rodTip.x>5,'tackle trails the new westward heading');
 assert.ok(turn.bobber.z-turn.rodTip.z>3,'turn does not rotate the tackle rigidly with the boat');
 assert.ok(horizontal(stop)<.3);assert.ok(stop.lureDepth>tow.lureDepth+2);
 for(let i=0;i<4;i++){
  const s=scenario(1/60)[i];assert.ok(Math.abs(s.lureDepth-[still,tow,turn,stop][i].lureDepth)<.12);
 }
});

test('uniform current changes ground travel, not the trolling line relative to water',()=>{
 const still=scenario(),flow=scenario(1/30,{x:.35,z:-.2});
 for(let i=0;i<4;i++)for(const key of ['x','z']){
  assert.ok(Math.abs((still[i].bobber[key]-still[i].rodTip[key])-(flow[i].bobber[key]-flow[i].rodTip[key]))<1e-6);
 }
});

test('rendered submerged line keeps the physical two-axis slope at all boat zooms',()=>{
 for(const s of scenario())for(const cameraScale of [2,4,6]){
  const before=structuredClone(s),project=(x,z)=>({x:(x-s.boatX)*cameraScale,y:(z-s.boatZ)*cameraScale});
  const rod=getRodCurve(s,{scale:cameraScale*.18}),line=getFishingLine(s,rod,{project,cameraScale});
  assert.ok(Math.abs((line.end.x-rod.waterBase.x)/rod.tipHeightPixels-(s.lineEntry.x-s.rodTip.x)/s.rodTip.height)<1e-8);
  assert.ok(Math.abs((line.end.y-rod.waterBase.y)/rod.tipHeightPixels-(s.lineEntry.z-s.rodTip.z)/s.rodTip.height)<1e-8);
  assert.strictEqual(line.start,rod.tip);assert.deepEqual(s,before,'rendering cannot move real tackle');
 }
});

test('cast line intersects the visible rod-to-hook ray and stays on its splash target at zero depth',()=>{
 const s=scenario()[2];s.castLine=true;const cameraScale=6,project=(x,z)=>({x:x*cameraScale,y:z*cameraScale}),rod=getRodCurve(s,{origin:project(s.boatX,s.boatZ),scale:1.08});
 for(const depth of [0,.01,2,12]){
  const state={...s,bobber:{...s.bobber,height:-depth},lureDepth:depth};const line=getFishingLine(state,rod,{project,cameraScale}),lure=project(s.bobber.x,s.bobber.z),fraction=rod.tipHeightPixels/(rod.tipHeightPixels+depth*cameraScale);
  assert.ok(Math.abs(line.end.x-(rod.waterBase.x+(lure.x-rod.waterBase.x)*fraction))<1e-8);
  assert.ok(Math.abs(line.end.y-(rod.waterBase.y+(lure.y-rod.waterBase.y)*fraction))<1e-8);
  if(depth===0)assert.deepEqual(line.end,lure);
 }
});
