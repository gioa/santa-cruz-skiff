import test from 'node:test';
import assert from 'node:assert/strict';
import {seatHook} from './helpers/pixel-hook.js';
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
function actions(sim,options={}){return boatActions(sim.state,{hasRod:sim.stats.hasRod,hasAnchor:sim.hasGear('anchor'),hasChart:sim.hasGear('nautical_chart'),canLower:sim.fishingReadiness().ok,nearDock:false,...options});}
const actionKeys=['unmoor','dock','engine','anchor','switchPanel','adjustPose','reel','spool','drag','lower','cast','hook','catch','retrieve','mount','take','assemble','return'];
const offered=a=>actionKeys.filter(key=>a[key]).sort();

test('each reachable fishing phase offers only its permitted actions, distinguishing hand and side holders',()=>{
 const sim=ready(),base=structuredClone(sim.state),cases=[
  ['idle','hand',['engine','anchor','adjustPose','lower','mount','assemble','return']],
  ['casting','hand',[]],
  ['flight','hand',[]],
  ['sinking','hand',['adjustPose','reel','spool','retrieve','mount']],
  ['waiting','hand',['adjustPose','reel','spool','retrieve','mount']],
  ['bite','hand',['adjustPose','reel','spool','hook']],
  ['fight','hand',['adjustPose','reel','spool','drag']],
  ['landed','hand',['catch']],
 ];
 for(const mount of['port','starboard'])cases.push(
  ['idle',mount,['engine','anchor','adjustPose','lower','take','assemble','return']],
  ['sinking',mount,['engine','anchor','adjustPose','spool','take','return']],
  ['waiting',mount,['engine','anchor','adjustPose','spool','take','return']],
  ['bite',mount,['adjustPose','spool','take']],
  ['fight',mount,['adjustPose','spool','drag','take']],
 );
 for(const[fishState,rodMount,expected]of cases){
  const state={...base,fishState,rodMount},a=boatActions(state,{hasRod:true,hasAnchor:true,hasChart:true,canLower:fishState==='idle',canCast:fishState==='idle'&&rodMount==='hand',nearDock:false});
  assert.deepEqual(offered(a),expected.sort(),`${fishState}/${rodMount}`);assert.equal(a.helm,false);assert.equal(a.console,true);assert.equal(a.tackle,true);
 }
});

test('a hand-held deployed rig hides boat operation until a real reel retrieve or side-holder transition',()=>{
 const sim=ready();assert.equal(actions(sim).engine,true);assert.ok(sim.lowerRig().ok);sim.state.biteAt=1e6;sim.state.snagThreshold=Infinity;run(sim,5);
 for(const key of['engine','anchor','return','dock','assemble','switchPanel'])assert.equal(actions(sim,{nearDock:true})[key],false,key);assert.equal(sim.toggleEngine().ok,false);assert.equal(sim.setThrottle(.2),false);assert.equal(actions(sim).retrieve,true);
 const line=sim.state.paidLineMeters;sim.step(.1,{reel:1.2});assert.ok(sim.state.paidLineMeters<line);assert.equal(actions(sim).engine,false,'one crank stroke must not act as an instant retrieve');
 for(let t=0;t<40&&sim.state.fishState!=='idle';t+=.1)sim.step(.1,{reel:1.2});assert.equal(sim.state.fishState,'idle');assert.equal(actions(sim).engine,true);
 assert.ok(sim.lowerRig().ok);assert.ok(sim.setRodMount('port').ok);assert.equal(actions(sim).engine,true);assert.equal(actions(sim).retrieve,false);assert.equal(actions(sim).reel,false);assert.ok(sim.toggleEngine().ok);assert.ok(sim.setThrottle(.2));run(sim,2);const helm=actions(sim,{panel:'helm'});assert.equal(helm.helm,true);assert.equal(helm.monitor,true);assert.equal(helm.tackle,false);assert.equal(helm.switchPanel,true);assert.equal(actions(sim).take,false,'a driven boat cannot immediately pick up the rod');
});

test('a mounted bite offers pickup rather than strike, and pickup exposes the real hook action',()=>{
 const sim=ready();assert.ok(sim.setRodMount('starboard').ok);assert.ok(sim.lowerRig().ok);sim.state.biteAt=Infinity;sim.state.snagThreshold=Infinity;run(sim,3);assert.ok(sim.state.lureDepth>.15);sim.state.biteAt=.000001;
 for(let t=0;t<5&&sim.state.fishState!=='bite';t+=.1)sim.step(.1);assert.equal(sim.state.fishState,'bite');let a=actions(sim);assert.equal(a.take,true);assert.equal(a.hook,false);assert.equal(a.engine,false);assert.equal(a.anchor,false);assert.equal(a.reel,false);assert.equal(sim.hook().ok,false);
 assert.ok(sim.setRodMount('hand').ok);a=actions(sim);assert.equal(a.take,false);assert.equal(a.hook,true);assert.equal(a.reel,true);seatHook(sim);assert.equal(sim.state.fishState,'fight');a=actions(sim);assert.equal(a.hook,false);assert.equal(a.mount,false);assert.equal(a.engine,false);assert.equal(a.drag,true);
});

