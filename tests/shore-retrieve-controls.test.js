import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {shoreSupply,isShoreLure} from '../dist/shore-equipment.js';
import {shorePresentation,stepShorePresentation} from '../dist/shore-presentation.js';
import {shoreLureAppeal} from '../dist/shore-fish-ecology.js';
import {shoreRodPose} from '../dist/shore-action-view.js';
import {finishShoreFlight,finishShoreRetrieve} from './helpers/shore-cast.js';

const advance=(sim,seconds,input={})=>{for(let t=0;t<seconds;t+=.05)sim.update(.05,input);};
const calm={depth:4,currentX:0,currentY:0,orbitalVelocity:0,waveVelocityX:0,waveVelocityY:0};
function setup(sceneId,rig){
 const sim=sceneId==='benicia'?new BeniciaSimulation({date:'2026-09-29',rng:()=>.5}):new PacificaSimulation({sceneId,date:'2026-09-29',regular:false,rng:()=>.5,seaState:{waveHeightM:0,wavePeriodS:10}});
 Object.assign(sim.state.player,sim.shop.door);sim.state.credits=500;assert.ok(sim.buy(rig).ok);assert.ok(sim.configureEquipment(rig).ok);
 if(!isShoreLure(rig)){sim.state.inventory.sandcrab=12;assert.ok(sim.equipBait('sandcrab').ok);}
 Object.assign(sim.state.player,{x:450,y:sim.world.shoreY(450)+25});
 sim.stepFish=()=>{}; // Physics/equipment fixture: no random fish interruptions.
 if(sceneId==='benicia')sim.state.crowd=[];
 return sim;
}
for(const sceneId of ['pacifica','half-moon-bay','benicia'])for(const rig of ['carolina_rig','fishfinder_rig','float_rig','salmon_spoon','salmon_spinner','grub_jig']){
 test(`${sceneId}: ${rig} reels gradually, pauses, and can be recast without duplicating supplies`,()=>{
  const sim=setup(sceneId,rig),s=sim.state,supply=shoreSupply(s),inventory=JSON.stringify(s.inventory),stock=JSON.stringify(s.rigStock);
  assert.ok(sim.cast({power:.45}).ok);finishShoreFlight(sim);assert.ok(sim.canReel);
  const start=s.lineDistance;assert.ok(sim.retrieve().ok);assert.equal(s.autoRetrieve,true);assert.equal(s.phase,'waiting');
  advance(sim,.5);assert.ok(s.lineDistance<start);assert.ok(s.cast,'half a second cannot teleport a cast home');
  sim.retrieve();assert.equal(s.autoRetrieve,false);const paused=s.lineDistance;advance(sim,.1);assert.ok(Math.abs(s.lineDistance-paused)<.3);
  finishShoreRetrieve(sim);assert.equal(shoreSupply(s),supply);assert.equal(JSON.stringify(s.inventory),inventory);assert.equal(JSON.stringify(s.rigStock),stock);
  if(sceneId==='benicia')s.crowd=[];
  assert.ok(sim.cast({power:.35}).ok);finishShoreFlight(sim);finishShoreRetrieve(sim);
  assert.equal(shoreSupply(s),supply);assert.equal(JSON.stringify(s.inventory),inventory);assert.equal(s.stats.casts,2);
 });
}
test('retrieve speed, rod lift, directional sweep and twitch each change actual presentation',()=>{
 const initial=shorePresentation(calm,'grub_jig',2),step=c=>stepShorePresentation(initial,calm,'grub_jig',.2,{directionX:0,directionY:1,...c});
 const slow=step({retrieveSpeed:.35}),fast=step({retrieveSpeed:1.8});assert.ok(fast.depth<slow.depth);assert.ok(fast.driftY>slow.driftY);
 const high=step({retrieveSpeed:1,rodLift:1}),low=step({retrieveSpeed:1,rodLift:0});assert.ok(high.depth<low.depth);
 const left=step({rodSweep:-1}),right=step({rodSweep:1});assert.ok(left.driftX>0&&right.driftX<0);
 const twitch=step({twitch:true});assert.ok(twitch.depth<initial.depth);assert.ok(twitch.motion>step({}).motion);
 const pause=stepShorePresentation(twitch,calm,'grub_jig',1);assert.ok(pause.depth>twitch.depth);
 const bottom=id=>stepShorePresentation(shorePresentation(calm,id,4),calm,id,.1,{twitch:true});
 assert.ok(bottom('carolina_rig').depth<bottom('fishfinder_rig').depth,'lighter rig hops more easily');
});
test('held twitch is one physical hop per press and controls clamp/save without resetting',()=>{
 const sim=setup('pacifica','grub_jig');sim.cast({power:.6});finishShoreFlight(sim);advance(sim,4);
 const depth=sim.state.presentation.depth;advance(sim,.4,{twitch:true});assert.ok(sim.state.presentation.depth>depth-.5,'holding twitch cannot apply a new hop every frame');
 sim.setFishingControls({reelSpeed:2,rodLift:NaN,rodSweep:-8,drag:0});
 assert.deepEqual(sim.state.fishingControls,{reelSpeed:1,rodLift:.35,rodSweep:-1,drag:.1});
 const restored=new PacificaSimulation({saved:sim.snapshot()});assert.deepEqual(restored.state.fishingControls,sim.state.fishingControls);
});
test('artificial action and depth affect beach fish appeal, with no natural bait requirement',()=>{
 const sim=setup('pacifica','grub_jig');sim.cast({power:.5});finishShoreFlight(sim);advance(sim,2,{reel:true,reelSpeed:.25});
 assert.equal(shoreSupply(sim.state).bait,null);assert.ok(sim.lureDeployed);assert.ok(sim.fishWorld().stimulus?.flash>0);
 const moving={depth:3.5,motion:.45},stopped={...moving,motion:0};
 const appeal=p=>shoreLureAppeal('halibut',{rig:'grub_jig',presentation:p,waterDepth:4});
 assert.ok(appeal(moving)>appeal(stopped));assert.ok(appeal(moving)>appeal({...moving,depth:.3}));
 assert.ok(sim.encounterRates().totalRatePerSecond>0,'shore diagnostics and population both recognize lure fishing');
});
test('cross-current cannot hold an empty rig permanently away from a winding spool',()=>{
 const current={...calm,currentX:2,currentY:-2};
 const p=stepShorePresentation(shorePresentation(current,'salmon_spoon',1),current,'salmon_spoon',.1,{retrieveSpeed:.4,directionX:0,directionY:1});
 assert.ok(p.driftY>=.2-1e-9);assert.ok(p.driftX>0,'sideways water drift is retained');assert.ok(Number.isFinite(p.relativeSpeed));
});
test('a lure left on Benicia rock can snag and retrieval loses only the mounted rig',()=>{
 const sim=new BeniciaSimulation({date:'2026-09-29',rng:()=>.5});sim.stepFish=()=>{};sim.state.crowd=[];
 Object.assign(sim.state.player,{x:1430,y:sim.world.shoreY(1430)+25});
 const stock=JSON.stringify(sim.state.rigStock),bait=JSON.stringify(sim.state.inventory);
 assert.ok(sim.cast({power:.2}).ok);finishShoreFlight(sim);advance(sim,20);
 assert.equal(sim.state.shoreSample.substrate,'rock');assert.ok(sim.state.snagSeconds>6);
 sim.update(.05,{reel:true});assert.equal(sim.state.phase,'walk');assert.equal(shoreSupply(sim.state),null);
 assert.equal(JSON.stringify(sim.state.rigStock),stock);assert.equal(JSON.stringify(sim.state.inventory),bait);
});

