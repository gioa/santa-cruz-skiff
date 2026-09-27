import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const geo=await import('../dist/pixel-geography.js'),harbor=await import('../dist/pixel-harbor-layout.js'),nav=await import('../dist/pixel-navigation.js');
const legacyGeo=await import('../dist/geography.js'),legacyHarbor=await import('../dist/harbor-layout.js'),legacyNav=await import('../dist/navigation.js');
const {PixelSimulation}=await import('../dist/pixel-sim.js');
const {HARBOR}=harbor,now=()=>new Date('2026-09-27T20:00:00Z');

test('both straight deck margins remain continuously walkable for the full wharf length',()=>{
 for(const x of[-28,22]){
  assert.equal(harbor.clearWalkSegment({x,z:-480},{x,z:260}),true);
  for(let z=-480;z<=260;z+=5){assert.equal(harbor.walkAllowed(x,z),true);assert.equal(harbor.walkBlocked(x,z),false);assert.equal(harbor.walkHeight(x,z),HARBOR.deckHeight);}
 }
 const sim=new PixelSimulation({now});sim.start();Object.assign(sim.state,{playerX:-28,playerZ:-300});assert.equal(sim.walkTo({x:-28,z:-460}).ok,true);for(let t=0;t<80&&sim.state.autoWalk;t+=.1)sim.step(.1);assert.equal(sim.state.arrival,'ground');assert.ok(Math.abs(sim.state.playerZ+460)<1e-6);assert.equal(sim.state.playerX,-28);
});

test('removed west-side bulges become water while old eastern water pockets become solid straight deck',()=>{
 const west={x:-40,z:-400},east={x:17,z:-400};assert.equal(legacyGeo.onPier(west.x,west.z),true);assert.equal(geo.onPier(west.x,west.z),false);assert.equal(harbor.walkAllowed(west.x,west.z),false);assert.equal(nav.hullPenetration({...west,heading:0}),0);
 assert.equal(legacyGeo.onPier(east.x,east.z),false);assert.equal(geo.onPier(east.x,east.z),true);assert.equal(legacyNav.hullPenetration({...east,heading:0}),0);assert.ok(nav.hullPenetration({...east,heading:0})>0);assert.equal(nav.waterRoute({x:30,z:-400},east),null);
 assert.equal(nav.clearWaterSegment({x:-45,z:-400},{x:-34,z:-400}),true);assert.equal(legacyNav.clearWaterSegment({x:-45,z:-400},{x:-34,z:-400}),false);
});

test('all four fishing destinations and return routes clear the straight deck and the preserved boarding structure',()=>{
 const berth={x:HARBOR.boatX,z:HARBOR.boatZ},dock={x:HARBOR.returnX,z:HARBOR.returnZ};
 for(const spot of geo.FISHING_SPOTS)for(const[start,target]of[[berth,spot],[spot,dock]]){
  const route=nav.waterRoute(start,target);assert.ok(route,spot.name);let previous=start;
  for(const p of route){assert.equal(nav.clearWaterSegment(previous,p),true);const steps=Math.max(1,Math.ceil(Math.hypot(p.x-previous.x,p.z-previous.z)));for(let i=0;i<=steps;i++){const f=i/steps,x=previous.x+(p.x-previous.x)*f,z=previous.z+(p.z-previous.z)*f;assert.equal(geo.onPier(x,z)||geo.onLand(x,z)||harbor.harborWaterBlocked(x,z),false);}previous=p;}
  assert.ok(Math.hypot(previous.x-target.x,previous.z-target.z)<1e-6);
 }
});

test('a turning hull contacts the new straight edge without teleporting or losing engine state',()=>{
 const before={x:25.1,z:-400,heading:0},v={...before,heading:Math.PI/2,vx:0,vz:0,yawRate:1,rpm:.7,tiller:1,thrustN:500};assert.equal(nav.hullPenetration(before),0);assert.ok(nav.hullPenetration(v)>0);assert.equal(nav.resolveVesselContact(v,before).collided,true);assert.deepEqual({x:v.x,z:v.z,heading:v.heading},before);assert.equal(nav.hullPenetration(v),0);assert.equal(v.rpm,.7);assert.equal(v.thrustN,500);
});

