import test from 'node:test';
import assert from 'node:assert/strict';
import {hookProfile,createHookHold,stepHookHold} from '../dist/pixel-hooking.js';

const fish=(fightKind,kg=.6)=>({fightKind,kg});
const kinds=['rockfish','mackerel','lingcod','halibut','salmon','seabass','bonito'];
function advance(hold,seconds,values={},dt=.1){
 let result={hold,lost:false};
 for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)result=stepHookHold(result.hold,{dt:Math.min(dt,seconds-elapsed),...values});
 return result;
}

test('proper steady pressure retains every species without baseline random losses',()=>{
 for(const kind of kinds)for(const roll of[.001,.5,.99999]){
  const hold=createHookHold(fish(kind),{},roll),r=advance(hold,120,{rodLoadN:hold.profile.holdLoadN*.7,lineSlackMeters:.15,headShake:1});
  assert.equal(r.lost,false,kind);assert.equal(r.hold.exposure,0,kind);
 }
});

test('small-fish ease follows mass continuously and is calibrated safer under sustained slack',()=>{
 assert.equal(hookProfile(fish('rockfish',1.5)).easy,true);assert.equal(hookProfile(fish('rockfish',1.51)).easy,false);
 assert.equal(hookProfile(fish('mackerel',.9)).easy,true);assert.equal(hookProfile(fish('mackerel',.91)).easy,false);
 const small=['rockfish','mackerel'].map(kind=>advance(createHookHold(fish(kind,.45)),20,{lineSlackMeters:2,headShake:1}));
 const large=['salmon','seabass','bonito'].map(kind=>advance(createHookHold(fish(kind,5)),20,{lineSlackMeters:2,headShake:1}));
 for(const r of small){assert.equal(r.lost,false);for(const l of large)assert.ok(r.hold.exposure<l.hold.exposure*.25);}
 const light=hookProfile(fish('rockfish',1.5)),near=hookProfile(fish('rockfish',1.5001)),heavy=hookProfile(fish('rockfish',6));
 assert.ok(Math.abs(light.slackLossRate-near.slackLossRate)<.00001);assert.ok(heavy.slackLossRate>light.slackLossRate);
 assert.ok(Math.abs(light.engageSeconds-near.engageSeconds)<.0001);
});

test('circle hooks can seat through steady pressure and retain more securely, with per-species timing',()=>{
 for(const kind of kinds){
  const j=hookProfile(fish(kind),{hookStyle:'j'}),circle=hookProfile(fish(kind),{hookStyle:'circle'});
  assert.ok(circle.engageSeconds<j.engageSeconds);assert.ok(circle.slackLossRate<j.slackLossRate);assert.ok(circle.holdLoadN>j.holdLoadN);
 }
 assert.ok(hookProfile(fish('rockfish')).engageSeconds<.8);assert.ok(hookProfile(fish('seabass',8)).engageSeconds>1);
 assert.deepEqual(hookProfile(fish('rockfish'),{circleHook:true}),hookProfile(fish('rockfish'),{hookStyle:'circle'}));
});

test('WSB has lower calibrated hook holding load and can be released by prolonged overload or slack',()=>{
 const wsb=createHookHold(fish('seabass',8));
 for(const kind of['lingcod','salmon','bonito'])assert.ok(wsb.profile.holdLoadN<hookProfile(fish(kind,8)).holdLoadN);
 assert.equal(advance(wsb,30,{lineSlackMeters:3,headShake:1}).lost,true);
 assert.equal(advance(wsb,15,{rodLoadN:wsb.profile.holdLoadN*2,lineSlackMeters:0}).lost,true);
 assert.equal(advance(wsb,.25,{rodLoadN:wsb.profile.holdLoadN*3}).lost,false,'brief overload is absorbed by the grace interval');
 assert.equal(advance(wsb,1.5,{lineSlackMeters:3}).lost,false,'brief slack is recoverable');
});

