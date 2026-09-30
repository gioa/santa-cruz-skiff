import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const {YORK_FEE,captainRigAdvice,planCaptainSpot,captainSpotQuality,stepCaptain}=await import('../dist/pixel-captain.js');
const {hullPenetration}=await import('../dist/pixel-navigation.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {boatActions}=await import('../dist/pixel-boat-actions.js');
function hired(mission='blue'){
 const sim=new PixelSimulation({rng:()=>.5,patrolRng:()=>1,now:()=>new Date('2026-09-30T14:00:00Z')});sim.start();
 Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
 assert.ok(sim.hireCaptain(mission).ok);assert.ok(sim.launchBoat().ok);
 for(let i=0;i<100;i++)sim.step(.25);
 Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.ok(sim.board().ok);
 return sim;
}
test('York charges once at counter, reserves boat rent, and does not gift equipment',()=>{
 const sim=new PixelSimulation();sim.start();sim.state.playerX=100;assert.equal(sim.hireCaptain().ok,false);
 Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
 const owned=[...sim.state.profile.owned];sim.state.profile.credits=YORK_FEE+14;assert.equal(sim.hireCaptain().ok,false);
 sim.state.profile.credits=100;assert.ok(sim.hireCaptain('blue').ok);assert.equal(sim.state.profile.credits,100-YORK_FEE);
 assert.equal(sim.hireCaptain('salmon').ok,false);assert.equal(sim.state.profile.credits,100-YORK_FEE);assert.deepEqual(sim.state.profile.owned,owned);
});
test('every York target uses actual mapped habitat, depth and a navigable water route',()=>{
 const sim=hired();for(const mission of ['blue','halibut','salmon']){
  sim.state.captain.mission=mission;const plan=planCaptainSpot(sim.state);assert.ok(plan?.route?.length,mission);assert.ok(captainSpotQuality(mission,plan.target)>0,mission);
 }
});
test('York takes the outboard, actual boat motion clears the harbor and reaches a blue-rockfish stop',()=>{
 const sim=hired(),s=sim.state;const start={x:s.boatX,z:s.boatZ};
 assert.equal(sim.setThrottle(1),false);assert.equal(sim.planWaypoint('dock').ok,false);
 assert.equal(boatActions(s,{panel:'helm',canLower:true}).helm,false);
 let seconds=0,maxSpeed=0;while(seconds<900&&s.captain.phase!=='fishing'){
  sim.step(.25,{throttle:-1,steer:1});seconds+=.25;maxSpeed=Math.max(maxSpeed,Math.abs(s.speed));
  assert.ok(hullPenetration(sim.vessel)<.02,`hull collision at ${seconds}`);
 }
 assert.equal(s.captain.phase,'fishing',JSON.stringify({seconds,c:s.captain,boat:[s.boatX,s.boatZ]}));
 assert.ok(s.sailed>100);assert.ok(maxSpeed>1);assert.ok(Math.hypot(s.boatX-start.x,s.boatZ-start.z)>100);
 assert.equal(s.throttle,0);assert.ok(captainSpotQuality('blue',s.captain.target)>0);
});
test('captain tells player exactly why trolling gear is unsuitable; mounted, braked tackle is required',()=>{
 const sim=hired('halibut'),s=sim.state;assert.match(captainRigAdvice(s).reason,/鳀鱼/);
 s.baitOnHook={kind:'anchovy',condition:1};s.bait='anchovy';assert.equal(captainRigAdvice(s).ok,true);
 assert.match(captainRigAdvice(s,{deployment:true}).reason,/下线/);
 s.fishState='waiting';assert.match(captainRigAdvice(s,{deployment:true}).reason,/竿架/);
 s.rodMount='port';s.reelMode='free';assert.match(captainRigAdvice(s,{deployment:true}).reason,/自由出线/);
 s.reelMode='brake';s.lureDepth=0;assert.match(captainRigAdvice(s,{deployment:true}).reason,/底层/);
 s.lureDepth=30;assert.equal(captainRigAdvice(s,{deployment:true}).ok,true);
 s.baitOnHook.condition=0;assert.match(captainRigAdvice(s).reason,/换饵/);
});
test('trolling stops for a bite, waits through landing, and never auto-hooks or reels',()=>{
 const sim=hired('halibut'),s=sim.state;Object.assign(s.captain,{phase:'trolling',route:[{x:s.boatX-100,z:s.boatZ-100}]});
 s.fishState='bite';s.rodMount='port';s.throttle=.25;stepCaptain(sim,.1);assert.equal(s.throttle,0);assert.equal(s.fishState,'bite');assert.match(s.captain.message,/收油/);
 s.fishState='landed';stepCaptain(sim,.1);assert.equal(s.throttle,0);assert.equal(s.fishState,'landed');
});
test('pause, restore and new-day lifecycle preserve payment without unattended driving',()=>{
 const sim=hired(),s=sim.state;sim.captainCommand('pause');sim.pause(true);const before=sim.snapshot();sim.step(.25);assert.equal(s.boatX,before.boatX);
 const restored=new PixelSimulation({saved:before});restored.start(true);assert.equal(restored.state.captain.phase,'paused');assert.equal(restored.state.profile.credits,s.profile.credits);
 assert.equal(restored.state.captain.hired,true);assert.equal(restored.state.throttle,0);
 restored.beginDayEnd();for(let i=0;i<60;i++)restored.step(.25);assert.equal(restored.state.captain,null);
});
test('changing destinations waits for stowed gear; severe weather requests return',()=>{
 const sim=hired(),s=sim.state;s.fishState='waiting';s.captain.phase='fishing';sim.captainCommand('return');stepCaptain(sim,.1);
 assert.equal(s.captain.pending,'return');assert.equal(s.throttle,0);
 s.fishState='idle';stepCaptain(sim,.1);assert.equal(s.captain.phase,'returning');assert.ok(s.captain.route.length);
 s.captain.phase='fishing';s.captain.pending=null;s.fishState='waiting';sim.conditions.waveHeight=2;stepCaptain(sim,.1);assert.equal(s.captain.pending,'return');assert.match(s.captain.message,/风浪/);
});
test('York returns and docks through normal physics; landing ends the paid outing',()=>{
 const sim=hired(),s=sim.state;const p={x:HARBOR.returnX-45,z:HARBOR.returnZ-25};Object.assign(s,{boatX:p.x,boatZ:p.z,heading:0});syncVessel(sim.vessel,p);
 sim.captainCommand('return');let elapsed=0;while(elapsed<180&&s.mode==='boat'){sim.step(.25);elapsed+=.25;}
 assert.equal(s.mode,'walk',JSON.stringify({elapsed,c:s.captain,x:s.boatX,z:s.boatZ}));assert.equal(s.captain,null);assert.equal(s.tripComplete,true);
});
test('an explicit pause survives fish handling and a saved resume; rescue ends the outing',()=>{
 const sim=hired(),s=sim.state;s.fishState='bite';stepCaptain(sim,.1);sim.captainCommand('pause');
 stepCaptain(sim,.1);s.fishState='idle';stepCaptain(sim,.1);assert.equal(s.captain.phase,'paused');
 s.captain.stoppedForFish=true;const restored=new PixelSimulation({saved:sim.snapshot()});restored.start(true);stepCaptain(restored,.1);
 assert.equal(restored.state.captain.phase,'paused');sim.rescue();assert.equal(s.captain,null);
});
test('halibut outing waits for real deployment, then moves boat and tackle at trolling speed',()=>{
 const sim=hired('halibut'),s=sim.state;
 let elapsed=0;while(elapsed<900&&s.captain.phase!=='rigging'){sim.step(.25);elapsed+=.25;}
 assert.equal(s.captain.phase,'rigging');assert.match(s.captain.message,/鳀鱼/);
 s.profile.stock.anchovy=3;assert.ok(sim.replaceBait('rod','anchovy').ok);
 while(Math.abs(s.speed)>.9&&elapsed<1000){sim.step(.25);elapsed+=.25;}
 assert.ok(sim.lowerRig().ok);assert.ok(sim.setRodMount(s.captain.side).ok);
 // Keep natural encounters from interrupting this navigation/rig integration case.
 s.biteAt=1e9;
 let sinking=0;while(sinking<120){sim.step(.25);sinking+=.25;sim.setReelMode('brake');if(captainRigAdvice(s,{deployment:true}).ok)break;sim.setReelMode('free');}
 assert.ok(captainRigAdvice(s,{deployment:true}).ok,JSON.stringify({sinking,depth:s.lureDepth,message:s.captain.message}));
 const start={x:s.boatX,z:s.boatZ};let maxSpeed=0;
 for(let i=0;i<160;i++){sim.step(.25);maxSpeed=Math.max(maxSpeed,Math.abs(s.speed));assert.ok(hullPenetration(sim.vessel)<.02);}
 assert.equal(s.captain.phase,'trolling',s.captain.message);assert.ok(maxSpeed>.1&&maxSpeed<1.55);assert.ok(Math.hypot(s.boatX-start.x,s.boatZ-start.z)>3);assert.ok(s.bobber&&s.paidLineMeters>3);
});
