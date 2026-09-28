import test from 'node:test';
import assert from 'node:assert/strict';
import {PixelAudio,PIXEL_MUSIC_SCORE,musicEventsForStep,MUSIC_STEP_SECONDS,reelFeedbackForState} from '../dist/pixel-audio.js';

class Param{
  constructor(value=0){this.value=value;this.events=[];}
  record(kind,value,time){assert.ok(Number.isFinite(value));assert.ok(Number.isFinite(time));this.events.push({kind,value,time});this.value=value;}
  setValueAtTime(v,t){this.record('set',v,t);}setTargetAtTime(v,t){this.record('target',v,t);}
  linearRampToValueAtTime(v,t){this.record('linear',v,t);}exponentialRampToValueAtTime(v,t){assert.ok(v>0);this.record('exponential',v,t);}
  cancelScheduledValues(t){this.events=this.events.filter(e=>e.time<t);}
}
class Node{
  constructor(context,kind){this.context=context;this.kind=kind;this.gain=new Param();this.frequency=new Param();this.Q=new Param();this.threshold=new Param();this.ratio=new Param();this.type='';context.nodes.push(this);}
  connect(destination){this.destination=destination;}disconnect(){this.disconnected=true;}
  start(at=0){this.startAt=at;this.context.starts.push(this);}stop(at=this.context.currentTime){this.stopAt=at;}
}
class Context{
  constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.nodes=[];this.starts=[];this.destination={};}
  createGain(){return new Node(this,'gain');}createBiquadFilter(){return new Node(this,'filter');}createDynamicsCompressor(){return new Node(this,'compressor');}
  createOscillator(){return new Node(this,'oscillator');}createBufferSource(){return new Node(this,'buffer');}
  createBuffer(_channels,size){return{getChannelData:()=>new Float32Array(size)};}
  resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
  advance(seconds){this.currentTime+=seconds;for(const node of this.nodes)if(!node.ended&&node.stopAt!==undefined&&node.stopAt<=this.currentTime){node.ended=true;node.onended?.();}}
}
globalThis.window={AudioContext:Context};
const create=()=>new PixelAudio({storage:{getItem:()=>null,setItem:()=>{}}});

test('original score loops deterministically with rests and bounded tonal/percussion levels',()=>{
  assert.equal(PIXEL_MUSIC_SCORE.bars.length,16);
  assert.equal(PIXEL_MUSIC_SCORE.bpm,100);
  let rests=0;
  for(let i=0;i<128;i++){
    const events=musicEventsForStep(i);assert.deepEqual(events,musicEventsForStep(i+128));
    assert.ok(events.every(e=>e.duration>0&&e.duration<1&&e.volume>0&&e.volume<=.09&&e.offset>=0));
    assert.ok(events.filter(e=>e.note).every(e=>e.note>=38&&e.note<=84));
    if(!events.some(e=>e.voice==='lead'))rests++;
  }
  assert.ok(rests>20);assert.equal(MUSIC_STEP_SECONDS,.3);
});

test('no context or notes are created before the user gesture init',()=>{
  const audio=create();audio.update(1,false,0,true);assert.equal(audio.event('catch'),false);
  assert.equal(audio.publicState().contextState,'uninitialized');assert.equal(audio.ctx,null);
  assert.equal(audio.init(),true);audio.update(1,false,0,false);
  const state=audio.publicState();assert.equal(state.contextState,'running');assert.ok(state.totalMusicNotes>0);assert.ok(state.scheduledNotes>0);
  audio.dispose();
});

test('blur pauses the context and removes pending notes; resume never bursts overdue bars',()=>{
  const audio=create();audio.init();audio.update(0,false,0,false);audio.ctx.advance(.15);
  audio.setPaused(true);assert.equal(audio.ctx.state,'suspended');assert.equal(audio.publicState().musicVoices,0);
  assert.equal(audio.event('bite'),false);const before=audio.publicState().totalMusicNotes;
  audio.ctx.advance(80);audio.update(80,false,0,false);assert.equal(audio.publicState().totalMusicNotes,before);
  audio.setPaused(false);audio.update(80,false,0,false);assert.equal(audio.ctx.state,'running');
  const after=audio.publicState();assert.ok(after.totalMusicNotes-before<12);assert.ok(after.musicVoices<12);
  audio.dispose();
});

test('repeated user-gesture init while dragging music volume preserves tempo and note timing',()=>{
  const play=repeatInit=>{
    const audio=create();audio.init();audio.update(0,false,0,false);
    for(let frame=1;frame<=180;frame++){
      audio.ctx.advance(1/60);
      if(repeatInit)audio.init();
      audio.setMusicVolume(.2+(frame%30)/100);
      audio.update(frame/60,false,0,false);
    }
    const state=audio.publicState();
    const result={notes:state.totalMusicNotes,bar:state.musicBar,active:state.activeVoices,
      scheduled:state.scheduledNotes,startTimes:audio.ctx.starts.map(node=>node.startAt)};
    audio.dispose();return result;
  };
  const normal=play(false),dragging=play(true);
  assert.ok(normal.notes>20,'the comparison covers multiple musical beats');
  assert.deepEqual(dragging,normal,'slider inputs must not advance extra score steps or stack notes');
});

