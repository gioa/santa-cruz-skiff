import test from 'node:test';
import assert from 'node:assert/strict';
import {createFishFight,stepFishFight,canLandFish,fishFightKind} from '../dist/pixel-fish-fight.js';
import {stepFishingLine,rodTipPosition,MAX_PAID_LINE_METERS} from '../dist/pixel-fishing-physics.js';
import {rigFishWeights,rigSpeciesKey} from '../dist/fishing-rigs.js';

function encounter(kind,kg,{dt=.05,depth=12,drag=.48,seconds=600,crank=1.2}={}){
 const fish={fightKind:kind,kg},s={fishState:'fight',fish,fishFight:createFishFight(fish),rig:'bottom',rigWeightGrams:85,boatX:0,boatZ:0,heading:0,rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'brake',crankRate:crank,drag,pumpHeight:0,rodBend:0,rodLoadN:0,lureDepth:depth,paidLineMeters:depth+2.5,lineSlackMeters:0};
 s.rodTip=rodTipPosition(s);s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:-depth};
 let maxPull=0,paidOut=0,maxLine=s.paidLineMeters,time=0,landed=false;
 for(;time<seconds;time+=dt){
  s.crankRate=crank; // A held input requests fresh handle torque on every frame.
  const r=stepFishFight(fish,s.fishFight,{...s,dt,time});s.fishFight=r.fight;s.fishPullN=r.pullN;s.fishMotion=r.motion;
  const previous=s.paidLineMeters;Object.assign(s,stepFishingLine(s,{dt,environment:{bottomDepth:30},fishPullN:r.pullN,fishMotion:r.motion}));
  assert.ok(Math.abs(s.paidLineMeters-previous-(s.payoutRate-s.retrieveRate)*dt)<1e-8,'actual spool motion conserves paid line');
  assert.ok(s.lureDepth>=0&&s.lureDepth<=30);assert.ok(s.paidLineMeters<=MAX_PAID_LINE_METERS);
  for(const value of[s.rodBend,s.rodLoadN,s.paidLineMeters,s.fishFight.energy,s.bobber.x,s.bobber.z])assert.ok(Number.isFinite(value));
  maxPull=Math.max(maxPull,r.pullN);paidOut+=s.payoutRate*dt;maxLine=Math.max(maxLine,s.paidLineMeters);
  if(canLandFish(s)){landed=true;break;}
 }
 return{s,time,landed,maxPull,paidOut,maxLine};
}

test('small and ordinary rockfish wind straight aboard without a mandatory exhaustion timer',()=>{
 for(const kg of[.25,.45,1.2]){
  const r=encounter('rockfish',kg);assert.equal(r.landed,true);assert.ok(r.time<20);assert.equal(r.paidOut,0);assert.ok(r.s.fishFight.energy>0,'landing does not require zero energy');
 }
 const medium=encounter('rockfish',1.2);assert.ok(medium.s.fishFight.energy>.4,'the former 19% stamina gate is gone');
 const shallow=encounter('rockfish',.45,{depth:4}),deep=encounter('rockfish',.45,{depth:20});assert.ok(deep.time>shallow.time*3,'retrieval duration follows real line length');
});

test('size changes rockfish resistance and a large specimen can take drag on the same starter tackle',()=>{
 const small=encounter('rockfish',.45),large=encounter('rockfish',5.5);assert.ok(large.maxPull>small.maxPull*5);assert.ok(large.paidOut>3);assert.ok(large.time>small.time*1.8);assert.ok(large.time<60);assert.equal(large.landed,true);
});

test('salmon, white seabass and bonito have distinct longer runs but remain landable',()=>{
 const results=[encounter('salmon',6),encounter('seabass',12),encounter('bonito',3.5)];
 for(const r of results){assert.equal(r.landed,true);assert.ok(r.time>60&&r.time<360);assert.ok(r.paidOut>15);}
 assert.ok(results[1].maxPull>results[0].maxPull);assert.ok(results[0].paidOut>results[2].paidOut);
 const traces=['rockfish','salmon','seabass','bonito'].map(kind=>Array.from({length:30},(_,time)=>stepFishFight({fightKind:kind,kg:3},null,{time}).pullN.toFixed(2)).join(','));assert.equal(new Set(traces).size,4,'species do not share one universal surge curve');
});

