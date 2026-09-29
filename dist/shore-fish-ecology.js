/** Evidence-informed shore ecology; see docs/shore-ecology-evidence.md.
 * Numeric affinities, seasons and encounter rates are authored game tuning,
 * not measured catch probabilities or fish-presence observations. Rates use
 * active seconds and MUST also be used for conditional species selection. */
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const bell=(value,centre,width)=>Math.exp(-.5*((value-centre)/width)**2);
const freeze=value=>Object.freeze(value);

export const SHORE_ECOLOGY=freeze([
 freeze({id:'surfperch',name:'银双齿海鲫',nameEn:'Barred surfperch',baseRatePerSecond:.0038,
  bait:freeze({sandcrab:1,squid:.2,anchovy:.075}),rig:freeze({carolina:1,fishfinder:.22,float:.2}),
  monthly:freeze([1.15,1.15,1.08,1,.95,.9,.87,.88,.92,1,1.08,1.15]),
  depth:freeze([.5,3.2,1.7]),bottomExponent:.75}),
 freeze({id:'striped_bass',name:'条纹鲈',nameEn:'Striped bass',baseRatePerSecond:.0024,
  bait:freeze({sandcrab:.13,squid:.2,anchovy:1}),rig:freeze({carolina:.32,fishfinder:1,float:.05}),
  monthly:freeze([.08,.09,.16,.3,.56,.85,1,1,.92,.58,.24,.11]),
  depth:freeze([.9,6,3.5]),bottomExponent:.4}),
 freeze({id:'halibut',name:'加州比目鱼',nameEn:'California halibut',baseRatePerSecond:.0018,
  // The inventory supplies cut anchovy and squid strips, not live baitfish.
  bait:freeze({sandcrab:.025,squid:.18,anchovy:.72}),rig:freeze({carolina:.3,fishfinder:1,float:.025}),
  monthly:freeze([.18,.2,.32,.5,.7,.9,1,1,.95,.7,.38,.22]),
  depth:freeze([1.8,12,5]),bottomExponent:.95}),
 freeze({id:'white_croaker',name:'白石首鱼',nameEn:'White croaker',baseRatePerSecond:.0022,
  bait:freeze({sandcrab:.1,squid:1,anchovy:.85}),rig:freeze({carolina:1,fishfinder:.2,float:.1}),
  monthly:freeze([1,1,1,1,1,1,1,1,1,1,1,1]),
  depth:freeze([1.2,30,10]),bottomExponent:.85}),
 freeze({id:'jacksmelt',name:'加州似银汉鱼',nameEn:'Jacksmelt',baseRatePerSecond:.0026,
  bait:freeze({sandcrab:.4,squid:1,anchovy:.7}),rig:freeze({carolina:.3,fishfinder:.035,float:1}),
  monthly:freeze([.5,.55,.72,.9,1,1,1,.95,.75,.65,.55,.5]),
  depth:freeze([.6,20,9]),bottomExponent:0}),
]);

function depthAffinity(depth,[low,high,deepWidth]){
 const outside=Math.max(low-depth,0,depth-high);
 return bell(outside,0,depth<low?Math.max(.3,low*.45):deepWidth);
}

function environment(sample,presentation){
 const offshore=finite(sample.offshore,-1),depth=finite(sample.depth,-1);
 const troughDistance=Math.max(4,finite(sample.troughDistance,24));
 const barDistance=Math.max(troughDistance+4,finite(sample.barDistance,52));
 const trough=clamp(finite(sample.troughStrength,sample.habitat==='trough'?1:0));
 const channel=clamp(finite(sample.channelStrength,sample.habitat==='channel'?1:0));
 const bar=clamp(finite(sample.barStrength,sample.habitat==='bar'?1:0));
 const breaking=clamp(finite(sample.breakStrength));
 const whitewater=clamp(finite(sample.whitewater,breaking));
 const waveHeight=Math.max(0,finite(sample.waveHeight,1));
 const orbital=Math.max(0,finite(sample.orbitalVelocity,waveHeight*.3));
 const turbidity=clamp(finite(sample.turbidity,whitewater*.7));
 const bottomContact=clamp(finite(presentation.bottomContact,1));
 const stability=clamp(finite(presentation.stability,1));
 const baitDepth=clamp(finite(presentation.depth,depth),0,Math.max(0,depth));
 // Legacy callers without hook depth describe settled bottom rigs. Actual
 // simulation callers supply depth, allowing upper-water bites while sinking.
 const submerged=Number.isFinite(presentation.depth)?clamp(baitDepth/.2):bottomContact;
 // Habitat labels classify sand morphology, not an observed school of fish.
 const sand=['swash','trough','bar','channel','surf','offshore','sand'].includes(sample.habitat);
 return{offshore,depth,troughDistance,barDistance,trough,channel,bar,breaking,whitewater,
  waveHeight,orbital,turbidity,bottomContact,stability,baitDepth,submerged,sand,
  current:Math.hypot(finite(sample.currentX),finite(sample.currentY))};
}

