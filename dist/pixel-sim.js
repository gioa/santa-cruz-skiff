import {fishMassKg} from './pixel-fish-mass.js?v=20260927-pixel-v51';
import {stepRodTip,fishTipSignal} from './pixel-rod-response.js?v=20260927-pixel-v51';
import {baitFishCandidates} from './pixel-small-fish.js?v=20260927-pixel-v51';
import {baitSchoolInfluence} from './pixel-bait-schools.js?v=20260927-pixel-v51';
import {planCast,stepCast} from './pixel-casting.js?v=20260927-pixel-v51';
import {RETIRED_PIXEL_GEAR} from './pixel-gear-availability.js?v=20260927-pixel-v51';
import {fishCommonName,fishDisplayName} from './pixel-fish-names.js?v=20260927-pixel-v51';
import {stepBottomSnag,stepSnagAbrasion} from './pixel-snag.js?v=20260927-pixel-v51';
import {formatLength,formatWeight} from './units.js?v=20260927-pixel-v51';
/** Pixel gameplay. Offshore travel uses a 1:2 map scale and the calendar clock runs at 2x. Input, fishing and animations use active real seconds. */
import {GEAR_CATALOG,BASE_GEAR,createProfile,equipmentStats,cargoWeight,settleFish,buyGear as purchaseGear,hasElectricReel as electricReelEquipped} from './equipment.js?v=20260927-pixel-v51';
import {HARBOR,BOARDING_WALK_PATH,walkHeight,walkAllowed,canBoardFrom,harborWaterBlocked} from './pixel-harbor-layout.js?v=20260927-pixel-v51';
import {walkingBlocked as walkBlocked,walkingPointOpen,walkingSegmentOpen as safeWalkSegment,createGroundWalkSearch,advanceGroundWalk} from './pixel-walking-path.js?v=20260927-pixel-v51';
import {FISHING_SPOTS,toGPS,bearingDegrees,onLand,onPier,MAP_BOUNDS} from './pixel-geography.js?v=20260927-pixel-v51';
import {fishingHabitatAt} from './pixel-seafloor.js?v=20260927-pixel-v51';
import {depthAt,depthInfoAt} from './bathymetry.js?v=20260927-pixel-v51';
import {waterRoute,resolveVesselContact,contactAwareControl,clearResumeVesselPose} from './pixel-navigation.js?v=20260927-pixel-v51';
import {createVesselState,stepVessel,syncVessel,vesselWind,vesselAutopilot} from './vessel-physics.js?v=20260927-pixel-v51';
import {fishEncounter,weightedEncounterFish} from './pixel-fish-ecology.js?v=20260927-pixel-v51';
import {RIG_PROFILES,getRigProfile} from './fishing-rigs.js?v=20260927-pixel-v51';
import {MAX_PAID_LINE_METERS,MAX_TROLL_SPEED_MPS,MAX_TROLL_THROTTLE,reelTurnsPerSecond,rodTipPosition,fishingCurrent,relativeFishingFlow,stepFishingLine} from './pixel-fishing-physics.js?v=20260927-pixel-v51';
import {createFishFight,stepFishFight,canLandFish} from './pixel-fish-fight.js?v=20260927-pixel-v51';
import {createHookHold,createBiteHold,stepHookHold} from './pixel-hooking.js?v=20260927-pixel-v51';
import {consumableStatus,installBait,installRig,loseRig,damageSupplies,rigRequiresBait,USABLE_CONDITION} from './pixel-consumables.js?v=20260927-pixel-v51';
import {ensureRodLoadouts,getRodAssembly,setRodAssembly,syncActiveRodLoadout} from './pixel-rod-loadouts.js?v=20260927-pixel-v51';
import {assessCatchLedger,identifyRegulatedSpecies} from './fishing-regulations.js?v=20260927-pixel-v51';
import {FishingPatrol} from './fish-patrol.js?v=20260927-pixel-v51';
import {NAVIGATION_COMPRESSION,navigationStepScale} from './pixel-navigation-scale.js?v=20260927-pixel-v51';
export const GAME_TIME_SCALE=1/NAVIGATION_COMPRESSION;
export const WALK_SPEED=2.90;
export const BOAT_RENTAL_PRICE=15; // Virtual game credits, not a real rental quote.
export function hasSavedBoatRental(saved){return saved?.edition==='pixel'&&(Number(saved.version)<5||saved.version==null?saved.mode==='boat'||['lowering','raising','afloat'].includes(saved.launchStage):saved.rentalPaid===true);}
const pacificMonth=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',month:'numeric'});
const pacificClock=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Los_Angeles',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
export {GEAR_CATALOG,BASE_GEAR,HARBOR,BOARDING_WALK_PATH,FISHING_SPOTS};
export const PIXEL_FISH=[
 {name:'蓝岩鱼',latin:'Sebastes mystinus',color:'#718ba8',min:22,max:39,weight:.7,referenceLength:30.5,power:.86,spot:'kelp',bait:'squid'},
 {name:'铜岩鱼',latin:'Sebastes caurinus',color:'#cc9869',min:27,max:58,weight:1.3,referenceLength:37.5,power:1.03,spot:'reef',bait:'squid'},
 {name:'加州大比目鱼',latin:'Paralichthys californicus',color:'#a6aa74',min:38,max:69,weight:2.5,power:1.2,spot:'sand',bait:'anchovy'},
 {name:'太平洋鲭鱼',latin:'Scomber japonicus',color:'#73b8c1',min:25,max:38,weight:.6,referenceLength:31.5,power:.8,spot:'sand',bait:'jig'},
 {name:'长蛇齿单线鱼',latin:'Ophiodon elongatus',color:'#8ba878',min:40,max:65,weight:1.34,referenceLength:53,power:1.32,spot:'reef',bait:'jig'},
 {name:'朱红岩鱼',latin:'Sebastes miniatus',color:'#d78062',min:25,max:68,weight:1.35,referenceLength:41.2,rarity:.36,spot:'reef',bait:'squid'},
 {name:'帝王鲑',latin:'Oncorhynchus tshawytscha',color:'#a8c8ce',min:45,max:100,weight:5.5,referenceLength:70,rarity:.09,spot:'sand',bait:'anchovy'},
 {name:'白海鲈',latin:'Atractoscion nobilis',color:'#b2b5a6',min:55,max:140,weight:8.6,referenceLength:98.5,rarity:.025,spot:'kelp',bait:'squid'},
 {name:'太平洋狐鲣',latin:'Sarda chiliensis lineolata',color:'#75a4b6',min:30,max:75,weight:1.8,referenceLength:50,lengthType:'fork',rarity:.12,spot:'sand',bait:'sardine'},
 {name:'白石首鱼',latin:'Genyonemus lineatus',color:'#c4bb95',min:18,max:30,weight:.19,referenceLength:25,spot:'sand',bait:'squid'},
 {name:'太平洋沙鲽',latin:'Citharichthys sordidus',color:'#b19771',min:15,max:28,weight:.16,referenceLength:24.6,spot:'sand',bait:'squid'},
].map(f=>({...f,commonName:fishCommonName(f)}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clone=v=>JSON.parse(JSON.stringify(v));
const rigItem=Object.fromEntries(Object.values(RIG_PROFILES).map(r=>[r.id,r.item]));
const round=(n,d=1)=>Number(finite(n).toFixed(d));
function pacificDayStart(now){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 const base=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),14);
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'2-digit',hourCycle:'h23'}).format(base));
 return new Date(base+(6-hour)*3600000).toISOString();
}
function initialState(profile){return{
 version:5,edition:'pixel',mode:'intro',phase:'walk',time:0,elapsed:0,gameElapsed:0,timeScale:GAME_TIME_SCALE,clock:'06:00:00',paused:false,
 playerX:HARBOR.spawnX,playerZ:HARBOR.spawnZ,yaw:0,walking:false,walkRoute:[],autoWalk:false,walkArrival:null,walkTarget:null,walkPending:false,
 boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,heading:0,speed:0,tiller:0,roll:0,pitch:0,
 launchStage:'stored',launchProgress:0,rentalPaid:false,loaded:false,moored:true,engine:false,throttle:0,fuel:100,anchor:false,
 standing:false,deckX:0,deckZ:.8,pfd:true,lanyard:true,swim:null,docking:null,
 profile:createProfile(profile),packed:BASE_GEAR.filter(g=>!RETIRED_PIXEL_GEAR.has(g.id)).map(g=>g.id),rig:'bottom',rigWeightGrams:85,fishingDepthMeters:null,rigPresentation:null,pumpHeight:0,paidLineMeters:0,snagExposure:0,snagThreshold:Infinity,snagged:false,snagPoint:null,snagStretchMeters:0,snagAbrasion:0,bottomSlackSeconds:0,bait:'squid',drag:.48,baitOnHook:null,rodBaitOnHooks:{},
 rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'brake',rodBend:0,rodLoadN:0,crankRate:0,rodTip:null,lineEntry:null,floatPosition:null,lineSlackMeters:0,payoutRate:0,retrieveRate:0,relativeFlowMps:0,
 schoolRemovals:{},baitSchools:[],rodTipMotion:null,fishState:'idle',castLine:false,casting:false,castPower:0,castFlight:null,bobber:null,lureDepth:0,lineDistance:0,
 tension:0,stamina:100,biteAt:0,biteTimer:0,biteFish:null,biteHold:null,biteExposure:0,biteEngagement:0,hookSetSeconds:0,hookHold:null,fish:null,fishFight:null,fishPullN:0,fishMotion:null,fightTime:0,breakMeter:0,reeling:false,pumping:false,
 waypoint:null,waterRoute:[],catches:[],journal:[],events:[],toast:'',toastId:0,casts:0,misses:0,breaks:0,
 walked:0,sailed:0,tripComplete:false,arrival:null,dayStartAt:null,navigationScale:1,inspection:null,lastInspection:null,
};}

