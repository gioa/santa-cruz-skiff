import test from 'node:test';
import assert from 'node:assert/strict';
import {seatHook} from './helpers/pixel-hook.js';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {MAX_PAID_LINE_METERS,MAX_TROLL_SPEED_MPS,rodTipPosition,relativeFishingFlow,stepFishingLine}=await import('../dist/pixel-fishing-physics.js');
const run=(sim,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.1)sim.step(Math.min(.1,seconds-t),input);};
function ready(gear=[]){
 const sim=new PixelSimulation({rng:()=>.05,patrolRng:()=>.9,conditions:{currentMps:0},profile:{version:2,credits:2000}});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
 for(const id of gear){assert.ok(sim.buyGear(id).ok);assert.ok(sim.equip(id).ok);}
 assert.ok(sim.launchBoat().ok);run(sim,24.1);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.ok(sim.board().ok);assert.ok(sim.unmoor().ok);
 const p=FISHING_SPOTS[1];Object.assign(sim.state,{boatX:p.x,boatZ:p.z});syncVessel(sim.vessel,{x:p.x,z:p.z,clearMotion:true});return sim;
}
function quietDrop(sim){assert.ok(sim.lowerRig().ok);sim.state.biteAt=1e6;sim.state.snagThreshold=Infinity;}
function pure(rig='bottom',extra={}){const s={rig,rigWeightGrams:85,boatX:0,boatZ:0,heading:0,rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'free',crankRate:0,drag:.48,pumpHeight:0,rodBend:0,rodLoadN:0,lureDepth:0,paidLineMeters:2.55,...extra};const tip=rodTipPosition(s);s.bobber??={x:tip.x,z:tip.z,height:0};return s;}
function pureRun(s,seconds,options={}){for(let t=0;t<seconds-1e-8;t+=.1)Object.assign(s,stepFishingLine(s,{dt:.1,environment:{bottomDepth:20},...options}));return s;}

test('vertical lowering consumes one bait, starts beside the real tip, and has no casting flight',()=>{
 const sim=ready();assert.ok(sim.lowerRig().ok);assert.equal(sim.state.castFlight,null);assert.equal(sim.state.fishState,'sinking');assert.equal(sim.state.reelMode,'free');assert.equal(sim.state.profile.stock.squid,11);assert.equal(sim.state.bobber.x,sim.state.rodTip.x);assert.equal(sim.state.bobber.z,sim.state.rodTip.z);assert.equal(sim.state.bobber.height,0);assert.equal(sim.state.floatPosition,null);
 assert.equal(sim.lowerRig().ok,false);assert.equal(sim.state.profile.stock.squid,11);sim.retrieve();assert.ok(sim.lowerRig().ok);assert.equal(sim.state.profile.stock.squid,11,'usable bait remains on its actual rod');
 const unpaid=new PixelSimulation();unpaid.start();assert.equal(unpaid.lowerRig().ok,false);assert.equal(unpaid.state.profile.stock.squid,12);
});

test('free spool has a finite feed rate; a braked spool cannot give unlimited sinking line',()=>{
 const free=pure(),braked=pure('bottom',{reelMode:'brake'}),paid=braked.paidLineMeters;pureRun(free,10);pureRun(braked,10);
 assert.ok(free.lureDepth>5);assert.ok(braked.lureDepth<.3);assert.equal(braked.paidLineMeters,paid);assert.ok(free.paidLineMeters<=2.55+10*1.65+1e-8);assert.ok(free.paidLineMeters>paid);assert.ok(free.paidLineMeters<=MAX_PAID_LINE_METERS);
 pureRun(free,500);assert.ok(free.paidLineMeters<=MAX_PAID_LINE_METERS);assert.ok(free.paidLineMeters<25,'open spool stops spilling line once the sinker is resting with slack');
});

