import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getRodCurve,getReelPose,getFishingLine,getFishingPresentation} from '../dist/pixel-rod-geometry.js';
const base={mode:'boat',launchStage:'afloat',boatX:-130,boatZ:-60,heading:0,fishState:'waiting',rig:'bottom',rodElevation:45,rodAzimuth:70,rodMount:'hand',rodBend:.1,lureDepth:20,paidLineMeters:21,reelMode:'brake',bobber:{x:-127,z:-60,height:-20}};
const project=(x,z)=>({x:x*6,y:z*6});

test('only a float rig displays a float; submerged rigs never inherit a bobber marker',()=>{
  for(const rig of['bottom','dropper','slider','jig','sabiki','float'])for(const fishState of['sinking','waiting','bite','fight']){const p=getFishingPresentation({...base,rig,fishState});assert.equal(p.showFloat,rig==='float');assert.equal(p.kind,rig==='float'?'float':'submerged');assert.equal(p.cameraTracksLure,rig==='float');}
  for(const fishState of['idle','casting','landed'])assert.equal(getFishingPresentation({...base,fishState}).deployed,false);
  assert.equal(getFishingPresentation({...base,fishState:'flight'}).kind,'flight');assert.equal(getFishingPresentation({...base,fishState:'flight'}).showFloat,false);
});
test('every mount, elevation, heading and load shares exactly one rod/line endpoint',()=>{
  for(const rodMount of['hand','port','starboard'])for(const rodElevation of[5,45,85])for(const heading of[0,1.3,Math.PI,5.4])for(const rodBend of[0,.5,1]){
    const state={...base,rodMount,rodElevation,heading,rodBend},rod=getRodCurve(state,{origin:{x:163,y:219},scale:1.08}),line=getFishingLine(state,rod,{project});
    assert.deepEqual(rod.points[0],rod.base);assert.strictEqual(line.start,rod.tip);assert.strictEqual(line.points[0],rod.points.at(-1));
    for(let i=1;i<rod.points.length;i++){const a=rod.points[i-1],b=rod.points[i];assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<5,'curved beam has no disconnected segment');}
  }
});
test('azimuth follows the model convention and mount sockets stay on their own gunwale',()=>{
  const right=getRodCurve({...base,rodAzimuth:70}),left=getRodCurve({...base,rodAzimuth:-70});assert.ok(right.tip.x>right.base.x);assert.ok(left.tip.x<left.base.x);
  const hand=getRodCurve(base),port=getRodCurve({...base,rodMount:'port'}),starboard=getRodCurve({...base,rodMount:'starboard'});assert.equal(hand.mounted,false);assert.equal(port.mounted,true);assert.equal(port.base.x,-17);assert.equal(starboard.base.x,17);assert.equal(hand.base.x,4);assert.notDeepEqual(port.base,hand.base);assert.notDeepEqual(starboard.base,hand.base);
});
test('actual model bend lowers the tip continuously without moving its anchored grip',()=>{
  let previous=getRodCurve({...base,rodBend:0});for(let i=1;i<=100;i++){const next=getRodCurve({...base,rodBend:i/100});assert.deepEqual(next.base,previous.base);assert.ok(next.tip.y>previous.tip.y);assert.ok(Math.hypot(next.tip.x-previous.tip.x,next.tip.y-previous.tip.y)<.4);previous=next;}
});
test('the winding hand follows the reel knob while the other hand supports the rod',()=>{
  const rod=getRodCurve(base);for(let i=0;i<30;i++){const pose=getReelPose({...base,reeling:true},rod,{turns:i/30});assert.strictEqual(pose.hands[0],rod.base);assert.strictEqual(pose.hands[1],pose.knob);}
  assert.deepEqual(getReelPose(base,rod).hands,[rod.rearGrip,rod.base]);assert.deepEqual(getReelPose({...base,reeling:true},getRodCurve({...base,rodMount:'port'})).hands,[],'mounted rods must not have disconnected hands');
});
test('surface float position is distinct from the real submerged hook position',()=>{
  const state={...base,rig:'float',floatPosition:{x:-115,z:-65},bobber:{x:-111,z:-61,height:-8},lureDepth:8},rod=getRodCurve(state),line=getFishingLine(state,rod,{project});assert.deepEqual(line.end,project(-115,-65));assert.notDeepEqual(line.end,project(-111,-61));assert.equal(line.underwater.length,0);
});
test('submerged line terminates at the surface intersection and fades after only a short tail',()=>{
  const state={...base,bobber:{x:160,z:-240,height:-70},lureDepth:70},rod=getRodCurve(state,{origin:project(base.boatX,base.boatZ),scale:1.08}),line=getFishingLine(state,rod,{project});
  assert.ok(Math.hypot(line.end.x-rod.waterBase.x,line.end.y-rod.waterBase.y)<Math.hypot(160*6-rod.waterBase.x,-240*6-rod.waterBase.y)*.03);
  assert.equal(line.showFloat,false);assert.ok(Math.hypot(line.underwater[1].x-line.end.x,line.underwater[1].y-line.end.y)<10);
});
test('free-spool line has visible slack and airborne non-float rigs remain sinkers/lures',()=>{
  const rod=getRodCurve(base),brake=getFishingLine(base,rod,{project}),free=getFishingLine({...base,reelMode:'free',paidLineMeters:35},rod,{project});assert.ok(free.slack>brake.slack);
  const flight=getFishingLine({...base,fishState:'flight',bobber:{x:2,z:3,height:4}},rod,{project,cameraScale:6});assert.equal(flight.showFloat,false);assert.deepEqual(flight.end,{x:12,y:-6});
});
test('visible line sag follows physical slack, not merely whether the bail is open',()=>{
 const rod=getRodCurve(base),taut=getFishingLine({...base,reelMode:'free',lineSlackMeters:0},rod,{project}),slack=getFishingLine({...base,reelMode:'brake',lineSlackMeters:3},rod,{project});
 assert.equal(taut.slack,0);assert.ok(slack.slack>taut.slack);
 assert.strictEqual(slack.points[0],rod.tip);assert.deepEqual(slack.points.at(-1),taut.points.at(-1));
});
test('model surface-intersection displacement is preserved on the enlarged pixel-art rod',()=>{
  const state={...base,rodTip:{x:-128,z:-60,height:2},lineEntry:{x:-127.5,z:-59.8,height:0}},rod=getRodCurve(state,{origin:{x:100,y:150},scale:1.08}),line=getFishingLine(state,rod,{project});assert.equal(line.entrySource,'model');
  assert.ok(Math.abs(line.end.x-rod.waterBase.x-.5/2*rod.tipHeightPixels)<1e-9);assert.ok(Math.abs(line.end.y-rod.waterBase.y-.2/2*rod.tipHeightPixels)<1e-9);assert.strictEqual(line.start,rod.tip);
});

