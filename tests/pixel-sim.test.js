import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,BASE_GEAR}=await import('../dist/pixel-sim.js');
const {hullPenetration}=await import('../dist/navigation.js');
const runUntil=(sim,predicate,seconds=600,input={})=>{let elapsed=0;while(!predicate(sim.state)&&elapsed<seconds){sim.step(.1,typeof input==='function'?input(sim.state):input);elapsed+=.1;}assert.ok(predicate(sim.state),`timed out after ${elapsed.toFixed(1)}s: ${JSON.stringify(sim.publicState())}`);return elapsed;};
function departure(sim,chart=false){assert.equal(sim.start().ok,true);assert.equal(sim.walkTo('counter').ok,true);runUntil(sim,()=>sim.atCounter&&sim.state.walkRoute.length===0,20);assert.equal(sim.interact().action,'staff');assert.equal(sim.packStarter().ok,true);if(chart){assert.equal(sim.buyGear('nautical_chart').ok,true);assert.equal(sim.equip('nautical_chart').ok,true);}assert.equal(sim.launchBoat().ok,true);assert.equal(sim.walkTo('boarding').ok,true);runUntil(sim,s=>s.walkRoute.length===0&&s.launchStage==='afloat',70);assert.equal(sim.board().ok,true);assert.equal(sim.unmoor().ok,true);}

test('pixel edition starts near the shop at 06:00 and honors pause + globally doubled game clock',()=>{
 const sim=new PixelSimulation();assert.equal(sim.state.mode,'intro');assert.ok(Math.hypot(sim.state.playerX-HARBOR.counterX,sim.state.playerZ-HARBOR.counterZ)<10);sim.start();for(let i=0;i<240;i++)sim.step(.25);assert.equal(sim.state.clock,'06:02:00');sim.pause(true);sim.step(.25);assert.equal(sim.state.clock,'06:02:00');sim.pause(false);assert.equal(sim.state.profile.credits,100);
 assert.equal(sim.buyGear('rig_slider').ok,false,'shop purchase must happen at the actual counter');assert.equal(sim.board().ok,false,'boarding requires the real left-side landing');
});

test('complete walking, hoist, sailing, fishing, return, fish trade and equipment loop',()=>{
 const sim=new PixelSimulation({rng:()=>.05,patrolRng:()=>.9,profile:{version:2,credits:220}});departure(sim,true);assert.deepEqual(sim.state.packed,[...BASE_GEAR.map(g=>g.id),'nautical_chart']);assert.equal(sim.state.pfd,true);assert.ok(sim.state.walked>35);assert.equal(sim.selectWaypoint('sand').ok,true);
 let maxSpeed=0;runUntil(sim,s=>s.arrival==='fishing',420,s=>{maxSpeed=Math.max(maxSpeed,Math.abs(s.speed));return{};});assert.ok(maxSpeed>1&&maxSpeed<5,'SI vessel speeds remain believable');assert.ok(sim.state.sailed>200);assert.equal(sim.state.engine,false);assert.equal(hullPenetration(sim.vessel),0);runUntil(sim,s=>Math.abs(s.speed)<.5,30);assert.equal(sim.toggleAnchor().ok,true);
 assert.equal(sim.startCast().ok,true);for(let i=0;i<15;i++)sim.step(.1);assert.equal(sim.releaseCast().ok,true);assert.equal(sim.state.profile.stock.squid,11);runUntil(sim,s=>s.fishState==='bite',100);assert.equal(sim.hook().ok,true);runUntil(sim,s=>s.fishState==='landed',240,{reel:true});assert.equal(sim.keepCatch().ok,true);assert.equal(sim.state.catches.length,1);assert.equal(sim.state.profile.credits,100,'kept fish require a counter trade');assert.equal(sim.selectWaypoint('dock').ok,true);runUntil(sim,s=>s.arrival==='dock',420);runUntil(sim,s=>Math.abs(s.speed)<.5,30);assert.equal(sim.dock().ok,true);runUntil(sim,s=>s.mode==='walk',40);assert.equal(sim.state.tripComplete,true);assert.equal(sim.walkTo('counter').ok,true);runUntil(sim,()=>sim.atCounter&&sim.state.walkRoute.length===0,70);const reward=sim.trade();assert.equal(reward.count,1);assert.ok(reward.total>0);const earned=sim.state.profile.credits;assert.equal(sim.trade().total,0,'same fish cannot be sold twice');assert.equal(sim.state.profile.credits,earned);assert.equal(sim.buyGear('rig_slider').ok,true);assert.equal(sim.state.profile.credits,earned-25);assert.equal(sim.equip('rig_slider').ok,true);assert.equal(sim.setRig({rig:'slider',bait:'squid'}).ok,true);assert.ok(sim.state.elapsed>300,'QA active duration remains actual elapsed gameplay seconds');
});