function spaceAffinity(id,e){
 if(id==='surfperch')return{
  distance:bell(e.offshore,e.troughDistance,Math.max(10,e.troughDistance*.65)),
  habitat:e.sand?clamp(.22+.78*e.trough+.16*e.channel):0,
 };
 if(id==='striped_bass')return{
  distance:Math.max(bell(e.offshore,e.barDistance+8,Math.max(24,e.barDistance*.65)),
   .65*bell(e.offshore,e.troughDistance+5,20)),
  habitat:e.sand?clamp(.18+.82*e.channel+.42*e.trough):0,
 };
 if(id==='white_croaker')return{
  distance:bell(e.offshore,e.barDistance+4,Math.max(28,e.barDistance*.85)),
  habitat:e.sand?clamp(.4+.4*e.trough+.3*e.channel)*(1-.6*e.bar):0,
 };
 if(id==='jacksmelt')return{
  distance:Math.max(bell(e.offshore,e.troughDistance+6,Math.max(20,e.troughDistance)),
   .8*bell(e.offshore,e.barDistance+8,Math.max(28,e.barDistance*.8))),
  habitat:e.sand?clamp(.6+.22*e.channel+.18*e.trough):0,
 };
 return{
  distance:bell(e.offshore,e.barDistance+22,Math.max(24,e.barDistance*.7)),
  habitat:e.sand?clamp(.38+.54*e.channel+.22*e.trough)*(1-.72*e.bar):0,
 };
}

function waveAffinity(id,e){
 // Moderate broken water can expose forage; severe turbulence hurts feeding
 // and is also transmitted through the physical bottom-contact simulation.
 // No wave height is a hard biological exclusion threshold.
 if(id==='surfperch')return (.72+.28*bell(e.whitewater,.3,.4))
  *Math.exp(-.45*Math.max(0,e.orbital-1)**2-.55*e.bar*e.breaking);
 if(id==='striped_bass')return (.78+.22*bell(e.whitewater,.22,.5))
  *Math.exp(-.25*Math.max(0,e.orbital-1.2)**2-.16*Math.max(0,e.current-.8)**2);
 if(id==='white_croaker')return Math.exp(-.45*e.whitewater-.3*e.orbital**2);
 if(id==='jacksmelt')return Math.exp(-.6*e.whitewater-.3*Math.max(0,e.orbital-.5)**2);
 return Math.exp(-1.15*e.whitewater-.55*e.turbidity-.25*e.orbital**2);
}

function lightAffinity(id,hour){
 const dawn=bell(hour,6.5,2),dusk=bell(hour,18.5,2),twilight=Math.max(dawn,dusk);
 if(id==='striped_bass')return .52+.48*twilight;
 if(id==='surfperch')return .82+.18*twilight;
 if(id==='white_croaker')return .75+.25*(1-Math.max(0,Math.sin((hour-5)*Math.PI/15)));
 if(id==='jacksmelt')return .65+.35*Math.max(0,Math.sin((hour-5)*Math.PI/15));
 // Visibility helps this ambush predator, but nighttime is not impossible.
 return .58+.42*Math.max(0,Math.sin((hour-5)*Math.PI/15));
}

