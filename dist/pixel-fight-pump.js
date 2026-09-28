// Deliberate pump-and-recover strokes. Forces remain in the line solver;
// this only supplies targets and requested winding, never fish displacement.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,f=0)=>Number.isFinite(v)?v:f;
export function fightPumpControl(s,phase,{strength=1,manualCrank=0}={}){
 if(s.rodMount!=='hand'||!['bite','fight'].includes(s.fishState)||s.paused)return{fightPumpPhase:'idle',rodTargetElevation:null,rodTargetAzimuth:null};
 const active=['lift','recover'].includes(phase),low=24,high=66;
 if(!active)return{fightPumpPhase:'idle',rodTargetElevation:null,rodTargetAzimuth:null};
 const drag=(3+clamp(finite(s.drag,.48),.2,.85)*22)*Math.max(.4,strength),overload=clamp((finite(s.fishPullN)-drag)/Math.max(3,drag),0,1);
 const recovering=phase==='recover'&&(finite(s.rodElevation,45)>low+.3||finite(s.lineSlackMeters)>.08);
 if(phase==='recover'&&!recovering)return{fightPumpPhase:'idle',rodTargetElevation:low,rodTargetAzimuth:null,pumping:false,crankRate:manualCrank,reeling:manualCrank>0};
 return{fightPumpPhase:phase,rodTargetElevation:phase==='lift'?high-overload*(high-low):low,rodTargetAzimuth:null,pumping:false,crankRate:recovering?1.2:0,reeling:recovering,reelMode:'brake'};
}
