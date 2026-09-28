/** Fish-driven elastic tip response. Frequencies/compliance are game tuning,
 * not measured species force or blank specifications. Action and power are
 * separate: action controls where the blank flexes, power its compliance. */
import {fishFightKind,FISH_FIGHT_PROFILES} from './pixel-fish-fight.js?v=20260927-pixel-v38';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,f=0)=>Number.isFinite(v)?v:f;
export const ROD_ACTIONS=Object.freeze({
 rod:{action:'moderate-fast',power:1,sensitivity:1,flex:3,hz:4.2,damping:.58},
 rod_light:{action:'fast',power:.72,sensitivity:1.3,flex:4.4,hz:5.4,damping:.47},
 rod_boat:{action:'moderate',power:1.4,sensitivity:.88,flex:2.2,hz:3.3,damping:.76},
 rod_electric:{action:'moderate-fast',power:1.15,sensitivity:1,flex:3,hz:3.7,damping:.68},
});
export function rodAction(s={}){return ROD_ACTIONS[s.profile?.loadout?.rod||s.activeRod]||ROD_ACTIONS.rod;}
export function fishTipSignal(s={},time=finite(s.time)){
 const fish=s.fishState==='bite'?s.biteFish:s.fishState==='fight'?s.fish:null;
 if(!fish)return{force:0,frequency:0,side:0};
 const p=FISH_FIGHT_PROFILES[fishFightKind(fish)],mass=clamp(finite(fish.kg,.6),.015,80),frequency=p.shake*clamp(Math.pow(mass,-.13),.58,1.6);
 const phase=time*frequency*Math.PI*2+finite(fish.length)*.037;
 const burst=.22+.78*Math.max(0,Math.sin(time*(s.fishState==='bite'?3.1:1.4)+.7))**2;
 const fatigue=s.fishState==='bite'?1:.2+.8*Math.sqrt(clamp(finite(s.fishFight?.energy,1),0,1));
 const force=Math.min(8,.32+Math.pow(mass,.64)*p.burst*.13)*burst*fatigue;
 return{force:force*(Math.sin(phase)+.28*Math.sin(phase*1.91)),frequency,side:Math.sin(phase*.71)*force*.38};
}
export function stepRodTip(s,dt){
 if(s.paused||!Number.isFinite(dt)||dt<=0)return s.rodTipMotion||{x:0,y:0,vx:0,vy:0};
 if(!['bite','fight'].includes(s.fishState))return{x:0,y:0,vx:0,vy:0};
 const rod=rodAction(s),old=s.rodTipMotion||{};let x=finite(old.x),y=finite(old.y),vx=finite(old.vx),vy=finite(old.vy);
 const duration=Math.min(.25,dt),n=Math.ceil(duration*240),h=duration/n,omega=rod.hz*Math.PI*2;
 // Slack and an unloaded/free spool isolate the blank from the fish.
 const taut=Math.exp(-Math.max(0,finite(s.lineSlackMeters))*5)*clamp(finite(s.rodLoadN)/.7,0,1)*(s.reelMode==='free'?.18:1);
 const line=s.profile?.loadout?.line==='line_braid'?1.12:.9;
 for(let i=0;i<n;i++){
  const signal=fishTipSignal(s,finite(s.time)-duration+(i+1)*h),gain=taut*rod.sensitivity/rod.power*line;
  const tx=clamp(signal.side*gain,-5,5),ty=clamp(signal.force*gain,-8,8);
  vx+=(omega*omega*(tx-x)-2*rod.damping*omega*vx)*h;
  vy+=(omega*omega*(ty-y)-2*rod.damping*omega*vy)*h;x+=vx*h;y+=vy*h;
 }
 return{x:clamp(x,-6,6),y:clamp(y,-10,10),vx,vy};
}
/** Displacement is normalised to displayed rod length; grip stays fixed. */
export function rodFlexPoint(s,t,length){
 const shape=Math.pow(clamp(t,0,1),rodAction(s).flex),motion=['bite','fight'].includes(s.fishState)?s.rodTipMotion:null;
 return{shape,x:finite(motion?.x)*length*.008*shape,y:finite(motion?.y)*length*.009*shape};
}
