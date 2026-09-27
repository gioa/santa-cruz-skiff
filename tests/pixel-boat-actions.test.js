import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const {boatActions}=await import('../dist/pixel-boat-actions.js');
const run=(sim,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.1)sim.step(Math.min(.1,seconds-t),input);};
function ready({moored=false}={}){
 const sim=new PixelSimulation({rng:()=>.05,patrolRng:()=>.9,profile:{version:2,credits:500}});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
 for(const item of['anchor','nautical_chart']){assert.ok(sim.buyGear(item).ok);assert.ok(sim.equip(item).ok);}
 assert.ok(sim.launchBoat().ok);run(sim,24.1);Object.assign(sim.state,{playerX:HARBOR.boardingX,playerZ:HARBOR.boardingZ});assert.ok(sim.board().ok);if(!moored)assert.ok(sim.unmoor().ok);return sim;
}
function actions(sim,options={}){return boatActions(sim.state,{hasRod:sim.stats.hasRod,hasAnchor:sim.hasGear('anchor'),hasChart:sim.hasGear('nautical_chart'),canLower:sim.fishingReadiness().ok,canCast:sim.fishingReadiness(true).ok,nearDock:false,...options});}
const actionKeys=['unmoor','dock','engine','anchor','switchPanel','more','sit','adjustPose','reel','spool','drag','lower','cast','hook','catch','retrieve','mount','take','stand','assemble','return'];
const offered=a=>actionKeys.filter(key=>a[key]).sort();

test('each reachable fishing phase offers only its permitted actions, distinguishing hand and side holders',()=>{
 const sim=ready(),base=structuredClone(sim.state),cases=[
  ['idle','hand',['engine','anchor','more','adjustPose','lower','cast','mount','stand','assemble','return']],
  ['casting','hand',['adjustPose','cast']],
  ['flight','hand',[]],
  ['sinking','hand',['adjustPose','reel','spool','drag','retrieve','mount']],
  ['waiting','hand',['adjustPose','reel','spool','drag','retrieve','mount']],
  ['bite','hand',['adjustPose','reel','spool','drag','hook']],
  ['fight','hand',['adjustPose','reel','spool','drag']],
  ['landed','hand',['catch']],
 ];
 for(const mount of['port','starboard'])cases.push(
  ['idle',mount,['engine','anchor','more','adjustPose','lower','take','stand','assemble','return']],
  ['sinking',mount,['engine','anchor','adjustPose','spool','drag','take','return']],
  ['waiting',mount,['engine','anchor','adjustPose','spool','drag','take','return']],
  ['bite',mount,['adjustPose','spool','drag','take']],
 );
 for(const[fishState,rodMount,expected]of cases){
  const state={...base,fishState,rodMount},a=boatActions(state,{hasRod:true,hasAnchor:true,hasChart:true,canLower:fishState==='idle',canCast:fishState==='idle'&&rodMount==='hand',nearDock:false});
  assert.deepEqual(offered(a),expected.sort(),`${fishState}/${rodMount}`);assert.equal(a.helm,false);assert.equal(a.console,true);assert.equal(a.tackle,true);
 }
});

test('a hand-held deployed rig hides boat operation until a real reel retrieve or side-holder transition',()=>{
 const sim=ready();assert.equal(actions(sim).engine,true);assert.ok(sim.lowerRig().ok);sim.state.biteAt=1e6;sim.state.snagThreshold=Infinity;run(sim,5);
 for(const key of['engine','anchor','return','dock','stand','more','switchPanel'])assert.equal(actions(sim,{nearDock:true})[key],false,key);assert.equal(sim.toggleEngine().ok,false);assert.equal(sim.setThrottle(.2),false);assert.equal(actions(sim).retrieve,true);
 const line=sim.state.paidLineMeters;sim.step(.1,{reel:1.2});assert.ok(sim.state.paidLineMeters<line);assert.equal(actions(sim).engine,false,'one crank stroke must not act as an instant retrieve');
 for(let t=0;t<40&&sim.state.fishState!=='idle';t+=.1)sim.step(.1,{reel:1.2});assert.equal(sim.state.fishState,'idle');assert.equal(actions(sim).engine,true);
 assert.ok(sim.lowerRig().ok);assert.ok(sim.setRodMount('port').ok);assert.equal(actions(sim).engine,true);assert.equal(actions(sim).retrieve,false);assert.equal(actions(sim).reel,false);assert.ok(sim.toggleEngine().ok);assert.ok(sim.setThrottle(.2));run(sim,2);const helm=actions(sim,{panel:'helm'});assert.equal(helm.helm,true);assert.equal(helm.monitor,true);assert.equal(helm.tackle,false);assert.equal(helm.switchPanel,true);assert.equal(actions(sim).take,false,'a driven boat cannot immediately pick up the rod');
});