globalThis.fetch=async url=>new Response(await readFile(url));
const fakeCanvas=()=>({width:1,height:1,getContext:()=>new Proxy({createPattern:()=>({setTransform(){}})},{get:(target,key)=>key in target?target[key]:()=>{}})});
globalThis.document={createElement:fakeCanvas};globalThis.DOMMatrix=class{translate(){return this;}scale(){return this;}};
const {createPixelWorld}=await import('../dist/pixel-world.js');
test('underwater rigs retain the boat close-up and variable mobile consoles stay reserved',()=>{
  for(const [width,height,inset]of[[390,844,286],[320,568,286],[568,320,150],[1280,720,286]]){
    const world=createPixelWorld(fakeCanvas());world.resize(width,height);world.setBottomInset(inset);const state={...base,bobber:{x:-60,z:-150,height:-35},lureDepth:35,rodTip:{x:-128,z:-60,height:2},lineEntry:{x:-127.5,z:-60,height:0}};world.draw(state,0);const farScale=world.camera.scale;world.draw({...state,bobber:{x:-127.5,z:-60,height:-35}},0);assert.equal(world.camera.scale,farScale,'invisible underwater distance cannot zoom out the boat');assert.ok(farScale>=5,'only the actual short-screen hull/rod extent can reduce zoom');assert.equal(world.camera.viewport.bottom,inset);
    world.setBottomInset(null);assert.equal(world.camera.viewport.bottom,height<=500&&width>height?126:232);
  }
});
test('short-phone HUD and tackle console never cover the rendered hull or raised rod',()=>{
  for(const [width,height,top,bottom]of[[320,568,110,273],[320,568,110,288],[390,844,110,310],[568,320,50,140],[568,320,50,174]])for(const delta of[-18,2,20]){
    const world=createPixelWorld(fakeCanvas());world.resize(width,height);world.setTopInset(top);world.setBottomInset(bottom);
    const state={...base,rodElevation:66.5,rodAzimuth:-63.9,paidLineMeters:16.4,bobber:{x:-135,z:-60+delta*5,height:-15},lureDepth:15,rodTip:{x:-132,z:-60,height:3},lineEntry:{x:-132,z:-60+delta,height:0}};
    for(let i=0;i<12;i++)world.draw(state,1/60);
    const frame=world.publicState().camera.framing;
    assert.ok(frame.primary.top>=top+8,`${width}×${height}: rod/hull top ${frame.primary.top} behind HUD`);assert.ok(frame.primary.bottom<=height-bottom-8,`${width}×${height}: hull bottom ${frame.primary.bottom} under console`);
    assert.ok(world.camera.scale>=2&&world.camera.scale<=6);
    const first={...world.camera};for(let i=0;i<12;i++)world.draw(state,0);assert.deepEqual(world.camera,first,'unchanged rod pose keeps camera still');
  }
});
test('small load changes do not alternate camera zoom on a cramped fishing screen',()=>{
  const world=createPixelWorld(fakeCanvas());world.resize(320,568);world.setBottomInset(288);world.setTopInset(110);const state={...base,rodElevation:66.5,rodAzimuth:-63.9,rodTip:{x:-132,z:-60,height:3},lineEntry:{x:-132,z:-42,height:0}};const scales=[];
  for(let i=0;i<120;i++){state.rodBend=.2+Math.sin(i*.2)*.015;world.draw(state,1/60);scales.push(world.camera.scale);}
  assert.equal(new Set(scales.slice(20)).size,1,'load oscillation cannot repeatedly zoom in and out');
});
