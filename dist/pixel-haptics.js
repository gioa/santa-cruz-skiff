/** Short, rate-limited tactile cues from actual fishing state. No timers and no
 * claim that API availability proves a motor exists or a pulse was felt. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const KEY='santa-cruz-haptics';
export class PixelHaptics{
 constructor({navigator=globalThis.navigator,document=globalThis.document,storage,now=()=>performance.now()}={}){
  this.navigator=navigator;this.document=document;this.now=now;
  try{this.storage=storage??globalThis.localStorage;}catch{this.storage=null;}
  this.supported=typeof navigator?.vibrate==='function';this.enabled=true;
  try{this.enabled=this.storage?.getItem(KEY)!=='off';}catch{}
  this.phase='idle';this.lastAt=-Infinity;this.busyUntil=0;this.lastLoad=0;this.lastShake=0;this.active=false;this.accepted=0;
 }
 stop(){if(this.active){try{this.navigator?.vibrate?.(0);}catch{}}this.active=false;this.busyUntil=0;}
 toggle(){this.enabled=!this.enabled;try{this.storage?.setItem(KEY,this.enabled?'on':'off');}catch{}if(!this.enabled)this.stop();return this.enabled;}
 pulse(pattern,gap=250){
  const t=this.now();if(!this.enabled||!this.supported||this.document?.hidden||this.navigator?.userActivation?.hasBeenActive===false||t<this.busyUntil||t-this.lastAt<gap)return false;
  this.lastAt=t;try{if(this.navigator.vibrate(pattern)===false)return false;}catch{this.supported=false;return false;}
  this.busyUntil=t+(Array.isArray(pattern)?pattern.reduce((a,b)=>a+b,0):pattern);this.active=true;this.accepted++;return true;
 }
 update(s,{focused=true}={}){
  const phase=s.fishState||'idle',was=this.phase;this.phase=phase;
  const load=clamp(s.rodLoadN,0,150),shake=clamp(s.fishMotion?.headShake,0,1),increase=load-this.lastLoad,shakeEdge=this.lastShake<.65&&shake>=.65;this.lastLoad=load;this.lastShake=shake;
  if(!this.enabled||s.paused||this.document?.hidden||!focused||s.mode!=='boat'){this.stop();return;}
  if(phase==='bite'&&was!=='bite'){this.stop();this.pulse([35,45,55],0);return;}
  if(!['sinking','waiting','bite','fight'].includes(phase)){this.stop();return;}
  const payout=clamp(s.payoutRate,0,3),inHand=s.rodMount==='hand';
  if(phase==='fight'&&s.reelMode!=='free'&&payout>.12&&s.lineSlackMeters<.3){
   // Slipping drag: distinct ticks accelerate with real spool movement.
   this.pulse(Math.round(12+payout*5),Math.max(180,420-payout*90));
  }else if(phase==='fight'&&inHand&&s.lineSlackMeters<.3&&(shakeEdge||increase>2.5)){
   this.pulse(Math.round(7+clamp(load/3,0,12)),450);
  }else if(inHand&&s.reelMode==='free'&&payout>.12){
   // Quiet feed while lowering; no vibration for idle or bottom overrun.
   this.pulse(6,650);
  }
 }
 snapshot(){return{supported:this.supported,enabled:this.enabled,acceptedPulses:this.accepted};}
}
