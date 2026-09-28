import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFishFight,stepFishFight,canLandFish,fishFightKind} from '../dist/pixel-fish-fight.js';
import {hookProfile,createHookHold,stepHookHold} from '../dist/pixel-hooking.js';
import {fishMassKg} from '../dist/pixel-fish-mass.js';
import {hookSizeFit} from '../dist/pixel-hook-size.js';
import {RIG_PROFILES} from '../dist/fishing-rigs.js';
import {rodTipPosition,stepFishingLine} from '../dist/pixel-fishing-physics.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PIXEL_FISH}=await import('../dist/pixel-sim.js');
const fishFor=latin=>{const fish=PIXEL_FISH.find(f=>f.latin===latin),length=latin==='Genyonemus lineatus'?25:24.6;return{...fish,length,kg:fishMassKg(fish,length)};};
const species=['Genyonemus lineatus','Citharichthys sordidus'];

test('documented sand-bottom fish have small conservative sizes and distinct identities',()=>{
 const fish=species.map(fishFor);assert.deepEqual(fish.map(fishFightKind),['croaker','sanddab']);
 for(const f of fish){assert.equal(f.spot,'sand');assert.equal(f.bait,'squid');assert.ok(f.min>=15&&f.max<=30);assert.ok(f.kg>0&&f.kg<.3);assert.ok(f.length>=f.min&&f.length<=f.max);assert.ok(hookProfile(f,RIG_PROFILES.bottom).easy);}
});

test('ordinary croaker and sanddab wind directly up without required exhaustion or arbitrary hook loss',()=>{
 for(const latin of species){
  const fish=fishFor(latin),s={fishState:'fight',fish,fishFight:createFishFight(fish),rig:'bottom',rigWeightGrams:85,boatX:0,boatZ:0,heading:0,rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'brake',crankRate:1.2,drag:.48,pumpHeight:0,rodBend:0,rodLoadN:0,lureDepth:12,paidLineMeters:14.5,lineSlackMeters:0};
  s.rodTip=rodTipPosition(s);s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:-12};
  let hold=createHookHold(fish,RIG_PROFILES.bottom,.00001),time=0,landed=false,paidOut=0;
  for(;time<45;time+=.05){
   const result=stepFishFight(fish,s.fishFight,{...s,time,dt:.05});s.fishFight=result.fight;s.fishPullN=result.pullN;s.fishMotion=result.motion;
   Object.assign(s,stepFishingLine(s,{dt:.05,environment:{bottomDepth:25},fishPullN:result.pullN,fishMotion:result.motion}));
   const hook=stepHookHold(hold,{dt:.05,rodLoadN:s.rodLoadN,lineSlackMeters:s.lineSlackMeters,headShake:result.motion.headShake});hold=hook.hold;
   assert.equal(hook.lost,false,latin);assert.equal(hold.profile.kind,fishFightKind(fish));paidOut+=s.payoutRate*.05;
   if(canLandFish(s)){landed=true;break;}
  }
  assert.ok(landed,latin);assert.ok(time<20,latin);assert.equal(paidOut,0);assert.ok(s.fishFight.energy>0);
 }
});

test('large 4/0 feathers reduce small-mouth seating while small hooks remain usable',()=>{
 for(const latin of species){const fish=fishFor(latin),fine=hookSizeFit(fish,RIG_PROFILES.sabiki),large=hookSizeFit(fish,RIG_PROFILES.feather40);assert.equal(fine.mouthFit,1);assert.ok(large.seatChance<fine.seatChance);assert.ok(large.seatChance>0,'reference-sized fish retain a plausible overlap');}
});