export class PixelSimulation {
 constructor({profile=null,saved=null,rng=Math.random,patrolRng,now=()=>new Date(),navigationScale,conditions={}}={}){
  this.rng=rng;this.now=now;this.navigationScaleOverride=navigationScale;this.saved=saved;this.walkSearch=null;this.conditions={windKnots:0,windDirection:315,waveHeight:0,period:9,waterTemp:14,...conditions};
  this.state=initialState(profile||saved?.profile);this.patrol=new FishingPatrol({rng:patrolRng,isWater:(x,z)=>!onLand(x,z)&&!onPier(x,z)&&!harborWaterBlocked(x,z)});this.transientThrottle=false;this.vessel=createVesselState({x:HARBOR.boatX,z:HARBOR.boatZ});
  ensureRodLoadouts(this.state.profile,saved||{});this.activeRodId=this.state.profile.loadout.rod;this.applyActiveRod();
 }
 get inventory(){return this.state.packed;}
 get hasElectricReel(){return electricReelEquipped(this.state.profile,this.state.packed);}
 get canOperateHelm(){const s=this.state;return !s.snagged&&(s.fishState==='idle'||(s.rodMount!=='hand'&&['sinking','waiting'].includes(s.fishState)));}
 get rentalReady(){return this.state.rentalPaid===true&&this.state.launchStage==='afloat';}
 navigationScale(state=this.state){return this.navigationScaleOverride?this.navigationScaleOverride(state):navigationStepScale(state);}
 hasGear(id){const s=this.state;return s.profile.owned.includes(id)&&s.packed.includes(id);}
 navigationInstruments(){const s=this.state,p=s.mode==='walk'?{x:s.playerX,z:s.playerZ}:s.mode==='swim'&&s.swim?s.swim:{x:s.boatX,z:s.boatZ},chart=this.hasGear('nautical_chart'),compass=this.hasGear('compass'),gps=this.hasGear('gps'),sounder=this.hasGear('sounder');return{chart,compass,gps,sounder,heading:compass||gps?bearingDegrees(s.mode==='boat'?s.heading:s.yaw):null,gpsPosition:gps?toGPS(p.x,p.z):null,depth:sounder?depthInfoAt(s.boatX,s.boatZ):null,speedKnots:gps?Math.abs(s.speed)*1.94384:null};}
 captureTimestamp(){return new Date(Date.parse(this.state.dayStartAt)+Math.round(this.state.gameElapsed*1000)).toISOString();}
 inspectionPending(){return ['approaching','checking'].includes(this.state.inspection?.phase);}
 inspectionChecking(){return this.state.inspection?.phase==='checking';}
 stopPropulsion(){const s=this.state;s.engine=false;s.throttle=0;s.waypoint=null;s.waterRoute=[];this.transientThrottle=false;}

 rodAssembly(rodId=this.state.profile.loadout.rod){return getRodAssembly(this.state.profile,rodId);}
 assemblyItems(rodId){const assembly=this.rodAssembly(rodId);if(!assembly)return[];return[rodId,assembly.reel,assembly.line,assembly.leader,rigItem[assembly.rig],rigRequiresBait(assembly.rig)?'bait':null,assembly.weightGrams!==getRigProfile(assembly.rig).defaultWeightGrams?'sinker_heavy':null].filter(Boolean);}
 enableRodAssembly(rodId){const s=this.state;s.packed=[...new Set([...s.packed,...this.assemblyItems(rodId).filter(id=>s.profile.owned.includes(id))])];}
 rememberHookBait(){const s=this.state;if(this.activeRodId){s.rodBaitOnHooks??={};s.rodBaitOnHooks[this.activeRodId]=s.baitOnHook?clone(s.baitOnHook):null;const supply=s.profile.rodSupplies?.[this.activeRodId];if(supply)supply.bait=s.baitOnHook||null;}}
 applyActiveRod(rodId=this.state.profile.loadout.rod){
  const s=this.state,previous=this.activeRodId;if(previous&&previous!==rodId)this.rememberHookBait();const assembly=syncActiveRodLoadout(s.profile,rodId);
  if(!assembly){this.activeRodId=null;s.baitOnHook=null;return null;}
  s.baitOnHook=s.profile.rodSupplies[rodId]?.bait||null;
  const changed=previous!==rodId||s.rig!==assembly.rig||s.rigWeightGrams!==assembly.weightGrams||s.fishingDepthMeters!==assembly.fishingDepthMeters;
  Object.assign(s,{rig:assembly.rig,bait:assembly.bait,drag:assembly.drag,rigWeightGrams:assembly.weightGrams,fishingDepthMeters:assembly.fishingDepthMeters});this.activeRodId=rodId;if(changed){s.rigPresentation=null;s.pumpHeight=0;}return assembly;
 }
 selectRod(rodId){const s=this.state;if(s.fishState!=='idle')return this.notify('先收回钓组。',null,false);if(!GEAR_CATALOG.some(g=>g.id===rodId&&g.slot==='rod')||!s.profile.owned.includes(rodId))return this.notify('背包里没有这根船竿。',null,false);this.enableRodAssembly(rodId);this.applyActiveRod(rodId);return this.notify('已换用这根船竿。');}
 equipRod(rodId){return this.selectRod(rodId);}
 get stats(){const s=this.state,stats=equipmentStats(s.profile,s.packed.filter(id=>!RETIRED_PIXEL_GEAR.has(id))),reel=GEAR_CATALOG.find(g=>g.id===s.profile.loadout.reel&&g.slot==='reel'&&this.hasGear(g.id));return{...stats,hasRod:Boolean(this.hasGear(s.profile.loadout.rod)&&GEAR_CATALOG.some(g=>g.id===s.profile.loadout.rod&&g.slot==='rod')),smooth:reel?.smooth||1};}

 get atCounter(){const s=this.state;return s.mode==='walk'&&Math.hypot(s.playerX-HARBOR.counterX,s.playerZ-HARBOR.counterZ)<3.2;}
 notify(message,action=null,ok=true){const s=this.state;if(message){s.toast=message;s.toastId++;s.events.push({id:s.toastId,time:s.clock,text:message,action});if(s.events.length>40)s.events.shift();}return{ok,message,action};}
 journal(text){const s=this.state;s.journal.unshift({time:s.clock,text});s.journal=s.journal.slice(0,100);}
 start(resume=false){
  const s=this.state;if(s.mode!=='intro')return this.notify('',null,false);
  if(!resume&&hasSavedBoatRental(this.saved)&&s.profile.credits<BOAT_RENTAL_PRICE)return this.notify('潮汐点不足以开启新航次，请继续上次已租航程。',null,false);
  if(resume&&this.saved?.edition==='pixel'){
   const p=this.saved;Object.assign(s,clone(p),{profile:createProfile(p.profile),mode:p.mode==='boat'?'boat':'walk',engine:false,throttle:0,pendingRodPickup:false,speed:0,waypoint:null,waterRoute:[],walkRoute:[],autoWalk:false,castLine:false,casting:false,castFlight:null,bobber:null,fishState:'idle',fish:null,biteFish:null,biteHold:null,biteExposure:0,biteEngagement:0,hookSetSeconds:0,hookHold:null,standing:false,deckX:0,deckZ:.8,walking:false,swim:null,docking:null,paused:false,fishFight:null,fishPullN:0,fishMotion:null,time:0,elapsed:0,gameElapsed:0,timeScale:GAME_TIME_SCALE,clock:'06:00:00',events:[],tension:0,lureDepth:0,lineDistance:0,castPower:0,reeling:false,pumping:false,arrival:null});
   s.packed=(p.packed||[]).filter(id=>s.profile.owned.includes(id)&&!RETIRED_PIXEL_GEAR.has(id));s.catches=p.catches||[];
   if(s.mode==='walk'){s.playerX=HARBOR.spawnX;s.playerZ=HARBOR.spawnZ;s.loaded=false;}
   // Restoring an interrupted immersion is the same explicit free recovery as
   // the rescue action: never strand the player ashore with an offshore boat.
   if(p.mode==='swim'){Object.assign(s,{boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,heading:0,moored:true,anchor:false,launchStage:'afloat',launchProgress:0});}
   // Existing pre-rental voyages keep their boat without a second charge.
   // New saves must explicitly record payment; a floating flag is insufficient.
   s.rentalPaid=hasSavedBoatRental(p);
   s.version=5;
   if(!s.rentalPaid){Object.assign(s,{mode:'walk',phase:'walk',playerX:HARBOR.spawnX,playerZ:HARBOR.spawnZ,boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,heading:0,launchStage:'stored',launchProgress:0,loaded:false,moored:true,anchor:false,inspection:null});}
   else if(s.launchStage==='lowering'){s.launchProgress=clamp(finite(s.launchProgress),0,1);s.mode='walk';s.loaded=false;s.moored=true;}
   else if(s.mode==='boat'||s.launchStage==='raising')s.launchStage='afloat';
  }else{s.mode='walk';this.journal('06:00，到达 Santa Cruz Wharf。');}
  if(resume&&s.mode==='boat'){const pose={x:s.boatX,z:s.boatZ,heading:s.heading},clear=clearResumeVesselPose(pose);if(clear!==pose){s.boatX=clear.x;s.boatZ=clear.z;s.heading=clear.heading;s.anchor=false;this.journal('码头布局更新，木艇已移到邻近安全水面。');}}
  // Retired controls cannot strand an older save. Ashore boats remain parked.
  s.anchor=false;s.moored=s.mode!=='boat';s.fuel=100;this.clearWalking();syncVessel(this.vessel,{x:s.boatX,z:s.boatZ,heading:s.heading,clearMotion:true});
  ensureRodLoadouts(s.profile,s);s.rodBaitOnHooks??={};this.activeRodId=s.profile.loadout.rod;this.applyActiveRod();
  this.transientThrottle=false;s.dayStartAt=pacificDayStart(this.now());s.rigWeightGrams=finite(s.rigWeightGrams,getRigProfile(s.rig).defaultWeightGrams);s.schoolRemovals={};s.baitSchools=[];s.rodTipMotion=null;s.rigPresentation=null;s.pumpHeight=0;s.paidLineMeters=0;Object.assign(s,{rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'brake',rodBend:0,rodLoadN:0,crankRate:0,rodTip:null,lineEntry:null,floatPosition:null,lineSlackMeters:0,payoutRate:0,retrieveRate:0,relativeFlowMps:0,snagged:false,snagPoint:null,snagStretchMeters:0,snagAbrasion:0,bottomSlackSeconds:0,breakMeter:0});
  return this.notify(resume&&this.saved?.mode==='swim'?'落水航程已安全恢复到码头，装备与鱼获已保留。':resume?'新的一天，装备与鱼获已保留。':'早上好，码头小屋就在前面。');
 }
 packStarter(){const s=this.state;s.packed=[...new Set([...s.packed,...BASE_GEAR.filter(g=>!RETIRED_PIXEL_GEAR.has(g.id)).map(g=>g.id)])];s.pfd=true;this.syncLoadout();this.journal('启用基础装备。');return this.notify('鱼竿、钓组与冰箱已启用。');}
 equip(id){const s=this.state;if(RETIRED_PIXEL_GEAR.has(id))return this.notify('',null,false);if(s.fishState!=='idle'&&this.assemblyItems(s.profile.loadout.rod).includes(id))return this.notify('先收回钓组，再调整这根竿的装备。',null,false);if(!s.profile.owned.includes(id))return this.notify('背包里还没有这件装备。',null,false);s.packed=s.packed.includes(id)?s.packed.filter(x=>x!==id):[...s.packed,id];s.pfd=true;this.syncLoadout();return this.notify('装备已整理。');}
 syncLoadout(){const s=this.state;s.packed=s.packed.filter(id=>!RETIRED_PIXEL_GEAR.has(id));ensureRodLoadouts(s.profile);const current=s.profile.loadout.rod,rod=this.hasGear(current)?current:GEAR_CATALOG.filter(g=>g.slot==='rod').reverse().find(g=>this.hasGear(g.id))?.id||null;s.profile.loadout.cooler=['cooler_large','cooler'].find(id=>this.hasGear(id))||null;if(rod)this.applyActiveRod(rod);else{this.rememberHookBait();s.profile.loadout.rod=null;this.activeRodId=null;s.baitOnHook=null;}}

