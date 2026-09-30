import test from 'node:test';
import assert from 'node:assert/strict';
import {stepShoreTether,shoreTetherReach} from '../dist/shore-tether.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {shoreStandPosition} from '../dist/shore-movement.js';
import {shoreRodGeometry} from '../dist/shore-scale.js';
import {shoreSupply,isShoreLure} from '../dist/shore-equipment.js';
import {finishShoreFlight} from './helpers/shore-cast.js';
import {shorePresentation,stepShorePresentation} from '../dist/shore-presentation.js';
import {shorePierOccludes,shoreVisibleLineSegments} from '../dist/shore-tackle-visual.js';

const rigs=['salmon_spoon','salmon_spinner','grub_jig','carolina_rig','fishfinder_rig','float_rig'];
const sites=[{name:'mud-bank',x:440},{name:'old-pilings',x:760},{name:'rock-bank',x:1430},{name:'west-bank',x:1910},{name:'pier-tip',x:1090,pier:true}];
function setup(site,rig,elapsed=0){
 const sim=new BeniciaSimulation({date:'2026-09-29',rng:()=>.5}),s=sim.state;
 sim.stepFish=()=>{}; // Deterministic tackle audit; encounter integration is tested separately.
 s.rodSupplies[s.activeRod]={id:rig,condition:1,bait:isShoreLure(rig)?null:{kind:'anchovy',condition:1}};
 s.onPier=Boolean(site.pier);s.elapsed=elapsed;
 Object.assign(s.player,site.pier?{x:1090,y:145}:shoreStandPosition(sim.scene,site.x));s.crowd=[];
 assert.ok(sim.cast({power:.55,aim:.3}).ok);finishShoreFlight(sim);
 return sim;
}
const advance=(sim,seconds,input={})=>{for(let i=0;i<Math.round(seconds/.05);i++)sim.update(.05,input);};