test('music, master mute and volume are independent and persist without scheduling while silent',()=>{
  const saved=[];const audio=new PixelAudio({storage:{getItem:()=>null,setItem:(_key,value)=>saved.push(JSON.parse(value))}});
  audio.init();audio.update(0,false,0,false);audio.toggleMusic();assert.equal(audio.musicEnabled,false);assert.equal(audio.publicState().musicVoices,0);
  assert.equal(audio.event('purchase'),true,'UI effects continue when just music is muted');
  audio.setMusicVolume(2);assert.equal(audio.musicVolume,1);audio.setMusicVolume(-1);assert.equal(audio.musicVolume,0);audio.setMusicVolume(.22);
  audio.toggle();assert.equal(audio.enabled,false);assert.equal(audio.ctx.state,'suspended');assert.equal(audio.event('plop'),false);
  audio.toggle();audio.toggleMusic();audio.ctx.advance(.1);audio.update(1,false,0,false);assert.ok(audio.publicState().musicVoices>0);
  assert.ok(saved.some(s=>s.musicVolume===.22));assert.ok(saved.some(s=>s.enabled===false));
  audio.dispose();assert.equal(audio.publicState().contextState,'closed');assert.equal(audio.init(),false);
});

test('effects have distinct recipes and rate limits, with no unlimited reel notes',()=>{
  const audio=create();audio.init();
  for(const name of['interaction','step','cast','plop','bite','reel','catch','engine','purchase','denied','swim']){
    audio.ctx.advance(1);const n=audio.ctx.starts.length;assert.equal(audio.event(name),true,name);assert.ok(audio.ctx.starts.length>n);assert.equal(audio.event(name),false,'same-frame event is coalesced');
  }
  assert.equal(audio.event('unknown'),false);assert.equal(audio.publicState().totalEffects,11);
  for(let i=0;i<120;i++){audio.ctx.advance(1/60);audio.update(i/60,false,0,false,{reeling:true});}
  assert.ok(audio.publicState().activeVoices<25);audio.dispose();assert.equal(audio.publicState().musicVoices,0);
});


const runState={fishState:'fight',reelMode:'brake',payoutRate:1.5,retrieveRate:0,crankRate:0,rodLoadN:12,dragThresholdN:12,lineSlackMeters:0};
const advanceAudio=(audio,seconds,options)=>{for(let i=0;i<Math.ceil(seconds*60);i++){audio.ctx.advance(1/60);audio.update(audio.ctx.currentTime,false,0,false,options);}};

test('drag teeth follow actual payout, with distinct open-spool and crank sounds',()=>{
  const small=reelFeedbackForState({...runState,payoutRate:.25,rodLoadN:5}),run=reelFeedbackForState({...runState,payoutRate:2.8});
  assert.ok(run.ratchetHz>small.ratchetHz);assert.ok(run.ratchetFrequency>small.ratchetFrequency);assert.ok(run.ratchetVolume>small.ratchetVolume);
  const feed=reelFeedbackForState({...runState,reelMode:'free'});
  assert.equal(feed.ratchetHz,0);assert.ok(feed.feedVolume>0);assert.equal(feed.crankVolume,0);
  assert.equal(run.feedVolume,0);assert.equal(run.crankVolume,0);
  const stalled=reelFeedbackForState({...runState,crankRate:1.2,retrieveRate:0});
  assert.ok(stalled.crankVolume>0,'a handle still turns audibly while the drag slips');assert.ok(stalled.ratchetHz>0);
  const fast=reelFeedbackForState({...runState,payoutRate:0,crankRate:2,retrieveRate:1.2});
  const slow=reelFeedbackForState({...runState,payoutRate:0,crankRate:.5,retrieveRate:.3});
  assert.ok(fast.gearFrequency>slow.gearFrequency);assert.ok(fast.crankVolume>slow.crankVolume);
  assert.equal(fast.ratchetHz,0);assert.equal(reelFeedbackForState({...runState,payoutRate:0,reeling:true,slipping:true}).ratchetHz,0);
});

test('stale rates, pause, slack and nonfinite physics cannot produce phantom reel motion',()=>{
  for(const fishState of['idle','landed','charging',undefined]){
    const f=reelFeedbackForState({...runState,fishState,crankRate:2,retrieveRate:1});
    assert.equal(f.active,false);assert.equal(f.ratchetHz+f.feedVolume+f.crankVolume+f.lineVolume,0);
  }
  assert.equal(reelFeedbackForState({...runState,paused:true}).ratchetHz,0);
  const loose=reelFeedbackForState({...runState,lineSlackMeters:3}),tight=reelFeedbackForState(runState);
  assert.ok(loose.lineVolume<tight.lineVolume*.2);
  const bad=reelFeedbackForState({...runState,payoutRate:Infinity,crankRate:NaN,rodLoadN:NaN,dragThresholdN:0});
  assert.equal(bad.ratchetHz+bad.crankVolume,0);assert.ok(Object.values(bad).filter(v=>typeof v==='number').every(Number.isFinite));
});

