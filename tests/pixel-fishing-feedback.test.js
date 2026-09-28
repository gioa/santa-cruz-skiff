import test from 'node:test';
import assert from 'node:assert/strict';
import {fishingFeedback,reelMotion} from '../dist/pixel-fishing-feedback.js';

test('a running fish turns the spool backwards even while the angler winds',()=>{
 const running={fishState:'fight',crankRate:1.2,payoutRate:1.4,retrieveRate:.2};
 assert.ok(reelMotion(running).spoolRadiansPerSecond<0);
 assert.equal(fishingFeedback(running).cue,'鱼在出线');
 const gaining={...running,payoutRate:0,retrieveRate:.6};
 assert.ok(reelMotion(gaining).spoolRadiansPerSecond>0);
 assert.equal(fishingFeedback(gaining).cue,'正在收线');
});

test('spool movement stops on pause, landing and idle despite stale rate values',()=>{
 for(const overrides of[{paused:true},{fishState:'landed'},{fishState:'idle'}]){
  assert.deepEqual(reelMotion({fishState:'fight',payoutRate:2,retrieveRate:.7,...overrides}),{payout:0,retrieve:0,net:0,spoolRadiansPerSecond:0});
 }
 assert.equal(reelMotion({fishState:'fight',payoutRate:NaN,retrieveRate:Infinity}).spoolRadiansPerSecond,0);
});

test('cues describe line slack and real bend without a fish health or strength gauge',()=>{
 const tight={fishState:'fight',lineSlackMeters:0,rodBend:.9,drag:.8};
 assert.equal(fishingFeedback(tight).cue,'竿身深弯');
 assert.equal(fishingFeedback({...tight,lineSlackMeters:1}).cue,'鱼线松了');
 assert.deepEqual(fishingFeedback({...tight,stamina:0,tension:0,rodLoadN:1}),fishingFeedback({...tight,stamina:100,tension:100,rodLoadN:100}));
 assert.equal(fishingFeedback({...tight,fishState:'bite'}).cue,'咬钩了');
 assert.equal(fishingFeedback({...tight,fishState:'idle'}).cue,'');
 assert.equal(fishingFeedback({...tight,reelMode:'free',payoutRate:1}).cue,'线杯放线');
});

test('descending tackle and a rock snag never masquerade as a running fish',()=>{
 const descent={fishState:'sinking',reelMode:'free',payoutRate:1.2,rodBend:.18};
 assert.equal(fishingFeedback(descent).cue,'线杯放线');
 assert.equal(fishingFeedback(descent).bendLabel,'竿尖轻弯');
 const bottom={...descent,fishState:'waiting',payoutRate:.025,rodBend:.03,lineSlackMeters:.8};
 assert.equal(fishingFeedback(bottom).cue,'鱼线松了');
 assert.equal(fishingFeedback(bottom).bendLabel,'竿尖舒展');
 const snag={...bottom,snagged:true,reelMode:'brake',rodBend:.94,retrieveRate:.01,lineSlackMeters:0,payoutRate:0};
 assert.equal(fishingFeedback(snag).cue,'钓组卡住了');
 assert.equal(fishingFeedback(snag).bendLabel,'竿身深弯');
 assert.equal(fishingFeedback({...snag,payoutRate:.3}).cue,'泄力出线');
 assert.equal(fishingFeedback({...snag,lineSlackMeters:1}).cue,'鱼线松了');
 assert.equal(fishingFeedback({...snag,snagged:false,payoutRate:.3}).cue,'泄力出线');
 assert.ok(reelMotion({...snag,payoutRate:.3}).spoolRadiansPerSecond<0,'snag drag slip turns the same physical spool backwards');
});

test('stale snag and fish values do not produce active cues while paused or after retrieval',()=>{
 const snag={fishState:'waiting',snagged:true,rodBend:.95,lineSlackMeters:0,payoutRate:.6,retrieveRate:.1};
 for(const phase of['sinking','waiting','bite','fight'])assert.equal(fishingFeedback({...snag,fishState:phase,paused:true}).cue,'');
 assert.equal(fishingFeedback({...snag,fishState:'idle'}).cue,'');
 assert.equal(fishingFeedback({...snag,fishState:'idle'}).bendLabel,'竿尖舒展');
 assert.equal(fishingFeedback({...snag,fishState:'landed'}).cue,'鱼在船边');
});
