// Authored gameplay hazards, not measured Santa Cruz snag percentages.
// Integrating exposure against one exponential threshold makes risk independent
// of frame rate. Bottom contact is recoverable; hooking rock is a separate state.
import {rigSnagRisk} from './fishing-rigs.js?v=20260928-pixel-v67';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
export const BOTTOM_SNAG_GRACE_SECONDS=4;
export function stepBottomSnag(s,environment={},dt=0){
 dt=clamp(finite(dt),0,.25);
 const contact=Boolean(s.rigPresentation?.bottomContact),slack=Math.max(0,finite(s.lineSlackMeters));
 const unattended=contact&&(slack>.06||s.reelMode==='free')&&finite(s.retrieveRate)<.04;
 const previous=Math.max(0,finite(s.bottomSlackSeconds)),seconds=unattended?previous+dt:0;
 const terrain={reef:1,mixed:.48,artificial:.85,kelp:.38}[environment.habitat]||0;
 const maturity=t=>clamp((t-BOTTOM_SNAG_GRACE_SECONDS)/8,0,1);
 // Integrate the linear ramp analytically, including the grace boundary.
 const primitive=t=>{const x=Math.max(0,t-BOTTOM_SNAG_GRACE_SECONDS);return x<=8?x*x/16:x-4;};
 const eligible=unattended?primitive(seconds)-primitive(previous):0;
 const sea=1+clamp(finite(environment.waveHeight),0,5)*.65+clamp(finite(environment.windKnots),0,40)*.025;
 const loose=1+clamp(slack,0,3)*.7;
 const base=terrain*rigSnagRisk({...environment,habitat:'reef',depth:s.lureDepth,retrieveSpeedMps:0});
 const rate=Math.min(.16,base*sea*loose*2.4),exposure=finite(s.snagExposure)+rate*eligible;
 return{bottomSlackSeconds:seconds,snagExposure:exposure,snagRiskPerSecond:rate*maturity(seconds),snagged:Boolean(s.snagged)||exposure>finite(s.snagThreshold,Infinity)};
}

export function stepSnagAbrasion(s,{dt=0,lineBreakingN=50,driftSpeedMps=0,waveHeight=0}={}){
 const previous=clamp(finite(s.snagAbrasion),0,.92),load=Math.max(0,finite(s.rodLoadN));
 const taut=finite(s.lineSlackMeters)<.08,working=finite(s.crankRate)>.02||driftSpeedMps>.08;
 // Backing off halts scraping. The selected drag still caps force; repeated
 // loaded movement across rock lowers the remaining knot/leader strength.
 const abrasion=s.snagged&&taut&&working&&load>3
  ?clamp(finite(dt),0,.25)*(.006+.034*clamp(load/Math.max(1,lineBreakingN),0,1)+.022*clamp(finite(s.crankRate)/2,0,1))*(1+clamp(waveHeight,0,5)*.18):0;
 const snagAbrasion=clamp(previous+abrasion,0,.92);
 return{snagAbrasion,effectiveBreakingN:Math.max(1,lineBreakingN*(1-snagAbrasion))};
}