 buyGear(id){if(RETIRED_PIXEL_GEAR.has(id))return this.notify('',null,false);if(!this.atCounter)return this.notify('到小屋柜台兑换装备。',null,false);const s=this.state,item=GEAR_CATALOG.find(g=>g.id===id);if(!s.rentalPaid&&item&&(item.bait||item.slot==='consumable'||item.slot==='rig'||!s.profile.owned.includes(id))&&s.profile.credits>=item.price&&s.profile.credits-item.price<BOAT_RENTAL_PRICE)return this.notify(`先留出 ${BOAT_RENTAL_PRICE} 潮汐点租金，租船后再兑换这件装备。`,null,false);const r=purchaseGear(s.profile,id);if(r.ok)this.journal(r.message);return this.notify(r.message,null,r.ok);}
 // Kept as a harmless legacy entry point; supplies are purchased individually.
 restock(){return this.notify('',null,false);}
 launchBoat(){const s=this.state;if(!this.atCounter)return this.notify('请在小屋柜台租船。',null,false);if(!s.rentalPaid){if(s.profile.credits<BOAT_RENTAL_PRICE)return this.notify(`租船需要 ${BOAT_RENTAL_PRICE} 潮汐点，当前余额不足。`,null,false);s.profile.credits-=BOAT_RENTAL_PRICE;s.rentalPaid=true;s.launchStage='stored';s.profile.transactions.unshift({kind:'boat_rental',id:'boat_rental',delta:-BOAT_RENTAL_PRICE,time:this.captureTimestamp()});s.profile.transactions=s.profile.transactions.slice(0,80);this.journal(`支付 ${BOAT_RENTAL_PRICE} 潮汐点租船。`);}if(s.launchStage==='stored'){s.launchStage='lowering';s.launchProgress=0;s.phase='board';this.journal('工作人员操作吊臂下放木艇。');return this.notify('租船已就绪，吊臂正在下放空艇。');}if(s.launchStage==='afloat'&&s.moored){return this.notify('木艇已在登船平台等你。');}return this.notify('吊艇正在进行。',null,false);}
 walkTo(destination){
  const s=this.state;if(s.mode!=='walk')return this.notify('先回到岸上。',null,false);
  this.clearWalking();
  let target=destination==='counter'?{x:HARBOR.counterX,z:HARBOR.counterZ}:destination==='boarding'?{x:HARBOR.boardingX,z:HARBOR.boardingZ}:destination;
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return this.notify('',null,false);
  const here={x:s.playerX,z:s.playerZ};let route=null;
  // Reject water, building interiors and far-away clicks before sampling any
  // route. Long walks can still be made in successive visible-ground clicks.
  if(distance(here,target)>180||!walkingPointOpen(target.x,target.z))return this.notify('那里暂时走不到。',null,false);
  if(safeWalkSegment(here,target))route=[{...target}];
  else{
   // The authored narrow stair route prevents cutting across the wharf ledge.
   const points=BOARDING_WALK_PATH,fromHere=points.map(p=>safeWalkSegment(here,p)),toTarget=points.map(p=>safeWalkSegment(p,target));let best=Infinity;
   for(let i=0;i<points.length;i++)if(fromHere[i])for(let j=0;j<points.length;j++)if(toTarget[j]){
    const direction=j>=i?1:-1,candidate=[];for(let k=i;;k+=direction){candidate.push({...points[k]});if(k===j)break;}candidate.push({...target});
    let cost=distance(here,candidate[0]);for(let k=1;k<candidate.length;k++)cost+=distance(candidate[k-1],candidate[k]);if(cost<best){best=cost;route=candidate;}
   }
  }
  if(!route)this.walkSearch=createGroundWalkSearch(here,target);
  s.walkRoute=route||[];s.walkPending=!route;s.walkTarget={x:target.x,z:target.z};s.autoWalk=true;s.arrival=null;s.walkArrival=destination==='counter'?'counter':destination==='boarding'?'boarding':'ground';return this.notify('',`walking-${s.walkArrival}`);
 }
 clearWalking(){const s=this.state;this.walkSearch=null;s.walkRoute=[];s.autoWalk=false;s.walkPending=false;s.walkTarget=null;s.walkArrival=null;s.arrival=null;}
 walkSearchNow(){return performance.now();}
 board(){const s=this.state;if(!s.rentalPaid)return this.notify(`先到小屋支付 ${BOAT_RENTAL_PRICE} 潮汐点租船。`,null,false);if(this.inspectionPending())return this.notify('等例行检查结束再出发。',null,false);if(s.mode!=='walk'||!canBoardFrom(s.playerX,s.playerZ))return this.notify('沿左侧台阶走到登船平台。',null,false);if(s.launchStage!=='afloat')return this.notify('等吊臂放稳木艇，再登船。',null,false);s.mode='boat';s.engine=true;s.throttle=0;s.loaded=true;s.moored=false;s.anchor=false;s.standing=false;s.deckX=0;s.deckZ=.8;s.walking=false;this.clearWalking();s.phase='launch';s.tripComplete=false;s.yaw=0;s.inspection=null;this.patrol.resetTrip();this.journal('带上装备，登上木艇。');return this.notify('坐稳了，可以出发。');}
 // Legacy clients can finish old boarding sequences without a rope mechanic.
 unmoor(){const s=this.state;if(!this.rentalReady||s.mode!=='boat')return this.notify('',null,false);s.moored=false;return this.notify('');}
 interact(){const s=this.state;if(s.paused)return this.notify('',null,false);if(s.mode==='walk'){if(this.atCounter)return{ok:true,action:'staff',message:''};if(canBoardFrom(s.playerX,s.playerZ))return this.board();return this.notify('靠近小屋柜台或左侧登船平台。',null,false);}if(s.mode==='boat'){if(s.fishState==='bite')return this.hook();if(s.fishState==='idle'&&Math.hypot(s.boatX-HARBOR.boatX,s.boatZ-HARBOR.boatZ)<16&&Math.abs(s.speed)<.85)return this.dock();}return this.notify('',null,false);}
 setThrottle(value){const s=this.state;if(!this.rentalReady)return false;if(this.inspectionChecking())return false;if(s.mode!=='boat'||s.docking||s.paused)return false;if(!this.canOperateHelm&&finite(value)!==0)return false;s.engine=true;s.throttle=this.canOperateHelm?clamp(finite(value),s.fishState==='idle'?-.3:0,s.fishState==='idle'?1:MAX_TROLL_THROTTLE):0;this.transientThrottle=false;s.waypoint=null;s.waterRoute=[];return true;}
 toggleAnchor(){this.state.anchor=false;return this.notify('',null,false);}
 selectWaypoint(destination){
  const s=this.state;if(!this.rentalReady)return this.notify('先在小屋租船，等木艇下水后再出发。',null,false);if(this.inspectionChecking())return this.notify('正在进行例行检查。',null,false);if(!this.hasGear('nautical_chart'))return this.notify('带上海图后可以标记航线。',null,false);if(s.mode!=='boat'||s.docking)return this.notify('先登船。',null,false);if(!this.canOperateHelm)return this.notify('先收回钓组或将鱼竿放入竿架。',null,false);
  const target=typeof destination==='object'?{...destination,name:destination.name||'选定水面'}:destination==='dock'?{x:HARBOR.returnX,z:HARBOR.returnZ,name:'租船登船平台',kind:'dock'}:FISHING_SPOTS.find(p=>p.kind===destination);
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return this.notify('没有找到这个钓点。',null,false);
  const route=waterRoute({x:s.boatX,z:s.boatZ},target);if(!route)return this.notify('这条航线无法安全穿过码头。',null,false);
  s.anchor=false;s.engine=true;this.transientThrottle=false;s.waterRoute=route;s.waypoint={...target,returning:destination==='dock'||target.kind==='dock'};s.arrival=null;s.phase=s.waypoint.returning?'return':'launch';this.journal(`航向 ${target.name}。`);return this.notify(`正在驶向 ${target.name}。`);
 }
 setRig(patch={}){
  const s=this.state;if(s.fishState!=='idle')return this.notify('先收回钓组。',null,false);const {rod=s.profile.loadout.rod,...changes}=patch;
  const result=setRodAssembly(s.profile,rod,changes);if(!result.ok)return this.notify(result.message,null,false);
  this.enableRodAssembly(rod);this.applyActiveRod(s.profile.loadout.rod);return{...this.notify(result.message),assembly:result.assembly,transferred:result.transferred};
 }

