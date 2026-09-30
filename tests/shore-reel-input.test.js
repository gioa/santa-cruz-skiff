import test from 'node:test';
import assert from 'node:assert/strict';
import {createShoreReelInput,tapShoreReelInput,stepShoreReelInput,SHORE_CRANK_STROKE_SECONDS,SHORE_CRANK_TURN_METRES,SHORE_MAX_CRANK_RATE} from '../dist/shore-reel-input.js';
import {PacificaSimulation,SPECIES} from '../dist/pacifica-sim.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {shorePresentation} from '../dist/shore-presentation.js';
import {createShoreFightMotion} from '../dist/shore-fish-fight.js';
const close=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
function cadence(hz,{seconds=8,dt=.01,sim=null}={}){
 let state=createShoreReelInput(),turns=0,feedbackTurns=0,nextTap=0;
 for(let t=0;t<seconds-1e-8;t+=dt){
  if(t+1e-8>=nextTap){state=tapShoreReelInput(state);nextTap+=1/hz;}
  const step=stepShoreReelInput(state,dt);state=step.state;turns+=step.handleTurns;
  if(sim){sim.drift(dt,step.input);feedbackTurns+=sim.state.reelFeedback.handleRate*dt;}
 }
 return{state,turns,feedbackTurns};
}
function rig(Simulation=PacificaSimulation){
 const sim=new Simulation({rng:()=>.5,regular:false}),s=sim.state,x=730,y=sim.scene.shoreY(x)+3;
 s.player={...s.player,x,y};s.phase='waiting';s.cast={origin:{x,y},target:{x,y:y-192},distance:60,fightDistance:60};s.lineDistance=60;
 s.seaState={waveHeightM:0,tideM:1};s.rodSupplies[s.activeRod]={id:'grub_jig',condition:1,bait:null};
 const sample={...sim.refreshSample(),currentX:0,currentY:0,waveVelocityX:0,waveVelocityY:0,waveLoad:0,orbitalVelocity:0,whitewater:0};
 sim.refreshSample=()=>{s.shoreSample=sample;return sample;};s.presentation=shorePresentation(sample,'grub_jig',1);
 return sim;
}

test('one deliberate tap is one bounded crank stroke, then input becomes explicitly idle',()=>{
 const initial=createShoreReelInput(),pressed=tapShoreReelInput(initial);assert.equal(initial.turnsRemaining,0);
 let state=pressed,total=0;
 for(let i=0;i<4;i++){const step=stepShoreReelInput(state,.1);state=step.state;total+=step.handleTurns;assert.equal(step.input.reel,true);close(step.input.crankRate,SHORE_MAX_CRANK_RATE);}
 close(total,1);assert.equal(state.turnsRemaining,0);
 assert.deepEqual(stepShoreReelInput(state,.1).input,{reel:false,crankRate:0});
 assert.equal(SHORE_CRANK_STROKE_SECONDS,.4);
});

test('tap frequency produces proportional winding below the physical cadence cap',()=>{
 const sparse=cadence(1),dense=cadence(2),limited=cadence(10);
 close(sparse.turns,8);close(dense.turns,16);close(dense.turns,2*sparse.turns);
 assert.ok(limited.turns<=8*SHORE_MAX_CRANK_RATE+1e-8);
 assert.ok(limited.state.turnsRemaining<=1,'overlapping taps cannot create a long queue');
 const stop=stepShoreReelInput(limited.state,SHORE_CRANK_STROKE_SECONDS);assert.equal(stop.state.turnsRemaining,0);
});

test('frantic simultaneous tapping cannot leave more than one unfinished turn',()=>{
 let state=createShoreReelInput();for(let i=0;i<1000;i++)state=tapShoreReelInput(state);
 assert.equal(state.turnsRemaining,1);const after=stepShoreReelInput(state,10);
 assert.equal(after.handleTurns,1);assert.equal(after.state.turnsRemaining,0);
 close(after.input.crankRate*10,1);
});

test('pause/disable discards pending strokes and no input reappears after resume',()=>{
 const pressed=tapShoreReelInput(createShoreReelInput());
 const paused=stepShoreReelInput(pressed,.1,{enabled:false});assert.deepEqual(paused.state,createShoreReelInput());assert.equal(paused.handleTurns,0);
 assert.deepEqual(stepShoreReelInput(paused.state,.1).input,{reel:false,crankRate:0});
 assert.deepEqual(tapShoreReelInput(pressed,{enabled:false}),createShoreReelInput());
 const zero=stepShoreReelInput(pressed,0);assert.equal(zero.state.turnsRemaining,1);assert.equal(zero.input.crankRate,0);
});

test('unloaded lure recovery follows crank turns, not a hidden speed preset',()=>{
 const slow=rig(),fast=rig();slow.state.fishingControls.reelSpeed=1;fast.state.fishingControls.reelSpeed=.2;
 const a=cadence(1,{sim:slow}),b=cadence(2,{sim:fast});
 close(60-slow.state.lineDistance,a.turns*SHORE_CRANK_TURN_METRES,1e-6);
 close(60-fast.state.lineDistance,b.turns*SHORE_CRANK_TURN_METRES,1e-6);
 close(60-fast.state.lineDistance,2*(60-slow.state.lineDistance),1e-6);
 close(a.feedbackTurns,a.turns);close(b.feedbackTurns,b.turns);
});

test('explicit stopped crank suppresses stale held input and reel-home in both scenes',()=>{
 for(const Simulation of [PacificaSimulation,BeniciaSimulation]){
  const sim=rig(Simulation),s=sim.state;s.autoRetrieve=true;sim.setReeling(true);s.snagSeconds=10;
  sim.drift(.1,{reel:true,crankRate:0});
  assert.equal(s.phase,'waiting');assert.equal(s.autoRetrieve,false);assert.equal(s.retrieveInput,false);assert.equal(s.reelFeedback.handleRate,0);close(s.lineDistance,60);
 }
});

test('fight crank input is capped and stopping does not inherit prior reeling',()=>{
 const sim=rig(),s=sim.state;s.phase='fighting';s.fish={...SPECIES.find(f=>f.speciesId==='jacksmelt'),weightKg:.3,length:32};s.fishMotion=createShoreFightMotion(s.fish,{depth:1});s.tension=.4;
 sim.fight(.1,true,{crankRate:100});assert.ok(s.reelFeedback.handleRate>0&&s.reelFeedback.handleRate<=SHORE_MAX_CRANK_RATE);
 s.autoRetrieve=true;sim.setReeling(true);sim.fight(.1,true,{crankRate:0});
 assert.equal(s.autoRetrieve,false);assert.equal(s.retrieveInput,false);assert.equal(s.reelFeedback.handleRate,0);assert.equal(s.reelFeedback.linePickupRate,0);
});
