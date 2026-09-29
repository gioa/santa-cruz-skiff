import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {shoreFishPosition} from '../dist/shore-line-geometry.js';
import {shoreFightPose} from '../dist/shore-fight-view.js';
import {sampleShore} from '../dist/shore-data.js';
import {finishShoreFlight} from './helpers/shore-cast.js';

const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,message||`${a} != ${b}`);
function hooked({sceneId='pacifica',pier=false}={}){
  const sim=new PacificaSimulation({sceneId,rng:()=>.999,date:'2026-09-28'}),s=sim.state;
  if(pier){s.onPier=true;Object.assign(s.player,sim.scene.pier.tip);}
  else Object.assign(s.player,{x:2440,y:sim.world.shoreY(2440)+25});
  assert.ok(sim.cast({power:.65,aim:.8}).ok);
  close(s.lineDistance,Math.hypot(s.cast.target.x-s.cast.origin.x,s.cast.target.y-s.cast.origin.y)/3.2);
  finishShoreFlight(sim);
  for(let i=0;i<8;i++)sim.update(.25);
  // Seat a known visitor to isolate geometry from stochastic encounter timing.
  s.phase='bite';s.biteSpeciesId='surfperch';
  assert.ok(sim.strike().ok);
  return sim;
}

test('a strike preserves the actual terminal position after a diagonal cast and drift',()=>{
  for(const options of [{},{sceneId:'half-moon-bay'},{pier:true}]){
    const sim=hooked(options),s=sim.state;
    assert.notEqual(s.cast.fightDistance,s.cast.distance,'waiting current changes the original throw distance');
    close(s.cast.fightDistance,s.lineDistance);
    const position=shoreFishPosition(sim.scene,s);
    close(position.x,s.cast.target.x);close(position.y,s.cast.target.y);
    const pose=shoreFightPose(sim.scene,s);
    close(pose.fishWorld.x,position.x);close(pose.fishWorld.y,position.y);
  }
});

test('a returning pier fish remains near the pier and uses that water for fight load',()=>{
  const sim=hooked({pier:true}),s=sim.state;
  s.lineDistance=3;
  const position=shoreFishPosition(sim.scene,s),pose=shoreFightPose(sim.scene,s);
  assert.ok(Math.hypot(position.x-s.cast.origin.x,position.y-s.cast.origin.y)/3.2<3.01);
  const sample=sampleShore(sim.scene,position.x,position.y,s.elapsed,s.seaState||{});
  assert.ok(sample.offshore>300,'a fish under the pier cannot be sampled in beach swash');
  close(pose.sample.offshore,sample.offshore);
  sim.fight(.025,false);
  assert.deepEqual(s.shoreSample,sample,'fight force uses the same shared world point as the view');
});

test('fighting line travel never drifts the frozen encounter target or wears waiting bait',()=>{
  for(const options of [{},{pier:true}]){
    const sim=hooked(options),s=sim.state,target={...s.cast.target};
    const condition=s.rodSupplies[s.activeRod].bait.condition,line=s.lineDistance;
    sim.update(.25,{reel:true});
    assert.equal(s.phase,'fighting');
    assert.deepEqual(s.cast.target,target);
    assert.equal(s.rodSupplies[s.activeRod].bait.condition,condition);
    assert.notEqual(s.lineDistance,line,'fish run and reeling still change deployed line');
  }
});

test('beach fish stay in water at landing and old fixtures retain the cast-distance fallback',()=>{
  for(const sceneId of ['pacifica','half-moon-bay']){
    const sim=hooked({sceneId}),s=sim.state;
    s.lineDistance=2.5;
    const position=shoreFishPosition(sim.scene,s);
    assert.ok(position.y<=sim.world.shoreY(position.x)-3.2);
    delete s.cast.fightDistance;s.lineDistance=s.cast.distance;
    const legacy=shoreFishPosition(sim.scene,s);
    close(legacy.x,s.cast.target.x);close(legacy.y,s.cast.target.y);
  }
});
