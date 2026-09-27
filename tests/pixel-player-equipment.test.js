import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,BASE_GEAR,WALK_SPEED}=await import('../dist/pixel-sim.js');
const {walkAllowed,walkBlocked}=await import('../dist/harbor-layout.js');
const now=()=>new Date('2026-09-27T20:00:00Z');
const run=(sim,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.1)sim.step(Math.min(.1,seconds-t),input);};
function equipped(items=[]){const sim=new PixelSimulation({now,rng:()=>.05,patrolRng:()=>.9,profile:{version:2,credits:5000}});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});for(const id of items)assert.equal(sim.buyGear(id).ok,true,id);Object.assign(sim.state,{playerX:HARBOR.spawnX,playerZ:HARBOR.spawnZ});return sim;}
function aboard(sim){Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ,launchStage:'afloat'});assert.equal(sim.board().ok,true);sim.unmoor();}

test('fresh base gear is enabled and backpack changes are portable without granting supplies or shop access',()=>{
 const sim=equipped(['gps']);assert.deepEqual(sim.state.packed,BASE_GEAR.map(g=>g.id));assert.equal(sim.state.pfd,true);assert.equal(sim.atCounter,false);assert.equal(sim.equip('gps').ok,true);assert.equal(sim.hasGear('gps'),true);sim.state.fuel=37;sim.state.profile.stock.squid=2;sim.equip('rod');assert.equal(sim.packStarter().ok,true);assert.equal(sim.hasGear('rod'),true);assert.equal(sim.state.fuel,37);assert.equal(sim.state.profile.stock.squid,2);assert.equal(sim.buyGear('rig_float').ok,false);assert.equal(sim.restock().ok,false);assert.equal(sim.trade().ok,false);
 aboard(sim);assert.equal(sim.equip('gps').ok,true);assert.equal(sim.hasGear('gps'),false);assert.equal(sim.equip('gps').ok,true);assert.equal(sim.hasGear('gps'),true);
});

test('walk displacement uses 2.90 metres per second with the existing load factor',()=>{
 const sim=equipped(),before={x:sim.state.playerX,z:sim.state.playerZ},speed=2.9*(1-sim.stats.weight*.002);assert.equal(WALK_SPEED,2.9);run(sim,1,{moveZ:1});assert.ok(Math.abs(Math.hypot(sim.state.playerX-before.x,sim.state.playerZ-before.z)-speed)<1e-7);assert.equal(sim.state.mode,'walk');
});

test('fast manual movement is swept against landing edges and never creates a swimming state',()=>{
 for(const dt of[1/60,.1,.25])for(const [moveX,moveZ]of[[-1,0],[1,0],[0,1],[-1,1]]){
  const sim=equipped();Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});
  for(let n=0;n<300;n++){sim.step(dt,{moveX,moveZ});assert.equal(sim.state.mode,'walk');assert.equal(sim.state.swim,null);assert.equal(walkAllowed(sim.state.playerX,sim.state.playerZ),true);assert.equal(walkBlocked(sim.state.playerX,sim.state.playerZ),false);}
  assert.equal(sim.jump().ok,false);assert.equal(sim.enterWater(0,0,0).ok,false);assert.equal(sim.state.mode,'walk');
 }
});

test('editing a stored rod enables its owned parts but preserves the held rod and each saved assembly',()=>{
 const sim=equipped(['rod_light','rig_float','rig_dropper','reel_smooth','line_braid','leader_heavy','sinker_heavy','bait_anchovy']);const credits=sim.state.profile.credits;
 assert.equal(sim.setRig({rod:'rod_light',rig:'float',bait:'anchovy',reel:'reel_smooth',line:'line_braid',leader:'leader_heavy',drag:.63,fishingDepthMeters:4}).ok,true);assert.equal(sim.state.profile.loadout.rod,'rod');assert.equal(sim.state.rig,'bottom');assert.equal(sim.rodAssembly('rod_light').weightGrams,7);for(const id of['rod_light','rig_float','reel_smooth','line_braid','leader_heavy','bait'])assert.equal(sim.hasGear(id),true,id);assert.equal(sim.state.profile.credits,credits);
 assert.equal(sim.setRig({rig:'dropper',weightGrams:170,drag:.34}).ok,true);assert.equal(sim.state.rig,'dropper');assert.equal(sim.state.rigWeightGrams,170);assert.equal(sim.selectRod('rod_light').ok,true);assert.equal(sim.state.rig,'float');assert.equal(sim.state.rigWeightGrams,7);assert.equal(sim.state.bait,'anchovy');assert.equal(sim.state.drag,.63);assert.equal(sim.state.fishingDepthMeters,4);sim.selectRod('rod');assert.equal(sim.state.rig,'dropper');assert.equal(sim.state.rigWeightGrams,170);assert.equal(sim.state.drag,.34);assert.equal(sim.rodAssembly('rod_light').rig,'float');
});