function statusFor(e,bait,rig,condition,totalRate){
 if(e.offshore<=0||e.depth<=.08)return '钓组还没有进入可垂钓的水层。';
 if(!bait||condition<=.08)return '钩上的鱼饵已不足，收线后重新装饵。';
 if(!rig)return '需要先装上可用的岸钓组。';
 if(rig==='float'){
  if(e.submerged<.9)return '浮漂落水，等待小钩下沉到漂下水层。';
  if(e.stability<.4)return '浪流拖着浮漂移动，钩饵难以稳定；寻找较平静的水面。';
  return bait==='sandcrab'?'浮钓小钩可试沙蟹；小鱿鱼条更适合寻找加州似银汉鱼。':
   '小钩悬在浮漂下，留意区别于海浪起伏的持续下沉或横移。';
 }
 if(e.bottomContact<.35)return '钓组还未贴底，等待铅坠下沉并观察浪流。';
 if(e.stability<.4)return '浪流正在拖动铅坠，钓饵难以留在鱼的觅食水层。';
 if(e.bar>.55&&e.breaking>.4)return '钓组落在碎浪沙坝上，白浪内侧的暗槽或缺口更容易留住钓饵。';
 if(!e.sand)return '这里缺少当前目标鱼偏好的沙底环境。';
 if(e.trough>.5&&bait==='sandcrab'&&rig==='carolina')return '沙蟹贴近沙槽底部，留意与浪组节奏不同的轻啄。';
 if(e.channel>.45&&bait==='anchovy'&&rig==='fishfinder')return '鱼块停在沙槽缺口附近，观察钓组是否被水流带离。';
 if(bait==='sandcrab'&&rig==='fishfinder')return '较大的钩配沙蟹，对小口海鲫的适配度较低。';
 if(totalRate<.0003)return '当前距离、钓组和鱼饵的搭配较弱，试着对准沙槽或调整装配。';
 return '钓饵正在沙底等待鱼经过；留意暗槽、白浪缺口和铅坠的移动。';
}

/** Per-species hazard in encounters / active second. Smooth distance curves
 * follow the local trough/bar geometry; a longer cast is not always better.
 * `presentation` comes from the settled rig simulation, not the rod upgrade.
 * Missing/unknown bait, rig, habitat, or dry water produces no made-up floor. */
export function shoreEncounterRates({sample={},bait,rig,baitCondition=1,month=9,hour=6,presentation={}}={}){
 sample=sample||{};presentation=presentation||{};
 const baitId=typeof bait==='string'?bait:bait?.kind||bait?.id;
 const rawRig=typeof rig==='string'?rig:rig?.id;
 const rigId=rawRig==='carolina_rig'?'carolina':rawRig==='fishfinder_rig'?'fishfinder':rawRig==='float_rig'?'float':rawRig;
 const validBait=['sandcrab','squid','anchovy'].includes(baitId)?baitId:null;
 const validRig=['carolina','fishfinder','float'].includes(rigId)?rigId:null;
 const condition=clamp(finite(baitCondition)),e=environment(sample,presentation);
 const monthIndex=clamp(Math.floor(finite(month,9)),1,12)-1;
 const clockHour=((finite(hour,6)%24)+24)%24;
 const active=e.offshore>0&&e.depth>.08&&condition>.08&&validBait&&validRig;
 const perSpecies=SHORE_ECOLOGY.map(species=>{
  const space=spaceAffinity(species.id,e);
  const factors={
   water:active?1:0,distance:space.distance,depth:depthAffinity(e.depth,species.depth),habitat:space.habitat,
   bait:species.bait[validBait]||0,rig:species.rig[validRig]||0,
   season:species.monthly[monthIndex],light:lightAffinity(species.id,clockHour),
   waves:waveAffinity(species.id,e),freshness:condition**1.25,
   bottomContact:species.id==='jacksmelt'?1:e.bottomContact**species.bottomExponent,
   feedingLayer:species.id==='jacksmelt'?e.submerged*(.1+.9*bell(e.baitDepth,Math.min(.9,e.depth*.45),.85)):1,
   stability:Math.exp(-4*(1-e.stability)**2),
  };
  const ratePerSecond=species.baseRatePerSecond*Object.values(factors).reduce((product,value)=>product*value,1);
  return{id:species.id,ratePerSecond,factors};
 });
 const totalRatePerSecond=perSpecies.reduce((total,species)=>total+species.ratePerSecond,0);
 const dominant=perSpecies.reduce((best,species)=>species.ratePerSecond>best.ratePerSecond?species:best,perSpecies[0]);
 return{perSpecies,totalRatePerSecond,dominantSpeciesId:totalRatePerSecond>0?dominant.id:null,
  medianWaitSeconds:totalRatePerSecond>0?Math.LN2/totalRatePerSecond:Infinity,
  status:statusFor(e,validBait,validRig,condition,totalRatePerSecond)};
}

