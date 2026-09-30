import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation,SPECIES} from '../dist/pacifica-sim.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {createShoreFightMotion} from '../dist/shore-fish-fight.js';
import {shorePresentation} from '../dist/shore-presentation.js';
import {sampleShore} from '../dist/shore-data.js';
import {shoreFishPosition} from '../dist/shore-line-geometry.js';

function deployed({pier=false,fish=null}={}){
 const sim=pier?new BeniciaSimulation({rng:()=>.5}):new PacificaSimulation({rng:()=>.5,regular:false}),s=sim.state;
 const x=pier?sim.scene.pier.tip.x:730,y=pier?sim.scene.pier.tip.y:sim.scene.shoreY(x)+3;
 s.player={...s.player,x,y};s.onPier=pier;s.cast={origin:{x,y},target:{x,y:y-96},distance:30,fightDistance:30};s.lineDistance=30;s.phase=fish?'fighting':'waiting';s.seaState={waveHeightM:0,tideM:1};
 s.rodSupplies[s.activeRod]={id:'grub_jig',condition:1,bait:null};s.presentation=shorePresentation(sim.refreshSample(),'grub_jig',1);
 if(fish){s.fish={...SPECIES.find(f=>f.speciesId===fish),weightKg:fish==='chinook_salmon'?5:.3,length:40};s.fishMotion=createShoreFightMotion(s.fish,{depth:pier?6:1,seed:1});s.tension=.5;}
 return sim;
}

test('moving current does not animate an unwound handle or imply drag slip',()=>{
 const sim=deployed(),s=sim.state;
 s.seaState.waveHeightM=.8;
 sim.drift(.05,{reel:false});
 assert.ok(s.presentation.relativeSpeed>0,'lure moves relative to current');
 assert.equal(s.reelFeedback.handleRate,0);assert.equal(s.reelFeedback.linePickupRate,0);assert.equal(s.reelFeedback.dragSlip,false);
 assert.equal(s.reelFeedback.load,s.tension);assert.ok(s.reelFeedback.slack>=0&&s.reelFeedback.slack<=1);
});

test('winding feedback follows achieved winding term and actual endpoint pickup',()=>{
 const sim=deployed(),s=sim.state;sim.drift(.05,{reel:true});
 assert.ok(s.reelFeedback.handleRate>0);assert.ok(s.reelFeedback.linePickupRate>0);assert.equal(s.reelFeedback.linePayoutRate,0);
 assert.ok(Math.abs(s.reelFeedback.handleRate-s.presentation.retrieveSpeed/.7)<1e-10,'authored 0.7m per handle turn');
 sim.drift(.05,{reel:false});assert.equal(s.reelFeedback.handleRate,0);assert.equal(s.reelFeedback.linePickupRate,0);
});

test('a loaded outward run can pay line through drag while the handle is stopped',()=>{
 const sim=deployed({fish:'chinook_salmon'}),s=sim.state;sim.setFishingControls({drag:.2,rodLift:.7});
 let slip=null;
 for(let i=0;i<100&&s.phase==='fighting';i++){sim.fight(.025,false);if(s.reelFeedback.dragSlip){slip={...s.reelFeedback};break;}}
 assert.ok(slip,'actual endpoint payout at current drag limit');assert.equal(slip.handleRate,0);assert.equal(slip.linePickupRate,0);assert.ok(slip.linePayoutRate>.02);
});

test('outward fish motion below the drag threshold does not produce false ratchet clicks',()=>{
 const sim=deployed({fish:'chinook_salmon'}),s=sim.state;s.tension=.12;sim.setFishingControls({drag:.8});sim.fight(.025,false);
 assert.ok(s.reelFeedback.linePayoutRate>0);assert.equal(s.reelFeedback.dragSlip,false);assert.equal(s.reelFeedback.handleRate,0);
});

test('rod straightening alone cannot masquerade as line payout through drag',()=>{
 const sim=deployed({fish:'chinook_salmon'}),s=sim.state;
 s.lineDistance=20;s.fishMotion.variation=0;s.fishMotion.elapsed=6;
 sim.setFishingControls({rodLift:0,drag:.5});s.tension=.54;
 const position=shoreFishPosition(sim.scene,s),sample=sampleShore(sim.scene,position.x,position.y,s.elapsed,s.seaState);
 s.fishMotion.depth=Math.min(8,sample.depth*.65);
 const depth=s.fishMotion.depth;sim.fight(.05,false);
 assert.equal(s.lineDistance,20);assert.equal(s.fishMotion.depth,depth);assert.equal(s.fishMotion.run,0);
 assert.ok(s.tension<.54,'rod unloads and straightens');
 assert.equal(s.reelFeedback.dragSlip,false);assert.ok(s.reelFeedback.linePayoutRate<.005);
});

test('the reel can be winding while a strong run still wins line',()=>{
 const sim=deployed({fish:'chinook_salmon'}),s=sim.state;sim.setFishingControls({drag:.2,reelSpeed:.2});sim.fight(.025,true);
 assert.ok(s.reelFeedback.handleRate>0);assert.ok(s.reelFeedback.linePayoutRate>0);assert.equal(s.reelFeedback.linePickupRate,0,'net endpoint motion is outward');
});

test('vertical pickup beside a deep pier remains visible after horizontal reach bottoms out',()=>{
 const sim=deployed({pier:true,fish:'chinook_salmon'}),s=sim.state;s.lineDistance=2.5;s.fishMotion.energy=.1;
 let vertical=null;
 for(let i=0;i<2000&&s.phase==='fighting';i++){
  const distance=s.lineDistance,depth=s.fishMotion.depth;sim.fight(.025,true);
  if(s.phase==='fighting'&&s.lineDistance===distance&&s.fishMotion.depth<depth&&s.reelFeedback.linePickupRate>.01){vertical={...s.reelFeedback,depth:s.fishMotion.depth,waterDepth:s.shoreSample.depth};break;}
 }
 assert.ok(vertical,'derived slant reach captures vertical winding');assert.ok(vertical.handleRate>0);assert.ok(vertical.waterDepth>4);assert.equal(vertical.linePayoutRate,0);
});

test('clearing and landing stop both reel and drag feedback immediately',()=>{
 const sim=deployed(),s=sim.state;sim.drift(.05,{reel:true});sim.clearLine();
 assert.deepEqual(s.reelFeedback,{handleRate:0,linePickupRate:0,linePayoutRate:0,dragSlip:false,load:0,slack:0});
 const fishSim=deployed({fish:'jacksmelt'}),f=fishSim.state;f.lineDistance=2.5;f.fishMotion.depth=.025;f.fishMotion.energy=0;f.landingControl=1;fishSim.fight(.025,true);
 assert.equal(f.phase,'landed');assert.equal(f.reelFeedback.handleRate,0);assert.equal(f.reelFeedback.dragSlip,false);assert.equal(f.reelFeedback.linePayoutRate,0);
});