test('stronger drag changes the actual run and retrieval rather than unlocking a fish',()=>{
 const loose=encounter('bonito',3.5,{drag:.35}),firm=encounter('bonito',3.5,{drag:.7});assert.equal(firm.landed,true);assert.equal(loose.landed,true);assert.ok(firm.paidOut<loose.paidOut);assert.ok(firm.time<loose.time);
});

test('slack does not deplete fish energy and a boat-side fish may land at full energy',()=>{
 const fish={fightKind:'salmon',kg:5};let fight=createFishFight(fish);
 for(let t=0;t<120;t+=.1)fight=stepFishFight(fish,fight,{time:t,dt:.1,lineSlackMeters:4}).fight;
 assert.equal(fight.energy,1);
 const side={fishState:'fight',reelMode:'brake',paidLineMeters:3,rodTip:{height:2},lureDepth:.5,payoutRate:0,fishPullN:3,dragThresholdN:13,stamina:100};assert.equal(canLandFish(side),true);assert.equal(canLandFish({...side,payoutRate:.5}),false);assert.equal(canLandFish({...side,reelMode:'free'}),false);
});

test('the spool end stops audible payout but still transfers a strong fish load with an open spool',()=>{
 const s={rig:'bottom',reelMode:'free',paidLineMeters:120,rodElevation:45,rodAzimuth:70,boatX:0,boatZ:0,bobber:{x:2,z:-120,height:-20},lureDepth:20};
 Object.assign(s,stepFishingLine(s,{dt:.1,environment:{bottomDepth:30},fishPullN:80}));assert.equal(s.payoutRate,0);assert.equal(s.paidLineMeters,120);assert.ok(s.rodLoadN>30,'terminal line load cannot disappear because the bail is open');
});

test('fight response remains close at phone and desktop frame intervals',()=>{
 const slow=encounter('bonito',3.5,{dt:.1}),fast=encounter('bonito',3.5,{dt:1/60});assert.ok(Math.abs(slow.time-fast.time)<3);assert.ok(Math.abs(slow.paidOut-fast.paidOut)<1.5);
});

test('new fish are identified by real species and retain soft bait/habitat probabilities',()=>{
 const fishes=[{latin:'Sebastes miniatus',rarity:.36},{latin:'Oncorhynchus tshawytscha',rarity:.09},{latin:'Atractoscion nobilis',rarity:.025},{latin:'Sarda chiliensis lineolata',rarity:.12}];
 assert.deepEqual(fishes.map(rigSpeciesKey),['vermilion','salmon','seabass','bonito']);assert.deepEqual(fishes.map(fishFightKind),['rockfish','salmon','seabass','bonito']);
 for(const rig of['bottom','dropper','slider','jig','float','sabiki'])assert.ok(rigFishWeights(fishes,{rig,bottomDepth:20,lureDepth:15,habitat:'reef',bait:'squid'}).every(n=>n>0&&Number.isFinite(n)));
 const warm=rigFishWeights(fishes,{waterTemp:20}),cold=rigFishWeights(fishes,{waterTemp:12});assert.ok(warm[3]>cold[3]);
});

test('an open spool consumes slack before paying more line or transmitting an end-stop load',()=>{
 for(const paidLineMeters of[40,120]){const s={rig:'bottom',reelMode:'free',paidLineMeters,rodElevation:45,rodAzimuth:70,boatX:0,boatZ:0,bobber:{x:2,z:0,height:-10},lureDepth:10};const r=stepFishingLine(s,{dt:.1,environment:{bottomDepth:30},fishPullN:80,fishMotion:{runSpeedMps:0,lateralMps:0,diveMps:0}});assert.equal(r.payoutRate,0);assert.equal(r.paidLineMeters,paidLineMeters);assert.equal(r.rodLoadN,0);assert.ok(r.lineSlackMeters>20);}
});
