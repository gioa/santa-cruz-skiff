import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SKIFF_RACKS,boatRenderPose,parkedSkiffPoses,skiffScreenPose,hitSkiff,skiffScale} from '../dist/pixel-boat-geometry.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {HARBOR}=await import('../dist/harbor-layout.js');
const {onPier,insidePolygon,pierRings,buildingFootprints}=await import('../dist/pixel-geography.js');
const base={mode:'walk',playerX:HARBOR.spawnX,playerZ:HARBOR.spawnZ,boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,heading:0,launchStage:'stored',fishState:'idle',moored:true};
const poseAt=p=>boatRenderPose({...base,launchStage:'lowering',launchProgress:p},HARBOR);
const project=(x,z)=>({x:x*6,y:z*6});
const geometry=(pose,time=0)=>skiffScreenPose(pose,{cameraScale:6,project,time});
const hullCorners=pose=>[-24,24].flatMap(x=>[-44,44].map(z=>({x:pose.x+.18*(x*Math.cos(pose.heading)+z*Math.sin(pose.heading)),z:pose.z+.18*(-x*Math.sin(pose.heading)+z*Math.cos(pose.heading))})));
const artPier=pierRings;
const safeDryFootprint=pose=>{for(const p of hullCorners(pose)){assert.ok(onPier(p.x,p.z),`hull over water at ${JSON.stringify(p)}`);assert.ok(artPier.some(r=>insidePolygon(p.x,p.z,r)),'hull must also stay inside rendered deck');assert.ok(!buildingFootprints.some(b=>insidePolygon(p.x,p.z,b.points)),'hull cannot occupy a building');}};

test('three full-size stored rentals fit on the straight playable pier with clear separation',()=>{
  const poses=[boatRenderPose(base,HARBOR),...parkedSkiffPoses()];assert.equal(poses.length,3);
  for(const pose of poses)safeDryFootprint(pose);
  for(let i=1;i<poses.length;i++)assert.ok(poses[i].z-poses[i-1].z>48*.18+2,'rack hulls leave more than two metres of gap');
  assert.ok(HARBOR.spawnX-(SKIFF_RACKS[0].x+88*.18/2)>1,'spawn clears assigned hull');
});
test('all models and occupancy states share one physical hull size at every supported zoom',()=>{
  const poses=[boatRenderPose(base,HARBOR),...parkedSkiffPoses(),poseAt(.6),boatRenderPose({...base,mode:'boat',launchStage:'afloat'},HARBOR)];
  for(const zoom of[2,3,4,6,7,9])for(const pose of poses){const g=skiffScreenPose(pose,{cameraScale:zoom,project});assert.equal(g.width,48*skiffScale(zoom));assert.equal(g.height,88*skiffScale(zoom));assert.ok(Math.abs(g.height/zoom-15.84)<1e-12,'zoom must not enlarge dry boats beyond the pier');}
});
test('stored hull never follows the water berth, tide bob or lowering lift',()=>{
  const pose=boatRenderPose({...base,boatX:900,boatZ:600},HARBOR);assert.equal(pose.x,SKIFF_RACKS[0].x);assert.equal(pose.z,SKIFF_RACKS[0].z);assert.equal(pose.afloat,false);assert.equal(pose.rigged,false);assert.equal(pose.bobWeight,0);assert.equal(pose.lift,0);
  const first=geometry(pose);for(const time of[.2,1,10,60])assert.deepEqual(geometry(pose,time),first);
  const water=project(HARBOR.boatX,HARBOR.boatZ);assert.equal(hitSkiff(water.x,water.y,first),false,'old water position must not be an invisible boat target');
});
test('24-second lowering begins exactly at the rack and ends at the actual water berth',()=>{
  const stored=geometry(boatRenderPose(base,HARBOR),1),start=geometry(poseAt(0),1),finish=geometry(poseAt(1),1),afloat=geometry(boatRenderPose({...base,launchStage:'afloat'},HARBOR),1);
  for(const key of['x','z','heading','screenX','screenY','width','height']){assert.equal(start[key],stored[key],key);assert.equal(finish[key],afloat[key],key);}
  assert.equal(finish.x,HARBOR.boatX);assert.equal(finish.z,HARBOR.boatZ);assert.equal(finish.afloat,true);
});
test('every pre-hoist transfer footprint stays on the pier while the boat turns toward the crane',()=>{
  for(let i=0;i<=1000;i++){const pose=poseAt(i/1000*.3);safeDryFootprint(pose);assert.equal(pose.lift,0);assert.equal(pose.rigged,false);}
  assert.equal(poseAt(.3).heading,0);assert.equal(poseAt(.3).x,HARBOR.craneX+4.8);
});
test('launch phases have no discontinuous jumps or land-to-water teleport at 60 fps',()=>{
  let previous=poseAt(0);
  for(let i=1;i<=24*60;i++){const pose=poseAt(i/(24*60));assert.ok(Math.hypot(pose.x-previous.x,pose.z-previous.z)<.05);assert.ok(Math.abs(pose.heading-previous.heading)<.006);assert.ok(Math.abs(pose.lift-previous.lift)<.16);assert.ok(!pose.afloat||i===24*60);previous=pose;}
  for(const boundary of[.3,.45,.8,.96]){const a=poseAt(boundary-1e-8),b=poseAt(boundary+1e-8);for(const key of['x','z','heading','lift','bobWeight'])assert.ok(Math.abs(a[key]-b[key])<1e-4,`${key} jumps at ${boundary}`);}
});
test('rotated hit areas and bounds follow the visible lifted hull and leave distant ground alone',()=>{
  for(let i=0;i<24;i++){const pose={...poseAt(.6),heading:i*Math.PI/12},g=geometry(pose);assert.ok(hitSkiff(g.screenX,g.screenY,g));const x=g.screenX+Math.cos(pose.heading)*g.width*.4,y=g.screenY-Math.sin(pose.heading)*g.width*.4;assert.ok(hitSkiff(x,y,g));assert.ok(x>=g.bounds.left&&x<=g.bounds.right&&y>=g.bounds.top&&y<=g.bounds.bottom);assert.equal(hitSkiff(g.screenX+300,g.screenY,g),false);}
});
test('presentation leaves both model and harbor coordinates unchanged',()=>{
  const state=structuredClone(base),harbor=structuredClone(HARBOR),saved=structuredClone(state);for(let i=0;i<=100;i++)boatRenderPose({...state,launchStage:'lowering',launchProgress:i/100},harbor);assert.deepEqual(state,saved);assert.deepEqual(harbor,HARBOR);
});