// ---------------------------------------------------------------------------
// Population inputs. The agent-based model in fish-population.js uses the same
// evidence-informed preferences, split by what they describe:
//  - suitability: where schools choose to be (distance/bar geometry, depth,
//    sand habitat, season, sea state) — decides where fish actually are;
//  - feeding: how hungry they are now (light, i.e. dawn/dusk and daytime);
//  - bait appeal: whether a fish that found the bait takes it (bait, rig and
//    hook fit, freshness, how naturally the tackle sits);
//  - scent/flash: how far away a bait can be noticed.
// None of these is a probability of a bite on its own.
const rigKey=rig=>{const raw=typeof rig==='string'?rig:rig?.id;return raw==='carolina_rig'?'carolina':raw==='fishfinder_rig'?'fishfinder':raw==='float_rig'?'float':raw;};
const speciesById=id=>SHORE_ECOLOGY.find(s=>s.id===id);
export function shoreSuitability(id,sample={},{month=9}={}){
 const species=speciesById(id);if(!species)return 0;
 const e=environment(sample||{},{bottomContact:1,stability:1});
 if(!(e.offshore>0)||!(e.depth>.15))return 0;
 const space=spaceAffinity(id,e),monthIndex=clamp(Math.floor(finite(month,9)),1,12)-1;
 return space.distance*space.habitat*depthAffinity(e.depth,species.depth)*species.monthly[monthIndex]*waveAffinity(id,e);
}
export function shoreFeeding(id,hour=6){return clamp(lightAffinity(id,((finite(hour,6)%24)+24)%24),0,1);}
export function shoreBaitAppeal(id,{bait,rig,baitCondition=1,presentation={}}={}){
 const species=speciesById(id),baitId=typeof bait==='string'?bait:bait?.kind||bait?.id,rigId=rigKey(rig);
 if(!species||!species.bait[baitId]||!species.rig[rigId])return 0;
 const condition=clamp(finite(baitCondition));if(condition<=.08)return 0;
 const p=presentation||{},stability=clamp(finite(p.stability,1)),contact=clamp(finite(p.bottomContact,1));
 return species.bait[baitId]*species.rig[rigId]*condition**.75*Math.exp(-3*(1-stability)**2)*(id==='jacksmelt'?1:contact**species.bottomExponent);
}
// Oily cut fish carries furthest; crustacean scent is milder. Floats and
// suspended baits are also visible; a bait lying on sand is barely seen.
export const SHORE_BAIT_SCENT=Object.freeze({sandcrab:.55,squid:.75,anchovy:1});
export function shoreBaitFlash(rig,bait){return rigKey(rig)==='float'?.35:bait==='sandcrab'?.12:.08;}

// Engine definitions: school sizes, movement, senses and cohort lengths.
// Densities are fish per hectare at suitability 1 (authored, not surveyed).
const nearBottom=offset=>bottom=>Math.max(.1,bottom-offset);
export const SHORE_POPULATION_SPECIES=Object.freeze([
 Object.freeze({id:'surfperch',school:[3,12],density:115,cruise:.3,burst:1.6,smell:.85,sight:2.5,sightDrive:.5,wariness:.45,calmSeconds:45,
  patience:26,biteRate:.8,giveUpMeters:30,lengthCm:[17,37],cohortSd:.08,probeMeters:5,
  preferredDepth:nearBottom(.35),verticalReach:bottom=>Math.max(.8,bottom*.45)}),
 Object.freeze({id:'striped_bass',school:[1,4],density:4,cruise:.6,burst:3.2,smell:.6,sight:5,sightDrive:.9,wariness:.72,calmSeconds:70,
  patience:14,biteRate:.85,giveUpMeters:45,lengthCm:[38,82],cohortSd:.1,probeMeters:9,
  preferredDepth:bottom=>Math.max(.3,bottom*.6),verticalReach:bottom=>Math.max(1.2,bottom*.7)}),
 Object.freeze({id:'halibut',school:[1,1],density:3,cruise:.12,burst:2.6,smell:.45,sight:4,sightDrive:1,wariness:.5,calmSeconds:60,
  patience:30,biteRate:.6,giveUpMeters:25,lengthCm:[36,82],cohortSd:0,probeMeters:7,arrivalSeconds:150,
  preferredDepth:nearBottom(.1),verticalReach:()=>.9}),
 Object.freeze({id:'white_croaker',school:[6,25],density:150,cruise:.25,burst:1.2,smell:1,sight:1.2,sightDrive:.2,wariness:.22,calmSeconds:30,
  patience:34,biteRate:.9,giveUpMeters:30,lengthCm:[16,32],cohortSd:.07,probeMeters:6,
  preferredDepth:nearBottom(.3),verticalReach:()=>.9}),
 Object.freeze({id:'jacksmelt',school:[10,40],density:260,cruise:.45,burst:1.9,smell:.5,sight:3,sightDrive:.65,wariness:.3,calmSeconds:30,
  patience:20,biteRate:.75,giveUpMeters:30,lengthCm:[20,38],cohortSd:.06,probeMeters:8,
  preferredDepth:bottom=>Math.min(1,Math.max(.3,bottom*.4)),verticalReach:bottom=>Math.max(1,bottom*.3)}),
]);
