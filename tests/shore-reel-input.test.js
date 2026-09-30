import test from 'node:test';
import assert from 'node:assert/strict';
import {createShoreReelHold,setShoreReelHeld,stepShoreReelHold,createShoreReelInput,tapShoreReelInput,stepShoreReelInput,SHORE_CRANK_STROKE_SECONDS,SHORE_CRANK_TURN_METRES,SHORE_MAX_CRANK_RATE,SHORE_REEL_HOLD_DELAY_SECONDS,SHORE_ROD_REST_LIFT,SHORE_ROD_HELD_LIFT} from '../dist/shore-reel-input.js';
import {PacificaSimulation,SPECIES} from '../dist/pacifica-sim.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {shorePresentation} from '../dist/shore-presentation.js';
import {createShoreFightMotion} from '../dist/shore-fish-fight.js';
import {shoreRodGeometry} from '../dist/shore-scale.js';
import {shoreTetherReach} from '../dist/shore-tether.js';
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
 s.cast.paidLength=shoreTetherReach(shoreRodGeometry(s).tipWorld,s.cast.target,s.presentation.depth);
 return sim;
}

test('press raises immediately, sustained hold winds after its threshold, release stops and lowers',()=>{
 const initial=createShoreReelHold(),held=setShoreReelHeld(initial,'pointer:7',true);
 assert.deepEqual(initial,{sources:[],heldSeconds:0,raisePending:0});
 const lift=stepShoreReelHold(held,.13);assert.equal(lift.handleTurns,0);assert.equal(lift.input.reel,false);assert.equal(lift.input.rodLift,SHORE_ROD_HELD_LIFT);
 const crossing=stepShoreReelHold(lift.state,.12);close(crossing.handleTurns,.03*SHORE_MAX_CRANK_RATE);
 const continued=stepShoreReelHold(crossing.state,2);close(continued.handleTurns,2*SHORE_MAX_CRANK_RATE);
 const released=setShoreReelHeld(continued.state,'pointer:7',false),stopped=stepShoreReelHold(released,.01);
 assert.deepEqual(stopped.input,{reel:false,crankRate:0,rodLift:SHORE_ROD_REST_LIFT});assert.equal(stopped.handleTurns,0);
 assert.deepEqual(stepShoreReelHold(stopped.state,100).input,stopped.input);
});

test('repeated keydown and overlapping held sources never multiply winding speed',()=>{
 let state=createShoreReelHold();for(let i=0;i<100;i++)state=setShoreReelHeld(state,'key:f',true);
 assert.deepEqual(state.sources,['key:f']);
 state=setShoreReelHeld(state,'pointer:3',true);
 state=stepShoreReelHold(state,SHORE_REEL_HOLD_DELAY_SECONDS).state;
 close(stepShoreReelHold(state,.1).input.crankRate,SHORE_MAX_CRANK_RATE);
 state=setShoreReelHeld(state,'key:f',false);assert.equal(stepShoreReelHold(state,.1).input.reel,true);
 state=setShoreReelHeld(state,'pointer:3',false);assert.equal(stepShoreReelHold(state,.1).input.crankRate,0);
});

test('disabled or reset hold cannot resume winding after a pause or cancellation',()=>{
 let state=setShoreReelHeld(createShoreReelHold(),'key: ',true);
 state=setShoreReelHeld(state,'pointer:5',true);
 const paused=stepShoreReelHold(state,.1,{enabled:false});assert.deepEqual(paused.state,createShoreReelHold());assert.equal(paused.handleTurns,0);
 assert.equal(stepShoreReelHold(paused.state,.1).input.crankRate,0);
 assert.deepEqual(setShoreReelHeld(state,'key:f',true,{enabled:false}),createShoreReelHold());
 assert.equal(stepShoreReelHold(createShoreReelHold(),.1).input.reel,false);
 const noTime=stepShoreReelHold(state,0);assert.equal(noTime.handleTurns,0);assert.equal(noTime.input.crankRate,0);
});