test('small ordinary fish do not lose hook purchase under even firm normal starter-gear pressure',()=>{
 for(const kind of['rockfish','mackerel'])for(const kg of[.1,.45,.9]){
  const hold=createHookHold(fish(kind,kg),{},.99999),load=kind==='rockfish'?20:16;
  assert.ok(hold.profile.holdLoadN>load);assert.equal(advance(hold,90,{rodLoadN:load,lineSlackMeters:.1,headShake:1}).lost,false);
 }
});

test('retention integrates elapsed exposure, including partial grace frames, independently of frame rate',()=>{
 const hold=createHookHold(fish('salmon',6),{hookStyle:'circle'},.3),input={rodLoadN:hold.profile.holdLoadN*1.5,lineSlackMeters:2.7,headShake:.65};
 const results=[1/120,1/60,.1,.25,1].map(dt=>advance(hold,7,input,dt));
 for(const result of results){assert.ok(Math.abs(result.hold.exposure-results[0].hold.exposure)<1e-10);assert.equal(result.lost,results[0].lost);}
 const first=stepHookHold(hold,{dt:1,lineSlackMeters:2}),second=stepHookHold(first.hold,{dt:1,lineSlackMeters:2});
 assert.equal(first.hold.exposure,0);assert.ok(Math.abs(second.hold.exposure-hold.profile.slackLossRate*.5)<1e-12);
});

test('restoring control resets a grace timer without erasing prior damage or reviving a lost fish',()=>{
 const hold=createHookHold(fish('seabass',8)),slack=advance(hold,3,{lineSlackMeters:2}),recovered=stepHookHold(slack.hold,{dt:.1,rodLoadN:5,lineSlackMeters:.1});
 assert.equal(recovered.hold.slackSeconds,0);assert.equal(recovered.hold.exposure,slack.hold.exposure);
 assert.equal(advance(recovered.hold,1.5,{lineSlackMeters:2}).hold.exposure,recovered.hold.exposure);
 const lost=advance(hold,60,{lineSlackMeters:3,headShake:1});assert.equal(lost.lost,true);
 assert.equal(stepHookHold(lost.hold,{dt:1,rodLoadN:5,lineSlackMeters:.1}).lost,true);
});

test('inputs remain immutable and invalid or extreme values cannot produce non-finite state',()=>{
 const original=createHookHold(fish('salmon',5),{hookStyle:'circle'},.2,.7),copy=structuredClone(original),args={dt:.1,rodLoadN:60,lineSlackMeters:2,headShake:.9};
 Object.freeze(original.profile);Object.freeze(original);Object.freeze(args);
 const r=stepHookHold(original,args);assert.deepEqual(original,copy);assert.notEqual(r.hold,original);assert.notEqual(r.hold.profile,original.profile);
 for(const value of[NaN,Infinity,-Infinity,1e99,-10]){
  const h=createHookHold({fightKind:'seabass',kg:value},null,value,value);h.exposure=value;h.threshold=value;h.slackSeconds=value;h.overloadSeconds=value;h.profile.holdLoadN=value;
  const next=stepHookHold(h,{dt:value,rodLoadN:value,lineSlackMeters:value,headShake:value});
  for(const n of[...Object.values(next.hold.profile),next.hold.exposure,next.hold.threshold,next.hold.slackSeconds,next.hold.overloadSeconds])if(typeof n==='number')assert.ok(Number.isFinite(n));
 }
 assert.equal(stepHookHold(null).lost,false);assert.equal(hookProfile(null,null).kind,'rockfish');
});

test('a less secure initial seat affects mistakes without introducing an arbitrary steady-retrieve failure',()=>{
 const good=createHookHold(fish('halibut',3),{},.5,1),poor=createHookHold(fish('halibut',3),{},.5,.4);
 assert.ok(poor.profile.holdLoadN<good.profile.holdLoadN);assert.ok(poor.profile.slackLossRate>good.profile.slackLossRate);
 assert.equal(advance(poor,120,{rodLoadN:10,lineSlackMeters:.1}).lost,false);
});
