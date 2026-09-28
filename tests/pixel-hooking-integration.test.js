import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {RIG_PROFILES}=await import('../dist/fishing-rigs.js');
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
function rigReady(id){
 const sim=ready();Object.assign(sim.state,{mode:'walk',playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
 assert.ok(sim.buyGear(RIG_PROFILES[id].item).ok);assert.ok(sim.replaceRig(undefined,id).ok);
 if(id==='jig')assert.ok(sim.replaceBait(undefined,'jig').ok);Object.assign(sim.state,{mode:'boat',moored:false});return sim;
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

test('a too-large hook permits nibbling but cannot seat; repeated controls never reroll fit',()=>{
 const sim=rigReady('jig'),stock=structuredClone(sim.state.profile.stock);bite(sim,{latin:'Scomber japonicus',name:'太平洋鲭鱼',length:25,kg:.35});
 const hold=sim.state.biteHold,baitCondition=sim.state.baitOnHook.condition;assert.equal(hold.canSeat,false);assert.equal(hold.profile.mouthFit,0);
 assert.equal(sim.publicState().hookSize,'4/0');assert.equal(sim.publicState().hookFit.canSeat,false);
 let randomCalls=0;sim.rng=()=>{randomCalls++;return 0;};
 for(let i=0;i<10;i++){assert.ok(sim.hook().ok);assert.equal(sim.state.biteHold,hold);assert.equal(sim.ensureBitingFish(),sim.state.biteFish);}
 until(sim,s=>s.fishState==='idle',10,{reel:1.2});assert.equal(randomCalls,0);assert.equal(sim.state.fish,null);assert.equal(sim.state.misses,1);assert.equal(sim.rodConsumableStatus().rig.present,true);
 assert.ok(sim.state.baitOnHook.condition<baitCondition,'nibbling still wears the attached lure');assert.deepEqual(sim.state.profile.stock,stock);
});

test('successful seating reuses the already chosen hook purchase and retention threshold',()=>{
 const sim=ready();bite(sim);const hold=sim.state.biteHold,threshold=hold.threshold;
 until(sim,s=>s.fishState==='fight',10,{reel:1.2});assert.equal(sim.state.hookHold,hold);assert.equal(sim.state.hookHold.threshold,threshold);assert.equal(sim.state.fish.rig.hookSize,'2/0');assert.equal(sim.state.fish.rig.hookStyle,'circle');
});

test('fine wire straightens under an actual large-fish overload and consumes the terminal rig only once',()=>{
 const sim=rigReady('sabiki');bite(sim,{latin:'Ophiodon elongatus',name:'长蛇齿单线鱼',length:95,kg:9});
 until(sim,s=>s.fishState==='fight',10,{reel:1.2});const stock=structuredClone(sim.state.profile.stock),spares=structuredClone(sim.state.profile.rigStock);
 Object.assign(sim.state,{paidLineMeters:35,lureDepth:20,drag:.85});let peak=0;
 for(let t=0;t<160&&sim.state.fishState==='fight';t+=.1){sim.step(.1,{reel:.3});peak=Math.max(peak,sim.state.rodLoadN);}
 assert.ok(peak>17,'the actual physics exceeded this fine-wire hook limit');assert.equal(sim.state.fishState,'idle');assert.match(sim.state.toast,/鱼钩被拉直/);assert.equal(sim.rodConsumableStatus().rig.present,false);assert.equal(sim.state.profile.rodSupplies.rod,null);assert.equal(sim.state.misses,1);assert.equal(sim.state.breaks,0);
 assert.equal(sim.lowerRig().ok,false);assert.equal(sim.stats.hasRod,true);assert.deepEqual(sim.state.profile.stock,stock);assert.deepEqual(sim.state.profile.rigStock,spares);
 const resumed=new PixelSimulation({saved:sim.snapshot()});resumed.start(true);assert.equal(resumed.rodConsumableStatus().rig.present,false,'reload cannot repair a straightened hook');assert.equal(resumed.state.profile.rigStock.sabiki.length,0);
});

test('an already straightened hook cannot be landed at the gunwale on the same frame',()=>{
 const sim=ready();bite(sim);until(sim,s=>s.fishState==='fight',10,{reel:1.2});sim.state.hookHold.wireDamage=1;
 Object.assign(sim.state,{paidLineMeters:1,lureDepth:.1,lineSlackMeters:0});sim.step(.1,{reel:1.2});
 assert.equal(sim.state.fishState,'idle');assert.equal(sim.state.catches.length,0);assert.match(sim.state.toast,/鱼钩被拉直/);assert.equal(sim.rodConsumableStatus().rig.present,false);
});

test('partial wire damage survives retrieval, save/resume and stowing then reinstalling the same rig',()=>{
 const sim=rigReady('sabiki'),large={latin:'Ophiodon elongatus',name:'长蛇齿单线鱼',length:95,kg:9};bite(sim,large);
 until(sim,s=>s.fishState==='fight',10,{reel:1.2});Object.assign(sim.state,{paidLineMeters:35,lureDepth:20,drag:.85});
 until(sim,s=>(s.profile.rodSupplies.rod?.hookDamage||0)>.1,80,{reel:.3});const damage=sim.rodConsumableStatus().rig.hookDamage;
 assert.ok(damage>.1&&damage<1);assert.ok(sim.retrieve().ok);assert.equal(sim.rodConsumableStatus().rig.hookDamage,damage);
 const resumed=new PixelSimulation({saved:sim.snapshot(),rng:()=>.05,patrolRng:()=>.9,conditions:{currentMps:0}});resumed.start(true);assert.equal(resumed.rodConsumableStatus().rig.hookDamage,damage);
 assert.ok(resumed.replaceRig(undefined,'bottom').ok);assert.equal(resumed.state.profile.rigStock.sabiki[0].hookDamage,damage);assert.equal(resumed.rodConsumableStatus().rig.hookDamage,0);
 assert.ok(resumed.replaceRig(undefined,'sabiki').ok);assert.equal(resumed.rodConsumableStatus().rig.hookDamage,damage);
 bite(resumed,large);assert.equal(resumed.state.biteHold.wireDamage,damage,'a second fish inherits the physical hook damage');
});
