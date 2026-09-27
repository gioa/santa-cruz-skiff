import {OceanAudio} from './audio.js?v=20260927-pixel-v5';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const valid=(n,fallback)=>Number.isFinite(n)?n:fallback;
const midi=n=>440*2**((n-69)/12);
const freezeBar=(chord,bass,melody)=>Object.freeze({chord:Object.freeze(chord),bass,melody:Object.freeze(melody)});

/** Original composition: sixteen bars of warm, lightly syncopated seaside pop.
 * MIDI pitches, two subdivisions per beat; zero is a rest. No sampled music.
 */
export const PIXEL_MUSIC_SCORE=Object.freeze({
  title:'Morning on the Little Boat',bpm:100,beatsPerBar:4,subdivisions:2,
  bars:Object.freeze([
    freezeBar([60,64,67,71],48,[76,0,79,81,79,0,76,74]),
    freezeBar([60,64,67,71],48,[72,0,74,76,79,0,76,0]),
    freezeBar([57,60,64,67],45,[76,0,79,76,72,0,74,72]),
    freezeBar([57,60,64,67],45,[69,0,72,74,76,0,72,0]),
    freezeBar([53,57,60,64],41,[72,0,76,77,76,0,72,69]),
    freezeBar([53,57,60,64],41,[72,0,74,76,77,0,76,0]),
    freezeBar([55,59,62,64],43,[74,0,79,77,74,0,71,74]),
    freezeBar([55,59,62,65],43,[79,0,77,74,71,0,72,0]),
    freezeBar([60,64,67,71],48,[79,0,81,79,76,74,72,0]),
    freezeBar([60,64,67,71],48,[76,0,79,81,79,0,76,0]),
    freezeBar([57,60,64,67],45,[76,0,72,74,76,79,76,0]),
    freezeBar([52,55,59,62],40,[74,0,71,74,76,0,74,0]),
    freezeBar([53,57,60,64],41,[72,0,76,77,79,0,77,76]),
    freezeBar([50,53,57,60],38,[74,0,77,76,74,0,72,0]),
    freezeBar([55,59,62,65],43,[71,0,74,77,79,0,77,74]),
    freezeBar([60,64,67,69],48,[76,0,74,72,0,0,0,0]),
  ]),
});
export const MUSIC_STEP_SECONDS=60/PIXEL_MUSIC_SCORE.bpm/PIXEL_MUSIC_SCORE.subdivisions;
const STEPS_PER_BAR=PIXEL_MUSIC_SCORE.beatsPerBar*PIXEL_MUSIC_SCORE.subdivisions;
const TOTAL_STEPS=PIXEL_MUSIC_SCORE.bars.length*STEPS_PER_BAR;

/** Pure score planner, shared by the live scheduler and deterministic tests. */
export function musicEventsForStep(step){
  const index=((Math.floor(valid(step,0))%TOTAL_STEPS)+TOTAL_STEPS)%TOTAL_STEPS;
  const bar=PIXEL_MUSIC_SCORE.bars[Math.floor(index/STEPS_PER_BAR)],beat=index%STEPS_PER_BAR,events=[];
  if(bar.melody[beat])events.push({voice:'lead',note:bar.melody[beat],duration:MUSIC_STEP_SECONDS*.82,volume:beat%2?.079:.088,offset:0});
  if(beat===0||beat===4){
    bar.chord.forEach((note,i)=>events.push({voice:'chord',note,duration:.85,volume:.019,offset:i*.016}));
    events.push({voice:'bass',note:bar.bass+(beat===4?7:0),duration:.44,volume:.075,offset:0});
    events.push({voice:'kick',note:0,duration:.11,volume:.07,offset:0});
  }
  if(beat===2||beat===6)events.push({voice:'brush',note:0,duration:.085,volume:.025,offset:0});
  // A little space at the end of each four-bar phrase keeps the loop breathable.
  if(!(index%32===31))events.push({voice:'hat',note:0,duration:.028,volume:beat%2?.011:.007,offset:0});
  return events;
}

const EVENT_GAPS={interaction:.07,step:.14,cast:.16,plop:.15,bite:.3,reel:.085,catch:.8,engine:.5,purchase:.3,denied:.3,swim:.4};