// Geometry integration needs no browser: these no-op paint methods exercise the
// actual renderer's camera, target selection, anchors and presentation metadata.
const fakeCanvas=()=>({width:1,height:1,getContext:()=>new Proxy({createPattern:()=>({setTransform(){}})},{get:(target,key)=>key in target?target[key]:()=>{}})});
globalThis.document={createElement:fakeCanvas};
globalThis.DOMMatrix=class{translate(){return this;}scale(){return this;}};
const {createPixelWorld}=await import('../dist/pixel-world.js');
test('mobile and desktop targets/anchors/metadata use the same dry and launching boat geometry',()=>{
  for(const [width,height]of[[390,844],[320,568],[568,320],[1280,720]]){
    const world=createPixelWorld(fakeCanvas());world.resize(width,height);world.draw(base,0);
    const metadata=world.publicState().boats,oldBerth=world.cssWorldToScreen(HARBOR.boatX,HARBOR.boatZ);
    assert.equal(world.walkingTargetAt(oldBerth.x,oldBerth.y,base),null,`${width}: invisible old berth target`);
    for(const boat of[metadata.player,...metadata.parked]){assert.equal(boat.width,metadata.player.width);assert.equal(boat.height,metadata.player.height);assert.equal(world.walkingTargetAt(boat.screenX,boat.screenY,base),'counter');}
    for(const progress of[0,.3,.45,.6,.8,1]){
      const state={...base,launchStage:'lowering',launchProgress:progress};world.draw(state,0);const boat=world.publicState().boats.player,anchor=world.interactionAnchors(state).boat;assert.ok(Math.abs(anchor.x-boat.screenX)<1e-9);assert.ok(Math.abs(anchor.y-boat.screenY)<1e-9);assert.equal(world.walkingTargetAt(boat.screenX,boat.screenY,state),'boarding',`${width}: launch ${progress}`);
    }
  }
});
