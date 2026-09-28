import test from 'node:test';
import assert from 'node:assert/strict';
import {createFishFight,stepFishFight} from '../dist/pixel-fish-fight.js';
import {stepFishingLine,rodTipPosition} from '../dist/pixel-fishing-physics.js';
import {encounter} from '../qa/pixel-halibut/compare.mjs';
const fish={fightKind:'halibut',latin:'Paralichthys californicus',kg:6.1,length:81.28};

test('32-inch halibut has sustained lift resistance and a surface dive under hurried retrieval',()=>{
 const r=encounter({drag:.85});assert.equal(r.kg,6.1);assert.equal(r.landed,true);
 assert.equal(r.nearRun,true);assert.ok(r.out>1);assert.ok(r.slowest<.05);
 assert.ok(r.seconds>25&&r.seconds<120,'resistance should be meaningful but not an endless fight');
 assert.ok(r.frames.some(f=>f.phase==='glide'&&f.retrieve<.65&&f.force>3),'weight is felt between bursts');
});

test('surface response depends on approach and individual, happens once, and never makes flatfish jump',()=>{
 let f=createFishFight(fish,.5);
 for(const patch of[{lureDepth:8},{retrieveRate:.05},{lineSlackMeters:2}]){
  const r=stepFishFight(fish,f,{time:7,dt:.1,lureDepth:1.2,retrieveRate:.6,lineSlackMeters:0,...patch});assert.equal(r.motion.phase,'glide');
 }
 const quiet=stepFishFight(fish,createFishFight(fish,.95),{time:7,dt:.1,lureDepth:1.2,retrieveRate:.6});assert.equal(quiet.fight.surfaceStartleUsed,false);
 let r=stepFishFight(fish,f,{time:7,dt:.1,lureDepth:1.2,retrieveRate:.6});
 assert.equal(r.motion.phase,'dive');assert.ok(r.motion.diveMps>1);assert.equal(r.motion.jumpActive,false);assert.ok(r.motion.headShake>0);
 f=r.fight;for(let t=7.1;t<13;t+=.1){r=stepFishFight(fish,f,{time:t,dt:.1,lureDepth:1.2,retrieveRate:.6});f=r.fight;}
 assert.equal(f.surfaceStartleUsed,true);assert.equal(f.surfaceBurstSeconds,0);
});

test('tightening drag above working load does not increase flatfish winding torque',()=>{
 const base={rig:'bottom',fishState:'fight',rodElevation:45,rodAzimuth:70,boatX:0,boatZ:0,paidLineMeters:14.5,crankRate:1.2,reelMode:'brake',rodBend:0,rodLoadN:0};
 const tip=rodTipPosition(base);base.bobber={x:tip.x,z:tip.z,height:tip.height-14.5};
 const options={dt:.05,environment:{bottomDepth:30},fishPullN:8,fishMotion:{bodyDragArea:.06}};
 const firm=stepFishingLine({...base,drag:.7},options),maximum=stepFishingLine({...base,drag:.85},options),slipping=stepFishingLine({...base,drag:.35},{...options,fishPullN:25});
 assert.equal(firm.retrieveRate,maximum.retrieveRate);assert.ok(maximum.retrieveRate<.65);
 assert.ok(maximum.crankRate<1.2);assert.ok(slipping.payoutRate>0);assert.ok(slipping.retrieveRate<.001);assert.ok(slipping.crankRate<.001);
 assert.ok(maximum.rodLoadN>0);
 const slack=stepFishingLine({...base,drag:.85,paidLineMeters:30},options);assert.equal(slack.crankRate,1.2);assert.equal(slack.retrieveRate,.78);assert.equal(slack.rodLoadN,0);
});

test('small halibut stay proportionately lighter and surface response is frame-rate stable',()=>{
 const small=encounter({inches:16,depth:5}),normal=encounter({depth:5}),fast=encounter({depth:5,dt:1/60});
 assert.ok(small.peak<normal.peak*.4);assert.equal(small.nearRun,false);assert.equal(small.landed,true);
 assert.equal(normal.nearRun,fast.nearRun);assert.ok(Math.abs(normal.seconds-fast.seconds)<3);assert.ok(Math.abs(normal.out-fast.out)<1);
});
