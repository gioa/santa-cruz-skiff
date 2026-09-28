import {fishFightKind} from './pixel-fish-fight.js?v=20260927-pixel-v48';
import {hookSizeFit} from './pixel-hook-size.js?v=20260927-pixel-v48';

/** Hook-seat and retention approximation, in active real seconds.
 * EVERY force threshold, duration and hazard below is gameplay calibration,
 * not a measured species escape rate. Evidence and its limits are recorded in
 * docs/pixel-hooking-evidence.md. WDFW recommends slow, steady lingcod retrieval:
 * https://wdfw.medium.com/key-in-on-structure-around-puget-sound-for-hard-fighting-lingcod-b7d6074c28a2
 * CDFW documents white seabass's soft, easily torn mouth, without a force limit:
 * https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=34195
 * Circle hooks seat through sustained pressure, rather than a timed sharp set:
 * https://myfwc.com/fishing/basics/
 * Bite abandonment and losing an already seated hook are separate hazards.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const number=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const bounded=(n,fallback,a,b)=>clamp(number(n,fallback),a,b);
const kinds=new Set(['baitfish','rockfish','mackerel','lingcod','halibut','salmon','seabass','bonito','croaker','sanddab']);
const settings={
 baitfish:{hold:4,holdScale:2,engage:.25,bite:.025,slack:.004,overload:.045,shake:.25},
 rockfish:{hold:25,holdScale:7,engage:.43,bite:.008,slack:.002,overload:.025,shake:.25},
 mackerel:{hold:19,holdScale:6,engage:.46,bite:.02,slack:.0035,overload:.03,shake:.45},
 lingcod:{hold:25,holdScale:7,engage:1.08,bite:.018,slack:.011,overload:.045,shake:.65},
 halibut:{hold:24,holdScale:6,engage:1.17,bite:.03,slack:.014,overload:.05,shake:.8},
 salmon:{hold:26,holdScale:6.5,engage:1.06,bite:.045,slack:.022,overload:.055,shake:1.5},
 seabass:{hold:12,holdScale:4,engage:1.21,bite:.025,slack:.017,overload:.09,shake:1},
 bonito:{hold:25,holdScale:7,engage:.94,bite:.05,slack:.024,overload:.06,shake:1.6},
 croaker:{hold:18,holdScale:5,engage:.45,bite:.012,slack:.0025,overload:.03,shake:.3},
 sanddab:{hold:16,holdScale:5,engage:.42,bite:.009,slack:.002,overload:.025,shake:.2},
};

export function hookProfile(fish={},rig={}){
 const kind=fishFightKind(fish||{}),p=settings[kind],mass=bounded(fish?.kg,.6,.05,80);
 const circle=rig?.circleHook===true||rig?.hookStyle==='circle'||rig?.hookType==='circle';
 const easy=kind==='baitfish'||kind==='rockfish'&&mass<=1.5||kind==='mackerel'&&mass<=.9||['croaker','sanddab'].includes(kind)&&mass<=.7;
 const growth=kind==='rockfish'?clamp((mass-1.5)/6,0,1):kind==='mackerel'?clamp((mass-.9)/3,0,1):0;
 const sizeRisk=1+clamp(Math.log1p(mass)/12,0,.25),stableSeat=circle?.72:1,fit=hookSizeFit(fish,rig);
 return{kind,easy,hookSize:fit.hookSize,mouthFit:fit.mouthFit,purchase:fit.purchase,seatChance:fit.seatChance,wireStrengthN:fit.wireStrengthN,
  holdLoadN:(p.hold+p.holdScale*Math.sqrt(mass))*(circle?1.05:1)*Math.pow(fit.purchase,.65),
  engageSeconds:clamp(p.engage+growth*.65+(circle?0:.2)+(1-fit.mouthFit)*.65+(1-fit.purchase)*.5,.4,2.8),
  biteLossRate:p.bite*(1+growth*.65),
  slackLossRate:(p.slack+growth*.012)*sizeRisk*stableSeat/Math.sqrt(fit.purchase),
  overloadLossRate:(p.overload+growth*.015)*sizeRisk*stableSeat/Math.sqrt(fit.purchase),
 };
}

/** One roll per hooked fish, not a fresh random decision on every frame.
 * Poor initial purchase increases sensitivity to mistakes but never adds a
 * baseline chance of losing a fish under steady, moderate line pressure.
 */