 rodConsumableStatus(rodId=this.state.profile.loadout.rod){return consumableStatus(this.state.profile,rodId);}
 rigSupply(rodId=this.state.profile.loadout.rod){const value=this.state.profile.rodSupplies[rodId];return value?clone(value):null;}
 replaceBait(rodId=this.state.profile.loadout.rod,baitKind){
  const s=this.state;if(s.fishState!=='idle')return this.notify('先收回钓组再换饵。',null,false);
  const assembly=this.rodAssembly(rodId);if(!assembly)return this.notify('还没有这根船竿。',null,false);
  const kind=baitKind||assembly.bait,result=installBait(s.profile,rodId,kind);if(!result.ok)return this.notify(result.message,null,false);
  s.profile.rodLoadouts[rodId].bait=kind;this.enableRodAssembly(rodId);this.applyActiveRod();return this.notify(result.message);
 }
 replaceRig(rodId=this.state.profile.loadout.rod,rig){
  const s=this.state;if(s.fishState!=='idle')return this.notify('先收回钓组再更换。',null,false);
  const assembly=this.rodAssembly(rodId);if(!assembly)return this.notify('还没有这根船竿。',null,false);
  const id=rig||assembly.rig,result=installRig(s.profile,rodId,id);if(!result.ok)return this.notify(result.message,null,false);
  const supplied=s.profile.rodSupplies[rodId];Object.assign(s.profile.rodLoadouts[rodId],{rig:id,weightGrams:getRigProfile(id).defaultWeightGrams,fishingDepthMeters:getRigProfile(id).defaultFishingDepth??null,bait:supplied.bait?.kind||(id==='jig'?'jig':'squid')});
  this.enableRodAssembly(rodId);this.applyActiveRod();return this.notify(result.message);
 }

