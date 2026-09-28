import test from 'node:test';
import assert from 'node:assert/strict';
import {fishMassKg} from '../dist/pixel-fish-mass.js';
import {fishBodyPose,FISH_BODY_PROFILES,drawFishBody} from '../dist/pixel-fish-motion.js';
import {createFishFight,stepFishFight,canLandFish} from '../dist/pixel-fish-fight.js';
import {stepFishingLine,rodTipPosition} from '../dist/pixel-fishing-physics.js';
import {fightViewGeometry} from '../dist/pixel-fight-view.js';

test('53 cm lingcod weighs about 3 lb, not the former 6.33 lb; reference fits increase monotonically',()=>{
 assert.equal(fishMassKg({latin:'Ophiodon elongatus'},53),1.34);
 for(const latin of['Ophiodon elongatus','Paralichthys californicus']){
  let prev=0;for(let l=15;l<=140;l++){const kg=fishMassKg({latin},l);assert.ok(kg>=prev);prev=kg;}
 }
 assert.ok(fishMassKg({latin:'Paralichthys californicus'},55.88)>1.8);
 assert.ok(fishMassKg({latin:'Paralichthys californicus'},55.88)<2);
 assert.equal(fishMassKg({},NaN),0);
});

test('every species articulates; small fish beat faster, fatigue reduces movement, reduced motion is static',()=>{
 for(const kind of Object.keys(FISH_BODY_PROFILES)){
  const a=fishBodyPose(kind,{time:.1,mass:1,headShake:.8}),b=fishBodyPose(kind,{time:.2,mass:1,headShake:.8});assert.notDeepEqual(a,b);
  assert.ok(fishBodyPose(kind,{energy:.05,headShake:.8}).tail<a.tail);
  assert.deepEqual(fishBodyPose(kind,{time:9,reducedMotion:true}),{tail:0,wave:0,pitch:0,roll:1});
 }
 assert.ok(fishBodyPose('lingcod',{time:1,mass:.2}).wave>fishBodyPose('lingcod',{time:1,mass:8}).wave);
 assert.ok(fishBodyPose('halibut',{time:.1,headShake:1}).roll<.9);
});

function surface(kind='salmon',kg=6,variation=.1,depth=.05){
 const fish={fightKind:kind,latin:kind,kg,length:80};
 const s={fishState:'fight',fish,fishFight:createFishFight(fish,variation),rig:'bottom',rigWeightGrams:85,boatX:0,boatZ:0,heading:0,rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'brake',crankRate:0,drag:.9,pumpHeight:0,rodBend:0,rodLoadN:0,lureDepth:depth,paidLineMeters:5,lineSlackMeters:0};
 s.rodTip=rodTipPosition(s);s.bobber={x:s.rodTip.x+3,z:s.rodTip.z,height:-depth};s.fishFight.jumpCooldown=0;return s;
}
function advance(s,dt,time){
 const r=stepFishFight(s.fish,s.fishFight,{...s,dt,time,fishHeight:s.bobber.height});s.fishFight=r.fight;s.fishMotion=r.motion;s.fishPullN=r.pullN;
 const paid=s.paidLineMeters;Object.assign(s,stepFishingLine(s,{dt,environment:{bottomDepth:30},fishPullN:r.pullN,fishMotion:r.motion}));
 assert.ok(Math.abs(s.paidLineMeters-paid-(s.payoutRate-s.retrieveRate)*dt)<1e-8);
 assert.ok(Math.hypot(s.bobber.x-s.rodTip.x,s.bobber.z-s.rodTip.z,s.bobber.height-s.rodTip.height)<=s.paidLineMeters+1e-8);
}
test('a near-surface vigorous salmon can breach, fall, splash and resume; line remains constrained',()=>{
 for(const dt of[1/60,.1]){
  const s=surface();let peak=0,splash=false;
  for(let t=0;t<2;t+=dt){advance(s,dt,t);peak=Math.max(peak,s.bobber.height);splash||=s.fishMotion.splash>0;if(s.fishMotion.jumpActive)assert.equal(canLandFish(s),false);}
  assert.ok(peak>.15&&peak<1,`physical leap height ${peak}`);assert.ok(splash);assert.equal(s.fishMotion.jumpActive,false);assert.ok(s.fishFight.jumpCooldown>10);
 }
});
test('bottom species, deep salmon, exhausted salmon and small fish never acquire a jump',()=>{
 for(const kind of['rockfish','lingcod','halibut','seabass','bonito','mackerel','croaker','sanddab']){const s=surface(kind);advance(s,.1,0);assert.equal(s.fishMotion.jumpActive,false);}
 for(const s of[surface('salmon',6,.1,5),surface('salmon',.5),surface('salmon',6,.6),surface()]){
  if(s.fish.latin==='salmon'&&s.fishFight.variation===.1&&s.fish.kg===6&&s.lureDepth===.05)s.fishFight.energy=.1;
  advance(s,.1,0);assert.equal(s.fishMotion.jumpActive,false);
 }
});
test('airborne line endpoint follows fish mouth above water and returns to water on re-entry',()=>{
 const s=surface();s.bobber.height=.5;s.lureDepth=0;
 const g=fightViewGeometry(390,844,s,{bottomInset:180});assert.ok(g.hookPoint.y<g.waterEntry.y);assert.strictEqual(g.line.at(-1),g.hookPoint);
 s.bobber.height=-.1;s.lureDepth=.1;const wet=fightViewGeometry(390,844,s);assert.strictEqual(wet.line.at(-1),wet.waterEntry);
});
test('articulated sprite preserves measurement width and keeps the nose fixed; live catch moves',()=>{
 const bounds={x:4,y:3,width:40,height:18};
 const draw=time=>{const calls=[];drawFishBody({drawImage:(...a)=>calls.push(a)},{},bounds,{x:10,y:20,length:100,height:45,pose:{...fishBodyPose('lingcod',{time,landed:true}),pitch:0}});return calls;};
 const a=draw(.1),b=draw(.7);assert.notDeepEqual(a,b);assert.equal(a.length,40);assert.equal(a[0][5],10);assert.ok(Math.abs(a.at(-1)[6]-20)<.01,'nose does not jump away from line/ruler zero');
});