test('raising a low rod with short braked line does not create line and can lift the rig out of water',()=>{
 const s=pure('bottom',{rodElevation:5,reelMode:'brake',paidLineMeters:1.253});const paid=s.paidLineMeters,oldTip=rodTipPosition(s);s.rodElevation=85;pureRun(s,.2);
 assert.equal(s.paidLineMeters,paid);assert.equal(s.payoutRate,0);assert.ok(s.bobber.height>0);assert.ok(Math.hypot(s.rodTip.x-oldTip.x,s.rodTip.z-oldTip.z,s.rodTip.height-oldTip.height)<=4.2);
 pureRun(s,8);const lifted={...s.bobber};pureRun(s,10);assert.ok(Math.hypot(s.bobber.x-lifted.x,s.bobber.z-lifted.z,s.bobber.height-lifted.height)<.001,'holding the same pose cannot pump indefinitely');
});

test('normal crank closes the spool, takes a finite length per turn, and physically retrieves the rig',()=>{
 const sim=ready();quietDrop(sim);run(sim,8);const paid=sim.state.paidLineMeters,bait=sim.state.profile.stock.squid;sim.step(.1,{reel:.5});assert.equal(sim.state.reelMode,'brake');assert.ok(sim.state.paidLineMeters<paid);assert.ok(paid-sim.state.paidLineMeters<.1);assert.notEqual(sim.state.fishState,'idle');
 let previous=sim.state.paidLineMeters;for(let t=0;t<40&&sim.state.fishState!=='idle';t+=.1){sim.step(.1,{reel:1.2});assert.ok(sim.state.paidLineMeters<=previous+1e-9,'cranking cannot feed line');previous=sim.state.paidLineMeters;}
 assert.equal(sim.state.fishState,'idle');assert.equal(sim.state.bobber,null);assert.equal(sim.state.paidLineMeters,0);assert.equal(sim.state.profile.stock.squid,bait);
});

test('rod lift changes a taut rig position but held pose has a finite stroke',()=>{
 const sim=ready();quietDrop(sim);run(sim,30);sim.setReelMode('brake');run(sim,2,{reel:.4});const before=sim.state.lureDepth,paid=sim.state.paidLineMeters;sim.setRodPose({elevation:80});run(sim,2);const lifted=sim.state.lureDepth;run(sim,12);
 assert.ok(before-lifted>.3);assert.ok(before-lifted<2.1);assert.ok(sim.state.lureDepth>=lifted-.01,'a held tip may settle the rig toward vertical but cannot continue lifting it');assert.equal(sim.state.paidLineMeters,paid);assert.ok(sim.state.rodBend>0);assert.ok(sim.state.rodLoadN>0);
});

test('only a real float mechanically holds the selected depth; sabiki free spool continues below its reference layer',()=>{
 const float=pure('float',{rigWeightGrams:7,fishingDepthMeters:2}),sabiki=pure('sabiki',{rigWeightGrams:28,fishingDepthMeters:6});pureRun(float,60);pureRun(sabiki,60);
 assert.ok(Math.abs(float.lureDepth-2)<.1);assert.ok(float.floatPosition);assert.equal(float.floatPosition.height,0);assert.ok(sabiki.lureDepth>10);assert.equal(sabiki.floatPosition,null);assert.equal(sabiki.bobber.height,-sabiki.lureDepth);
 const light=pure('bottom',{rigWeightGrams:28}),heavy=pure('bottom',{rigWeightGrams:170});pureRun(light,5);pureRun(heavy,5);assert.ok(heavy.lureDepth>light.lureDepth+.5);
});

test('flow is relative to boat velocity, while stronger crossflow loads and bends a braked rod',()=>{
 assert.equal(relativeFishingFlow({x:1,z:0},{vx:1,vz:0}),0);assert.equal(relativeFishingFlow({x:1,z:0},{vx:-1,vz:0}),2);
 const calm=pure('bottom',{reelMode:'brake',paidLineMeters:5,lureDepth:2.5}),flow=pure('bottom',{reelMode:'brake',paidLineMeters:5,lureDepth:2.5});calm.bobber.height=flow.bobber.height=-2.5;
 pureRun(calm,4);pureRun(flow,4,{current:{x:1,z:0}});assert.ok(flow.rodLoadN>calm.rodLoadN);assert.ok(flow.rodBend>calm.rodBend);assert.equal(flow.paidLineMeters,5);
});

