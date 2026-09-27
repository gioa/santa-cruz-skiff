import test from 'node:test';
import assert from 'node:assert/strict';
import {PixelAudio,PIXEL_MUSIC_SCORE,musicEventsForStep,MUSIC_STEP_SECONDS} from '../dist/pixel-audio.js';

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