test('a mounted bite offers pickup rather than strike, and pickup exposes the real hook action',()=>{
 const sim=ready();assert.ok(sim.setRodMount('starboard').ok);assert.ok(sim.lowerRig().ok);sim.state.biteAt=.5;run(sim,2);assert.equal(sim.state.fishState,'bite');let a=actions(sim);assert.equal(a.take,true);assert.equal(a.hook,false);assert.equal(a.engine,false);assert.equal(a.anchor,false);assert.equal(a.reel,false);assert.equal(sim.hook().ok,false);
 assert.ok(sim.setRodMount('hand').ok);a=actions(sim);assert.equal(a.take,false);assert.equal(a.hook,true);assert.equal(a.reel,true);assert.ok(sim.hook().ok);assert.equal(sim.state.fishState,'fight');a=actions(sim);assert.equal(a.hook,false);assert.equal(a.mount,false);assert.equal(a.engine,false);assert.equal(a.drag,true);
});

test('the charging cast keeps its release control while incompatible controls stay absent',()=>{
 const sim=ready();assert.equal(actions(sim).cast,true);assert.ok(sim.startCast().ok);run(sim,.8);const charging=actions(sim);assert.equal(sim.fishingReadiness(true).ok,false,'new cast readiness is distinct from completing the current cast');assert.equal(charging.cast,true);
 for(const key of['lower','reel','spool','drag','mount','take','engine','anchor','return','dock','stand','more'])assert.equal(charging[key],false,key);
 assert.ok(sim.releaseCast().ok);const flight=actions(sim);assert.equal(flight.cast,false);assert.equal(flight.adjustPose,false);assert.equal(flight.reel,false);assert.equal(flight.mount,false);assert.equal(flight.engine,false);run(sim,3);assert.ok(['sinking','waiting'].includes(sim.state.fishState));assert.equal(actions(sim).reel,true);assert.equal(actions(sim).mount,true);
});

test('mooring, inspection, pause and docking suppress the complete active control set',()=>{
 const sim=ready({moored:true});assert.deepEqual(offered(actions(sim,{nearDock:true})),['unmoor']);assert.equal(actions(sim).tackle,false);assert.equal(actions(sim).helm,false);assert.ok(sim.unmoor().ok);assert.equal(actions(sim).unmoor,false);
 const base=structuredClone(sim.state);for(const patch of[{paused:true},{inspection:{phase:'checking'}},{docking:{progress:.5}},{rentalPaid:false},{launchStage:'lowering'},{mode:'walk'}]){
  const a=boatActions({...base,...patch},{hasRod:true,hasAnchor:true,hasChart:true,canLower:true,canCast:true,nearDock:true});assert.deepEqual(offered(a),[],JSON.stringify(patch));assert.equal(a.console,false);assert.equal(a.tackle,false);assert.equal(a.helm,false);
 }
 sim.pause(true);assert.deepEqual(offered(actions(sim)),[]);sim.pause(false);assert.ok(sim.dock().ok);assert.deepEqual(offered(actions(sim)),[]);
});

test('standing offers only sitting, even for an already deployed legacy rod; landed fish offers only catch handling',()=>{
 const sim=ready();assert.ok(sim.stand().ok);assert.deepEqual(offered(actions(sim)),['sit']);assert.ok(sim.lowerRig().ok);run(sim,1);const paid=sim.state.paidLineMeters;assert.deepEqual(offered(actions(sim)),['sit']);assert.ok(sim.stand().ok);assert.equal(sim.state.paidLineMeters,paid);assert.equal(actions(sim).reel,true);
 sim.state.fishState='landed';sim.state.fish={name:'test',latin:'Scomber japonicus',length:30,kg:.6};assert.deepEqual(offered(actions(sim,{nearDock:true})),['catch']);assert.ok(sim.keepCatch().ok);assert.equal(actions(sim).catch,false);assert.equal(actions(sim).engine,true);
});