test('separate quick presses never accumulate delay or spool motion',()=>{
 let state=createShoreReelHold();
 for(let i=0;i<20;i++){
  state=setShoreReelHeld(state,'key:f',true);const pressed=stepShoreReelHold(state,.1);assert.equal(pressed.handleTurns,0);
  state=setShoreReelHeld(pressed.state,'key:f',false);const released=stepShoreReelHold(state,.05);assert.equal(released.input.rodLift,SHORE_ROD_REST_LIFT);assert.equal(released.handleTurns,0);state=released.state;
 }
});

test('hold threshold conserves winding time at different frame rates',()=>{
 for(const dt of [.01,.025,.05,.1]){
  let state=setShoreReelHeld(createShoreReelHold(),'pointer:1',true),turns=0;
  for(let elapsed=0;elapsed<1-1e-8;elapsed+=dt){const step=stepShoreReelHold(state,Math.min(dt,1-elapsed));state=step.state;turns+=step.handleTurns;}
  close(turns,(1-SHORE_REEL_HOLD_DELAY_SECONDS)*SHORE_MAX_CRANK_RATE);
 }
});

test('real line winds only during the held interval and remains stopped after release',()=>{
 for(const Simulation of [PacificaSimulation,BeniciaSimulation]){
  const sim=rig(Simulation),initial=sim.state.cast.paidLength;
  let held=setShoreReelHeld(createShoreReelHold(),'key:f',true);
  for(let i=0;i<50;i++){const step=stepShoreReelHold(held,.02);held=step.state;sim.setFishingControls(step.input);sim.drift(.02,step.input);}
  close(initial-sim.state.cast.paidLength,(1-SHORE_REEL_HOLD_DELAY_SECONDS)*SHORE_MAX_CRANK_RATE*SHORE_CRANK_TURN_METRES,1e-6);
  held=setShoreReelHeld(held,'key:f',false);const atRelease=sim.state.cast.paidLength;
  for(let i=0;i<50;i++){const step=stepShoreReelHold(held,.02);held=step.state;sim.setFishingControls(step.input);sim.drift(.02,step.input);}
  close(sim.state.cast.paidLength,atRelease);assert.equal(sim.state.reelFeedback.handleRate,0);assert.equal(sim.state.retrieveInput,false);
 }
});

test('short press moves the physical rod and lure without winding, then releases into sinking',()=>{
 for(const Simulation of [PacificaSimulation,BeniciaSimulation]){
  const sim=rig(Simulation),s=sim.state;sim.setFishingControls({rodLift:SHORE_ROD_REST_LIFT});s.presentation.rodLift=SHORE_ROD_REST_LIFT;
  s.cast.paidLength=shoreTetherReach(shoreRodGeometry(s).tipWorld,s.cast.target,s.presentation.depth);
  const depth=s.presentation.depth,paid=s.cast.paidLength,lowTip=shoreRodGeometry(s).tipWorld.height;
  const pressed=stepShoreReelHold(setShoreReelHeld(createShoreReelHold(),'pointer:1',true),.1);
  sim.setFishingControls(pressed.input);sim.drift(.1,pressed.input);
  assert.ok(shoreRodGeometry(s).tipWorld.height>lowTip+.3,'physical rod endpoint rises');
  assert.ok(s.presentation.depth<depth-.1,'lure receives actual upward movement');close(s.cast.paidLength,paid);assert.equal(s.reelFeedback.handleRate,0);
  const liftedDepth=s.presentation.depth,released=stepShoreReelHold(setShoreReelHeld(pressed.state,'pointer:1',false),.05);
  sim.setFishingControls(released.input);sim.drift(.05,released.input);
  assert.ok(shoreRodGeometry(s).tipWorld.height<lowTip+.05,'physical rod returns low');
  assert.ok(s.presentation.depth>liftedDepth,'released lure sinks');assert.equal(s.presentation.twitch,0);assert.equal(s.presentation.hopRemaining,0);close(s.cast.paidLength,paid);
 }
});

