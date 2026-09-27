import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraOffset,projectPixel,unprojectPixel,cameraDeadzone,stepDeadzoneCamera,keepCameraPointsVisible,rectilinearOutline} from '../dist/pixel-camera.js';
const initial=()=>({x:-17,z:-51,scale:6,width:640,height:360});

test('walking around the shop and most of the boarding route leaves the scenery still',()=>{
  const camera=initial();for(const [x,z]of[[-10,-45],[-7.8,-54],[-12,-54],[-24.5,-63.8],[-28.6,-65.8],[-31.2,-57]])assert.deepEqual(stepDeadzoneCamera(camera,{x,z},{mode:'walk',dt:.1}),camera);
});
test('camera starts scrolling only after an edge margin is reached and does not recenter on stop',()=>{
  let camera=initial();const focus={x:45,z:-51};const first=stepDeadzoneCamera(camera,focus,{mode:'walk',dt:.1});assert.ok(first.x>camera.x);assert.equal(first.z,camera.z);camera=first;
  for(let i=0;i<200;i++)camera=stepDeadzoneCamera(camera,focus,{mode:'walk',dt:.1});const stopped={...camera};for(let i=0;i<200;i++)camera=stepDeadzoneCamera(camera,focus,{mode:'walk',dt:.1});assert.deepEqual(camera,stopped);const p=projectPixel(camera,focus.x,focus.z),box=cameraDeadzone(camera);assert.ok(p.x<=box.right);
});
test('an orientation change and a large relocation keep the player in the visible playfield',()=>{
  for(const [width,height]of[[328,710],[560,259],[800,450]])for(const mode of['walk','boat','swim']){const c={...initial(),width,height},focus={x:200,z:-250},next=stepDeadzoneCamera(c,focus,{mode,dt:.016,force:true}),p=projectPixel(next,focus.x,focus.z),box=cameraDeadzone(next,mode);assert.ok(p.x>=box.left-1&&p.x<=box.right+1);assert.ok(p.y>=box.top-1&&p.y<=box.bottom+1);}
});
test('world points shift together by whole pixels without slope or texture crawling',()=>{
  const a=initial(),b={...a,x:a.x+.11,z:a.z+.08},one={x:-30.17,z:-60.73},two={x:16.63,z:-42.24};const ap=projectPixel(a,one.x,one.z),bp=projectPixel(b,one.x,one.z),aq=projectPixel(a,two.x,two.z),bq=projectPixel(b,two.x,two.z);assert.deepEqual({x:bp.x-ap.x,y:bp.y-ap.y},{x:bq.x-aq.x,y:bq.y-aq.y});assert.ok(Number.isInteger(bp.x)&&Number.isInteger(bp.y));assert.ok(Number.isInteger(cameraOffset(b).x));
});
test('screen/world conversion uses the same snapped camera offset',()=>{
  const camera={...initial(),x:-16.91,z:-50.92};for(const p of[{x:-31.8,z:-55.2},{x:1.27,z:-52.45},{x:-10,z:-45}]){const pixel=projectPixel(camera,p.x,p.z),world=unprojectPixel(camera,pixel.x,pixel.y);assert.ok(Math.abs(world.x-p.x)<=.5/camera.scale);assert.ok(Math.abs(world.z-p.z)<=.5/camera.scale);}
});
test('axis-aligned art footprints preserve source map points and close without diagonals',()=>{
  const source=[{x:-41.5,z:-235.8},{x:-19.4,z:99.6},{x:7.8,z:98},{x:-3.3,z:-42.2}],copy=structuredClone(source),ring=rectilinearOutline(source,{grid:1,span:10});assert.deepEqual(source,copy);assert.ok(ring.length>4);for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];assert.ok(a.x===b.x||a.z===b.z);assert.ok(Number.isInteger(a.x)&&Number.isInteger(a.z));}
  const coastline=rectilinearOutline(source,{grid:2,span:8,closed:false});for(let i=1;i<coastline.length;i++)assert.ok(coastline[i].x===coastline[i-1].x||coastline[i].z===coastline[i-1].z);
});
test('long casts fit both boat and float and do not keep drifting the camera after release',()=>{
  for(const [width,height]of[[640,360],[328,710],[560,259]])for(const [dx,dz]of[[33,0],[-33,0],[0,-33],[0,33]]){
    const boat={x:-120,z:-60},float={x:boat.x+dx,z:boat.z+dz},scale=Math.max(3,Math.floor(Math.min(7,(width-80)/(Math.abs(dx)+5),(height-100)/(Math.abs(dz)+6))));let camera={x:boat.x,z:boat.z-4,scale,width,height};camera=keepCameraPointsVisible(camera,[boat,float]);for(const p of[boat,float]){const q=projectPixel(camera,p.x,p.z);assert.ok(q.x>=27&&q.x<=width-27);assert.ok(q.y>=31&&q.y<=height-61);}assert.deepEqual(keepCameraPointsVisible(camera,[boat,float]),camera);
  }
});