test('hooking preserves the actual rig point and paid line instead of inventing a distant fish',()=>{
 const sim=ready(['rig_dropper']);sim.setRig({rig:'dropper'});assert.ok(sim.lowerRig().ok);for(let t=0;t<100&&sim.state.fishState!=='bite';t+=.1)sim.step(.1);assert.equal(sim.state.fishState,'bite');const point={...sim.state.bobber},paid=sim.state.paidLineMeters;assert.ok(sim.hook().ok);assert.deepEqual(sim.state.bobber,point);assert.equal(sim.state.paidLineMeters,paid);seatHook(sim,{request:false,onStep:(before,dt)=>assert.ok(Math.abs(sim.state.paidLineMeters-before.paidLineMeters-(sim.state.payoutRate-sim.state.retrieveRate)*dt)<1e-8,'seating must conserve actual spool travel')});assert.equal(sim.state.fish.hookCount,2);assert.equal(sim.state.fish.rig.id,'dropper');assert.equal(sim.state.reelMode,'brake');
});

test('an overloaded drag slips despite cranking; fish remain above seabed and line stays finite',()=>{
 const s=pure('bottom',{reelMode:'brake',crankRate:2,drag:.2,paidLineMeters:8,lureDepth:4.7});s.bobber.height=-4.7;const paid=s.paidLineMeters;pureRun(s,10,{environment:{bottomDepth:5},fishPullN:28});assert.ok(s.paidLineMeters>paid,'turning the handle cannot overcome a running fish and slipping drag');assert.ok(s.payoutRate>s.retrieveRate);assert.ok(s.lureDepth<=5);assert.ok(s.rodBend>.3);
 pureRun(s,200,{environment:{bottomDepth:5},fishPullN:50});assert.ok(s.paidLineMeters<=MAX_PAID_LINE_METERS);assert.ok(s.lureDepth<=5);for(const value of[s.paidLineMeters,s.rodBend,s.rodLoadN,s.bobber.x,s.bobber.z,s.bobber.height])assert.ok(Number.isFinite(value));
});

test('side holder permits bounded slow trolling, neutral pickup, and actual line towing',()=>{
 const sim=ready();quietDrop(sim);sim.setReelMode('brake');assert.equal(sim.toggleEngine().ok,false);assert.ok(sim.setRodMount('starboard').ok);assert.equal(sim.state.rodAzimuth,100);assert.ok(sim.canOperateHelm);assert.ok(sim.toggleEngine().ok);assert.ok(sim.setThrottle(1));assert.ok(sim.state.throttle<=.28);const start={...sim.state.bobber};run(sim,15,{reel:1.2});assert.equal(sim.state.rodMount,'starboard','cannot crank and propel the boat while rod is in its holder');assert.equal(sim.state.crankRate,0);assert.ok(Math.abs(sim.state.speed)<MAX_TROLL_SPEED_MPS+.2);assert.ok(Math.hypot(sim.state.bobber.x-start.x,sim.state.bobber.z-start.z)>1);assert.equal(sim.setRodMount('hand').ok,false);
 sim.setThrottle(0);for(let t=0;t<30&&Math.abs(sim.state.speed)>1.2;t+=.1)sim.step(.1);sim.step(.1,{reel:.7});assert.equal(sim.state.rodMount,'hand');assert.equal(sim.state.engine,false);assert.equal(sim.canOperateHelm,false);assert.equal(sim.state.crankRate,.7);
});

test('a mounted bite neutralizes propulsion and requires pickup before a hand-operated wind/lift',()=>{
 const sim=ready();assert.ok(sim.setRodMount('port').ok);assert.ok(sim.lowerRig().ok);sim.state.biteAt=.4;assert.ok(sim.toggleEngine().ok);assert.ok(sim.setThrottle(.15));run(sim,2);assert.equal(sim.state.fishState,'bite');assert.equal(sim.state.throttle,0);assert.equal(sim.canOperateHelm,false);assert.equal(sim.hook().ok,false);assert.ok(sim.setRodMount('hand').ok);assert.equal(sim.state.engine,false);seatHook(sim);assert.equal(sim.state.fishState,'fight');
});

