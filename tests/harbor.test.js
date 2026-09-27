import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {HARBOR,BOARDING_WALK_PATH,walkHeight,walkAllowed,walkBlocked,clearWalkSegment,canBoardFrom,migrateHarborSave}=await import('../dist/harbor-layout.js');
const {onPier,onLand}=await import('../dist/geography.js');

test('counter, left stair and landing form a continuous walk from the nearby start',()=>{
 let previous={x:HARBOR.spawnX,z:HARBOR.spawnZ};
 assert.equal(onPier(previous.x,previous.z),true);
 for(const p of BOARDING_WALK_PATH){assert.ok(clearWalkSegment(previous,p),JSON.stringify({previous,p}));assert.ok(walkAllowed(p.x,p.z));assert.equal(walkBlocked(p.x,p.z),false);previous=p;}
 assert.ok(HARBOR.boardingX<HARBOR.spawnX);
 assert.ok(HARBOR.spawnX<HARBOR.counterX);
 assert.equal(onPier(HARBOR.boatX,HARBOR.boatZ)||onLand(HARBOR.boatX,HARBOR.boatZ),false);
});
test('stair descends shoreward to the fixed landing with no boarding through the high deck',()=>{
 const x=(HARBOR.stair.minX+HARBOR.stair.maxX)/2;
 assert.equal(walkHeight(x,HARBOR.stair.minZ),HARBOR.deckHeight);
 assert.equal(walkHeight(x,HARBOR.stair.maxZ),HARBOR.landingHeight);
 assert.ok(walkHeight(x,-63)>walkHeight(x,-60));
 assert.ok(canBoardFrom(HARBOR.boardingX,HARBOR.boardingZ));
 assert.equal(canBoardFrom(-29,-54),false);
 assert.equal(canBoardFrom(x,-59),false);
 assert.equal(walkAllowed(18,-76),false,'removed right-side floating dock must be water');
});
test('the top connector meets the stair at deck height without overlapping its descent',()=>{
 assert.equal(HARBOR.connector.maxZ,HARBOR.stair.minZ);
 const x=(HARBOR.stair.minX+HARBOR.stair.maxX)/2,joint=HARBOR.stair.minZ;
 for(let z=HARBOR.connector.minZ;z<=joint;z+=.05)assert.equal(walkHeight(x,z),HARBOR.deckHeight);
 assert.equal(walkHeight(x,joint),HARBOR.deckHeight);
 assert.ok(Math.abs(walkHeight(x,joint+.01)-walkHeight(x,joint-.01))<.01);
 assert.ok(clearWalkSegment({x,z:joint-.6},{x,z:joint+.6}));
 // A plan-view shortcut across the main-deck edge is not a valid descent.
 assert.equal(clearWalkSegment({x:-28.6,z:-63},{x:-31.2,z:-63}),false);
 assert.equal(clearWalkSegment({x:-28.6,z:-55},{x:HARBOR.boardingX,z:HARBOR.boardingZ}),false);
 // Independently sample every guided step in 3D, including both joints.
 let previous=BOARDING_WALK_PATH[0];
 for(const p of BOARDING_WALK_PATH.slice(1)){
  const steps=Math.max(1,Math.ceil(Math.hypot(p.x-previous.x,p.z-previous.z)/.025));let height=walkHeight(previous.x,previous.z);
  for(let i=1;i<=steps;i++){const f=i/steps,next=walkHeight(previous.x+(p.x-previous.x)*f,previous.z+(p.z-previous.z)*f);assert.ok(Math.abs(next-height)<.03);height=next;}
  previous=p;
 }
});
test('old onshore and moored saves move to the corrected landing without losing inventory or catch history',()=>{
 const saved={mode:'walk',playerX:18,playerZ:-76,boatX:20.8,boatZ:-77,moored:true,launchStage:'afloat',profile:{credits:68},packed:['rod'],catches:[{name:'halibut'}],sailed:321,heading:1,anchor:false};
 const progress=JSON.stringify([saved.profile,saved.packed,saved.catches,saved.sailed]);
 assert.equal(migrateHarborSave(saved),true);assert.equal(saved.playerX,HARBOR.spawnX);assert.equal(saved.boatX,HARBOR.boatX);assert.equal(saved.heading,0);
 assert.equal(JSON.stringify([saved.profile,saved.packed,saved.catches,saved.sailed]),progress);
 saved.playerX=-12;assert.equal(migrateHarborSave(saved),false);assert.equal(saved.playerX,-12);
});
test('old offshore saves retain their actual position and anchor',()=>{
 const saved={mode:'boat',boatX:167,boatZ:-345,heading:1.4,anchor:true,moored:false,launchStage:'afloat',profile:{credits:100}};
 migrateHarborSave(saved);assert.deepEqual([saved.boatX,saved.boatZ,saved.heading,saved.anchor],[167,-345,1.4,true]);assert.equal(saved.profile.credits,100);
});