export function createHookHold(fish,rig={},roll=.5,quality=1){
 const p=hookProfile(fish,rig),seat=bounded(quality,1,.25,1);
 return{profile:{...p,holdLoadN:p.holdLoadN*(.78+.22*seat),slackLossRate:p.slackLossRate/seat,overloadLossRate:p.overloadLossRate/seat},
  exposure:0,threshold:-Math.log(bounded(roll,.5,.00001,.99999)),slackSeconds:0,overloadSeconds:0,wireDamage:0,wireOverloadSeconds:0};
}

/** Resolve size-dependent purchase once per bite. Keeping pressure or pressing
 * the hook control again cannot reroll an unsuitable hook into a success. */
export function createBiteHold(fish,rig={}, {holdRoll=.5,seatRoll=.5,wireDamage=0}={}){
 const hold=createHookHold(fish,rig,holdRoll),roll=bounded(seatRoll,.5,0,1);
 return{...hold,wireDamage:bounded(wireDamage,0,0,1),seatRoll:roll,canSeat:hold.profile.seatChance>0&&roll<hold.profile.seatChance};
}

/** Exact elapsed time beyond a grace window for a piecewise-constant input. */
const beyond=(before,after,grace)=>Math.max(0,after-grace)-Math.max(0,before-grace);

export function stepHookHold(hold,{dt=0,rodLoadN=0,lineSlackMeters=0,headShake=0}={}){
 const original=hold||createHookHold(),kind=kinds.has(original.profile?.kind)?original.profile.kind:'rockfish';
 const fallback=hookProfile({fightKind:kind}),raw=original.profile||{},profile={kind,easy:typeof raw.easy==='boolean'?raw.easy:fallback.easy,hookSize:typeof raw.hookSize==='string'?raw.hookSize:null};
 for(const key of['holdLoadN','engageSeconds','biteLossRate','slackLossRate','overloadLossRate']){
  const range=key==='holdLoadN'?[1,500]:key==='engageSeconds'?[.1,5]:[0,2];
  profile[key]=bounded(raw[key],fallback[key],...range);
 }
 for(const key of['mouthFit','purchase','seatChance'])profile[key]=bounded(raw[key],fallback[key],0,1);
 profile.wireStrengthN=bounded(raw.wireStrengthN,fallback.wireStrengthN,1,500);
 dt=bounded(dt,0,0,5);const slack=bounded(lineSlackMeters,0,0,120),load=bounded(rodLoadN,0,0,1000),shake=bounded(headShake,0,0,1);
 const beforeSlack=bounded(original.slackSeconds,0,0,86400),beforeOverload=bounded(original.overloadSeconds,0,0,86400);
 const slackSeconds=slack>.6?Math.min(86400,beforeSlack+dt):0,overloadSeconds=load>profile.holdLoadN?Math.min(86400,beforeOverload+dt):0;
 // Crossing the grace interval within one frame charges only the portion after
 // the interval. Tightening the line resets the continuous slack duration;
 // accumulated damage/exposure remains, so repeated mistakes still matter.
 const slackTime=slack>.6?beyond(beforeSlack,slackSeconds,1.5):0;
 const overloadTime=load>profile.holdLoadN?beyond(beforeOverload,overloadSeconds,.25):0;
 const shakeFactor=1+settings[kind].shake*shake;
 const slackExposure=profile.slackLossRate*clamp((slack-.6)/1.4,0,3)*shakeFactor*slackTime;
 const overloadExposure=profile.overloadLossRate*clamp(load/profile.holdLoadN-1,0,6)*(1+.5*shake)*overloadTime;
 const exposure=Math.min(1e6,bounded(original.exposure,0,0,1e6)+slackExposure+overloadExposure),threshold=bounded(original.threshold,Math.log(2),.000001,1000);
 const beforeWire=bounded(original.wireOverloadSeconds,0,0,86400),wireOverloadSeconds=load>profile.wireStrengthN?Math.min(86400,beforeWire+dt):0;
 const wireTime=load>profile.wireStrengthN?beyond(beforeWire,wireOverloadSeconds,.18):0;
 // Wire only deforms under actual transmitted load. Short transients have a
 // grace window; easing the drag stops damage but cannot unbend a damaged hook.
 const wireDamage=Math.min(1,bounded(original.wireDamage,0,0,1)+Math.pow(clamp(load/profile.wireStrengthN-1,0,10),2)*wireTime*.8);
 const lostReason=wireDamage>=1?'straightened':exposure>=threshold?'hook':null;
 return{hold:{profile,exposure,threshold,slackSeconds,overloadSeconds,wireDamage,wireOverloadSeconds},lost:Boolean(lostReason),lostReason};
}