test('anchor and chart routes require their actual equipment and near-dock is an explicit contextual capability',()=>{
 const sim=ready();assert.equal(actions(sim).dock,false);assert.equal(actions(sim,{nearDock:true}).dock,true);sim.state.speed=.85;assert.equal(actions(sim,{nearDock:true}).dock,false);sim.state.speed=0;
 assert.equal(actions(sim).anchor,true);assert.ok(sim.toggleAnchor().ok);assert.equal(actions(sim).anchor,true,'raising an existing anchor stays available');assert.equal(actions(sim).engine,false);assert.equal(actions(sim).return,false);assert.ok(sim.toggleAnchor().ok);assert.ok(sim.equip('anchor').ok);assert.equal(actions(sim).anchor,false);assert.ok(sim.equip('nautical_chart').ok);assert.equal(actions(sim).return,false);
 sim.state.fuel=0;assert.equal(actions(sim).engine,false);sim.state.engine=true;assert.equal(actions(sim).engine,true,'engine stop remains available even when fuel is empty');assert.equal(actions(sim,{panel:'helm'}).switchPanel,true);
});

test('readiness is side-effect free and hides missing bait or gear using exactly the same validation as deployment',()=>{
 const sim=ready();sim.state.profile.stock.squid=0;sim.state.baitOnHook=null;const before=structuredClone(sim.state);
 for(let i=0;i<500;i++){assert.equal(sim.fishingReadiness().ok,false);assert.equal(sim.fishingReadiness(true).ok,false);assert.equal(actions(sim).lower,false);assert.equal(actions(sim).cast,false);}assert.deepEqual(sim.state,before,'rendering controls cannot change toasts, inventory, journal or events');
 const readiness=sim.fishingReadiness(),rejected=sim.lowerRig();assert.equal(rejected.ok,false);assert.equal(rejected.message,readiness.message);assert.equal(sim.state.profile.stock.squid,0);assert.equal(sim.state.fishState,'idle');
 sim.state.baitOnHook={kind:'squid',condition:.7};assert.equal(sim.fishingReadiness().ok,true,'usable bait already on the hook needs no fresh stock');assert.equal(actions(sim).lower,true);sim.state.baitOnHook.condition=.08;assert.equal(actions(sim).lower,false);
 sim.state.profile.stock.squid=1;assert.ok(sim.equip('bait').ok);const noBox=sim.fishingReadiness();assert.equal(noBox.ok,false);assert.equal(actions(sim).lower,false);assert.equal(sim.startCast().message,noBox.message);assert.ok(sim.equip('bait').ok);assert.ok(sim.equip('tackle').ok);assert.equal(actions(sim).lower,false);assert.equal(sim.lowerRig().ok,false);assert.ok(sim.equip('tackle').ok);assert.equal(actions(sim).lower,true);assert.ok(sim.lowerRig().ok);assert.equal(sim.state.profile.stock.squid,0);
});

test('readiness capabilities preserve handheld and mounted speed/engine thresholds without mutating state',()=>{
 const sim=ready();sim.state.speed=.91;assert.equal(actions(sim).lower,false);assert.equal(actions(sim).cast,false);sim.state.speed=0;assert.ok(sim.toggleEngine().ok);assert.equal(actions(sim).lower,false);assert.equal(actions(sim).cast,false);assert.ok(sim.setRodMount('port').ok);assert.equal(actions(sim).lower,true);assert.equal(actions(sim).cast,false);sim.state.speed=1.56;assert.equal(actions(sim).lower,false);sim.state.speed=1.55;assert.equal(actions(sim).lower,true);
 const state=structuredClone(sim.state),context={hasRod:true,hasAnchor:true,hasChart:true,canLower:true,canCast:false,nearDock:false};boatActions(sim.state,context);assert.deepEqual(sim.state,state);assert.deepEqual(context,{hasRod:true,hasAnchor:true,hasChart:true,canLower:true,canCast:false,nearDock:false});
});