function controlledFight(){
 const sim=setup('benicia','salmon_spoon'),s=sim.state;
 s.onPier=true;Object.assign(s.player,{x:1090,y:165});s.crowd=[];
 assert.ok(sim.cast({power:.6,aim:.5}).ok);finishShoreFlight(sim);
 // Isolate loaded rod response from the encounter RNG; strike still creates
 // the real species motion and clears the previous presentation's pulse.
 Object.assign(s,{phase:'bite',biteSpeciesId:'white_croaker',biteLengthCm:25});s.presentation.twitch=1;
 assert.ok(sim.strike().ok);assert.equal(s.presentation.twitch,0);
 s.lineDistance=6;s.tension=.45;s.fishMotion.depth=6;
 return sim;
}
test('fight lift pulse loads the visible rod and fish depth without free spool pickup, then decays',()=>{
 const lifted=controlledFight(),steady=controlledFight(),before=lifted.state.lineDistance;
 lifted.update(.05,{reel:false,twitch:true});steady.update(.05,{reel:false});
 assert.ok(lifted.state.presentation.twitch>.9&&lifted.state.presentation.twitch<=1);
 assert.ok(lifted.state.tension>steady.state.tension,'lifting adds real bounded line pressure');
 assert.ok(shoreRodPose(lifted.state).tip.y<shoreRodPose(steady.state).tip.y,'same pulse moves the actual connected rod');
 assert.ok(lifted.state.lineDistance>=before,'a lift never reels line in for free');
 advance(lifted,.3,{reel:false});advance(steady,.3,{reel:false});
 assert.ok(lifted.state.fishMotion.depth<steady.state.fishMotion.depth,'loaded rod pulse changes continuous fish ascent');
 advance(lifted,1.6,{reel:true});assert.ok(lifted.state.presentation.twitch<.01,'pulse relaxes instead of sticking after a strike');
 assert.equal(lifted.state.fishingControls.rodLift,.35,'a temporary lift preserves the held-rod preference');
});
test('holding fight lift is one pulse, and a fresh press can lift again',()=>{
 const held=controlledFight(),released=controlledFight();
 held.update(.05,{twitch:true});released.update(.05,{twitch:true});
 advance(held,.5,{twitch:true});advance(released,.5,{twitch:false});
 assert.equal(held.state.presentation.twitch,released.state.presentation.twitch);
 assert.equal(held.state.fishMotion.depth,released.state.fishMotion.depth);
 assert.equal(held.state.tension,released.state.tension);
 const previous=released.state.presentation.twitch;released.update(.05,{twitch:true});
 assert.ok(released.state.presentation.twitch>previous);
});
