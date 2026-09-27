import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraOffset,projectPixel,unprojectPixel,cameraDeadzone,cameraPlayfield,fitCameraBounds,stepDeadzoneCamera,keepCameraPointsVisible,cameraZoomForState,zoomCameraAt,rectilinearOutline} from '../dist/pixel-camera.js';
import {skiffScale} from '../dist/pixel-boat-geometry.js';
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
test('continuous northbound sailing locks to the upper boundary without one-pixel reverse steps',()=>{
  for(const [width,height]of[[640,360],[328,710],[560,315]])for(const scale of[4,6])for(const fps of[30,60,120]){
    let camera={x:0,z:0,scale,width,height},focus={x:0,z:0},previous=projectPixel(camera,0,0).y;const steady=[];
    for(let frame=0;frame<40*fps;frame++){
      focus.z-=2.2/fps;camera=stepDeadzoneCamera(camera,focus,{mode:'boat',dt:1/fps});const y=projectPixel(camera,focus.x,focus.z).y;
      assert.ok(y<=previous,`northbound screen position reversed: ${previous} -> ${y}`);previous=y;
      if(frame>25*fps)steady.push(y);
    }
    assert.deepEqual([...new Set(steady)],[cameraDeadzone(camera,'boat').top]);
    assert.deepEqual(stepDeadzoneCamera(camera,focus,{mode:'boat'}),camera,'no delayed camera catch-up after stopping');
  }
});
test('edge tracking keeps both diagonal axes monotonic and leaves the unused axis untouched',()=>{
  for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){
    let camera={x:-.123,z:.327,scale:6,width:328,height:710},focus={x:camera.x,z:camera.z},previous=projectPixel(camera,focus.x,focus.z),offset=cameraOffset(camera);
    for(let frame=0;frame<1500;frame++){
      focus.x+=dx*.073;focus.z+=dz*.073;camera=stepDeadzoneCamera(camera,focus,{mode:'boat'});const p=projectPixel(camera,focus.x,focus.z),nextOffset=cameraOffset(camera);
      if(dx)assert.ok((p.x-previous.x)*dx>=0);else{assert.equal(p.x,previous.x);assert.equal(nextOffset.x,offset.x);}
      if(dz)assert.ok((p.y-previous.y)*dz>=0);else{assert.equal(p.y,previous.y);assert.equal(nextOffset.y,offset.y);}
      previous=p;offset=nextOffset;
    }
  }
});
test('engine toggles, mooring changes and starting a cast do not rescale the scene',()=>{
  const camera={width:328,height:710};
  for(const engine of[false,true])for(const moored of[false,true])for(const fishState of['idle','casting','landed'])assert.equal(cameraZoomForState(camera,{mode:'boat',engine,moored,fishState,boatX:0,boatZ:0}),6);
  assert.equal(cameraZoomForState(camera,{mode:'walk'}),6);
  assert.equal(cameraZoomForState({width:560,height:259},{mode:'boat',fishState:'flight',boatX:0,boatZ:0,bobber:{x:0,z:-33}}),4,'a long cast can still fit in short landscape');
});
test('an explicit or long-cast zoom preserves the boat pixel instead of jumping around the viewport centre',()=>{
  for(const [width,height]of[[640,360],[328,710],[560,315]])for(const scale of[3,4,6,7]){
    const camera={x:-130.217,z:-66.361,scale:6,width,height},boat={x:-139.683,z:-61.019},p=projectPixel(camera,boat.x,boat.z),zoomed=zoomCameraAt(camera,scale,boat);
    assert.deepEqual(projectPixel(zoomed,boat.x,boat.z),p);assert.equal(zoomed.scale,scale);assert.equal(camera.scale,6);
  }
});
test('southbound boats stop above the fixed CSS console on tall, short and landscape screens',()=>{
  for(const [cssWidth,cssHeight,width,height]of[[1280,720,640,360],[390,844,328,710],[320,568,300,533],[568,320,560,315]]){
    const consoleHeight=cssHeight<=500&&cssWidth>cssHeight?126:232,viewport={height:cssHeight,bottom:consoleHeight,gap:10};
    let camera={x:0,z:0,scale:6,width,height,viewport},focus={x:0,z:0};camera=stepDeadzoneCamera(camera,focus,{mode:'boat'});let previous=projectPixel(camera,0,0).y;const steady=[];
    for(let frame=0;frame<2400;frame++){
      focus.z+=2.2/60;camera=stepDeadzoneCamera(camera,focus,{mode:'boat',dt:1/60});const p=projectPixel(camera,focus.x,focus.z);
      assert.ok(p.y>=previous,'southbound boat must not bounce back toward the top');previous=p.y;if(frame>1500)steady.push(p.y);
    }
    const box=cameraDeadzone(camera,'boat'),spriteBottomCss=(previous+54*1.08)*cssHeight/height;
    assert.deepEqual([...new Set(steady)],[box.bottom]);assert.ok(spriteBottomCss<=cssHeight-consoleHeight-9,`${cssWidth}×${cssHeight}: boat overlaps console`);assert.ok(box.top<=box.bottom);
    assert.equal(box.top,Math.round(height*.31),'normal northbound framing is unchanged');
    assert.equal(cameraDeadzone(camera,'walk').bottom,Math.round(height*.76),'walking keeps its broad deadzone');
  }
});
test('tiny viewports cannot invert the boat deadzone',()=>{
  for(const height of[160,220,260,320]){const camera={x:0,z:0,scale:6,width:560,height,viewport:{height,bottom:126,gap:10}},box=cameraDeadzone(camera,'boat');assert.ok(box.top>=0);assert.ok(box.bottom>=box.top);assert.ok(box.bottom<=height-126);const next=stepDeadzoneCamera(camera,{x:0,z:500},{mode:'boat'});assert.equal(projectPixel(next,0,500).y,box.bottom);}
});
test('console clearance reserves the same hull scale as dry and occupied boats at every zoom',()=>{
  for(const [width,height,cssHeight,bottom]of[[640,360,720,232],[328,710,844,232],[300,533,568,232],[560,315,320,126]])for(const scale of[2,3,6,9]){
    const camera={x:0,z:0,scale,width,height,viewport:{height:cssHeight,bottom,gap:10}},box=cameraDeadzone(camera,'boat'),visibleBottom=(cssHeight-bottom-10)*height/cssHeight;
    assert.ok(box.bottom+54*skiffScale(scale)<=visibleBottom+1,`scale ${scale} hull enters console`);
    assert.ok(box.top<=box.bottom,'camera deadzone remains ordered');
  }
});
test('long casts fit the unobscured playfield above the console in both directions',()=>{
  for(const [width,height,cssHeight,bottom]of[[640,360,720,232],[328,710,844,232],[300,533,568,232],[560,315,320,126]])for(const dz of[-33,33]){
    const boat={x:0,z:0},float={x:0,z:dz},base={x:0,z:0,scale:6,width,height,viewport:{height:cssHeight,bottom,gap:10}},state={mode:'boat',fishState:'flight',boatX:0,boatZ:0,bobber:float};
    const scale=cameraZoomForState(base,state);let camera=zoomCameraAt(base,scale,boat);const box=cameraDeadzone(camera,'boat');camera=keepCameraPointsVisible(camera,[boat,float],{paddingBottom:height-box.bottom});
    for(const point of[boat,float]){const p=projectPixel(camera,point.x,point.z);assert.ok(p.y>=31&&p.y<=box.bottom,JSON.stringify({width,height,scale,dz,p,box}));}
  }
});
test('framing uses actual sprite bounds and cannot sacrifice the boat to a distant line endpoint',()=>{
  const camera={x:0,z:0,scale:6,width:300,height:533,viewport:{height:568,top:110,bottom:288,gap:10}},primary={left:100,right:155,top:52,bottom:151},all={left:100,right:180,top:52,bottom:510},before=cameraOffset(camera),next=fitCameraBounds(camera,all,{primaryBounds:primary}),after=cameraOffset(next),field=cameraPlayfield(camera),dy=after.y-before.y;
  assert.ok(primary.top+dy>=field.top);assert.ok(primary.bottom+dy<=field.bottom);assert.ok(Number.isInteger(dy));
  const moved=r=>({left:r.left+after.x-before.x,right:r.right+after.x-before.x,top:r.top+dy,bottom:r.bottom+dy});assert.deepEqual(fitCameraBounds(next,moved(all),{primaryBounds:moved(primary)}),next,'a stopped composition does not drift');
});