test('closed-bail tether permits sideways swing but never invents line',()=>{
 const tip={x:0,y:0,height:2},previous={x:0,y:-32};let target=previous,depth=0,length=shoreTetherReach(tip,target,depth);
 for(let i=0;i<1000;i++){
  const r=stepShoreTether({tip,previous:target,target:{x:target.x+.3,y:target.y-.1},previousDepth:depth,depth:Math.min(4,depth+.03),paidLength:length,dt:.05});
  target=r.target;depth=r.depth;
  assert.equal(r.paidLength,length);assert.ok(shoreTetherReach(tip,target,depth)<=length+1e-9);
 }
 assert.ok(target.x>0);assert.ok(depth>0);
});
test('vertical deep-pier winding takes up line and lifts tackle before retrieval',()=>{
 const tip={x:0,y:0,height:6},point={x:0,y:0};
 const r=stepShoreTether({tip,previous:point,target:point,previousDepth:8,depth:8.03,paidLength:14,windSpeed:1,dt:.2});
 assert.equal(r.paidLength,13.8);assert.ok(Math.abs(r.depth-7.8)<1e-9);assert.equal(r.pickup,.2);
});
test('old rock contact cannot break a lure now suspended over mud',()=>{
 const sim=setup(sites[0],'salmon_spoon'),s=sim.state,supply=shoreSupply(s);
 s.snagSeconds=8;sim.update(.05,{crankRate:2.5});
 assert.equal(s.snagSeconds,0);assert.equal(shoreSupply(s),supply);assert.equal(s.phase,'waiting');
});
test('deep tackle beside the pier is not retrieved just because horizontal range is short',()=>{
 const sim=setup(sites.at(-1),'salmon_spoon'),s=sim.state,tip=shoreRodGeometry(s).tipWorld;
 s.cast.target={x:tip.x+2,y:tip.y-2};s.presentation.depth=4;s.cast.paidLength=shoreTetherReach(tip,s.cast.target,4);
 sim.update(.05,{crankRate:2.5});
 assert.equal(s.phase,'waiting');assert.ok(s.presentation.depth>3);assert.ok(s.reelFeedback.linePickupRate>0);
 for(let i=0;i<300&&s.cast;i++)sim.update(.05,{crankRate:2.5});
 assert.equal(s.phase,'walk');assert.ok(shoreSupply(s));
});
test('long closed-bail soak never spins the spool or extends the paid line',()=>{
 const sim=setup(sites.at(-1),'fishfinder_rig'),s=sim.state,length=s.cast.paidLength;
 for(let i=0;i<1200;i++){
  sim.update(.05,{crankRate:0});assert.ok(s.cast);
  assert.equal(s.cast.paidLength,length);assert.equal(s.reelFeedback.linePayoutRate,0);
  assert.equal(s.reelFeedback.handleRate,0);assert.equal(s.reelFeedback.linePickupRate,0);
 }
});
test('a single twitch has the same bounded travel at 20, 60 and 120 Hz',()=>{
 const sample={depth:10,currentX:0,currentY:0};
 const runs=[20,60,120].map(hz=>{
  let p=shorePresentation(sample,'salmon_spoon',4),travel=0;
  for(let i=0;i<hz;i++){p=stepShorePresentation(p,sample,'salmon_spoon',1/hz,{directionY:1,twitch:i===0});travel+=p.driftY/hz;}
  return{depth:p.depth,travel};
 });
 for(const r of runs){assert.ok(r.travel>.27&&r.travel<.29);assert.ok(Math.abs(r.depth-runs[0].depth)<1e-9);assert.ok(Math.abs(r.travel-runs[0].travel)<1e-9);}
});
test('pier deck hides underwater tackle and the lower strand, but not a raised rod or an outside cast',()=>{
 const under={x:1090,y:200-3.5*3.2};
 assert.ok(shorePierOccludes('benicia',under,0));
 assert.equal(shorePierOccludes('benicia',under,5),false);
 assert.equal(shorePierOccludes('benicia',{x:1200,y:under.y},0),false);
 const points=Array.from({length:25},(_,i)=>({x:1090,y:175+i}));
 const visible=shoreVisibleLineSegments('benicia',points,6,0);
 assert.ok(visible.length>0&&visible.length<24);
 assert.deepEqual(visible[0][0],points[0]);assert.notDeepEqual(visible.at(-1)[1],points.at(-1));
});
for(const site of sites)for(const power of [0,.5,1])for(const aim of [-1,0,1]){
 test(`${site.name}: ${power} power / ${aim} aim resolves its actual landing and can recover`,()=>{
  const sim=setup(site,'salmon_spoon'),s=sim.state;sim.clearLine();s.crowd=[];
  const supply=shoreSupply(s),planned=sim.previewCast({power,aim});
  assert.ok(sim.cast({power,aim}).ok);advance(sim,Math.ceil(planned.flightDuration*20)/20+.05);
  assert.equal(s.phase,planned.landing==='water'?'waiting':'walk');
  for(let i=0;i<6000&&s.cast;i++)sim.update(.05,{crankRate:2.5});
  assert.equal(s.phase,'walk');assert.equal(shoreSupply(s),supply);
  assert.ok(!s.fish);assert.equal(s.reelFeedback.linePickupRate,0);
 });
}
for(const site of sites)for(const rig of rigs)for(const [tide,elapsed] of [['flood',0],['ebb',2250]]){
 test(`${site.name}/${rig}/${tide}: line bound, twitch, tap retrieval and supply conservation`,()=>{
  const sim=setup(site,rig,elapsed),s=sim.state,stock=JSON.stringify(s.rigStock),supply=shoreSupply(s);
  const length=s.cast.paidLength;assert.ok(Number.isFinite(length),'splash closes the bail with a finite line budget');
  advance(sim,2,{crankRate:0});
  assert.ok(s.cast);assert.equal(s.cast.paidLength,length);
  assert.ok(shoreTetherReach(shoreRodGeometry(s).tipWorld,s.cast.target,s.presentation.depth)<=length+.03);
  const before={...s.cast.target},tip=shoreRodGeometry(s).tipWorld;
  sim.update(.05,{twitch:true,crankRate:0});
  const toward=(before.x-s.cast.target.x)*(before.x-tip.x)+(before.y-s.cast.target.y)*(before.y-tip.y);
  assert.ok(toward>=-1e-6,'a twitch must not push terminal tackle away from the angler');
  assert.equal(s.cast.paidLength,length,'twitching is not free winding');
  // Fast deliberate strokes with a brief pause between turns.
  let last=length;
  for(let i=0;i<5000&&s.cast;i++){
   sim.update(.05,{crankRate:i%9<8?2.5:0});
   if(s.cast){assert.ok(s.cast.paidLength<=last+1e-9);last=s.cast.paidLength;assert.ok(Number.isFinite(s.cast.target.x+s.cast.target.y+s.presentation.depth));}
  }
  assert.equal(s.phase,'walk','empty tackle must reach the hand rather than orbit/stall');
  assert.equal(shoreSupply(s),supply);assert.equal(JSON.stringify(s.rigStock),stock);
 });
}