test('missed bite expires, bait persists and disconnected pointer cancellation costs no bait',()=>{
 const sim=new PixelSimulation({rng:()=>0});departure(sim);assert.equal(sim.startCast().ok,true);sim.cancelCast();assert.equal(sim.state.fishState,'idle');assert.equal(sim.state.profile.stock.squid,12);sim.startCast();sim.step(.1);sim.releaseCast();runUntil(sim,s=>s.fishState==='bite',100);for(let i=0;i<100;i++)sim.step(.1);assert.equal(sim.state.fishState,'idle');assert.equal(sim.state.misses,1);assert.equal(sim.state.profile.stock.squid,11);sim.startCast();sim.releaseCast();assert.equal(sim.state.profile.stock.squid,11,'usable hook bait is retained for recast');
});

test('boat deck edges block movement and old water-entry actions cannot start swimming',()=>{
 const sim=new PixelSimulation();departure(sim);sim.toggleEngine();sim.setThrottle(.2);for(let i=0;i<50;i++)sim.step(.1);assert.equal(sim.jump().ok,false);assert.equal(sim.state.mode,'boat');assert.equal(sim.state.swim,null);assert.equal(sim.stand().ok,true);
 for(const [moveX,moveZ]of[[1,0],[-1,0],[0,1],[0,-1],[1,1]]){for(let i=0;i<100;i++)sim.step(.25,{moveX,moveZ});assert.equal(sim.state.mode,'boat');assert.ok(Math.abs(sim.state.deckX)<=.72);assert.ok(sim.state.deckZ>=-1.85&&sim.state.deckZ<=1.70);}
 assert.equal(sim.enterWater(999,999,1).ok,false);assert.equal(sim.reboard().ok,false);assert.equal(sim.state.swim,null);assert.ok(sim.state.packed.includes('rod'));
});

test('mobile steering and throttle cancel assisted route without teleporting the boat',()=>{
 const sim=new PixelSimulation({profile:{version:2,credits:220}});departure(sim,true);sim.selectWaypoint('sand');for(let i=0;i<60;i++)sim.step(.1);const before={x:sim.state.boatX,z:sim.state.boatZ};sim.step(.1,{steer:-.7,throttle:.2});assert.equal(sim.state.waypoint,null);assert.deepEqual(sim.state.waterRoute,[]);assert.equal(sim.state.throttle,.2);assert.ok(Math.hypot(sim.state.boatX-before.x,sim.state.boatZ-before.z)<.5);assert.ok(sim.state.tiller<0);
});

test('saved equipment and settled fish persist while each resumed day begins at 06:00',()=>{
 const sim=new PixelSimulation();sim.start();sim.walkTo('counter');runUntil(sim,()=>sim.atCounter&&sim.state.walkRoute.length===0,20);sim.packStarter();sim.buyGear('rig_slider');sim.equip('rig_slider');const saved=sim.snapshot(),next=new PixelSimulation({saved});assert.equal(next.start(true).ok,true);assert.equal(next.state.profile.credits,75);assert.ok(next.state.packed.includes('rig_slider'));assert.equal(next.state.clock,'06:00:00');assert.equal(next.state.engine,false);assert.equal(next.state.mode,'walk');assert.equal(next.state.playerX,HARBOR.spawnX);assert.equal(next.publicState().renderer,'Canvas 2D');
});

test('a legacy saved immersion restores the player and the boat together without losing equipment',()=>{
 const sim=new PixelSimulation();departure(sim);sim.toggleEngine();sim.setThrottle(.4);for(let i=0;i<180;i++)sim.step(.1);assert.ok(Math.hypot(sim.state.boatX-HARBOR.boatX,sim.state.boatZ-HARBOR.boatZ)>10);const saved=sim.snapshot();saved.mode='swim';saved.swim={x:saved.boatX+2,z:saved.boatZ+2};const restored=new PixelSimulation({saved});restored.start(true);assert.equal(restored.state.mode,'walk');assert.equal(restored.state.loaded,false);assert.equal(restored.state.moored,true);assert.equal(restored.state.launchStage,'afloat');assert.equal(restored.state.boatX,HARBOR.boatX);assert.equal(restored.state.boatZ,HARBOR.boatZ);assert.deepEqual(restored.state.packed,saved.packed);assert.equal(restored.state.profile.credits,saved.profile.credits);assert.equal(restored.state.fishState,'idle');assert.equal(restored.state.anchor,false);assert.equal(restored.state.clock,'06:00:00');
});