test('reel smoothness and braid thickness apply only to the active assembled rod; unique parts move between rods',()=>{
 const sim=equipped(['rod_light','reel_smooth','line_braid','rig_jig']);sim.setRig({rod:'rod_light',reel:'reel_smooth',line:'line_braid',rig:'jig'});assert.equal(sim.stats.smooth,1);assert.equal(sim.rigEnvironment().lineDiameterMm,.36);sim.selectRod('rod_light');assert.equal(sim.stats.smooth,.86);assert.equal(sim.rigEnvironment().lineDiameterMm,.28);
 const moved=sim.setRig({rod:'rod',reel:'reel_smooth',line:'line_braid',rig:'jig'});assert.equal(moved.ok,true);assert.equal(moved.transferred.length,3);assert.equal(sim.state.profile.loadout.rod,'rod_light');assert.equal(sim.stats.smooth,1);assert.equal(sim.rigEnvironment().lineDiameterMm,.36);assert.equal(sim.state.rig,'bottom');assert.equal(sim.rodAssembly('rod_light').line,null);sim.selectRod('rod');assert.equal(sim.stats.smooth,.86);assert.equal(sim.rigEnvironment().lineDiameterMm,.28);
});

test('rod activation restores individual bait condition and casting requires its enabled assembly',()=>{
 const sim=equipped(['rod_light','rig_float','reel_smooth']);sim.setRig({rod:'rod_light',rig:'float',bait:'jig',reel:'reel_smooth'});sim.state.baitOnHook={kind:'squid',condition:.41};sim.selectRod('rod_light');assert.equal(sim.state.baitOnHook,null);sim.state.baitOnHook={kind:'jig',condition:.79};sim.selectRod('rod');assert.deepEqual(sim.state.baitOnHook,{kind:'squid',condition:.41});sim.selectRod('rod_light');assert.deepEqual(sim.state.baitOnHook,{kind:'jig',condition:.79});aboard(sim);
 sim.equip('reel_smooth');assert.equal(sim.startCast().ok,false);assert.equal(sim.selectRod('rod_light').ok,true);assert.equal(sim.hasGear('reel_smooth'),true);assert.equal(sim.startCast().ok,true);assert.equal(sim.equip('rod_light').ok,false);assert.equal(sim.setRig({rod:'rod',rig:'bottom'}).ok,false);sim.cancelCast();
});

test('per-rod configurations, bait and active rod survive save/resume; old global rigs migrate only onto the old active rod',()=>{
 const sim=equipped(['rod_light','rig_float','reel_smooth']);sim.setRig({rod:'rod_light',rig:'float',reel:'reel_smooth',bait:'jig',drag:.62,fishingDepthMeters:3});sim.selectRod('rod_light');sim.state.baitOnHook={kind:'jig',condition:.7};const saved=sim.snapshot(),restored=new PixelSimulation({saved,now});restored.start(true);assert.equal(restored.state.profile.loadout.rod,'rod_light');assert.equal(restored.state.rig,'float');assert.equal(restored.state.drag,.62);assert.equal(restored.state.fishingDepthMeters,3);assert.deepEqual(restored.state.baitOnHook,{kind:'jig',condition:.7});assert.equal(restored.rodAssembly('rod').rig,'bottom');assert.deepEqual(restored.state.packed,saved.packed);
 const old=structuredClone(saved);delete old.profile.rodLoadouts;delete old.profile.rodLoadoutsVersion;delete old.rodBaitOnHooks;old.rig='float';old.bait='jig';old.rigWeightGrams=7;old.fishingDepthMeters=5;old.drag=.71;const migrated=new PixelSimulation({saved:old,now});migrated.start(true);assert.equal(migrated.rodAssembly('rod_light').rig,'float');assert.equal(migrated.rodAssembly('rod_light').fishingDepthMeters,5);assert.equal(migrated.rodAssembly('rod_light').drag,.71);assert.equal(migrated.rodAssembly('rod').rig,'bottom');assert.equal(migrated.state.profile.loadout.rod,'rod_light');assert.deepEqual(migrated.state.packed,old.packed);
});
