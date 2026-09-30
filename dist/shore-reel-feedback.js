const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>Number.isFinite(v)?v:0;
export function shoreControlWords({reelSpeed=.6,drag=.5,rodLift=.35,rodSweep=0}={}){
 return{speed:reelSpeed<.4?'慢收':reelSpeed>.8?'快收':'匀速',drag:drag<.3?'松':drag>.75?'紧':'适中',rod:`${rodLift<.3?'放低竿尖':rodLift>.7?'抬高竿尖':'平持鱼竿'} · ${rodSweep<-.2?'向左持竿':rodSweep>.2?'向右持竿':'居中'}`};
}
// A fixed-spool spinning reel: the handle turns the bail during winding;
// the spool itself rotates only when the loaded drag pays line out.
// Ratios are authored gear dimensions, not measured commercial specifications.
export function stepShoreReelVisual(previous={},feedback={},dt=0){
 dt=clamp(finite(dt),0,.1);
 const handleRate=Math.max(0,finite(feedback.handleRate)),slipping=Boolean(feedback.dragSlip)&&feedback.linePayoutRate>0;
 const payout=slipping?Math.max(0,finite(feedback.linePayoutRate)):0;
 const turn=(angle,rate)=>(finite(angle)+rate*dt*360)%360;
 return{handleAngle:turn(previous.handleAngle,handleRate),bailAngle:turn(previous.bailAngle,handleRate*(.7/.16)),spoolAngle:turn(previous.spoolAngle,-payout/.16),
  winding:handleRate>.015,slipping,lineMoving:Math.max(finite(feedback.linePickupRate),payout)>.015,
  clickRate:slipping?clamp(payout*14,1,12):0};
}
