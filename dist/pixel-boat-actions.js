import {hasElectricReel} from './equipment.js?v=20260927-pixel-v26';
// Presentation policy for the bottom console. Model methods still validate
// actions themselves; this pure selector keeps unavailable controls offscreen.
export function boatActions(s,{panel='tackle',hasRod=true,hasChart=false,canLower=false,nearDock=false}={}){
 const fish=s.fishState||'idle',idle=fish==='idle',waiting=['sinking','waiting'].includes(fish),water=waiting||['bite','fight'].includes(fish),mounted=['port','starboard'].includes(s.rodMount);
 const ready=s.mode==='boat'&&s.rentalPaid&&s.launchStage==='afloat'&&!s.paused&&!s.docking&&s.inspection?.phase!=='checking',aboard=ready;
 const boatFree=aboard&&!s.snagged&&(idle||mounted&&waiting),helm=boatFree&&s.engine&&panel==='helm',tackle=aboard&&!helm&&(hasRod||fish==='landed');
 const pickUp=tackle&&mounted&&['idle','sinking','waiting','bite','fight'].includes(fish)&&Math.abs(s.throttle||0)<=.01&&Math.abs(s.speed||0)<=1.2;
 return{
  console:ready,helm,tackle,mounted,
  unmoor:false,dock:aboard&&idle&&nearDock&&Math.abs(s.speed||0)<.85,
  engine:boatFree,anchor:false,
  switchPanel:boatFree&&s.engine&&(mounted||helm),switchLabel:helm?'钓鱼':'操船',
  monitor:helm&&mounted,
  pose:tackle&&fish!=='landed',adjustPose:tackle&&!['casting','flight','landed'].includes(fish)&&(!s.engine||mounted),
  reelInstrument:tackle&&water,reel:tackle&&water&&!mounted,spool:tackle&&water,drag:tackle&&(fish==='fight'||Boolean(s.snagged)),
  lower:tackle&&idle&&canLower,cast:false,
  hook:tackle&&fish==='bite'&&!mounted,catch:tackle&&fish==='landed',retrieve:tackle&&waiting&&!mounted&&hasElectricReel(s.profile,s.packed),
  mount:tackle&&hasRod&&!mounted&&(idle||waiting),take:pickUp,
  assemble:ready&&idle,return:boatFree&&hasChart
 };
}