test('releasing momentary joystick throttle selects neutral; untouched autopilot and explicit slider remain active',()=>{
 const sim=new PixelSimulation({profile:{version:2,credits:220}});departure(sim,true);sim.toggleEngine();sim.step(.1,{throttle:.6});assert.equal(sim.state.throttle,.6);sim.step(.1,{});assert.equal(sim.state.throttle,0);assert.equal(sim.state.engine,true,'neutral keeps motor running');sim.setThrottle(.3);sim.step(.1,{});sim.step(.1,{});assert.equal(sim.state.throttle,.3,'explicit throttle slider holds its setting');sim.selectWaypoint('sand');sim.step(.1,{});assert.ok(sim.state.waypoint);assert.ok(sim.state.throttle>0);sim.step(.1,{steer:1});assert.equal(sim.state.waypoint,null);assert.equal(sim.state.throttle,0,'helm takeover does not inherit hidden autopilot thrust');
});

test('rig selection validates real carried rods and bait while unrelated packing preserves a selected rod',()=>{
 const sim=new PixelSimulation();sim.start();sim.walkTo('counter');runUntil(sim,()=>sim.atCounter&&sim.state.walkRoute.length===0,20);sim.packStarter();assert.equal(sim.setRig({rod:'cooler'}).ok,false,'packed cooler is not a rod');assert.equal(sim.setRig({bait:'anchovy'}).ok,false,'no bait in stock');assert.equal(sim.buyGear('rod_light').ok,true);assert.equal(sim.equip('rod_light').ok,true);assert.equal(sim.setRig({rod:'rod_light'}).ok,true);assert.equal(sim.state.profile.loadout.rod,'rod','editing a stored rod must not take it in hand');assert.equal(sim.selectRod('rod_light').ok,true);sim.equip('water');assert.equal(sim.state.profile.loadout.rod,'rod_light');sim.equip('rod_light');assert.equal(sim.state.profile.loadout.rod,'rod');sim.equip('rod');assert.equal(sim.stats.hasRod,false);assert.equal(sim.selectRod('rod').ok,true);assert.equal(sim.stats.hasRod,true);
});

test('map object destinations identify a return to the dock and reject points on the pier',()=>{
 const sim=new PixelSimulation({profile:{version:2,credits:220}});departure(sim,true);assert.equal(sim.selectWaypoint({x:HARBOR.counterX,z:HARBOR.counterZ,name:'inside shop'}).ok,false);assert.equal(sim.selectWaypoint({x:HARBOR.returnX,z:HARBOR.returnZ,name:'登船平台',kind:'dock'}).ok,true);assert.equal(sim.state.waypoint.returning,true);assert.equal(sim.state.phase,'return');
});

test('guided stair arrival never clips open water and remains still for a minute after arrival',()=>{
 for(const dt of[1/60,.1])for(const delay of[0,.3,2]){
  const sim=new PixelSimulation();sim.start();sim.walkTo('counter');while(!sim.atCounter)sim.step(dt);for(let t=0;t<delay;t+=dt)sim.step(dt);sim.packStarter();sim.launchBoat();assert.equal(sim.walkTo('boarding').ok,true);
  let steps=0;while(sim.state.walkRoute.length&&steps++<6000)sim.step(dt);assert.equal(sim.state.mode,'walk',`${dt}/${delay} must not fall off the guided path`);assert.equal(sim.state.arrival,'boarding');assert.equal(sim.state.walkRoute.length,0);assert.ok(Math.abs(sim.state.playerX-HARBOR.boardingX)<1e-5);assert.ok(Math.abs(sim.state.playerZ-HARBOR.boardingZ)<1e-5);
  const point=[sim.state.playerX,sim.state.playerZ];for(let t=0;t<60;t+=dt)sim.step(dt,{moveX:0,moveZ:0,steer:0});assert.equal(sim.state.mode,'walk');assert.deepEqual([sim.state.playerX,sim.state.playerZ],point);assert.equal(sim.interaction(),'登船');
 }
});

test('the visible retrieve action also cancels an airborne cast without consuming another bait',()=>{
 const sim=new PixelSimulation();departure(sim);sim.startCast();sim.step(.1);sim.releaseCast();assert.equal(sim.state.fishState,'flight');assert.equal(sim.startCast().ok,true);assert.equal(sim.state.fishState,'idle');assert.equal(sim.state.castFlight,null);assert.equal(sim.state.bobber,null);assert.equal(sim.state.profile.stock.squid,11);
});

test('packing a larger cooler activates its purchased capacity without requiring the free cooler to be removed',()=>{
 const sim=new PixelSimulation({profile:{version:2,credits:200}});sim.start();sim.walkTo('counter');runUntil(sim,()=>sim.atCounter&&sim.state.walkRoute.length===0,20);sim.packStarter();assert.equal(sim.stats.capacity,8);assert.equal(sim.buyGear('cooler_large').ok,true);assert.equal(sim.equip('cooler_large').ok,true);assert.equal(sim.stats.capacity,18);sim.equip('cooler_large');assert.equal(sim.stats.capacity,8);
});
