// Presentation only: the simulation owns force, line travel and fish effort.
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function reelMotion(state={}){
 const active=['sinking','waiting','bite','fight'].includes(state.fishState)&&!state.paused;
 const payout=active?Math.max(0,finite(state.payoutRate)):0,retrieve=active?Math.max(0,finite(state.retrieveRate)):0;
 const net=retrieve-payout;
 // A 27 mm working spool radius; the crank remains independently driven by
 // actual hand turns, including when a running fish takes line against it.
 return{payout,retrieve,net,spoolRadiansPerSecond:net/.027};
}

export function fishingFeedback(state={}){
 const deployed=['sinking','waiting','bite','fight'].includes(state.fishState);
 const bend=deployed?clamp(finite(state.rodBend),0,1):0,slack=Math.max(0,finite(state.lineSlackMeters));
 const {payout,retrieve}=reelMotion(state);
 const bendLabel=bend>.82?'竿身深弯':bend>.4?'鱼竿受力':bend>.1?'竿尖轻弯':'竿尖舒展';
 const drag=clamp(finite(state.drag,.48),.2,.85),dragLabel=drag<.38?'偏松':drag>.66?'偏紧':'适中';
 let cue='';
 if(state.paused)cue='';
 else if(state.fishState==='bite')cue='咬钩了';
 else if(state.fishState==='landed')cue='鱼在船边';
 else if(['sinking','waiting','fight'].includes(state.fishState)){
  if(slack>.45)cue='鱼线松了';
  else if(state.snagged)cue=payout>.07&&state.reelMode!=='free'?'泄力出线':'钓组卡住了';
  else if(payout>.07)cue=state.reelMode==='free'?'线杯放线':state.fishState==='fight'?'鱼在出线':'泄力出线';
  else if(retrieve>.04)cue='正在收线';
  else if(bend>.4)cue=bendLabel;
  else cue='留意竿尖';
 }
 return{cue,bendLabel,dragLabel};
}