/**
 * User-gesture initialised audio for the pixel edition. Existing OceanAudio calls
 * remain supported. setPaused is for background/blur; menus can leave music on
 * while supplying update() with engine/walking/reeling=false.
 */
export class PixelAudio extends OceanAudio{
  constructor({storage=null}={}){
    super();this.musicEnabled=true;this.musicVolume=.34;this._paused=false;this._disposed=false;
    this._voices=new Set();this._lastEvent=new Map();this._scoreStep=0;this._nextStepAt=null;
    this._totalMusicNotes=0;this._totalEffects=0;this._lastUpdate=-Infinity;this._lastReel=-Infinity;
    this._musicDuck=1;this._storage=storage;this._storageKey='santa-cruz-pixel-audio-v1';
    try{this._storage??=globalThis.localStorage;const saved=JSON.parse(this._storage?.getItem(this._storageKey)||'null');if(saved){this.enabled=saved.enabled!==false;this.musicEnabled=saved.musicEnabled!==false;this.musicVolume=clamp(valid(saved.musicVolume,.34),0,1);this.volume=clamp(valid(saved.volume,.55),0,1);}}catch{}
  }
  _save(){try{this._storage?.setItem(this._storageKey,JSON.stringify({enabled:this.enabled,musicEnabled:this.musicEnabled,musicVolume:this.musicVolume,volume:this.volume}));}catch{}}
  init(){
    if(this._disposed)return false;
    const wasRunning=this.ctx?.state==='running';
    try{if(!this.ctx)super.init();}catch{return false;}
    if(!this.ctx)return false;
    if(!this.musicGain){this.musicGain=this.ctx.createGain();this.musicGain.gain.value=this.musicVolume;this.musicGain.connect(this.master);}
    this._applyMix();
    // Settings may call init for every volume-slider input. Preserve the
    // current beat when audio is already running; only a real start/resume
    // needs a fresh scheduling window.
    if(this.enabled&&!this._paused){if(!wasRunning){this._resume();this._resetSchedule();}}
    else this._suspend();
    return true;
  }
  _resume(){try{this.ctx?.resume()?.catch?.(()=>{});}catch{}}
  _suspend(){try{this.ctx?.suspend()?.catch?.(()=>{});}catch{}}
  _resetSchedule(){this._nextStepAt=this.ctx?this.ctx.currentTime+.045:null;this._lastUpdate=-Infinity;}
  _applyMix(){
    if(!this.ctx)return;const now=this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);this.master.gain.setTargetAtTime(this.enabled&&!this._paused?this.volume:0,now,.035);
    if(this.musicGain){this.musicGain.gain.cancelScheduledValues(now);this.musicGain.gain.setTargetAtTime(this.enabled&&this.musicEnabled&&!this._paused?this.musicVolume*this._musicDuck:0,now,.05);}
  }
  toggle(){
    this.enabled=!this.enabled;this._applyMix();
    if(this.enabled&&!this._paused){this._resume();this._resetSchedule();}else{this._stopVoices();this._suspend();}
    this._save();return this.enabled;
  }
  toggleMusic(){
    this.musicEnabled=!this.musicEnabled;this._applyMix();
    if(this.musicEnabled)this._resetSchedule();else this._stopVoices('music');
    this._save();return this.musicEnabled;
  }
  setMusicVolume(value){this.musicVolume=clamp(valid(Number(value),this.musicVolume),0,1);this._applyMix();if(!this.musicVolume)this._stopVoices('music');this._save();return this.musicVolume;}
  setVolume(value){this.volume=clamp(valid(Number(value),this.volume),0,1);this._applyMix();this._save();return this.volume;}
  setPaused(value){
    const paused=Boolean(value);if(paused===this._paused)return;
    this._paused=paused;this._applyMix();
    if(paused){this._stopVoices();this._suspend();this._nextStepAt=null;}
    else if(this.enabled){this._resume();this._resetSchedule();}
  }
  _canPlay(){return Boolean(this.ctx&&this.enabled&&!this._paused&&!this._disposed);}
  _track(source,nodes,kind,start,end){
    const voice={source,nodes,kind,start,end};this._voices.add(voice);
    const clean=()=>{if(!this._voices.delete(voice))return;for(const node of nodes){try{node.disconnect();}catch{}}};
    voice.clean=clean;source.onended=clean;return voice;
  }
  _stopVoices(kind=null){for(const voice of [...this._voices])if(!kind||voice.kind===kind){try{voice.source.stop(this.ctx.currentTime);}catch{}voice.clean();}}
  _tone({frequency,duration=.12,volume=.05,type='triangle',at=null,kind='effect',cutoff=6000,toFrequency=null}={}){
    if(!this._canPlay())return;
    const c=this.ctx,start=Math.max(c.currentTime,at??c.currentTime),end=start+Math.max(.015,duration);
    const source=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();
    source.type=type;source.frequency.setValueAtTime(Math.max(25,frequency),start);
    if(toFrequency)source.frequency.exponentialRampToValueAtTime(Math.max(25,toFrequency),end);
    filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.5;
    gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.005);
    if(kind==='music')gain.gain.linearRampToValueAtTime(volume*.64,start+duration*.32);
    gain.gain.exponentialRampToValueAtTime(.0001,end);
    source.connect(filter);filter.connect(gain);gain.connect(kind==='music'?this.musicGain:this.master);
    this._track(source,[source,filter,gain],kind,start,end);source.start(start);source.stop(end+.01);
  }
  _noise({duration=.06,frequency=1200,volume=.025,type='bandpass',at=null,kind='effect'}={}){
    if(!this._canPlay())return;
    const c=this.ctx,start=Math.max(c.currentTime,at??c.currentTime),source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),end=start+Math.max(.012,duration);
    source.buffer=this.white;filter.type=type;filter.frequency.setValueAtTime(frequency,start);filter.frequency.exponentialRampToValueAtTime(Math.max(90,frequency*.6),end);filter.Q.value=.55;
    gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,end);
    source.connect(filter);filter.connect(gain);gain.connect(kind==='music'?this.musicGain:this.master);
    this._track(source,[source,filter,gain],kind,start,end);source.start(start,0,duration);source.stop(end+.01);
  }
  ping(frequency=660,duration=.12,volume=.08,type='sine'){this._tone({frequency,duration,volume,type});}
  noiseBurst(duration=.15,frequency=1000,volume=.06,type='bandpass'){this._noise({duration,frequency,volume,type});}
  cast(){this.event('cast');}
  splash(scale=1){this._noise({duration:.5,frequency:1150,volume:.13*clamp(scale,.2,2),type:'lowpass'});this._noise({duration:.18,frequency:390,volume:.11*clamp(scale,.2,2)});}
  reel(){this.event('reel');}
  gull(){this._tone({frequency:980,toFrequency:740,duration:.55,volume:.012,type:'sine',cutoff:1800});}
  event(name){
    if(!this._canPlay()||!Object.hasOwn(EVENT_GAPS,name))return false;
    const now=this.ctx.currentTime;if(now-(this._lastEvent.get(name)??-Infinity)<EVENT_GAPS[name])return false;
    this._lastEvent.set(name,now);this._totalEffects++;
    const tone=(f,d,v,offset=0,type='triangle')=>this._tone({frequency:f,duration:d,volume:v,at:now+offset,type});
    if(name==='interaction'){tone(610,.065,.028);}
    else if(name==='step'){this._noise({duration:.07,frequency:220,volume:.045});this._noise({duration:.045,frequency:1400,volume:.009});}
    else if(name==='cast'){this._noise({duration:.19,frequency:2550,volume:.042});}
    else if(name==='plop'){this._tone({frequency:520,toFrequency:125,duration:.17,volume:.065,type:'sine'});this._noise({duration:.11,frequency:650,volume:.028});}
    else if(name==='bite'){tone(880,.09,.065);tone(1174.66,.14,.06,.11,'sine');}
    else if(name==='reel'){this._noise({duration:.021,frequency:1550,volume:.021,type:'highpass'});tone(155,.024,.008);}
    else if(name==='catch'){[72,76,79,84].forEach((n,i)=>tone(midi(n),.23,.055,i*.09));}
    else if(name==='engine'){this._noise({duration:.23,frequency:180,volume:.05,type:'lowpass'});tone(65,.14,.025);tone(92,.11,.017,.12);}
    else if(name==='purchase'){tone(midi(83),.15,.043,0,'sine');tone(midi(88),.2,.032,.075,'sine');}
    else if(name==='denied'){tone(196,.075,.027);tone(174.61,.11,.024,.09);}
    else if(name==='swim')this.splash();
    return true;
  }
  _scheduleMusic(){
    if(!this._canPlay()||!this.musicEnabled||this.musicVolume===0||this.ctx.state!=='running')return;
    const now=this.ctx.currentTime;
    // A throttled tab or resumed context starts from now; never queue old bars.
    if(this._nextStepAt===null||this._nextStepAt<now-MUSIC_STEP_SECONDS*.5)this._nextStepAt=now+.045;
    let guard=0;
    while(this._nextStepAt<now+.12&&guard++<2){
      for(const event of musicEventsForStep(this._scoreStep)){
        const at=this._nextStepAt+event.offset;
        if(event.voice==='hat'||event.voice==='brush')this._noise({...event,at,kind:'music',frequency:event.voice==='hat'?5300:1250,type:event.voice==='hat'?'highpass':'bandpass'});
        else if(event.voice==='kick')this._tone({...event,at,kind:'music',frequency:125,toFrequency:48,type:'sine',cutoff:500});
        else this._tone({...event,at,kind:'music',frequency:midi(event.note),type:event.voice==='chord'?'triangle':event.voice==='bass'?'sine':'triangle',cutoff:event.voice==='bass'?600:event.voice==='chord'?1600:3500});
        this._totalMusicNotes++;
      }
      this._scoreStep=(this._scoreStep+1)%TOTAL_STEPS;this._nextStepAt+=MUSIC_STEP_SECONDS;
    }
  }
  update(t,engine,throttle,walking,options={}){
    if(!this._canPlay())return;
    const now=this.ctx.currentTime;this._scheduleMusic();
    // Continuous environment automation at 20 Hz avoids piling up per-frame
    // AudioParam events on phones; musical scheduling uses its own audio clock.
    if(now-this._lastUpdate>=.05){
      this._lastUpdate=now;super.update(t,engine,throttle,false,options);
      // The old 3D surf was mixed as a foreground soundscape. In the pixel
      // edition it sits behind the melody and short, readable action cues.
      this.surfGain.gain.cancelScheduledValues(now);
      this.surfGain.gain.setTargetAtTime(.034+Math.min(2,Math.max(0,options.wave||0))*.009+Math.min(4,Math.max(0,options.speed||0))*.004+Math.sin(t*.42)*.006,now,.3);
      const duck=options.underwater?.45:1;
      if(duck!==this._musicDuck){this._musicDuck=duck;this._applyMix();}
    }
    if(walking&&t-this.lastStep>.46){this.lastStep=t;this.event('step');}
    if(options.reeling&&now-this._lastReel>.09){this._lastReel=now;this.event('reel');}
  }
  publicState(){
    const now=this.ctx?.currentTime||0,voices=[...this._voices];
    return{contextState:this._disposed?'closed':this.ctx?.state||'uninitialized',enabled:this.enabled,musicEnabled:this.musicEnabled,musicVolume:this.musicVolume,masterVolume:this.volume,paused:this._paused,
      scheduledNotes:voices.filter(v=>v.kind==='music'&&v.start>now).length,activeVoices:voices.filter(v=>v.start<=now&&v.end>now).length,
      musicVoices:voices.filter(v=>v.kind==='music').length,totalMusicNotes:this._totalMusicNotes,totalEffects:this._totalEffects,
      musicBar:Math.floor(this._scoreStep/STEPS_PER_BAR)+1,scoreBPM:PIXEL_MUSIC_SCORE.bpm};
  }
  dispose(){
    if(this._disposed)return;this._disposed=true;this._stopVoices();
    for(const source of[this.surf,this.engine,this.exhaust])try{source?.stop();source?.disconnect();}catch{}
    try{this.musicGain?.disconnect();this.master?.disconnect();this.ctx?.close()?.catch?.(()=>{});}catch{}
  }
}
