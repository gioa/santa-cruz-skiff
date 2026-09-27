// Layered procedural environmental sound, no task-completion soundtrack.
export class OceanAudio {
 constructor(){this.ctx=null;this.enabled=true;this.volume=.55;this.lastGull=0;this.lastStep=0;this.lastCreak=0;this.lastSlip=0;}
 init(){
  if(this.ctx){this.ctx.resume();return;}const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
  this.ctx=new A();const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.volume;
  this.listenerFilter=c.createBiquadFilter();this.listenerFilter.type='lowpass';this.listenerFilter.frequency.value=14000;
  const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=4;this.master.connect(this.listenerFilter);this.listenerFilter.connect(limiter);limiter.connect(c.destination);
  this.noise=c.createBuffer(1,c.sampleRate*4,c.sampleRate);const d=this.noise.getChannelData(0);let brown=0;
  for(let i=0;i<d.length;i++){brown=(brown+(Math.random()*2-1)*.018)/1.019;d[i]=brown*4;}
  this.white=c.createBuffer(1,c.sampleRate,c.sampleRate);const w=this.white.getChannelData(0);for(let i=0;i<w.length;i++)w[i]=Math.random()*2-1;
  this.surf=c.createBufferSource();this.surf.buffer=this.noise;this.surf.loop=true;
  this.surfFilter=c.createBiquadFilter();this.surfFilter.type='lowpass';this.surfFilter.frequency.value=950;
  this.surfGain=c.createGain();this.surfGain.gain.value=.25;this.surf.connect(this.surfFilter);this.surfFilter.connect(this.surfGain);this.surfGain.connect(this.master);this.surf.start();
  this.engine=c.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=28;
  this.engineGain=c.createGain();this.engineGain.gain.value=0;this.engineFilter=c.createBiquadFilter();this.engineFilter.type='lowpass';this.engineFilter.frequency.value=240;
  this.engine.connect(this.engineFilter);this.engineFilter.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();
  this.exhaust=c.createOscillator();this.exhaust.type='triangle';this.exhaust.frequency.value=56;this.exhaustGain=c.createGain();this.exhaustGain.gain.value=0;this.exhaust.connect(this.exhaustGain);this.exhaustGain.connect(this.master);this.exhaust.start();
 }
 toggle(){this.enabled=!this.enabled;if(this.ctx)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.1);return this.enabled;}
 ping(freq=660,duration=.12,volume=.08,type='sine'){if(!this.ctx||!this.enabled)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+duration);o.onended=()=>{o.disconnect();g.disconnect();};}
 noiseBurst(duration=.15,frequency=1000,volume=.06,type='bandpass'){
  if(!this.ctx||!this.enabled)return;const c=this.ctx,source=c.createBufferSource(),f=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.white;f.type=type;f.frequency.setValueAtTime(frequency,c.currentTime);f.frequency.exponentialRampToValueAtTime(Math.max(70,frequency*.45),c.currentTime+duration);f.Q.value=.7;gain.gain.setValueAtTime(.001,c.currentTime);gain.gain.linearRampToValueAtTime(volume,c.currentTime+.009);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);source.connect(f);f.connect(gain);gain.connect(this.master);source.start(0,Math.random()*.3,duration);source.onended=()=>{source.disconnect();f.disconnect();gain.disconnect();};
 }
 splash(scale=1){this.noiseBurst(.65,1250,.18*scale,'lowpass');this.noiseBurst(.23,420,.16*scale);}
 cast(){this.noiseBurst(.22,2900,.045);}
 reel(){this.noiseBurst(.021,2100,.025,'highpass');}
 hullKnock(){this.noiseBurst(.16,180,.09);this.ping(68,.14,.018,'triangle');}
 gull(){if(!this.ctx||!this.enabled)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(950,c.currentTime);o.frequency.linearRampToValueAtTime(1370,c.currentTime+.12);o.frequency.exponentialRampToValueAtTime(640,c.currentTime+.62);g.gain.setValueAtTime(.001,c.currentTime);g.gain.linearRampToValueAtTime(.014,c.currentTime+.12);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.7);o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+.72);o.onended=()=>{o.disconnect();g.disconnect();};}
 update(t,engine,throttle,walking,{speed=0,wave=.3,underwater=false,strain=0,slipping=false,roll=0}={}){
  if(!this.ctx)return;const c=this.ctx,rpm=Math.abs(throttle);
  this.listenerFilter.frequency.setTargetAtTime(underwater?380:14000,c.currentTime,.12);
  this.surfGain.gain.setTargetAtTime(.16+Math.min(2,wave)*.05+speed*.025+Math.sin(t*.42)*.035,c.currentTime,.3);
  this.surfFilter.frequency.setTargetAtTime(850+speed*220+Math.sin(t*.25)*150,c.currentTime,.3);
  const pulse=28+rpm*53+Math.sin(t*28)*.65;this.engine.frequency.setTargetAtTime(pulse,c.currentTime,.08);this.exhaust.frequency.setTargetAtTime(pulse*2,c.currentTime,.08);
  this.engineFilter.frequency.setTargetAtTime(180+rpm*340,c.currentTime,.1);this.engineGain.gain.setTargetAtTime(engine?.024+rpm*.065:0,c.currentTime,.25);this.exhaustGain.gain.setTargetAtTime(engine?.014+rpm*.027:0,c.currentTime,.3);
  if(t-this.lastGull>34){this.lastGull=t+Math.random()*30;this.gull();}
  if(walking&&t-this.lastStep>.46){this.lastStep=t;this.noiseBurst(.1,220,.065);this.noiseBurst(.065,1800,.012);}
  if(Math.abs(roll)>.06&&t-this.lastCreak>4){this.lastCreak=t;this.noiseBurst(.22,330,.012);}
  if(slipping&&strain>.55&&t-this.lastSlip>.1){this.lastSlip=t;this.noiseBurst(.045,1900,.012+strain*.035);}
 }
}