function paidBoatSave(){const sim=new PixelSimulation({now});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});sim.launchBoat();for(let i=0;i<97;i++)sim.step(.25);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.equal(sim.board().ok,true);sim.unmoor();sim.state.sailed=456;sim.state.catches.push({name:'蓝岩鱼',kg:.8,length:30,kept:true,catchId:'saved-catch'});return sim.snapshot();}

test('resuming a hull inside new deck moves only that hull to nearby water and preserves its rental and cargo',()=>{
 for(const pose of[{x:17,z:-400,heading:0},{x:-25,z:-472,heading:0},{x:-30.2,z:-472,heading:0},{x:24.2,z:-410,heading:.2},{x:0,z:-482.2,heading:Math.PI/4}]){
  const saved=paidBoatSave();Object.assign(saved,{boatX:pose.x,boatZ:pose.z,heading:pose.heading});assert.ok(nav.hullPenetration(pose)>0);const sim=new PixelSimulation({saved,now});sim.start(true);assert.equal(nav.hullPenetration({x:sim.state.boatX,z:sim.state.boatZ,heading:sim.state.heading}),0);assert.ok(Math.hypot(sim.state.boatX-pose.x,sim.state.boatZ-pose.z)<12);assert.equal(sim.state.heading,pose.heading);assert.equal(sim.state.rentalPaid,true);assert.equal(sim.state.profile.credits,saved.profile.credits);assert.deepEqual(sim.state.packed,saved.packed);assert.deepEqual(sim.state.catches,saved.catches);assert.equal(sim.state.sailed,456);
 }
});

test('offshore saved vessels remain in place and walkers from removed deck resume safely at the nearby spawn',()=>{
 const saved=paidBoatSave();Object.assign(saved,{boatX:-100,boatZ:-250,heading:1.2});const pose={x:saved.boatX,z:saved.boatZ,heading:saved.heading};assert.equal(nav.clearResumeVesselPose(pose),pose);const offshore=new PixelSimulation({saved,now});offshore.start(true);assert.deepEqual({x:offshore.state.boatX,z:offshore.state.boatZ,heading:offshore.state.heading},pose);assert.equal(offshore.state.sailed,456);
 const walking={...saved,mode:'walk',playerX:-40,playerZ:-400},sim=new PixelSimulation({saved:walking,now});sim.start(true);assert.equal(sim.state.playerX,HARBOR.spawnX);assert.equal(sim.state.playerZ,HARBOR.spawnZ);assert.equal(harbor.walkAllowed(sim.state.playerX,sim.state.playerZ),true);assert.equal(harbor.walkBlocked(sim.state.playerX,sim.state.playerZ),false);assert.equal(sim.state.boatX,saved.boatX);assert.equal(sim.state.boatZ,saved.boatZ);
});

test('geometry factories accept independent layouts while legacy defaults retain their original pier',()=>{
 const inside=(x,z)=>x>=0&&x<=10&&z>=0&&z<=10,ring=[{x:0,z:0},{x:10,z:0},{x:10,z:10},{x:0,z:10}];
 const customHarbor=legacyHarbor.createHarborLayout({onPier:inside,onLand:()=>false,buildingFootprints:[]}),customNav=legacyNav.createNavigation({onPier:inside,onLand:()=>false,pierRings:[ring],landPolygons:[],harborWaterBlocked:()=>false,harborObstacleRings:[]});
 assert.equal(customHarbor.walkHeight(5,5),HARBOR.deckHeight);assert.equal(customHarbor.walkAllowed(-40,-400),false);assert.equal(customNav.clearWaterSegment({x:-5,z:5},{x:15,z:5}),false);assert.equal(customNav.clearWaterSegment({x:-3,z:-5},{x:-3,z:15}),true);assert.equal(legacyHarbor.walkAllowed(-40,-400),true);assert.equal(legacyNav.hullPenetration({x:17,z:-400,heading:0}),0);
});
