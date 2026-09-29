/** Six independent hooks share one real paid-out line. All hazards, dimensions
 * and strengths here are simulation tuning, not observed catch percentages.
 * The renderer supplies visible bait schools; birds/dolphins never create fish.
 */
import {SABIKI_FISH,SABIKI_HOOK_SPACING,SABIKI_RIG} from './pixel-sabiki-data.js';
import {stepFishingLine,fishingCurrent} from './pixel-fishing-physics.js';
import {stepBottomSnag,stepSnagAbrasion} from './pixel-snag.js';
import {cargoWeight,settleFish} from './equipment.js';
import {damageSupplies} from './pixel-consumables.js';
import {identifyRegulatedSpecies} from './fishing-regulations.js';
import {toGPS} from './pixel-geography.js';
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const exponential=rng=>-Math.log(clamp(1-rng(),1e-8,1-1e-8));
const emptyHook=(index,rng)=>({index,exposure:0,threshold:exponential(rng),pending:null,fish:null,engagement:0,age:0,lossExposure:0,lossThreshold:exponential(rng)});
export function createSabikiSet(rng=Math.random){return{hooks:Array.from({length:6},(_,i)=>emptyHook(i,rng)),landed:[],elapsed:0};}
export function attachedSabikiFish(state){return(state.sabiki?.hooks||[]).filter(h=>h.fish).map(h=>h.fish);}
export function sabikiSchoolAt(schools,point,depth,hookIndex=0){
 const hookDepth=Math.max(0,finite(depth)-hookIndex*SABIKI_HOOK_SPACING);let best=null,strength=0;
 if(hookDepth<=.15||!Number.isFinite(point?.x)||!Number.isFinite(point?.z))return{strength,school:best,depth:hookDepth};
 for(const school of schools||[]){
  if(school?.type!=='bait'||!Number.isFinite(school.x)||!Number.isFinite(school.z))continue;
  if(Number.isFinite(school.duration)&&school.age>=school.duration)continue;
  const radius=clamp(finite(school.radius,8),1,18),distance=Math.hypot(point.x-school.x,point.z-school.z);
  if(distance>radius*2)continue;
  const centre=finite(school.depth,3.4+Math.sin(finite(school.age)*.07+finite(school.id))*.7),thickness=clamp(finite(school.thickness,1.3),.3,4);
  const match=Math.exp(-.5*(distance/radius)**2)*Math.exp(-.5*((hookDepth-centre)/thickness)**2);
  if(match>strength){best=school;strength=match;}
 }
 return{strength,school:best,depth:hookDepth};
}
export function sabikiHookRate(schools,s,hookIndex){
 const match=sabikiSchoolAt(schools,s.bobber,s.lureDepth,hookIndex);
 if(match.depth<=.15)return{...match,rate:0};
 const speed=Math.abs(finite(s.lureVerticalSpeedMps)),presentation=clamp((s.pumping?1.3:1)/(1+Math.max(0,speed-.3)*2),.18,1.3);
 return{...match,rate:(.00003+.11*match.strength)*presentation};
}
function baitFish(school,rng){
 const template=SABIKI_FISH[school?.species]||SABIKI_FISH['anchovy-school'];
 const length=Number((template.min+Math.pow(rng(),1.4)*(template.max-template.min)).toFixed(1));
 return{...template,length,kg:Number((template.weight*(length/template.referenceLength)**3).toFixed(3))};
}
function capture(sim,fish,index){
 const s=sim.state,p=s.bobber||{x:s.boatX,z:s.boatZ},aboard=s.catches.filter(f=>f.kept&&!f.settled&&!f.confiscated);
 return{...fish,hookIndex:index,caughtAt:sim.captureTimestamp(),caughtGPS:toGPS(p.x,p.z),hookCount:6,lineCount:1,
  rig:{id:'sabiki6',rod:s.profile.loadout.rod,hookCount:6,hookSize:SABIKI_RIG.hookSize,hookStyle:'j',lineCount:1,rodCount:1,weightGrams:28,wireLeader:false,hookGapInches:SABIKI_RIG.hookGapMm/25.4,bait:false,circleHook:false,trolling:false},
  hasDescendingDevice:sim.hasGear('descending_device'),landingNetDiameterInches:sim.hasGear('net')?20:false,
  groundfishAboardAtCapture:aboard.some(f=>{const sp=identifyRegulatedSpecies(f);return sp?.groundfish&&!sp.groundfishGearExempt;}),
  salmonAboardAtCapture:aboard.some(f=>identifyRegulatedSpecies(f)?.id==='chinook_salmon')};
}
export function stepSabikiFishing(sim,dt,env){
 const s=sim.state;if(s.rig!=='sabiki6')return false;
 const set=s.sabiki??=createSabikiSet(sim.rng),eq=sim.stats;set.elapsed+=dt;
 const before=attachedSabikiFish(s),previousDepth=s.lureDepth;
 const pull=before.reduce((sum,f)=>sum+(.035+f.kg*4)*(1+.16*Math.sin(set.elapsed*9+f.hookIndex*2)),0);
 const motion=before.length?{headShake:.12,lateralMps:Math.sin(set.elapsed*6)*.018*before.length,runSpeedMps:0,diveMps:0}:null;
 Object.assign(s,stepFishingLine(s,{dt,environment:env,current:fishingCurrent(sim.conditions),velocity:sim.vessel,retrieve:eq.retrieve,strength:eq.strength,smooth:eq.smooth,sensitivity:eq.sensitivity,fishPullN:before.length?pull:null,fishMotion:motion}));
 s.lureVerticalSpeedMps=(previousDepth-s.lureDepth)/dt;s.fishPullN=pull;s.fishMotion=motion;
 s.lineBreakingN=8*4.44822*.75;s.tension=clamp(s.rodLoadN/s.lineBreakingN*100,0,150);
 if(s.snagged){
  const wear=stepSnagAbrasion(s,{dt,lineBreakingN:s.lineBreakingN,driftSpeedMps:env.driftSpeedMps,waveHeight:env.waveHeight});Object.assign(s,wear);
  s.breakMeter=s.rodLoadN>wear.effectiveBreakingN?s.breakMeter+dt:Math.max(0,s.breakMeter-dt*2);
  if(s.breakMeter>1.2)sim.escape('snag-break');return true;
 }
 if(s.rodLoadN>s.lineBreakingN){s.breakMeter+=dt;if(s.breakMeter>1.2){sim.escape('break');return true;}}else s.breakMeter=Math.max(0,s.breakMeter-dt*2);
 if(!before.length){
  const contact=stepBottomSnag(s,env,dt);Object.assign(s,contact);
  if(s.snagged){s.snagPoint={...s.bobber};s.snagStretchMeters=0;s.snagAbrasion=0;s.breakMeter=0;s.fishState='waiting';sim.stopPropulsion();return true;}
 }
 let newlyHooked=0;
 for(const h of set.hooks){
  if(h.fish){
   // Loose line can let a small fish shake free, but steady winding has no
   // forced fight or substantial random loss. Each hook loses only its fish.
   const load=before.length?s.rodLoadN/before.length:0;
   h.lossExposure+=dt*(s.lineSlackMeters>1?.004:.00015)+dt*Math.max(0,load-SABIKI_RIG.hookWireStrengthN)*.04;
   if(h.lossExposure>h.lossThreshold){Object.assign(h,emptyHook(h.index,sim.rng));s.misses++;}continue;
  }
  if(h.pending){
   h.age+=dt;
   if(s.reelMode==='brake'&&s.lineSlackMeters<.5&&s.rodLoadN>.03)h.engagement+=dt;
   else h.engagement=Math.max(0,h.engagement-dt);
   if(h.engagement>=.3){h.fish=capture(sim,h.pending,h.index);h.pending=null;newlyHooked++;continue;}
   if(h.age>4.5){Object.assign(h,emptyHook(h.index,sim.rng));s.misses++;}continue;
  }
  const encounter=sabikiHookRate(s.baitSchools,s,h.index);h.exposure+=encounter.rate*dt;
  if(h.exposure>=h.threshold){h.pending=baitFish(encounter.school,sim.rng);h.age=0;h.engagement=0;}
 }
 const fish=attachedSabikiFish(s),pending=set.hooks.find(h=>h.pending);
 s.fish=fish[0]||null;s.biteFish=pending?.pending||null;s.biteHold=null;
 if(fish.length){
  if(!before.length){s.fightTime=0;sim.stopPropulsion();sim.notify('竿尖连续点动，稳稳收线。','hook');}
  s.fishState='fight';s.fightTime+=dt;s.stamina=100;
 }else if(pending){if(s.fishState!=='bite')sim.notify('竿尖轻点，锁杯稳收。','bite');s.fishState='bite';}
 else s.fishState=Math.abs(s.lureDepth-s.rigPresentation.targetDepth)<.25?'waiting':'sinking';
 if(newlyHooked)damageSupplies(s.profile,s.profile.loadout.rod,'bite');
 // Every occupied hook returns on this line. Empty hooks do not fabricate a
 // six-fish batch; additional bites stop once the tackle leaves the water.
 if(s.reeling&&s.paidLineMeters<=.35&&s.lureDepth<.2){
  if(!fish.length){sim.retrieve();return true;}
  set.landed=fish.map(f=>({...f}));s.fishState='landed';s.reeling=false;s.pumping=false;s.crankRate=0;s.payoutRate=0;s.retrieveRate=0;s.fishMotion=null;
  sim.notify(`收起 ${fish.length} 条饵鱼。`,'catch');
 }
 return true;
}
export function resolveSabikiCatch(sim,keep){
 const s=sim.state,batch=s.sabiki?.landed||[];if(s.fishState!=='landed'||!batch.length)return null;
 const weight=batch.reduce((n,f)=>n+f.kg,0);
 if(keep&&cargoWeight(s.catches)+weight>sim.stats.capacity)return sim.notify('冰箱装不下这一串鱼，可以记录并放流。',null,false);
 let reward=0;
 for(const fish of batch){const f={...fish,catchId:`pixel-${Date.now()}-${s.profile.nextCatch++}`,kept:keep,time:s.clock,fightSeconds:Math.round(s.fightTime)};s.catches.push(f);if(!keep)reward+=settleFish(s.profile,f);}
 const payment=keep?0:sim.payFineDebt();damageSupplies(s.profile,s.profile.loadout.rod,'catch');
 const count=batch.length;s.fishState='idle';sim.retrieve();sim.journal(`${keep?'留鱼':'放流'} ${count} 条 Sabiki 饵鱼。`);
 return{...sim.notify(keep?`${count} 条鱼获已装箱，返航后去小屋兑换。`:`已记录并放流 ${count} 条，入账 ${Math.max(0,reward-payment)} 潮汐点。`),count};
}
