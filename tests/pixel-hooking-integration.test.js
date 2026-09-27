import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const run=(sim,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.1)sim.step(Math.min(.1,seconds-t),input);};
const until=(sim,predicate,seconds=100,input={})=>{for(let t=0;t<seconds&&!predicate(sim.state);t+=.1)sim.step(.1,input);assert.ok(predicate(sim.state),`unexpected phase ${sim.state.fishState}`);};
function ready(){
 const sim=new PixelSimulation({rng:()=>.05,patrolRng:()=>.9,conditions:{currentMps:0}});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});sim.launchBoat();run(sim,24.1);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});sim.board();sim.unmoor();
 const p=FISHING_SPOTS[1];Object.assign(sim.state,{boatX:p.x,boatZ:p.z});syncVessel(sim.vessel,{x:p.x,z:p.z,clearMotion:true});return sim;
}
const blue={name:'蓝岩鱼',latin:'Sebastes mystinus',length:28,kg:.55};
function bite(sim,fish=blue){
 assert.ok(sim.lowerRig().ok);sim.state.snagThreshold=Infinity;sim.state.biteAt=.5;until(sim,s=>s.fishState==='bite');
 sim.state.biteFish={...fish};sim.state.biteHold=null;sim.ensureBitingFish();return sim.state.biteFish;
}

test('small rockfish can be landed by normal reeling without a hook button or a minimum fight timer',()=>{
 const sim=ready(),candidate=bite(sim),line=sim.state.paidLineMeters;let hookCalls=0;const hook=sim.hook.bind(sim);sim.hook=options=>{assert.equal(options?.automatic,true);hookCalls++;return hook(options);};
 until(sim,s=>s.fishState==='fight',10,{reel:1.2});assert.equal(hookCalls,1);assert.equal(sim.state.fish.latin,candidate.latin);assert.equal(sim.state.fish.kg,candidate.kg);assert.ok(sim.state.paidLineMeters<=line+.5);assert.equal(sim.state.fish.rig.circleHook,true);
 until(sim,s=>s.fishState==='landed',90,{reel:1.2});assert.equal(sim.state.misses,0);assert.equal(sim.state.breaks,0);assert.ok(sim.state.stamina>50,'small fish can come straight in without being exhausted');assert.ok(sim.releaseCatch().ok);assert.equal(sim.state.hookHold,null);assert.equal(sim.state.biteFish,null);
});

test('elapsed time with an open spool never seats a hook and small fish do not fail at nine seconds',()=>{
 const sim=ready();bite(sim);sim.state.biteHold.threshold=3;run(sim,12);assert.equal(sim.state.fishState,'bite');assert.equal(sim.state.biteEngagement,0);assert.equal(sim.state.misses,0);assert.equal(sim.state.fish,null);
 sim.pause(true);const before=structuredClone(sim.state);run(sim,20,{reel:1.2});assert.deepEqual(sim.state,before);
});

test('bite abandonment uses the biting species rather than a universal deadline',()=>{
 const small=ready(),pelagic=ready();bite(small);bite(pelagic,{name:'太平洋狐鲣',latin:'Sarda chiliensis lineolata',length:55,kg:2.4});
 for(const sim of[small,pelagic]){sim.state.biteHold.threshold=.22;run(sim,12);}
 assert.equal(small.state.fishState,'bite');assert.equal(small.state.misses,0);assert.equal(pelagic.state.fishState,'idle');assert.equal(pelagic.state.misses,1);assert.match(pelagic.state.toast,/松口/);
});

test('a rod in a side holder hooks through real line pressure and can then be picked up',()=>{
 const sim=ready();assert.ok(sim.setRodMount('port').ok);bite(sim);assert.ok(sim.setReelMode('brake').ok);until(sim,s=>s.fishState==='fight',10);
 assert.equal(sim.state.rodMount,'port');assert.equal(sim.state.engine,false);assert.equal(sim.state.throttle,0);assert.ok(sim.setRodMount('hand').ok);until(sim,s=>s.fishState==='landed',90,{reel:1.2});assert.equal(sim.state.misses,0);
});

test('manual controlled lift preserves the fish chosen at the bite and resume clears pending hook state',()=>{
 const sim=ready(),candidate=bite(sim);assert.ok(sim.hook().ok);assert.equal(sim.state.fishState,'bite');until(sim,s=>s.fishState==='fight',10,{reel:1.2});assert.equal(sim.state.fish.kg,candidate.kg);assert.equal(sim.state.fish.latin,candidate.latin);assert.equal(sim.state.biteFish,null);assert.ok(sim.state.hookHold);
 const resumed=new PixelSimulation({saved:sim.snapshot()});resumed.start(true);assert.equal(resumed.state.hookHold,null);assert.equal(resumed.state.biteFish,null);assert.equal(resumed.state.biteHold,null);assert.equal(resumed.state.biteEngagement,0);
});


test('the manual seating control must take up real slack before a fish is hooked',()=>{
 const sim=ready();bite(sim);sim.state.paidLineMeters+=5;sim.state.lineSlackMeters=5;sim.state.rodLoadN=0;
 assert.equal(sim.hook().ok,true);assert.equal(sim.state.fishState,'bite');assert.equal(sim.state.fish,null);run(sim,.2);assert.equal(sim.state.fishState,'bite','a short lift cannot bypass several metres of loose line');
 assert.equal(sim.hook({automatic:true}).ok,false,'automatic finalization also validates physical engagement');until(sim,s=>s.fishState==='fight',20,{reel:1.2});assert.equal(sim.state.fish.latin,blue.latin);
});