test('vertical-only policy offers lowering even when an obsolete caller claims casting is possible',()=>{
 const sim=ready();assert.equal(actions(sim,{canCast:true}).cast,false);assert.equal(actions(sim).lower,true);
 for(const fishState of['casting','flight']){const a=boatActions({...sim.state,fishState},{hasRod:true,canLower:true,canCast:true});assert.equal(a.cast,false);assert.equal(a.lower,false);assert.equal(a.adjustPose,false);}
 assert.ok(sim.lowerRig().ok);assert.equal(sim.state.fishState,'sinking');assert.equal(actions(sim).cast,false);assert.equal(actions(sim).reel,true);assert.equal(actions(sim).mount,true);
});

test('mooring, inspection, pause and docking suppress the complete active control set',()=>{
 const sim=ready({moored:true});assert.deepEqual(offered(actions(sim,{nearDock:true})),['assemble','unmoor']);assert.equal(actions(sim).tackle,false);assert.equal(actions(sim).helm,false);assert.ok(sim.unmoor().ok);assert.equal(actions(sim).unmoor,false);
 const base=structuredClone(sim.state);for(const patch of[{paused:true},{inspection:{phase:'checking'}},{docking:{progress:.5}},{rentalPaid:false},{launchStage:'lowering'},{mode:'walk'}]){
  const a=boatActions({...base,...patch},{hasRod:true,hasAnchor:true,hasChart:true,canLower:true,canCast:true,nearDock:true});assert.deepEqual(offered(a),[],JSON.stringify(patch));assert.equal(a.console,false);assert.equal(a.tackle,false);assert.equal(a.helm,false);
 }
 sim.pause(true);assert.deepEqual(offered(actions(sim)),[]);sim.pause(false);assert.ok(sim.dock().ok);assert.deepEqual(offered(actions(sim)),[]);
});

test('legacy standing flags cannot trap rod controls and a landed fish offers only catch handling',()=>{
 const sim=ready(),normal=offered(actions(sim));sim.state.standing=true;assert.deepEqual(offered(actions(sim)),normal);
 assert.ok(sim.lowerRig().ok);run(sim,1);assert.equal(actions(sim).reel,true);assert.equal(actions(sim).assemble,false);
 for(const key of['stand','sit','more'])assert.equal(key in actions(sim),false);
 sim.state.fishState='landed';sim.state.fish={name:'test',latin:'Scomber japonicus',length:30,kg:.6};assert.deepEqual(offered(actions(sim,{nearDock:true})),['catch']);assert.ok(sim.keepCatch().ok);assert.equal(actions(sim).catch,false);assert.equal(actions(sim).assemble,true);assert.equal(actions(sim).engine,true);
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
 sim.state.profile.stock.squid=1;assert.ok(sim.equip('bait').ok);const noBox=sim.fishingReadiness();assert.equal(noBox.ok,false);assert.equal(actions(sim).lower,false);assert.equal(sim.lowerRig().message,noBox.message);assert.ok(sim.equip('bait').ok);assert.ok(sim.equip('tackle').ok);assert.equal(actions(sim).lower,false);assert.equal(sim.lowerRig().ok,false);assert.ok(sim.equip('tackle').ok);assert.ok(sim.replaceBait().ok);assert.equal(actions(sim).lower,true);assert.ok(sim.lowerRig().ok);assert.equal(sim.state.profile.stock.squid,0);
});

test('readiness capabilities preserve handheld and mounted speed/engine thresholds without mutating state',()=>{
 const sim=ready();sim.state.speed=.91;assert.equal(actions(sim).lower,false);assert.equal(actions(sim).cast,false);sim.state.speed=0;assert.ok(sim.toggleEngine().ok);assert.equal(actions(sim).lower,false);assert.equal(actions(sim).cast,false);assert.ok(sim.setRodMount('port').ok);assert.equal(actions(sim).lower,true);assert.equal(actions(sim).cast,false);sim.state.speed=1.56;assert.equal(actions(sim).lower,false);sim.state.speed=1.55;assert.equal(actions(sim).lower,true);
 const state=structuredClone(sim.state),context={hasRod:true,hasAnchor:true,hasChart:true,canLower:true,canCast:false,nearDock:false};boatActions(sim.state,context);assert.deepEqual(sim.state,state);assert.deepEqual(context,{hasRod:true,hasAnchor:true,hasChart:true,canLower:true,canCast:false,nearDock:false});
});