test('pause freezes line and posture; resume resets old live tackle without duplicating bait or cargo',()=>{
 const sim=ready();quietDrop(sim);run(sim,4);sim.pause(true);const paid=sim.state.paidLineMeters,point={...sim.state.bobber};assert.equal(sim.setRodPose({elevation:80}).ok,false);assert.equal(sim.setReelMode('brake').ok,false);run(sim,5,{reel:2});assert.equal(sim.state.paidLineMeters,paid);assert.deepEqual(sim.state.bobber,point);const stock=sim.state.profile.stock.squid,saved=sim.snapshot(),resumed=new PixelSimulation({saved,patrolRng:()=>.9});assert.ok(resumed.start(true).ok);assert.equal(resumed.state.fishState,'idle');assert.equal(resumed.state.paidLineMeters,0);assert.equal(resumed.state.rodBend,0);assert.equal(resumed.state.rodMount,'hand');assert.equal(resumed.state.profile.stock.squid,stock);assert.equal(resumed.publicState().canOperateHelm,true);
});


test('an actively fitted smoother reel reduces drag breakaway shock without changing steady payout',()=>{
 const ordinary=pure('bottom',{reelMode:'brake',paidLineMeters:12,lureDepth:8}),smooth=pure('bottom',{reelMode:'brake',paidLineMeters:12,lureDepth:8});ordinary.bobber.height=smooth.bobber.height=-8;ordinary.paidLineMeters=smooth.paidLineMeters=rodTipPosition(ordinary).height+8;
 Object.assign(ordinary,stepFishingLine(ordinary,{dt:.1,fishPullN:30,smooth:1}));Object.assign(smooth,stepFishingLine(smooth,{dt:.1,fishPullN:30,smooth:.86}));assert.ok(smooth.rodLoadN<ordinary.rodLoadN);assert.equal(smooth.paidLineMeters,ordinary.paidLineMeters);assert.equal(smooth.dragThresholdN,ordinary.dragThresholdN);
 const sim=ready(['reel_smooth','rod_light']);assert.equal(sim.stats.smooth,1,'packing an unattached reel does not change the active rod');assert.ok(sim.setRig({rod:'rod_light',reel:'reel_smooth'}).ok);assert.equal(sim.stats.smooth,1);assert.ok(sim.selectRod('rod_light').ok);assert.equal(sim.stats.smooth,.86);
});


test('a drifting boat reaches an underwater pendulum equilibrium on fixed braked line instead of pinning the rig to the surface',()=>{
 const results=[];
 for(const dt of[1/60,.1]){
  const s=pure('bottom',{reelMode:'brake',paidLineMeters:20,lureDepth:15});s.bobber.height=-15;
  for(let time=0;time<240-dt/2;time+=dt){s.boatX+=.4*dt;Object.assign(s,stepFishingLine(s,{dt,environment:{bottomDepth:25},velocity:{vx:.4,vz:0}}));assert.equal(s.paidLineMeters,20);assert.ok(Math.hypot(s.bobber.x-s.rodTip.x,s.bobber.z-s.rodTip.z,s.bobber.height-s.rodTip.height)<=20+1e-8,'rope length is enforced after gravity');}
  assert.ok(s.lureDepth>10&&s.lureDepth<18,'slow drift produces a submerged angled line');assert.ok(s.lineDistance>4&&s.lineDistance<15);results.push(s.lureDepth);
  pureRun(s,120,{environment:{bottomDepth:25}});assert.ok(s.lureDepth>17,'after stopping the boat gravity swings the rig back beneath the rod');assert.equal(s.paidLineMeters,20);
 }
 assert.ok(Math.abs(results[0]-results[1])<.1,'the equilibrium is stable across mobile and desktop frame intervals');
 const stuck=pure('bottom',{reelMode:'brake',paidLineMeters:20,lureDepth:0});stuck.bobber.x-=19;pureRun(stuck,20,{environment:{bottomDepth:25}});assert.ok(stuck.lureDepth>5,'an old surface-bound rig can sink again without opening the spool');assert.equal(stuck.paidLineMeters,20);
});