test('ratchet has a bounded audio-clock cadence and loops stay bounded on a mobile frame budget',()=>{
  const audio=create();audio.init();audio.toggleMusic();
  let maxVoices=0;const options={...runState,payoutRate:8,crankRate:2,retrieveRate:.2};
  for(let frame=0;frame<60*20;frame++){
    audio.ctx.advance(1/60);audio.update(frame/60,false,0,false,options);maxVoices=Math.max(maxVoices,audio.publicState().reel.voices);
  }
  const running=audio.publicState();assert.ok(running.reel.totalTicks>500);assert.ok(running.reel.totalTicks<20*43);assert.ok(maxVoices<=10);
  assert.equal(audio._reelLoops.size,3,'crank, gears and guide hiss are reused instead of recreated every frame');
  const before=running.reel.totalTicks;audio.ctx.advance(90);audio.update(110,false,0,false,options);
  assert.ok(audio.publicState().reel.totalTicks-before<=3,'a delayed frame cannot replay a backlog of ratchet teeth');
  audio.update(110,false,0,false,{...options,fishState:'idle'});assert.equal(audio.publicState().reel.voices,0);assert.equal(audio._reelLoops.size,0);
  audio.dispose();
});

test('music ducks for a bite and fight while the bite cue itself has no beep oscillator',()=>{
  const audio=create();audio.init();audio.update(0,false,0,false,{fishState:'bite'});
  assert.equal(audio.publicState().musicDuck,.23);assert.equal(audio.musicGain.gain.value,audio.musicVolume*.23);
  const before=audio.ctx.starts.length;audio.event('bite');const cue=audio.ctx.starts.slice(before);
  assert.equal(cue.length,2);assert.ok(cue.every(node=>node.kind==='buffer'),'the cue is a physical knock and guide noise');
  advanceAudio(audio,.1,{...runState,fishState:'fight'});assert.equal(audio.publicState().musicDuck,.23);
  advanceAudio(audio,.1,{fishState:'landed'});assert.equal(audio.publicState().musicDuck,1);audio.dispose();
});

test('pause, mute and idle cancel reel loops and future teeth without waiting for the next 20 Hz automation tick',()=>{
  const audio=create();audio.init();audio.toggleMusic();
  audio.update(0,false,0,false,runState);assert.ok(audio.publicState().reel.voices>0);
  audio.ctx.advance(.001);audio.update(.001,false,0,false,{...runState,paused:true});assert.equal(audio.publicState().reel.voices,0);
  advanceAudio(audio,.1,runState);assert.ok(audio.publicState().reel.voices>0);
  audio.setPaused(true);assert.equal(audio.publicState().reel.voices,0);audio.ctx.advance(20);audio.setPaused(false);audio.update(21,false,0,false,runState);
  assert.ok(audio.publicState().reel.voices>0);assert.ok(audio.publicState().reel.voices<=5);
  audio.toggle();assert.equal(audio.publicState().reel.voices,0);audio.toggle();advanceAudio(audio,.1,runState);assert.ok(audio.publicState().reel.voices>0);
  audio.setVolume(0);assert.equal(audio.publicState().reel.voices,0);advanceAudio(audio,.2,runState);assert.equal(audio.publicState().reel.voices,0);
  audio.setVolume(.55);advanceAudio(audio,.1,runState);assert.ok(audio.publicState().reel.voices>0);audio.dispose();assert.equal(audio.publicState().reel.voices,0);
});

test('spool latch plays once on mode change and an open spool never emits drag ratchet teeth',()=>{
  const audio=create();audio.init();audio.toggleMusic();
  audio.update(0,false,0,false,{...runState,reelMode:'free'});const first=audio.ctx.starts.length;
  advanceAudio(audio,.4,{...runState,reelMode:'free'});assert.equal(audio.ctx.starts.length,first);assert.equal(audio.publicState().reel.totalTicks,0);
  const before=audio.ctx.starts.length;advanceAudio(audio,.1,{...runState,reelMode:'brake',payoutRate:0});
  assert.equal(audio.ctx.starts.length-before,2,'only the two dry latch layers start');
  advanceAudio(audio,.2,{...runState,reelMode:'brake',payoutRate:0});assert.equal(audio.ctx.starts.length-before,2);
  audio.dispose();
});

test('airborne casting spools produce feed sound without drag chatter',()=>{const f=reelFeedbackForState({fishState:'flight',reelMode:'free',payoutRate:12,rodLoadN:.2});assert.ok(f.feedVolume>0);assert.equal(f.ratchetHz,0);});