test('a press released before a frame preserves one physical lift without leaving the rod raised',()=>{
 let state=setShoreReelHeld(createShoreReelHold(),'pointer:1',true);
 state=setShoreReelHeld(state,'pointer:1',false);
 const completed=stepShoreReelHold(state,.05);
 assert.equal(completed.input.rodLift,SHORE_ROD_REST_LIFT);close(completed.input.rodRaise,SHORE_ROD_HELD_LIFT-SHORE_ROD_REST_LIFT);assert.equal(completed.input.crankRate,0);
 assert.equal(stepShoreReelHold(completed.state,.05).input.rodRaise,undefined,'completed stroke is consumed only once');
 assert.equal(stepShoreReelHold(state,.05,{enabled:false}).input.rodRaise,undefined,'pause discards unprocessed input');
 const short=rig(),long=rig();
 for(const sim of[short,long]){sim.setFishingControls({rodLift:SHORE_ROD_REST_LIFT});sim.state.presentation.rodLift=SHORE_ROD_REST_LIFT;}
 const before=short.state.presentation.depth,paid=short.state.cast.paidLength;
 short.update(.025,completed.input);long.update(.1,completed.input);
 assert.ok(short.state.presentation.depth<before-.1);assert.ok(long.state.presentation.depth>short.state.presentation.depth-.04,'substeps do not replay the completed stroke');
 assert.equal(short.state.fishingControls.rodLift,SHORE_ROD_REST_LIFT);assert.equal(short.state.presentation.twitch,0);close(short.state.cast.paidLength,paid);
});

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
 const initial=slow.state.cast.paidLength;
 const a=cadence(1,{sim:slow}),b=cadence(2,{sim:fast});
 // The spool winds actual line, not the horizontal projection of a sloping
 // line from an elevated rod to a sinking lure.
 close(initial-slow.state.cast.paidLength,a.turns*SHORE_CRANK_TURN_METRES,1e-6);
 close(initial-fast.state.cast.paidLength,b.turns*SHORE_CRANK_TURN_METRES,1e-6);
 close(initial-fast.state.cast.paidLength,2*(initial-slow.state.cast.paidLength),1e-6);
 assert.ok(fast.state.lineDistance<slow.state.lineDistance&&slow.state.lineDistance<60);
 close(a.feedbackTurns,a.turns);close(b.feedbackTurns,b.turns);
});

test('explicit stopped crank suppresses stale held input and reel-home in both scenes',()=>{
 for(const Simulation of [PacificaSimulation,BeniciaSimulation]){
  const sim=rig(Simulation),s=sim.state;s.autoRetrieve=true;sim.setReeling(true);s.snagSeconds=10;
  const length=s.cast.paidLength;sim.drift(.1,{reel:true,crankRate:0});
  assert.equal(s.phase,'waiting');assert.equal(s.autoRetrieve,false);assert.equal(s.retrieveInput,false);assert.equal(s.reelFeedback.handleRate,0);close(s.cast.paidLength,length);
 }
});

test('fight crank input is capped and stopping does not inherit prior reeling',()=>{
 const sim=rig(),s=sim.state;s.phase='fighting';s.fish={...SPECIES.find(f=>f.speciesId==='jacksmelt'),weightKg:.3,length:32};s.fishMotion=createShoreFightMotion(s.fish,{depth:1});s.tension=.4;
 sim.fight(.1,true,{crankRate:100});assert.ok(s.reelFeedback.handleRate>0&&s.reelFeedback.handleRate<=SHORE_MAX_CRANK_RATE);
 s.autoRetrieve=true;sim.setReeling(true);sim.fight(.1,true,{crankRate:0});
 assert.equal(s.autoRetrieve,false);assert.equal(s.retrieveInput,false);assert.equal(s.reelFeedback.handleRate,0);assert.equal(s.reelFeedback.linePickupRate,0);
});
