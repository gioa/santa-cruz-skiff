import test from 'node:test';
import assert from 'node:assert/strict';
import {RIG_PROFILES} from '../dist/fishing-rigs.js';
import {hookSizeFit} from '../dist/pixel-hook-size.js';
import {hookProfile,createBiteHold,createHookHold,stepHookHold} from '../dist/pixel-hooking.js';

const blue={latin:'Sebastes mystinus',length:22,kg:.3};
const smallMackerel={latin:'Scomber japonicus',length:25,kg:.35};
const bigLingcod={latin:'Ophiodon elongatus',length:95,kg:9};
const advance=(hold,seconds,load,dt=.1)=>{
 let result={hold};for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)result=stepHookHold(result.hold,{dt:Math.min(dt,seconds-elapsed),rodLoadN:load,lineSlackMeters:.1});return result;
};

test('all premade rigs specify their US hook number and virtual hook product properties',()=>{
 assert.deepEqual(Object.values(RIG_PROFILES).map(r=>r.hookSize),['#10','2/0','1/0','3/0','4/0','#2','#6','4/0']);
 for(const rig of Object.values(RIG_PROFILES)){assert.ok(rig.hookGapMm>0);assert.ok(rig.hookWireStrengthN>0);assert.match(rig.hookWire,/^(fine|standard|heavy)$/);}
});

test('hook fit follows mouth size, not a universal length or species cutoff',()=>{
 const starter=hookSizeFit(blue,RIG_PROFILES.bottom),jig=hookSizeFit(blue,RIG_PROFILES.jig);
 assert.ok(starter.seatChance>.95,'ordinary small rockfish remain easy to hook with the starter 2/0');
 assert.ok(jig.seatChance<starter.seatChance&&jig.seatChance>.5,'larger jig hooks reduce small rockfish efficiency without banning them');
 assert.equal(hookSizeFit(smallMackerel,RIG_PROFILES.jig).mouthFit,0,'this hook cannot enter this small mouth, although the fish can nibble');
 assert.equal(hookSizeFit(smallMackerel,RIG_PROFILES.sabiki).mouthFit,1);
 const sameLengthLingcod=hookSizeFit({...smallMackerel,latin:'Ophiodon elongatus'},RIG_PROFILES.jig);
 assert.equal(sameLengthLingcod.mouthFit,1,'wide-mouthed species are not treated like equally long mackerel');
});

test('small hooks can hook big fish, with less purchase and a separately specified wire limit',()=>{
 const fine=hookSizeFit(bigLingcod,RIG_PROFILES.sabiki),heavy=hookSizeFit(bigLingcod,RIG_PROFILES.jig);
 assert.ok(fine.seatChance>0&&fine.seatChance<heavy.seatChance);assert.ok(fine.purchase<heavy.purchase);assert.ok(fine.wireStrengthN<heavy.wireStrengthN);
 assert.ok(hookProfile(bigLingcod,RIG_PROFILES.sabiki).holdLoadN<hookProfile(bigLingcod,RIG_PROFILES.jig).holdLoadN);
 assert.equal(advance(createHookHold(bigLingcod,RIG_PROFILES.sabiki,.5),120,10).lost,false,'patient retrieval below the fine-wire load limit remains possible');
 const sameSizeStrongerWire=hookSizeFit(bigLingcod,{...RIG_PROFILES.sabiki,hookWireStrengthN:65});
 assert.equal(sameSizeStrongerWire.seatChance,fine.seatChance);assert.equal(sameSizeStrongerWire.wireStrengthN,65,'number alone never determines material strength');
});

test('bite seating is decided once, including exact zero-fit and favorable small-hook exceptions',()=>{
 for(const seatRoll of[0,.1,.5,.99999])assert.equal(createBiteHold(smallMackerel,RIG_PROFILES.jig,{seatRoll}).canSeat,false);
 const favorable=createBiteHold(bigLingcod,RIG_PROFILES.sabiki,{seatRoll:.01}),unfavorable=createBiteHold(bigLingcod,RIG_PROFILES.sabiki,{seatRoll:.99});
 assert.equal(favorable.canSeat,true);assert.equal(unfavorable.canSeat,false);assert.equal(unfavorable.seatRoll,.99);
});

test('wire straightening requires sustained actual overload, independent of frame rate',()=>{
 const fine=createHookHold(bigLingcod,RIG_PROFILES.sabiki,.001),load=fine.profile.wireStrengthN*2;
 assert.equal(advance(fine,.18,load).hold.wireDamage,0,'brief peaks are absorbed');
 const traces=[1/120,1/60,.1,.25,1].map(dt=>advance(fine,1,load,dt));
 for(const result of traces)assert.ok(Math.abs(result.hold.wireDamage-traces[0].hold.wireDamage)<1e-10);
 const failure=advance(fine,2,load);assert.equal(failure.lost,true);assert.equal(failure.lostReason,'straightened');
 assert.equal(advance(createHookHold(bigLingcod,RIG_PROFILES.jig,.001),2,load).lost,false,'stronger wire tolerates the same load');
 const eased=stepHookHold(traces[0].hold,{dt:2,rodLoadN:10,lineSlackMeters:.1});assert.equal(eased.hold.wireDamage,traces[0].hold.wireDamage);assert.equal(eased.hold.wireOverloadSeconds,0);
});

test('missing legacy hook metadata remains neutral and malformed sizes cannot corrupt state',()=>{
 assert.equal(hookSizeFit(blue,{}).seatChance,1);
 for(const value of[NaN,Infinity,-Infinity,-1,0,1e99]){
  const fit=hookSizeFit({kg:value,length:value},{hookSize:'#6',hookGapMm:value,hookWireStrengthN:value});
  for(const number of Object.values(fit))if(typeof number==='number')assert.ok(Number.isFinite(number));
 }
});