 changeDrag(delta){const s=this.state;s.drag=clamp(s.drag+finite(delta),.2,.85);const assembly=s.profile.rodLoadouts?.[s.profile.loadout.rod];if(assembly)assembly.drag=s.drag;return s.drag;}
 setRodPose({elevation,azimuth}={}){const s=this.state;if(s.mode!=='boat'||s.paused||this.inspectionChecking())return{ok:false,message:''};if(Number.isFinite(elevation))s.rodElevation=clamp(elevation,5,85);if(Number.isFinite(azimuth))s.rodAzimuth=clamp(azimuth,-110,110);s.rodTip=rodTipPosition(s);return{ok:true,message:''};}
 requestRodInHand(){
  const s=this.state;if(s.mode!=='boat'||s.paused||s.docking||this.inspectionChecking()||['casting','flight','landed'].includes(s.fishState))return{ok:false,message:''};
  this.stopPropulsion();s.pendingRodPickup=false;
  if(s.rodMount==='hand')return{ok:true,message:''};
  if(Math.abs(s.speed)>1.2){s.pendingRodPickup=true;return this.notify('已回空挡，船慢下来后拿竿。');}
  return this.setRodMount('hand');
 }
 cancelRodPickup(){this.state.pendingRodPickup=false;}
 setRodMount(mount){
  const s=this.state;if(!['hand','port','starboard'].includes(mount)||s.mode!=='boat'||s.paused||s.docking||this.inspectionChecking()||['casting','flight','landed'].includes(s.fishState))return{ok:false,message:''};
  s.pendingRodPickup=false;
  if(mount==='hand'&&s.rodMount!=='hand'){if(Math.abs(s.throttle)>.01||Math.abs(s.speed)>1.2)return this.notify('先收油，等木艇慢下来再拿竿。',null,false);this.stopPropulsion();}
  if(mount!=='hand'&&s.fishState==='fight')return this.notify('先把这条鱼遛上来。',null,false);
  s.rodMount=mount;if(mount!=='hand'){s.rodAzimuth=mount==='port'?-100:100;s.rodElevation=35;}s.rodTip=rodTipPosition(s);return this.notify(mount==='hand'?'鱼竿已拿在手里。':mount==='port'?'鱼竿已放入左舷竿架。':'鱼竿已放入右舷竿架。');
 }
 setReelMode(mode){const s=this.state;if(!['brake','free'].includes(mode)||(mode==='free'&&s.fishState==='fight')||s.mode!=='boat'||s.paused||this.inspectionChecking())return{ok:false,message:''};s.reelMode=mode;return{ok:true,message:''};}
 fishingReadiness(casting=false,{ignoreBait=false}={}){
  if(casting&&this.state.rodMount!=='hand')return{ok:false,message:'先拿起鱼竿。'};
  const s=this.state;if(!this.rentalReady||s.mode!=='boat'||s.paused||s.docking)return {ok:false,message:''};if(this.inspectionChecking())return {ok:false,message:'正在进行例行检查。'};if(s.fishState!=='idle')return {ok:false,message:'摇轮收回钓组后再下线。'};
  if(s.rodMount==='hand'?(Math.abs(s.throttle||0)>.01||Math.abs(s.speed)>.9):Math.abs(s.speed)>MAX_TROLL_SPEED_MPS)return {ok:false,message:'先回空挡等船慢下来，或减到拖钓慢速。'};
  const eq=this.stats;if(!eq.hasRod||!eq.hasRig||(!ignoreBait&&rigRequiresBait(s.rig)&&!eq.hasBaitBox)||!s.packed.includes(rigItem[s.rig]))return {ok:false,message:'需要带上鱼竿、钓组和鱼饵盒。'};const supply=s.profile.rodSupplies[s.profile.loadout.rod];if(!supply||supply.rig!==s.rig||supply.condition<=USABLE_CONDITION)return{ok:false,message:'钓组缺失或已磨损，请在鱼竿页装上备用钓组。'};if(!ignoreBait&&rigRequiresBait(s.rig)&&(!s.baitOnHook||s.baitOnHook.kind!==s.bait||s.baitOnHook.condition<=USABLE_CONDITION))return{ok:false,message:'鱼饵缺失或已用完，请在鱼竿页手动换饵。'};if(this.assemblyItems(s.profile.loadout.rod).some(id=>(!ignoreBait||id!=='bait')&&!this.hasGear(id)))return {ok:false,message:'先启用这根竿装配所需的装备。'};return{ok:true,message:''};
 }
 fishingReady(casting=false){const result=this.fishingReadiness(casting);return result.ok?result:this.notify(result.message,null,false);}
 baitRig(){const s=this.state;s.casts++;s.lureDepth=0;s.pumpHeight=0;s.rigPresentation=null;s.snagExposure=0;s.snagged=false;s.snagPoint=null;s.snagStretchMeters=0;s.snagAbrasion=0;s.bottomSlackSeconds=0;s.breakMeter=0;s.snagThreshold=-Math.log(clamp(this.rng(),.00001,.99999));s.biteTimer=0;s.biteFish=null;s.biteHold=null;s.biteExposure=0;s.biteEngagement=0;s.hookSetSeconds=0;s.hookHold=null;s.biteTrolling=false;s.reelMode='free';s.rodBend=0;s.rodLoadN=0;s.crankRate=0;s.lineSlackMeters=0;s.payoutRate=0;s.retrieveRate=0;s.rodTip=rodTipPosition(s);s.biteAt=-Math.log(1-clamp(this.rng(),.000001,.999999));s.phase='fish';}
 lowerRig(){const ready=this.fishingReady();if(!ready.ok)return ready;const s=this.state;this.baitRig();s.castLine=false;s.casting=false;s.castFlight=null;s.fishState='sinking';s.rigFallSpeed=undefined;s.rigVelocity={vx:this.vessel.vx||0,vz:this.vessel.vz||0};s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:0};s.lineEntry={...s.bobber};s.floatPosition=s.rig==='float'?{...s.bobber}:null;s.paidLineMeters=s.rodTip.height+.15;s.lineDistance=Math.hypot(s.bobber.x-s.boatX,s.bobber.z-s.boatZ);this.journal(`第 ${s.casts} 次沿船边下线。`);return this.notify('钓组沿船边入水。');}
 castTo(target){const ready=this.fishingReady(true);if(!ready.ok)return ready;
  const s=this.state,plan=planCast(s,target,{isWater:(x,z)=>x>=MAP_BOUNDS.minX&&x<=MAP_BOUNDS.maxX&&z>=MAP_BOUNDS.minZ&&z<=MAP_BOUNDS.maxZ&&!onLand(x,z)&&!onPier(x,z)&&!harborWaterBlocked(x,z)});if(!plan.ok)return this.notify(plan.message,null,false);
  s.rodElevation=50;s.rodAzimuth=plan.azimuth;this.baitRig();Object.assign(s,{rigFallSpeed:undefined,rigVelocity:null,fishState:'flight',castLine:true,casting:false,castFlight:plan.flight,bobber:{...plan.flight.start},rodTip:plan.tip,paidLineMeters:plan.paid,lineEntry:null,floatPosition:null,lineDistance:Math.hypot(plan.flight.start.x-s.boatX,plan.flight.start.z-s.boatZ)});
  this.journal(`第 ${s.casts} 次向水面抛投。`);return this.notify(plan.limited?'已抛至这套钓组的可达范围。':'');
 }
 // Old charge/release controls have no target and cannot create a cast.
 startCast(target){return target?this.castTo(target):{ok:false,message:''};}
 cancelCast(){const s=this.state;if(s.casting||s.castFlight||['casting','flight'].includes(s.fishState))Object.assign(s,{castLine:false,casting:false,castPower:0,castFlight:null,bobber:null,fishState:'idle',lureDepth:0,lineDistance:0,paidLineMeters:0,lineEntry:null,floatPosition:null,rigPresentation:null,reeling:false,pumping:false,crankRate:0,rodBend:0,rodLoadN:0,lineSlackMeters:0,payoutRate:0,retrieveRate:0,snagged:false,snagPoint:null,snagStretchMeters:0,snagAbrasion:0,bottomSlackSeconds:0,breakMeter:0});return{ok:true,message:''};}
 releaseCast(){if(this.state.castFlight?.version!==1)this.cancelCast();return{ok:false,message:''};}
 // Emergency/admin compatibility. Ordinary controls retrieve by turning the
 // reel; patrol inspection, a broken line and rescue may clear the tackle.
 retrieve(){const s=this.state;if(s.fishState==='landed')return this.notify('先决定留下或放流这条鱼。',null,false);Object.assign(s,{castLine:false,casting:false,castPower:0,castFlight:null,bobber:null,fishState:'idle',fish:null,biteFish:null,biteHold:null,biteExposure:0,biteEngagement:0,hookSetSeconds:0,hookHold:null,fishFight:null,fishPullN:0,fishMotion:null,tension:0,lureDepth:0,pumpHeight:0,rigPresentation:null,paidLineMeters:0,reeling:false,pumping:false,reelMode:'brake',rodBend:0,rodLoadN:0,crankRate:0,lineEntry:null,floatPosition:null,lineSlackMeters:0,payoutRate:0,retrieveRate:0,snagged:false,snagPoint:null,snagStretchMeters:0,snagAbrasion:0,bottomSlackSeconds:0,breakMeter:0});return this.notify('钓组已收回。');}
 setBaitSchools(events){const s=this.state;s.schoolRemovals??={};const active=(events||[]).filter(e=>e.type==='bait'),ids=new Set(active.map(e=>String(e.id)));for(const id of Object.keys(s.schoolRemovals))if(!ids.has(id))delete s.schoolRemovals[id];s.baitSchools=active.map(e=>({...e,removedFish:[...new Set([...(e.removedFish||[]),...(s.schoolRemovals[e.id]||[])])],followers:(e.followers||[]).map(f=>({...f}))}));}
 fishingCandidates(env=this.rigEnvironment()){const s=this.state;return[...PIXEL_FISH,...baitFishCandidates(s.baitSchools,{...env,point:s.bobber,lureDepth:s.lureDepth})];}
 nearestSpot(){const s=this.state;let spot=FISHING_SPOTS[0],d=Infinity;for(const p of FISHING_SPOTS){const n=Math.hypot(p.x-s.boatX,p.z-s.boatZ);if(n<d){d=n;spot=p;}}return{spot,d};}
 rigEnvironment(){const s=this.state,p=s.bobber||{x:s.boatX,z:s.boatZ},profile=getRigProfile(s.rig),bed=fishingHabitatAt(p.x,p.z),flow=relativeFishingFlow(fishingCurrent(this.conditions),s.rigVelocity||this.vessel);return{schoolInfluence:baitSchoolInfluence(s.baitSchools,p,s.lureDepth),rig:s.rig,bottomDepth:depthAt(p.x,p.z),lureDepth:s.lureDepth,weightGrams:s.rigWeightGrams??profile.defaultWeightGrams,fishingDepthMeters:s.fishingDepthMeters??profile.defaultFishingDepth,currentMps:flow,boatSpeedMps:0,lineOutMeters:s.paidLineMeters,lineDiameterMm:s.profile.loadout.line==='line_braid'&&this.hasGear('line_braid')?.28:.36,habitat:bed.kind,substrateMapped:bed.mapped,substrateContextual:bed.contextual,bait:s.baitOnHook?.condition>USABLE_CONDITION?s.baitOnHook.kind:(rigRequiresBait(s.rig)?s.bait:'feather'),baitForm:s.baitOnHook?.kind==='squid'?'strip':'deadwhole',baitTipped:Boolean(s.baitOnHook?.condition>USABLE_CONDITION),tipFreshness:s.baitOnHook?.condition??0,anchored:false,driftSpeedMps:Math.hypot(this.vessel.vx||0,this.vessel.vz||0),freshness:rigRequiresBait(s.rig)?(s.baitOnHook?.condition??0):(s.profile.rodSupplies[s.profile.loadout.rod]?.condition??0),waterTemp:this.conditions.waterTemp,waveHeight:this.conditions.waveHeight,windKnots:this.conditions.windKnots,wavePeriod:this.conditions.period,month:Number(pacificMonth.format(new Date(this.captureTimestamp()))),retrieveSpeedMps:s.crankRate*.65*this.stats.retrieve,pumping:s.pumping,lureVerticalSpeedMps:finite(s.lureVerticalSpeedMps)};}
 // The fish is chosen when it takes the bait, not when a button is pressed.
 ensureBitingFish(){
  const s=this.state;if(!s.biteFish){const f=weightedEncounterFish(this.fishingCandidates(),this.rigEnvironment(),this.rng);if(!f)return null;const length=f.baitfish?f.length:Math.round(f.min+Math.pow(this.rng(),1.65)*(f.max-f.min));s.biteFish={...f,length,kg:fishMassKg(f,length)};}
  if(!s.biteHold){s.biteHold=createBiteHold(s.biteFish,getRigProfile(s.rig),{holdRoll:this.rng(),seatRoll:this.rng(),wireDamage:s.profile.rodSupplies[s.profile.loadout.rod]?.hookDamage});damageSupplies(s.profile,s.profile.loadout.rod,'bite');}return s.biteFish;
 }
 hook({automatic=false}={}){
  const s=this.state;if(s.fishState!=='bite'||s.paused||this.inspectionChecking())return{ok:false,message:''};if(s.rodMount!=='hand'&&!automatic)return this.notify('拿起鱼竿再收紧鱼线。',null,false);
  const rig=getRigProfile(s.rig),f=this.ensureBitingFish();if(!f)return this.escape('miss');
  if(!automatic){this.stopPropulsion();s.reelMode='brake';s.hookSetSeconds=rig.hookStyle==='circle'?1.2:.8;return{ok:true,message:'',action:'seating'};}
  if(s.reelMode!=='brake'||s.lineSlackMeters>=.35||s.rodLoadN<.35||s.biteEngagement<s.biteHold.profile.engageSeconds)return{ok:false,message:''};
  if(s.biteHold.canSeat===false)return this.escape('miss');
  this.stopPropulsion();const p=s.bobber||{x:s.boatX,z:s.boatZ};
  s.fish={...f,captureDepth:s.lureDepth,caughtAt:this.captureTimestamp(),caughtGPS:toGPS(p.x,p.z),rig:{id:s.rig,rod:s.profile.loadout.rod,reel:s.profile.loadout.reel,line:s.profile.loadout.line,leader:s.profile.loadout.leader,hookCount:rig.hooks,hookSize:rig.hookSize,hookStyle:rig.hookStyle,lineCount:1,weightGrams:s.rigWeightGrams,fishingDepthMeters:s.fishingDepthMeters,wireLeader:false,rodCount:1,bait:Boolean(s.baitOnHook&&s.baitOnHook.kind!=='jig'),circleHook:rig.hookStyle==='circle',trolling:Boolean(s.biteTrolling),sinkerLb:s.rigWeightGrams/453.592,breakawayWeight:false},hookCount:rig.hooks,lineCount:1,hasDescendingDevice:this.hasGear('descending_device'),landingNetDiameterInches:this.hasGear('net')?20:false,salmonAboardAtCapture:s.catches.some(c=>c.kept&&!c.settled&&identifyRegulatedSpecies(c)?.id==='chinook_salmon'),groundfishAboardAtCapture:s.catches.some(c=>{const sp=identifyRegulatedSpecies(c);return c.kept&&!c.settled&&sp?.groundfish&&!sp.groundfishGearExempt;})};
  if(f.schoolId!=null&&Number.isInteger(f.schoolSlot)){s.schoolRemovals??={};s.schoolRemovals[f.schoolId]=[...new Set([...(s.schoolRemovals[f.schoolId]||[]),f.schoolSlot])];const school=s.baitSchools.find(e=>e.id===f.schoolId);if(school)school.removedFish=[...s.schoolRemovals[f.schoolId]];}
  s.hookHold=s.biteHold;s.biteFish=null;s.biteHold=null;s.biteEngagement=0;s.hookSetSeconds=0;s.biteExposure=0;
  s.fishFight=createFishFight(s.fish,this.rng());s.fishPullN=0;s.fishMotion=null;s.fishState='fight';s.stamina=100;s.tension=0;s.fightTime=0;s.breakMeter=0;return this.notify(s.rodMount==='hand'?'中鱼了。':'鱼竿已经受力，拿起鱼竿收线。','hook');
 }

 escape(reason){const s=this.state;s.misses++;if(reason==='break'||reason==='snag-break')s.breaks++;if(reason==='break'||reason==='snag-break'||reason==='snag'||reason==='straightened'){loseRig(s.profile,s.profile.loadout.rod);s.baitOnHook=null;}else damageSupplies(s.profile,s.profile.loadout.rod,'escape');this.retrieve();return this.notify(reason==='snag-break'?'钓组挂底，受力磨断了线。请装上备用钓组。':reason==='straightened'?'鱼钩被拉直，整套钓组已报废，请换上备用钓组。':reason==='break'?'断线了，钓组与鱼饵已丢失，请装上备用钓组。':reason==='snag'?'钓组挂底丢失，请装上备用钓组。':reason==='miss'?'鱼松口了。':'鱼脱钩了。','escape');}
 keepCatch(){return this.resolveCatch(true);}
 releaseCatch(){return this.resolveCatch(false);}
 resolveCatch(keep){const s=this.state;if(s.fishState!=='landed'||!s.fish)return{ok:false,message:''};if(keep&&cargoWeight(s.catches)+s.fish.kg>this.stats.capacity)return this.notify('冰箱装不下了，可以记录并放流。',null,false);const f={...s.fish,catchId:`pixel-${Date.now()}-${s.profile.nextCatch++}`,kept:keep,time:s.clock,fightSeconds:Math.round(s.fightTime)};s.catches.push(f);const reward=keep?0:settleFish(s.profile,f),finePayment=keep?0:this.payFineDebt();damageSupplies(s.profile,s.profile.loadout.rod,'catch');s.fishState='idle';this.retrieve();this.journal(`${keep?'留鱼':'放流'} ${fishDisplayName(f)} · ${formatLength(f.length)} / ${formatWeight(f.kg)}。`);return this.notify(keep?'鱼获已装箱，返航后去小屋兑换。':`记录并放流，入账 ${Math.max(0,reward-finePayment)} 潮汐点${finePayment?`，另有 ${finePayment} 点抵扣罚款`:''}。`);}
 unsettledCargo(){const s=this.state;return s.catches.filter(f=>f.kept&&!f.settled&&!f.confiscated&&!(f.catchId&&s.profile.settled.includes(f.catchId)));}
 needsLandingInspection(){const s=this.state,cargo=this.unsettledCargo();return cargo.length>0&&(s.landingInspection?.status!=='complete'||cargo.some(f=>f.landingInspectionId!==s.landingInspection.id));}
 payFineDebt(){
  const s=this.state,p=s.profile,owed=Math.max(0,Math.ceil(finite(p.fineDebt))),paid=Math.min(Math.max(0,finite(p.credits)),owed);p.fineDebt=owed-paid;
  if(paid){p.credits-=paid;p.transactions.unshift({kind:'inspection_fine_payment',delta:-paid,debt:p.fineDebt,time:this.captureTimestamp()});p.transactions=p.transactions.slice(0,80);}return paid;
 }
 trade(){
  const s=this.state;if(!this.atCounter)return{...this.notify('回小屋找值班员兑换鱼获。',null,false),count:0,total:0};
  const cargo=this.unsettledCargo(),assessment=assessCatchLedger(s.catches),illegal=assessment.violations.some(v=>cargo.includes(s.catches[v.index]));
  // Clearance is tied to this landing and these actual fish. A counter visit,
  // rescue, old save or missing patrol boat must never bypass the inspection.
  if(this.needsLandingInspection()||illegal){this.patrol.beginLanding(s);return{...this.notify('请关闭窗口，先接受码头鱼警检查。','inspection-required',false),count:0,total:0};}
  if(this.inspectionPending())return{...this.notify('请关闭窗口，等鱼警检查结束后再兑换。','inspection-required',false),count:0,total:0};
  let count=0,grossTotal=0;for(const f of cargo){const n=settleFish(s.profile,f);if(n){count++;grossTotal+=n;}}
  const finePayment=this.payFineDebt(),total=Math.max(0,grossTotal-finePayment),message=count?`兑换 ${count} 条鱼，入账 ${total} 潮汐点${finePayment?`，另有 ${finePayment} 点抵扣罚款`:''}。`:'冰箱里没有待兑换的鱼获。';
  if(count)this.journal(message);return{...this.notify(message),count,total,grossTotal,finePayment,fineDebt:s.profile.fineDebt};
 }
 dock(){const s=this.state;if(s.mode!=='boat'||s.paused||s.docking||this.inspectionChecking()||s.fishState!=='idle'||Math.hypot(s.boatX-HARBOR.boatX,s.boatZ-HARBOR.boatZ)>=16||Math.abs(s.speed)>=.85)return this.notify('靠近登船平台，减速后靠泊。',null,false);s.engine=false;s.throttle=0;s.anchor=false;s.waypoint=null;s.waterRoute=[];s.docking={fromX:s.boatX,fromZ:s.boatZ,fromHeading:s.heading,progress:0,duration:Math.max(4,Math.hypot(s.boatX-HARBOR.boatX,s.boatZ-HARBOR.boatZ)/.55)};return this.notify('慢慢靠泊，准备上岸。');}
 // Compatibility with old controls: the angler stays at the controls aboard.
 stand(){return{ok:false,message:''};}
 // The pixel edition no longer enters water.
 enterWater(){return{ok:false,message:''};}
 jump(){return{ok:false,message:''};}
 reboard(){return{ok:false,message:''};}

 rescue(){const s=this.state,stage=s.rentalPaid&&['lowering','afloat'].includes(s.launchStage)?s.launchStage:'stored',progress=stage==='lowering'?s.launchProgress:0;this.retrieve();this.clearWalking();Object.assign(s,{mode:'walk',playerX:HARBOR.spawnX,playerZ:HARBOR.spawnZ,boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,heading:0,speed:0,engine:false,throttle:0,moored:true,anchor:false,swim:null,standing:false,docking:null,waypoint:null,waterRoute:[],walkRoute:[],autoWalk:false,launchStage:stage,launchProgress:progress,loaded:false});syncVessel(this.vessel,{x:s.boatX,z:s.boatZ,heading:0,clearMotion:true});this.journal('使用免费游戏救援返回码头。');return this.notify('你和木艇已返回码头。');}
 pause(value=true){this.state.paused=Boolean(value);if(this.state.castFlight?.version!==1)this.cancelCast();this.state.reeling=false;this.state.pumping=false;this.state.crankRate=0;}
 snapshot(){this.rememberHookBait();const copy=clone(this.state);copy.events=[];copy.toast='';copy.toastId=0;return copy;}

 step(dt,input={}){
  const s=this.state;
  // Discard old deck-walking posture even while a menu pauses the simulation.
  s.anchor=false;s.moored=s.mode!=='boat';
  if(s.mode==='boat'){s.standing=false;s.deckX=0;s.deckZ=.8;s.walking=false;}
  if(s.mode==='intro'||s.paused||!Number.isFinite(dt)||dt<=0)return s;dt=Math.min(.25,dt);s.time+=dt;s.elapsed+=dt;s.gameElapsed+=dt*GAME_TIME_SCALE;s.clock=this.clock();s.walking=false;
  if(!s.rentalPaid&&s.launchStage!=='stored'){s.launchStage='stored';s.launchProgress=0;}
  if(s.launchStage==='lowering'){s.launchProgress=Math.min(1,s.launchProgress+dt/24);if(s.launchProgress===1){s.launchStage='afloat';s.launchProgress=0;this.notify('木艇已下水，可以登船。');}}
  if(s.docking){this.stepDocking(dt);this.stepPatrol(dt);return s;}
  this.stepBoat(dt,input);
  if(s.pendingRodPickup){if(s.mode!=='boat'||s.docking||this.inspectionChecking())s.pendingRodPickup=false;else if(Math.abs(s.throttle)>.01)s.pendingRodPickup=false;else if(Math.abs(s.speed)<=1.2)this.setRodMount('hand');}
  if(s.mode==='walk')this.stepWalking(dt,input);
  else if(s.mode==='swim')this.rescue();
  this.stepFishing(dt,input);s.rodTipMotion=stepRodTip(s,dt);this.stepPatrol(dt);return s;
 }
 clock(){if(!this.state.dayStartAt)return'06:00:00';return pacificClock.format(new Date(this.captureTimestamp()));}
 stepWalking(dt,input){const s=this.state;let dx=finite(input.moveX),dz=finite(input.moveZ),magnitude=Math.hypot(dx,dz);if(magnitude>.05){this.clearWalking();if(magnitude>1){dx/=magnitude;dz/=magnitude;}}else{
   if(s.walkPending){
    if(!this.walkSearch){this.clearWalking();return;}
    const result=advanceGroundWalk(this.walkSearch,{now:()=>this.walkSearchNow()});if(!result.done)return;
    this.walkSearch=null;s.walkPending=false;if(!result.value.route){this.clearWalking();this.notify('这边暂时走不过去。',null,false);return;}s.walkRoute=result.value.route;
   }
   if(!s.walkRoute.length)return;let target=s.walkRoute[0],d=Math.hypot(target.x-s.playerX,target.z-s.playerZ);
   // The stair is only 1.4 m wide. Reach its actual vertices: accepting a point
   // 12 cm early cuts a diagonal over the connector/landing edge. Movement is
   // still capped to the physical walking speed; this does not teleport.
   while(d<1e-6){s.walkRoute.shift();if(!s.walkRoute.length){const arrival=s.walkArrival||'ground';this.clearWalking();s.arrival=arrival;return;}target=s.walkRoute[0];d=Math.hypot(target.x-s.playerX,target.z-s.playerZ);}
   dx=(target.x-s.playerX)/d;dz=(target.z-s.playerZ)/d;const maxMove=WALK_SPEED*(1-this.stats.weight*.002)*dt;if(d<maxMove){dx*=d/maxMove;dz*=d/maxMove;}}
  const speed=WALK_SPEED*(1-this.stats.weight*.002),startX=s.playerX,startZ=s.playerZ,targetX=startX+dx*speed*dt,targetZ=startZ+dz*speed*dt,steps=Math.max(1,Math.ceil(Math.hypot(targetX-startX,targetZ-startZ)/.025));
  // Sweep the whole movement, so a fast diagonal cannot skip a narrow water
  // gap. Stop at the last safe point rather than entering a swimming mode.
  let x=startX,z=startZ,previousHeight=walkHeight(x,z),blocked=false;
  for(let i=1;i<=steps;i++){const nextX=startX+(targetX-startX)*i/steps,nextZ=startZ+(targetZ-startZ)*i/steps,nextHeight=walkHeight(nextX,nextZ);if(!walkAllowed(nextX,nextZ)||walkBlocked(nextX,nextZ)||Math.abs(nextHeight-previousHeight)>.3){blocked=true;break;}x=nextX;z=nextZ;previousHeight=nextHeight;}
  const moved=Math.hypot(x-startX,z-startZ);if(moved>1e-8){s.walked+=moved;s.playerX=x;s.playerZ=z;s.yaw=Math.atan2(-dx,-dz);s.walking=true;}
  if(blocked&&s.autoWalk)this.clearWalking();
 }

 stepBoat(dt,input){const s=this.state;if(!this.rentalReady){this.stopPropulsion();s.speed=0;s.moored=true;s.navigationScale=1;return;}if(this.inspectionChecking()){this.stopPropulsion();input={};}else{s.engine=true;}s.navigationScale=clamp(finite(this.navigationScale(s),1),1,2);const total=dt*s.navigationScale,count=Math.max(1,Math.ceil(total/.1));for(let i=0;i<count;i++)this.stepBoatPhysics(total/count,input);}
 stepBoatPhysics(dt,input){const s=this.state,v=this.vessel;if(s.mode!=='boat'){s.speed=0;return;}let steer=s.mode==='boat'?clamp(finite(input.steer),-1,1):0;const manualThrottle=Number.isFinite(input.throttle)&&s.mode==='boat';
  if(Math.abs(steer)>.08||manualThrottle){if(s.waypoint)s.throttle=0;s.waypoint=null;s.waterRoute=[];}
  if(manualThrottle&&s.engine){s.throttle=clamp(input.throttle,-.3,1);this.transientThrottle=true;}
  else if(this.transientThrottle){s.throttle=0;this.transientThrottle=false;}
  // Joystick throttle is momentary. The separate setThrottle() slider method
  // is persistent, while an untouched assisted route owns its own throttle.

  const contactOptions={dt,extraPenetration:(x,z)=>Math.max(0,.7-(depthInfoAt(x,z).value??99))};
  if(s.waypoint&&s.waterRoute.length){const final=s.waterRoute.length===1,control=contactAwareControl(v,vesselAutopilot(v,s.waterRoute[0],{final}),contactOptions);steer=control.steer;s.throttle=control.throttle;if(control.arrived){s.waterRoute.shift();if(!s.waterRoute.length){s.arrival=s.waypoint.returning?'dock':'fishing';s.phase=s.waypoint.returning?'return':'fish';s.waypoint=null;s.throttle=0;s.engine=false;this.notify(s.arrival==='dock'?'到码头了，停稳后靠泊。':'抵达钓点，已回空挡，等船慢下来。');}}}
  if(!this.canOperateHelm){s.throttle=0;s.waypoint=null;s.waterRoute=[];steer=0;}else if(s.fishState!=='idle'){s.throttle=clamp(s.throttle,0,MAX_TROLL_THROTTLE);}
  const before={x:v.x,z:v.z,heading:v.heading};stepVessel(v,{dt,time:s.time,engine:s.engine,throttle:s.fishState!=='idle'&&Math.abs(s.speed)>MAX_TROLL_SPEED_MPS?0:s.throttle,steer,anchor:false,payloadKg:s.loaded?this.stats.weight+cargoWeight(s.catches):0,crewKg:s.mode==='boat'?82:0,crewX:0,crewZ:.9,seaAnchor:false,currentX:fishingCurrent(this.conditions).x,currentZ:fishingCurrent(this.conditions).z,...vesselWind(this.conditions.windKnots,this.conditions.windDirection)});
  resolveVesselContact(v,before,contactOptions);if(v.x<MAP_BOUNDS.minX||v.x>MAP_BOUNDS.maxX||v.z<MAP_BOUNDS.minZ||v.z>MAP_BOUNDS.maxZ){syncVessel(v,{...before});s.throttle=0;s.waypoint=null;s.waterRoute=[];this.notify('已到海图资料边缘。');}
  s.sailed+=Math.hypot(v.x-before.x,v.z-before.z);s.boatX=v.x;s.boatZ=v.z;s.heading=v.heading;s.speed=v.speed;s.tiller=v.tiller;s.roll=v.roll;s.pitch=v.pitch;
 }
 stepDocking(dt){const s=this.state,d=s.docking;d.progress=Math.min(1,d.progress+dt/d.duration);s.boatX=d.fromX+(HARBOR.boatX-d.fromX)*d.progress;s.boatZ=d.fromZ+(HARBOR.boatZ-d.fromZ)*d.progress;s.heading=d.fromHeading*(1-d.progress);s.speed=0;if(d.progress===1){s.docking=null;s.moored=true;s.mode='walk';s.playerX=HARBOR.boardingX;s.playerZ=HARBOR.boardingZ;s.yaw=0;s.loaded=false;s.standing=false;s.tripComplete=true;s.phase='complete';syncVessel(this.vessel,{x:s.boatX,z:s.boatZ,heading:0,clearMotion:true});this.patrol.beginLanding(s,{force:true});this.journal('平安靠泊，鱼警正在检查本次鱼获。');this.notify('已上岸，鱼警正在检查鱼获。','inspection');}}
 stepFishing(dt,input){
  const s=this.state;if(s.fishState==='flight'&&s.castFlight?.version===1){Object.assign(s,stepCast(s,dt));return;}if(s.casting||s.castFlight||['casting','flight'].includes(s.fishState)){this.cancelCast();return;}
  const active=['sinking','waiting','bite','fight'].includes(s.fishState)&&!this.inspectionChecking(),setting=active&&s.fishState==='bite'&&s.hookSetSeconds>0;s.crankRate=active?Math.max(reelTurnsPerSecond(input.reel??input.reeling),setting?1.2:0):0;if(setting)s.hookSetSeconds=Math.max(0,s.hookSetSeconds-dt);if(s.crankRate>0&&s.rodMount!=='hand'){if(Math.abs(s.throttle)<=.01&&Math.abs(s.speed)<=1.2)this.setRodMount('hand');else s.crankRate=0;}s.reeling=s.crankRate>0;s.pumping=active&&(Boolean(input.pump??input.pumping)||setting&&getRigProfile(s.rig).hookStyle!=='circle');
  if(!active){s.lureVerticalSpeedMps=0;return;}
  const env=this.rigEnvironment(),eq=this.stats,previousLureDepth=s.lureDepth;let pull=null;
  if(s.fishState==='bite'){const f=this.ensureBitingFish();if(!f){this.escape('miss');return;}pull=Math.max(.1,Math.min(8,.6+Math.pow(f.kg,.65)*1.4)+fishTipSignal(s).force*.32);}
  if(s.fishState==='fight'){s.fightTime+=dt;const response=stepFishFight(s.fish,s.fishFight,{dt,time:s.fightTime,rodLoadN:s.rodLoadN,payoutRate:s.payoutRate,retrieveRate:s.retrieveRate,lineSlackMeters:s.lineSlackMeters,lureDepth:s.lureDepth,fishHeight:s.bobber?.height,paidLineMeters:s.paidLineMeters});s.fishFight=response.fight;s.fishMotion=response.motion;s.fishPullN=pull=response.pullN;s.stamina=response.fight.energy*100;}
  Object.assign(s,stepFishingLine(s,{dt,environment:env,current:fishingCurrent(this.conditions),velocity:this.vessel,retrieve:eq.retrieve,strength:eq.strength,sensitivity:eq.sensitivity,smooth:eq.smooth,fishPullN:pull,fishMotion:s.fishMotion}));
  s.lureVerticalSpeedMps=dt>0?(previousLureDepth-s.lureDepth)/dt:0;env.lureVerticalSpeedMps=s.lureVerticalSpeedMps;
  // Virtual starter main line is 20 lb, leader 15 lb; knot efficiency .75 is a
  // conservative simulation assumption, not a guarantee for a purchased line.
  const mainLb=s.profile.loadout.line==='line_braid'?30:20,leaderLb=s.profile.loadout.leader==='leader_heavy'?30:15;
  s.lineBreakingN=Math.min(mainLb,leaderLb)*4.44822*.75;s.tension=clamp(s.rodLoadN/s.lineBreakingN*100,0,150);
  if(s.fishState==='sinking'||s.fishState==='waiting'){
   if(s.snagged){
    const wear=stepSnagAbrasion(s,{dt,lineBreakingN:s.lineBreakingN,driftSpeedMps:env.driftSpeedMps,waveHeight:env.waveHeight});s.snagAbrasion=wear.snagAbrasion;s.tension=clamp(s.rodLoadN/wear.effectiveBreakingN*100,0,150);
    if(s.tension>96&&s.lineSlackMeters<.08)s.breakMeter+=dt;else s.breakMeter=Math.max(0,s.breakMeter-dt*2);
    if(s.breakMeter>1.2){this.escape('snag-break');return;}
    s.fishState='waiting';return;
   }
   if(s.reeling&&s.paidLineMeters<=.35&&s.lureDepth<.2){this.retrieve();return;}
   const presentation=s.rigPresentation,contact=stepBottomSnag(s,env,dt);Object.assign(s,contact);presentation.snagRiskPerSecond=contact.snagRiskPerSecond;
   if(s.snagged){s.snagPoint={...s.bobber};s.snagStretchMeters=0;s.snagAbrasion=0;s.breakMeter=0;s.fishState='waiting';s.biteTimer=0;this.stopPropulsion();this.journal('钓组卡在海底结构中。');return;}
   if(s.baitOnHook&&s.baitOnHook.kind!=='jig')s.baitOnHook.condition=Math.max(0,s.baitOnHook.condition-dt*.0005);const hasAttractant=!rigRequiresBait(s.rig)||(s.baitOnHook?.condition??0)>USABLE_CONDITION;if(hasAttractant)s.biteTimer+=dt*fishEncounter(this.fishingCandidates(env),{...env,lureDepth:s.lureDepth}).ratePerSecond;
   s.fishState=Math.abs(s.lureDepth-presentation.targetDepth)<.25?'waiting':'sinking';
   if(hasAttractant&&s.biteTimer>s.biteAt&&s.lureDepth>.15){s.biteTrolling=s.engine&&Math.abs(s.speed)>.25&&s.rodMount!=='hand';s.fishState='bite';s.biteTimer=0;if(!this.ensureBitingFish()){s.fishState='waiting';return;}s.throttle=0;s.waypoint=null;s.waterRoute=[];this.transientThrottle=false;this.notify(s.rodMount==='hand'?'鱼讯，稳稳收线。':'竿尖有鱼讯，拿起鱼竿！','bite');}
  }else if(s.fishState==='bite'){
   const profile=s.biteHold.profile,before=s.biteTimer;s.biteTimer+=dt;
   // Pressure seats a hook. Time alone or an open spool cannot do so.
   const engaged=s.reelMode==='brake'&&s.lineSlackMeters<.35&&s.rodLoadN>=.35;
   s.biteEngagement=engaged?s.biteEngagement+dt*(s.reeling?1.5:1):Math.max(0,s.biteEngagement-dt);
   if(s.biteEngagement>=profile.engageSeconds){this.hook({automatic:true});return;}
   // Species-dependent bait rejection is separate from losing a hooked fish.
   // Rates are calibrated gameplay hazards, never claimed as field percentages.
   s.biteExposure+=(Math.max(0,s.biteTimer-1.5)-Math.max(0,before-1.5))*profile.biteLossRate*(engaged?.2:1);
   if(s.biteExposure>s.biteHold.threshold)this.escape('miss');
  }
  else if(s.fishState==='fight'){
   if(s.tension>96||(s.paidLineMeters>=MAX_PAID_LINE_METERS-.01&&s.lineSlackMeters<.1&&s.fishPullN>s.lineBreakingN)){s.breakMeter+=dt;if(s.breakMeter>1.9){this.escape('break');return;}}else s.breakMeter=Math.max(0,s.breakMeter-dt*2);
   s.hookHold??={...createHookHold(s.fish,getRigProfile(s.rig),this.rng()),wireDamage:s.profile.rodSupplies[s.profile.loadout.rod]?.hookDamage||0};
   const retention=stepHookHold(s.hookHold,{dt,rodLoadN:s.rodLoadN,lineSlackMeters:s.lineSlackMeters,headShake:s.fishMotion?.headShake});s.hookHold=retention.hold;const supply=s.profile.rodSupplies[s.profile.loadout.rod];if(supply)supply.hookDamage=Math.max(supply.hookDamage||0,retention.hold.wireDamage);if(retention.lost){this.escape(retention.lostReason);return;}
   if(canLandFish(s)){s.fishState='landed';s.reeling=false;s.pumping=false;s.crankRate=0;s.payoutRate=0;s.retrieveRate=0;s.fishMotion=null;this.notify(`${fishDisplayName(s.fish)} 上船了！`,'catch');return;}
  }
 }
 stepPatrol(dt){
  const s=this.state;this.payFineDebt();
  // Rescue and old dockside saves also pass through shore inspection. Empty
  // fresh starts are exempt; actual dockings are checked even with no cargo.
  if(s.mode==='walk'&&!s.docking&&this.needsLandingInspection())this.patrol.beginLanding(s);
  const events=this.patrol.update(s,dt,{assessment:()=>assessCatchLedger(s.catches)});
  for(const event of events){
   if(event.type==='inspection-start'){this.stopPropulsion();s.reeling=false;s.pumping=false;if(s.fishState!=='landed'&&s.fishState!=='idle'){this.retrieve();}if(event.reason==='landing')this.notify('鱼警正在检查本次带回的鱼获。','inspection');}
   if(event.type!=='inspection-result')continue;
   const assessment=assessCatchLedger(s.catches),cargo=this.unsettledCargo(),violations=event.violations.filter(v=>cargo.includes(s.catches[v.index])),indices=[...new Set(violations.map(v=>v.index).filter(Number.isInteger))],confiscated=[];
   for(const index of indices){const f=s.catches[index];if(!f?.kept||f.settled||f.confiscated)continue;f.confiscated=true;f.settled=true;f.reward=0;f.confiscatedAt=this.captureTimestamp();if(f.catchId&&!s.profile.settled.includes(f.catchId))s.profile.settled.push(f.catchId);confiscated.push({index,catchId:f.catchId,name:f.name,kg:f.kg});}
   // This fixed virtual-credit penalty is game balancing, not a California
   // statutory fine. Fish are marked settled before charging to make retries
   // and saved inspection recovery idempotent. No real-world money is used.
   const fine=confiscated.length*100;s.profile.fineDebt=Math.max(0,finite(s.profile.fineDebt))+fine;
   if(fine){s.profile.transactions.unshift({kind:'inspection_fine',inspectionId:event.id,catchIds:confiscated.map(f=>f.catchId),fine,delta:0,time:this.captureTimestamp()});s.profile.transactions=s.profile.transactions.slice(0,80);}
   const paid=this.payFineDebt(),debt=s.profile.fineDebt;
   s.lastInspection={id:event.id,reason:event.reason,checkedAt:this.captureTimestamp(),ruleset:assessment.ruleset,violations,unsupported:assessment.unsupported,confiscated,fine,paid,debt};
   if(event.reason==='landing'){for(const f of this.unsettledCargo())f.landingInspectionId=event.id;s.landingInspection={id:event.id,status:'complete',checkedAt:s.lastInspection.checkedAt};}
   const message=confiscated.length?`鱼警没收 ${confiscated.length} 条违规鱼获，罚款 ${fine} 潮汐点（游戏积分）；已扣 ${paid} 点${debt?`，待缴 ${debt} 点`:''}。`:event.reason==='landing'?'鱼警检查完毕，鱼获可以兑换。':'例行检查结束，可以继续航程。';this.journal(message);this.notify(message,'inspection');
  }
 }
 interaction(){const s=this.state;if(s.mode==='walk'){if(this.atCounter)return'码头小屋';if(canBoardFrom(s.playerX,s.playerZ))return s.launchStage==='afloat'?'登船':'等候吊艇';return'';}if(s.mode==='boat'){if(s.docking)return'正在靠泊';if(s.fishState==='bite')return'提竿！';if(s.fishState==='idle'&&Math.hypot(s.boatX-HARBOR.boatX,s.boatZ-HARBOR.boatZ)<16&&Math.abs(s.speed)<.85)return'靠泊上岸';}return'';}
 publicState(){
  const s=this.state,p=s.mode==='walk'?{x:s.playerX,z:s.playerZ}:s.mode==='swim'?s.swim:{x:s.boatX,z:s.boatZ},nav=this.navigationInstruments(),fish=s.fish?clone(s.fish):null;if(fish&&!nav.gps)delete fish.caughtGPS;
  const presentation=s.rigPresentation?{...s.rigPresentation,depth:nav.sounder?s.rigPresentation.depth:null,targetDepth:nav.sounder?s.rigPresentation.targetDepth:null}:null;
  return{edition:'pixel',renderer:'Canvas 2D',version:5,mode:s.mode,phase:s.phase,time:s.clock,dayStartAt:s.dayStartAt,activeSeconds:Math.round(s.elapsed),gameSeconds:Math.round(s.gameElapsed),timeScale:GAME_TIME_SCALE,position:{x:round(p.x),z:round(p.z)},boat:{x:round(s.boatX),z:round(s.boatZ),heading:nav.compass||nav.gps?round(s.heading,3):null},navigation:nav,navigationScale:s.navigationScale,gps:nav.gpsPosition,referenceDepth:nav.depth,launchStage:s.launchStage,rentalPaid:s.rentalPaid,rentalPrice:BOAT_RENTAL_PRICE,launchProgress:round(s.launchProgress,2),packed:[...s.packed],profile:{credits:s.profile.credits,fineDebt:s.profile.fineDebt||0,owned:[...s.profile.owned],stock:{...s.profile.stock},loadout:{...s.profile.loadout}},activeRod:s.profile.loadout.rod,hasElectricReel:this.hasElectricReel,snagged:Boolean(s.snagged),bottomSlackSeconds:round(s.bottomSlackSeconds,2),snagAbrasion:round(s.snagAbrasion,3),rodAssemblies:clone(s.profile.rodLoadouts||{}),rodSupplies:clone(s.profile.rodSupplies||{}),rigStock:clone(s.profile.rigStock||{}),consumables:this.rodConsumableStatus(),loaded:s.loaded,moored:s.moored,engine:s.engine,throttle:round(s.throttle,2),canOperateHelm:this.canOperateHelm,anchor:s.anchor,hasAnchor:false,speedKnots:nav.speedKnots==null?null:round(nav.speedKnots),fuel:Math.round(s.fuel),standing:s.standing,swim:s.swim?clone(s.swim):null,waypoint:s.waypoint?.name||null,autoWalking:s.autoWalk,walkPending:s.walkPending,walkDestination:s.autoWalk?{...(s.walkTarget||s.walkRoute.at(-1))}:null,arrival:s.arrival,fishState:s.fishState,casting:s.casting,castPower:round(s.castPower,2),castFlight:s.castFlight?clone(s.castFlight):null,lineEndpoint:s.bobber?clone(s.bobber):null,rig:s.rig,rigWeightGrams:s.rigWeightGrams,fishingDepthMeters:s.fishingDepthMeters,rigPresentation:presentation,hookCount:getRigProfile(s.rig).hooks,hookSize:getRigProfile(s.rig).hookSize,hookFit:s.biteHold?.profile?{mouthFit:round(s.biteHold.profile.mouthFit,3),purchase:round(s.biteHold.profile.purchase,3),seatChance:round(s.biteHold.profile.seatChance,3),canSeat:s.biteHold.canSeat}:null,hookHold:s.hookHold?{purchase:round(s.hookHold.profile.purchase,3),wireStrengthN:round(s.hookHold.profile.wireStrengthN,2),wireDamage:round(s.hookHold.wireDamage,3)}:null,rodElevation:s.rodElevation,rodAzimuth:s.rodAzimuth,rodMount:s.rodMount,reelMode:s.reelMode,rodBend:round(s.rodBend,3),rodTipMotion:s.rodTipMotion?{...s.rodTipMotion}:null,rodLoadN:round(s.rodLoadN,2),fishPullN:round(s.fishPullN,2),fishMotion:s.fishMotion?{...s.fishMotion}:null,dragThresholdN:round(s.dragThresholdN,2),crankRate:round(s.crankRate,2),payoutRate:round(s.payoutRate,2),retrieveRate:round(s.retrieveRate,2),lineSlackMeters:round(s.lineSlackMeters,2),maxPaidLineMeters:MAX_PAID_LINE_METERS,paidLineMeters:round(s.paidLineMeters),tension:Math.round(s.tension),stamina:Math.round(s.stamina),lineDistance:round(s.lineDistance),lureDepth:nav.sounder?round(s.lureDepth):null,fish,casts:s.casts,catches:s.catches.map(f=>({name:f.name,commonName:fishCommonName(f),length:f.length,kg:f.kg,kept:f.kept,settled:Boolean(f.settled),confiscated:Boolean(f.confiscated),caughtAt:f.caughtAt,rig:f.rig,hookCount:f.hookCount})),inspection:s.inspection?clone(s.inspection):null,lastInspection:s.lastInspection?clone(s.lastInspection):null,misses:s.misses,breaks:s.breaks,sailedMeters:Math.round(s.sailed),walkedMeters:Math.round(s.walked),paused:s.paused,interaction:this.interaction(),tripComplete:s.tripComplete,conditions:{...this.conditions}};
 }

}
