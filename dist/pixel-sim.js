/** Pixel gameplay. Geographic coordinates are metres; offshore navigation is compressed 1:2, while clock/fishing/swimming remain 1:1. */
import {GEAR_CATALOG,BASE_GEAR,createProfile,equipmentStats,cargoWeight,settleFish,buyGear as purchaseGear,restock} from './equipment.js?v=20260927-pixel-v3';
import {HARBOR,BOARDING_WALK_PATH,walkHeight,walkAllowed,walkBlocked,clearWalkSegment,canBoardFrom,harborWaterBlocked} from './harbor-layout.js?v=20260927-pixel-v3';
import {FISHING_SPOTS,toGPS,bearingDegrees,onLand,onPier,MAP_BOUNDS} from './geography.js?v=20260927-pixel-v3';
import {depthAt,depthInfoAt} from './bathymetry.js?v=20260927-pixel-v3';
import {waterRoute,resolveVesselContact,contactAwareControl} from './navigation.js?v=20260927-pixel-v3';
import {createVesselState,stepVessel,syncVessel,vesselWind,vesselAutopilot} from './vessel-physics.js?v=20260927-pixel-v3';
import {newImmersion,stepImmersion,ladderPoint} from './swimming.js?v=20260927-pixel-v3';
import {RIG_PROFILES,getRigProfile,stepRigLure,weightedRigFish} from './fishing-rigs.js?v=20260927-pixel-v3';
import {assessCatchLedger,identifyRegulatedSpecies} from './fishing-regulations.js?v=20260927-pixel-v3';
import {FishingPatrol} from './fish-patrol.js?v=20260927-pixel-v3';
import {navigationStepScale} from './pixel-navigation-scale.js?v=20260927-pixel-v3';
export {GEAR_CATALOG,BASE_GEAR,HARBOR,BOARDING_WALK_PATH,FISHING_SPOTS};
export const PIXEL_FISH=[
 {name:'蓝岩鱼',latin:'Sebastes mystinus',color:'#718ba8',min:22,max:39,weight:.7,power:.86,spot:'kelp',bait:'squid'},
 {name:'铜岩鱼',latin:'Sebastes caurinus',color:'#cc9869',min:27,max:48,weight:1.3,power:1.03,spot:'reef',bait:'squid'},
 {name:'加州大比目鱼',latin:'Paralichthys californicus',color:'#a6aa74',min:38,max:69,weight:2.5,power:1.2,spot:'sand',bait:'anchovy'},
 {name:'太平洋鲭鱼',latin:'Scomber japonicus',color:'#73b8c1',min:25,max:38,weight:.6,power:.8,spot:'sand',bait:'jig'},
 {name:'长蛇齿单线鱼',latin:'Ophiodon elongatus',color:'#8ba878',min:40,max:65,weight:2.8,power:1.32,spot:'reef',bait:'jig'},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clone=v=>JSON.parse(JSON.stringify(v));
const rigItem=Object.fromEntries(Object.values(RIG_PROFILES).map(r=>[r.id,r.item]));
const round=(n,d=1)=>Number(finite(n).toFixed(d));
function safeWalkSegment(a,b){
 if(!clearWalkSegment(a,b))return false;
 // The shared 3D helper samples every 15 cm. A diagonal can cross the small
 // open-water notch beside the stair between samples; tighten assisted-path
 // clearance so a user never falls because the guide cut that corner.
 const length=distance(a,b),n=Math.max(1,Math.ceil(length/.025)),px=-(b.z-a.z)/(length||1)*.1,pz=(b.x-a.x)/(length||1)*.1;
 for(let i=0;i<=n;i++){const t=i/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;for(const side of[-1,0,1])if(!walkAllowed(x+px*side,z+pz*side)||walkBlocked(x+px*side,z+pz*side))return false;}
 return true;
}
function pacificDayStart(now){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 const base=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),14);
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'2-digit',hourCycle:'h23'}).format(base));
 return new Date(base+(6-hour)*3600000).toISOString();
}
function initialState(profile){return{
 version:4,edition:'pixel',mode:'intro',phase:'walk',time:0,elapsed:0,clock:'06:00:00',paused:false,
 playerX:HARBOR.spawnX,playerZ:HARBOR.spawnZ,yaw:0,walking:false,walkRoute:[],autoWalk:false,
 boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,heading:0,speed:0,tiller:0,roll:0,pitch:0,
 launchStage:'stored',launchProgress:0,loaded:false,moored:true,engine:false,throttle:0,fuel:100,anchor:false,
 standing:false,deckX:0,deckZ:.8,pfd:false,lanyard:true,swim:null,docking:null,
 profile:createProfile(profile),packed:[],rig:'bottom',rigWeightGrams:85,fishingDepthMeters:null,rigPresentation:null,pumpHeight:0,paidLineMeters:0,snagExposure:0,snagThreshold:Infinity,bait:'squid',drag:.48,baitOnHook:null,
 fishState:'idle',casting:false,castPower:0,castFlight:null,bobber:null,lureDepth:0,lineDistance:0,
 tension:0,stamina:100,biteAt:0,biteTimer:0,fish:null,fightTime:0,breakMeter:0,reeling:false,pumping:false,
 waypoint:null,waterRoute:[],catches:[],journal:[],events:[],toast:'',toastId:0,casts:0,misses:0,breaks:0,
 walked:0,sailed:0,tripComplete:false,arrival:null,dayStartAt:null,navigationScale:1,inspection:null,lastInspection:null,
};}

export class PixelSimulation {
 constructor({profile=null,saved=null,rng=Math.random,patrolRng,now=()=>new Date(),navigationScale,conditions={}}={}){
  this.rng=rng;this.now=now;this.navigationScaleOverride=navigationScale;this.saved=saved;this.conditions={windKnots:0,windDirection:315,waveHeight:0,period:9,waterTemp:14,...conditions};
  this.state=initialState(profile||saved?.profile);this.patrol=new FishingPatrol({rng:patrolRng,isWater:(x,z)=>!onLand(x,z)&&!onPier(x,z)&&!harborWaterBlocked(x,z)});this.transientThrottle=false;this.vessel=createVesselState({x:HARBOR.boatX,z:HARBOR.boatZ});
 }
 get inventory(){return this.state.packed;}
 navigationScale(state=this.state){return this.navigationScaleOverride?this.navigationScaleOverride(state):navigationStepScale(state);}
 hasGear(id){const s=this.state;return s.profile.owned.includes(id)&&s.packed.includes(id);}
 navigationInstruments(){const s=this.state,p=s.mode==='walk'?{x:s.playerX,z:s.playerZ}:s.mode==='swim'&&s.swim?s.swim:{x:s.boatX,z:s.boatZ},chart=this.hasGear('nautical_chart'),compass=this.hasGear('compass'),gps=this.hasGear('gps'),sounder=this.hasGear('sounder');return{chart,compass,gps,sounder,heading:compass||gps?bearingDegrees(s.mode==='boat'?s.heading:s.yaw):null,gpsPosition:gps?toGPS(p.x,p.z):null,depth:sounder?depthInfoAt(s.boatX,s.boatZ):null,speedKnots:gps?Math.abs(s.speed)*1.94384:null};}
 captureTimestamp(){return new Date(Date.parse(this.state.dayStartAt)+this.state.elapsed*1000).toISOString();}
 inspectionPending(){return ['approaching','checking'].includes(this.state.inspection?.phase);}
 inspectionChecking(){return this.state.inspection?.phase==='checking';}
 stopPropulsion(){const s=this.state;s.engine=false;s.throttle=0;s.waypoint=null;s.waterRoute=[];this.transientThrottle=false;}

 get stats(){return equipmentStats(this.state.profile,this.state.packed);}
 get atCounter(){const s=this.state;return s.mode==='walk'&&Math.hypot(s.playerX-HARBOR.counterX,s.playerZ-HARBOR.counterZ)<3.2;}
 notify(message,action=null,ok=true){const s=this.state;if(message){s.toast=message;s.toastId++;s.events.push({id:s.toastId,time:s.clock,text:message,action});if(s.events.length>40)s.events.shift();}return{ok,message,action};}
 journal(text){const s=this.state;s.journal.unshift({time:s.clock,text});s.journal=s.journal.slice(0,100);}
 start(resume=false){
  const s=this.state;if(s.mode!=='intro')return this.notify('',null,false);
  if(resume&&this.saved?.edition==='pixel'){
   const p=this.saved;Object.assign(s,clone(p),{profile:createProfile(p.profile),mode:p.mode==='boat'?'boat':'walk',engine:false,throttle:0,speed:0,waypoint:null,waterRoute:[],walkRoute:[],autoWalk:false,casting:false,castFlight:null,bobber:null,fishState:'idle',fish:null,standing:false,swim:null,docking:null,paused:false,time:0,elapsed:0,clock:'06:00:00',events:[],tension:0,lureDepth:0,lineDistance:0,castPower:0,reeling:false,pumping:false,arrival:null});
   s.packed=(p.packed||[]).filter(id=>s.profile.owned.includes(id));s.catches=p.catches||[];
   if(s.mode==='walk'){s.playerX=HARBOR.spawnX;s.playerZ=HARBOR.spawnZ;s.loaded=false;}
   // Restoring an interrupted immersion is the same explicit free recovery as
   // the rescue action: never strand the player ashore with an offshore boat.
   if(p.mode==='swim'){Object.assign(s,{boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,heading:0,moored:true,anchor:false,launchStage:'afloat',launchProgress:0});}
   if(['lowering','raising'].includes(s.launchStage))s.launchStage='afloat';
   if(s.mode==='boat')s.launchStage='afloat';
  }else{s.mode='walk';this.journal('06:00，到达 Santa Cruz Wharf。');}
  syncVessel(this.vessel,{x:s.boatX,z:s.boatZ,heading:s.heading,clearMotion:true});
  this.transientThrottle=false;s.dayStartAt=pacificDayStart(this.now());s.rigWeightGrams=finite(s.rigWeightGrams,getRigProfile(s.rig).defaultWeightGrams);s.rigPresentation=null;s.pumpHeight=0;s.paidLineMeters=0;
  return this.notify(resume&&this.saved?.mode==='swim'?'落水航程已安全恢复到码头，装备与鱼获已保留。':resume?'新的一天，装备与鱼获已保留。':'早上好，码头小屋就在前面。');
 }
 packStarter(){if(!this.atCounter)return this.notify('到小屋柜台整理装备。',null,false);const s=this.state;s.packed=[...new Set([...s.packed,...BASE_GEAR.map(g=>g.id)])];s.pfd=true;restock(s.profile);s.fuel=100;this.journal('带上免费基础装备，补齐鱼饵。');return this.notify('鱼竿、钓组、救生衣与冰箱都带好了。');}
 equip(id){const s=this.state;if(!this.atCounter)return this.notify('到小屋柜台整理装备。',null,false);if(!s.profile.owned.includes(id))return this.notify('储物柜里还没有这件装备。',null,false);s.packed=s.packed.includes(id)?s.packed.filter(x=>x!==id):[...s.packed,id];s.pfd=s.packed.includes('pfd');this.syncLoadout();return this.notify('装备已整理。');}
 syncLoadout(){const s=this.state;const choose=(slot,ids)=>{if(slot!=='rod'||!ids.includes(s.profile.loadout[slot])||!s.packed.includes(s.profile.loadout[slot]))s.profile.loadout[slot]=ids.find(id=>s.packed.includes(id))||null;};choose('rod',['rod_boat','rod_light','rod']);choose('cooler',['cooler_large','cooler']);choose('line',['line_braid']);choose('leader',['leader_heavy']);choose('reel',['reel_smooth']);}
 buyGear(id){if(!this.atCounter)return this.notify('到小屋柜台兑换装备。',null,false);const r=purchaseGear(this.state.profile,id);if(r.ok)this.journal(r.message);return this.notify(r.message,null,r.ok);}
 restock(){if(!this.atCounter)return this.notify('到小屋柜台免费补给。',null,false);restock(this.state.profile);this.state.fuel=100;return this.notify('基础鱼饵与燃油已补齐。');}
 launchBoat(){const s=this.state;if(!this.atCounter)return this.notify('请在小屋柜台请求吊艇。',null,false);if(s.launchStage==='stored'){s.launchStage='lowering';s.launchProgress=0;s.phase='board';this.journal('工作人员操作吊臂下放木艇。');return this.notify('吊臂正在下放空艇，沿左侧台阶去登船。');}if(s.launchStage==='afloat'&&s.moored){return this.notify('木艇已在登船平台等你。');}return this.notify('吊艇正在进行。',null,false);}
 walkTo(destination){
  const s=this.state;if(s.mode!=='walk')return this.notify('先回到岸上。',null,false);
  let target=destination==='counter'?{x:HARBOR.counterX,z:HARBOR.counterZ}:destination==='boarding'?{x:HARBOR.boardingX,z:HARBOR.boardingZ}:destination;
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return this.notify('',null,false);
  const here={x:s.playerX,z:s.playerZ};let route=null;
  if(safeWalkSegment(here,target))route=[{...target}];
  else{
   // The authored narrow stair route prevents cutting across the wharf ledge.
   const points=BOARDING_WALK_PATH,fromHere=points.map(p=>safeWalkSegment(here,p)),toTarget=points.map(p=>safeWalkSegment(p,target));let best=Infinity;
   for(let i=0;i<points.length;i++)if(fromHere[i])for(let j=0;j<points.length;j++)if(toTarget[j]){
    const direction=j>=i?1:-1,candidate=[];for(let k=i;;k+=direction){candidate.push({...points[k]});if(k===j)break;}candidate.push({...target});
    let cost=distance(here,candidate[0]);for(let k=1;k<candidate.length;k++)cost+=distance(candidate[k-1],candidate[k]);if(cost<best){best=cost;route=candidate;}
   }
  }
  if(!route)return this.notify('这边不能直接走过去。',null,false);
  s.walkRoute=route;s.autoWalk=true;s.arrival=null;return this.notify('',destination==='counter'?'walking-counter':'walking-boarding');
 }
 board(){const s=this.state;if(this.inspectionPending())return this.notify('等例行检查结束再出发。',null,false);if(s.mode!=='walk'||!canBoardFrom(s.playerX,s.playerZ))return this.notify('沿左侧台阶走到登船平台。',null,false);if(s.launchStage!=='afloat')return this.notify('等吊臂放稳木艇，再登船。',null,false);s.mode='boat';s.loaded=true;s.moored=true;s.standing=false;s.walkRoute=[];s.autoWalk=false;s.phase='launch';s.tripComplete=false;s.yaw=0;s.inspection=null;this.patrol.resetTrip();this.journal('带上装备，登上木艇。');return this.notify('坐稳了，解开缆绳出发。');}
 unmoor(){const s=this.state;if(s.mode!=='boat'||!s.moored||s.launchStage!=='afloat')return this.notify('',null,false);s.moored=false;return this.notify('缆绳已解开。');}
 interact(){const s=this.state;if(s.paused)return this.notify('',null,false);if(s.mode==='swim')return this.reboard();if(s.mode==='walk'){if(this.atCounter)return{ok:true,action:'staff',message:''};if(canBoardFrom(s.playerX,s.playerZ))return this.board();return this.notify('靠近小屋柜台或左侧登船平台。',null,false);}if(s.mode==='boat'){if(s.moored)return this.unmoor();if(s.fishState==='bite')return this.hook();if(s.fishState==='idle'&&Math.hypot(s.boatX-HARBOR.boatX,s.boatZ-HARBOR.boatZ)<16&&Math.abs(s.speed)<.85)return this.dock();}return this.notify('',null,false);}
 toggleEngine(){const s=this.state;if(this.inspectionChecking())return this.notify('正在进行例行检查。',null,false);if(s.mode!=='boat'||s.standing||s.docking)return this.notify('坐回驾驶座。',null,false);if(s.moored)return this.notify('先解开缆绳。',null,false);if(s.anchor)return this.notify('先起锚。',null,false);if(s.fishState!=='idle')return this.notify('先收回钓组。',null,false);if(s.fuel<=0)return this.notify('燃油用尽，可呼叫免费救援。',null,false);s.engine=!s.engine;s.throttle=0;if(!s.engine){s.waypoint=null;s.waterRoute=[];}return this.notify(s.engine?'发动机已启动。':'发动机已关闭。');}
 setThrottle(value){const s=this.state;if(this.inspectionChecking())return false;if(s.mode!=='boat'||!s.engine||s.moored||s.anchor||s.standing)return false;s.throttle=clamp(finite(value),-.3,1);this.transientThrottle=false;s.waypoint=null;s.waterRoute=[];return true;}
 toggleAnchor(){const s=this.state;if(s.mode!=='boat'||s.moored||s.docking)return this.notify('',null,false);if(s.engine||Math.abs(s.speed)>.85)return this.notify('停机、减速后再下锚。',null,false);s.anchor=!s.anchor;s.waypoint=null;s.waterRoute=[];return this.notify(s.anchor?'锚链缓缓入水。':'锚已收回。');}
 selectWaypoint(destination){
  const s=this.state;if(this.inspectionChecking())return this.notify('正在进行例行检查。',null,false);if(!this.hasGear('nautical_chart'))return this.notify('带上海图后可以标记航线。',null,false);if(s.mode!=='boat'||s.moored||s.standing||s.docking)return this.notify('先登船、解缆并坐稳。',null,false);if(s.fishState!=='idle')return this.notify('先收回钓组。',null,false);if(s.fuel<=0)return this.notify('需要燃油，可使用免费救援。',null,false);
  const target=typeof destination==='object'?{...destination,name:destination.name||'选定水面'}:destination==='dock'?{x:HARBOR.returnX,z:HARBOR.returnZ,name:'租船登船平台',kind:'dock'}:FISHING_SPOTS.find(p=>p.kind===destination);
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return this.notify('没有找到这个钓点。',null,false);
  const route=waterRoute({x:s.boatX,z:s.boatZ},target);if(!route)return this.notify('这条航线无法安全穿过码头。',null,false);
  s.anchor=false;s.engine=true;this.transientThrottle=false;s.waterRoute=route;s.waypoint={...target,returning:destination==='dock'||target.kind==='dock'};s.arrival=null;s.phase=s.waypoint.returning?'return':'launch';this.journal(`航向 ${target.name}。`);return this.notify(`正在驶向 ${target.name}。`);
 }
 setRig({rig=this.state.rig,bait=this.state.bait,drag=this.state.drag,rod=null,weightGrams,fishingDepthMeters}={}){
  const s=this.state;if(s.fishState!=='idle')return this.notify('先收回钓组。',null,false);if(!RIG_PROFILES[rig]||!this.hasGear(rigItem[rig]))return this.notify('没有携带这套钓组。',null,false);if(!(bait in s.profile.stock))return this.notify('没有这种鱼饵。',null,false);if(!(s.profile.stock[bait]>0)&&!(s.baitOnHook?.kind===bait&&s.baitOnHook.condition>.08))return this.notify('这种鱼饵用完了，选择其他鱼饵或回小屋补给。',null,false);if(rod&&(!this.hasGear(rod)||!GEAR_CATALOG.some(g=>g.id===rod&&g.slot==='rod')))return this.notify('没有携带这根船竿。',null,false);
  const previousRig=s.rig,profile=getRigProfile(rig),weight=Number.isFinite(weightGrams)?clamp(weightGrams,1,500):rig===s.rig?finite(s.rigWeightGrams,profile.defaultWeightGrams):profile.defaultWeightGrams;
  if(profile.id==='float'&&weight!==profile.defaultWeightGrams)return this.notify('这枚浮漂使用配套的七克配重。',null,false);
  if(weight!==profile.defaultWeightGrams&&!this.hasGear('sinker_heavy'))return this.notify('需要带上可调铅坠包。',null,false);
  s.rig=rig;s.rigWeightGrams=weight;s.fishingDepthMeters=Number.isFinite(fishingDepthMeters)?clamp(fishingDepthMeters,.25,80):rig===previousRig&&s.fishingDepthMeters!=null?s.fishingDepthMeters:profile.defaultFishingDepth??null;s.bait=bait;s.drag=clamp(finite(drag,.48),.2,.85);s.rigPresentation=null;s.pumpHeight=0;if(rod)s.profile.loadout.rod=rod;return this.notify('钓组已整理好。');
 }

 changeDrag(delta){this.state.drag=clamp(this.state.drag+finite(delta),.2,.85);return this.state.drag;}
 startCast(){const s=this.state;if(this.inspectionChecking())return this.notify('正在进行例行检查。',null,false);if(s.mode!=='boat'||s.paused||s.docking)return this.notify('',null,false);if(s.fishState==='bite')return this.hook();if(['flight','sinking','waiting'].includes(s.fishState))return this.retrieve();if(s.fishState!=='idle')return this.notify('',null,false);if(s.moored)return this.notify('离开登船平台后再抛竿。',null,false);if(s.engine||Math.abs(s.speed)>.9)return this.notify('停机、减速后再抛竿。',null,false);const eq=this.stats;if(!eq.hasRod||!eq.hasRig||!eq.hasBaitBox||!s.packed.includes(rigItem[s.rig]))return this.notify('需要带上鱼竿、钓组和鱼饵盒。',null,false);if((!s.baitOnHook||s.baitOnHook.kind!==s.bait||s.baitOnHook.condition<=.08)&&!(s.profile.stock[s.bait]>0))return this.notify('这种鱼饵用完了，换饵或回小屋补充。',null,false);if(!this.hasGear('sinker_heavy'))s.rigWeightGrams=getRigProfile(s.rig).defaultWeightGrams;s.casting=true;s.castPower=.12;s.fishState='casting';return{ok:true,message:'',action:'casting'};}
 cancelCast(){const s=this.state;if(s.casting){s.casting=false;s.castPower=0;s.fishState='idle';}return{ok:true,message:''};}
 releaseCast(){const s=this.state;if(!s.casting)return{ok:false,message:''};if(s.paused||s.engine||s.moored){this.cancelCast();return{ok:false,message:''};}if(!s.baitOnHook||s.baitOnHook.kind!==s.bait||s.baitOnHook.condition<=.08){s.profile.stock[s.bait]--;s.baitOnHook={kind:s.bait,condition:1};}s.casting=false;s.fishState='flight';s.casts++;s.lureDepth=0;s.pumpHeight=0;s.rigPresentation=null;s.paidLineMeters=0;s.snagExposure=0;s.snagThreshold=-Math.log(clamp(this.rng(),.00001,.99999));s.biteTimer=0;s.lineDistance=8+s.castPower*25;const angle=s.heading+s.yaw,start={x:s.boatX-Math.sin(angle)*1.5,z:s.boatZ-Math.cos(angle)*1.5,height:1.7},vy=4+s.castPower*3,duration=(vy+Math.sqrt(vy*vy+19.62*start.height))/9.81;s.castFlight={t:0,duration,start,vy,endX:s.boatX-Math.sin(angle)*s.lineDistance,endZ:s.boatZ-Math.cos(angle)*s.lineDistance};s.bobber={...start};const {d}=this.nearestSpot();s.biteAt=(24+this.rng()*42+(d>180?22:0))/(.5+.5*s.baitOnHook.condition)/this.stats.sensitivity;s.phase='fish';this.journal(`第 ${s.casts} 次抛竿。`);return this.notify('鱼饵入水，等候鱼讯。');}
 retrieve(){const s=this.state;if(s.fishState==='landed')return this.notify('先决定留下或放流这条鱼。',null,false);s.casting=false;s.castPower=0;s.castFlight=null;s.bobber=null;s.fishState='idle';s.fish=null;s.tension=0;s.lureDepth=0;s.pumpHeight=0;s.rigPresentation=null;s.paidLineMeters=0;s.reeling=false;s.pumping=false;return this.notify('钓组已收回。');}
 nearestSpot(){const s=this.state;let spot=FISHING_SPOTS[0],d=Infinity;for(const p of FISHING_SPOTS){const n=Math.hypot(p.x-s.boatX,p.z-s.boatZ);if(n<d){d=n;spot=p;}}return{spot,d};}
 rigEnvironment(){const s=this.state,p=s.bobber||{x:s.boatX,z:s.boatZ},profile=getRigProfile(s.rig);return{rig:s.rig,bottomDepth:depthAt(p.x,p.z),lureDepth:s.lureDepth,weightGrams:s.rigWeightGrams??profile.defaultWeightGrams,fishingDepthMeters:s.fishingDepthMeters??profile.defaultFishingDepth,currentMps:finite(this.conditions.currentMps,.08),boatSpeedMps:s.speed,lineDiameterMm:this.hasGear('line_braid')?.28:.36,habitat:this.nearestSpot().spot.kind,bait:s.bait,freshness:s.baitOnHook?.condition||.5,retrieveSpeedMps:s.reeling?1.35*this.stats.retrieve:0,pumping:s.pumping};}
 hook(){
  const s=this.state;if(s.fishState!=='bite'||this.inspectionChecking())return{ok:false,message:''};const rig=getRigProfile(s.rig),f=weightedRigFish(PIXEL_FISH,this.rigEnvironment(),this.rng),length=Math.round(f.min+this.rng()*(f.max-f.min)),p=s.bobber||{x:s.boatX,z:s.boatZ};
  s.fish={...f,length,kg:Number((f.weight*Math.pow(length/((f.min+f.max)/2),2.7)).toFixed(2)),caughtAt:this.captureTimestamp(),caughtGPS:toGPS(p.x,p.z),rig:{id:s.rig,hookCount:rig.hooks,lineCount:1,weightGrams:s.rigWeightGrams,fishingDepthMeters:s.fishingDepthMeters,wireLeader:false},hookCount:rig.hooks,lineCount:1,hasDescendingDevice:this.hasGear('descending_device'),landingNetDiameterInches:this.hasGear('net')?20:false,groundfishAboardAtCapture:s.catches.some(c=>c.kept&&!c.settled&&identifyRegulatedSpecies(c)?.groundfish)};
  s.fishState='fight';s.stamina=100;s.tension=34;s.fightTime=0;s.breakMeter=0;s.lineDistance=18+this.rng()*9;return this.notify('中鱼了！收线，留意张力。');
 }

 escape(reason){const s=this.state;s.misses++;if(reason==='break')s.breaks++;if(s.baitOnHook)s.baitOnHook.condition*=.7;this.retrieve();return this.notify(reason==='break'?'断线了，备用子线已接好。':reason==='snag'?'钓组挂底，已换上备用子线。':'鱼跑了，再来一竿。');}
 keepCatch(){return this.resolveCatch(true);}
 releaseCatch(){return this.resolveCatch(false);}
 resolveCatch(keep){const s=this.state;if(s.fishState!=='landed'||!s.fish)return{ok:false,message:''};if(keep&&cargoWeight(s.catches)+s.fish.kg>this.stats.capacity)return this.notify('冰箱装不下了，可以记录并放流。',null,false);const f={...s.fish,catchId:`pixel-${Date.now()}-${s.profile.nextCatch++}`,kept:keep,time:s.clock,fightSeconds:Math.round(s.fightTime)};s.catches.push(f);const reward=keep?0:settleFish(s.profile,f);if(s.baitOnHook)s.baitOnHook.condition*=.45;s.fish=null;s.fishState='idle';s.bobber=null;s.reeling=false;s.pumping=false;s.tension=0;this.journal(`${keep?'留鱼':'放流'} ${f.name} · ${f.length} cm / ${f.kg} kg。`);return this.notify(keep?'鱼获已装箱，返航后去小屋兑换。':`记录并放流，获得 ${reward} 潮汐点。`);}
 trade(){const s=this.state;if(this.inspectionPending())return{...this.notify('例行检查结束后可以兑换鱼获。',null,false),count:0,total:0};if(!this.atCounter)return this.notify('回小屋找值班员兑换鱼获。',null,false);let count=0,total=0;for(const f of s.catches)if(f.kept&&!f.settled){const n=settleFish(s.profile,f);if(n){count++;total+=n;}}if(count)this.journal(`兑换 ${count} 条鱼，获得 ${total} 潮汐点。`);return{...this.notify(count?`兑换 ${count} 条鱼，获得 ${total} 潮汐点。`:'冰箱里没有待兑换的鱼获。'),count,total};}
 dock(){const s=this.state;if(s.mode!=='boat'||s.fishState!=='idle'||Math.hypot(s.boatX-HARBOR.boatX,s.boatZ-HARBOR.boatZ)>=16||Math.abs(s.speed)>=.85)return this.notify('靠近登船平台，减速后靠泊。',null,false);this.patrol.considerDock(s);s.engine=false;s.throttle=0;s.anchor=false;s.waypoint=null;s.waterRoute=[];s.docking={fromX:s.boatX,fromZ:s.boatZ,fromHeading:s.heading,progress:0,duration:Math.max(4,Math.hypot(s.boatX-HARBOR.boatX,s.boatZ-HARBOR.boatZ)/.55)};return this.notify('慢慢靠泊，系好缆绳。');}
 stand(){const s=this.state;if(s.mode==='swim'){s.swim.assist=true;return this.notify('朝船尾梯游过去。');}if(s.mode!=='boat'||s.docking||s.fishState!=='idle')return this.notify('先收回钓组。',null,false);s.standing=!s.standing;s.deckX=0;s.deckZ=.8;s.engine=false;s.throttle=0;s.waypoint=null;s.waterRoute=[];return this.notify(s.standing?'扶稳船舷，慢慢走。':'回到驾驶座。');}
 enterWater(x,z,y){const s=this.state;this.retrieve();s.mode='swim';s.swim=newImmersion(x,z,y,s.pfd);s.standing=false;s.walkRoute=[];s.autoWalk=false;s.waypoint=null;s.waterRoute=[];if(s.lanyard){s.engine=false;s.throttle=0;}this.journal('落水，向船尾梯游去。');return this.notify(s.pfd?'救生衣托住你，慢慢游向船尾梯。':'落水了，尽快游向船尾梯。');}
 jump(){const s=this.state;if(s.mode==='boat'){const p=ladderPoint(s.boatX,s.boatZ,s.heading);return this.enterWater(p.x-1.3*Math.cos(s.heading),p.z+1.3*Math.sin(s.heading),1.4);}if(s.mode==='walk'){for(const angle of[s.yaw,s.yaw+Math.PI/2,s.yaw-Math.PI/2,s.yaw+Math.PI]){const x=s.playerX-Math.sin(angle)*1.8,z=s.playerZ-Math.cos(angle)*1.8;if(!walkAllowed(x,z))return this.enterWater(x,z,walkHeight(s.playerX,s.playerZ)+1.6);}return this.notify('这里离水边还有一段距离。',null,false);}if(s.mode==='swim'){s.swim.assist=!s.swim.assist;return this.notify(s.swim.assist?'朝船尾梯游过去。':'停下来漂浮休息。');}return{ok:false,message:''};}
 reboard(){const s=this.state;if(s.mode!=='swim')return{ok:false,message:''};const p=ladderPoint(s.boatX,s.boatZ,s.heading);if(!s.swim.latched||distance(s.swim,p)>=2.2||s.engine||s.launchStage!=='afloat')return this.notify('游到船尾梯旁，发动机停转后登船。',null,false);s.mode='boat';s.swim=null;s.standing=false;s.loaded=true;s.yaw=0;return this.notify('抓稳梯子，回到船里。');}
 rescue(){const s=this.state;this.retrieve();Object.assign(s,{mode:'walk',playerX:HARBOR.spawnX,playerZ:HARBOR.spawnZ,boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,heading:0,speed:0,engine:false,throttle:0,moored:true,anchor:false,swim:null,standing:false,docking:null,waypoint:null,waterRoute:[],walkRoute:[],autoWalk:false,launchStage:'afloat',launchProgress:0,loaded:false});syncVessel(this.vessel,{x:s.boatX,z:s.boatZ,heading:0,clearMotion:true});this.journal('使用免费游戏救援返回码头。');return this.notify('你和木艇已返回码头。');}
 pause(value=true){this.state.paused=Boolean(value);this.cancelCast();this.state.reeling=false;this.state.pumping=false;}
 snapshot(){const copy=clone(this.state);copy.events=[];copy.toast='';copy.toastId=0;return copy;}

 step(dt,input={}){
  const s=this.state;if(s.mode==='intro'||s.paused||!Number.isFinite(dt)||dt<=0)return s;dt=Math.min(.25,dt);s.time+=dt;s.elapsed+=dt;s.clock=this.clock();s.walking=false;
  if(s.launchStage==='lowering'){s.launchProgress=Math.min(1,s.launchProgress+dt/24);if(s.launchProgress===1){s.launchStage='afloat';s.launchProgress=0;this.notify('木艇已下水，可以登船。');}}
  if(s.docking){this.stepDocking(dt);this.stepPatrol(dt);return s;}
  this.stepBoat(dt,input);
  if(s.mode==='walk')this.stepWalking(dt,input);
  else if(s.mode==='swim')this.stepSwimming(dt,input);
  else if(s.standing)this.stepDeck(dt,input);
  this.stepFishing(dt,input);this.stepPatrol(dt);return s;
 }
 clock(){const seconds=Math.floor(6*3600+this.state.elapsed)%86400;return`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
 stepWalking(dt,input){const s=this.state;let dx=finite(input.moveX),dz=finite(input.moveZ),magnitude=Math.hypot(dx,dz);if(magnitude>.05){s.walkRoute=[];s.autoWalk=false;if(magnitude>1){dx/=magnitude;dz/=magnitude;}}else if(s.walkRoute.length){let target=s.walkRoute[0],d=Math.hypot(target.x-s.playerX,target.z-s.playerZ);
   // The stair is only 1.4 m wide. Reach its actual vertices: accepting a point
   // 12 cm early cuts a diagonal over the connector/landing edge. Movement is
   // still capped to the physical walking speed; this does not teleport.
   while(d<1e-6){s.walkRoute.shift();if(!s.walkRoute.length){s.autoWalk=false;s.arrival=this.atCounter?'counter':'boarding';return;}target=s.walkRoute[0];d=Math.hypot(target.x-s.playerX,target.z-s.playerZ);}
   dx=(target.x-s.playerX)/d;dz=(target.z-s.playerZ)/d;const maxMove=1.45*(1-this.stats.weight*.002)*dt;if(d<maxMove){dx*=d/maxMove;dz*=d/maxMove;}}else return;
  const speed=1.45*(1-this.stats.weight*.002),x=s.playerX+dx*speed*dt,z=s.playerZ+dz*speed*dt;if(walkBlocked(x,z))return;if(!walkAllowed(x,z)){if(s.autoWalk){s.walkRoute=[];s.autoWalk=false;this.notify('栈道边缘，重新选择脚下的路线。');return;}this.enterWater(x,z,walkHeight(s.playerX,s.playerZ)+1.62);return;}const height=walkHeight(x,z)-walkHeight(s.playerX,s.playerZ);if(Math.abs(height)>.4)return;s.walked+=Math.hypot(x-s.playerX,z-s.playerZ);s.playerX=x;s.playerZ=z;s.yaw=Math.atan2(-dx,-dz);s.walking=true;
 }
 stepDeck(dt,input){const s=this.state;s.deckX+=finite(input.moveX)*dt*.8;s.deckZ+=finite(input.moveZ)*dt*.8;s.walking=Boolean(input.moveX||input.moveZ);if(Math.abs(s.deckX)>.76||s.deckZ<-1.9||s.deckZ>1.75){const c=Math.cos(s.heading),a=Math.sin(s.heading);this.enterWater(s.boatX+s.deckX*c+s.deckZ*a,s.boatZ-s.deckX*a+s.deckZ*c,1.5);}}
 stepSwimming(dt,input){const s=this.state,sw=s.swim;let dx=finite(input.moveX),dz=finite(input.moveZ);if(Math.hypot(dx,dz)>.05)sw.assist=false;if(sw.assist){const p=ladderPoint(s.boatX,s.boatZ,s.heading),d=distance(sw,p);if(d>1.1){dx=(p.x-sw.x)/d;dz=(p.z-sw.z)/d;}}const before={x:sw.x,z:sw.z};stepImmersion(sw,{dt,dx,dz,temperature:this.conditions.waterTemp,water:0,windX:.012,windZ:.008});if(onLand(sw.x,sw.z)||onPier(sw.x,sw.z)||harborWaterBlocked(sw.x,sw.z)){sw.x=before.x;sw.z=before.z;}if(dx||dz)s.yaw=Math.atan2(-dx,-dz);}
 stepBoat(dt,input){const s=this.state;if(this.inspectionChecking()){this.stopPropulsion();input={};}s.navigationScale=clamp(finite(this.navigationScale(s),1),1,2);const total=dt*s.navigationScale,count=Math.max(1,Math.ceil(total/.1));for(let i=0;i<count;i++)this.stepBoatPhysics(total/count,input);if(s.engine){s.fuel=Math.max(0,s.fuel-dt*(.0018+Math.abs(s.throttle)*.006));if(!s.fuel){this.stopPropulsion();this.notify('燃油用尽，可呼叫免费救援。');}}}
 stepBoatPhysics(dt,input){const s=this.state,v=this.vessel;if(s.moored){s.speed=0;return;}let steer=s.mode==='boat'&&!s.standing?clamp(finite(input.steer),-1,1):0;const manualThrottle=Number.isFinite(input.throttle)&&s.mode==='boat'&&!s.standing;
  if(Math.abs(steer)>.08||manualThrottle){if(s.waypoint)s.throttle=0;s.waypoint=null;s.waterRoute=[];}
  if(manualThrottle&&s.engine){s.throttle=clamp(input.throttle,-.3,1);this.transientThrottle=true;}
  else if(this.transientThrottle){s.throttle=0;this.transientThrottle=false;}
  // Joystick throttle is momentary. The separate setThrottle() slider method
  // is persistent, while an untouched assisted route owns its own throttle.

  const contactOptions={dt,extraPenetration:(x,z)=>Math.max(0,.7-(depthInfoAt(x,z).value??99))};
  if(s.waypoint&&s.waterRoute.length){const final=s.waterRoute.length===1,control=contactAwareControl(v,vesselAutopilot(v,s.waterRoute[0],{final}),contactOptions);steer=control.steer;s.throttle=control.throttle;if(control.arrived){s.waterRoute.shift();if(!s.waterRoute.length){s.arrival=s.waypoint.returning?'dock':'fishing';s.phase=s.waypoint.returning?'return':'fish';s.waypoint=null;s.throttle=0;s.engine=false;this.notify(s.arrival==='dock'?'到码头了，停稳后靠泊。':'抵达钓点，停机等船慢下来。');}}}
  const before={x:v.x,z:v.z,heading:v.heading};stepVessel(v,{dt,time:s.time,engine:s.engine,throttle:s.throttle,steer,anchor:s.anchor,payloadKg:s.loaded?this.stats.weight+cargoWeight(s.catches):0,crewKg:s.mode==='boat'?82:0,crewX:s.standing?s.deckX:0,crewZ:s.standing?s.deckZ:.9,seaAnchor:s.packed.includes('sea_anchor'),...vesselWind(this.conditions.windKnots,this.conditions.windDirection)});
  resolveVesselContact(v,before,contactOptions);if(v.x<MAP_BOUNDS.minX||v.x>MAP_BOUNDS.maxX||v.z<MAP_BOUNDS.minZ||v.z>MAP_BOUNDS.maxZ){syncVessel(v,{...before});s.throttle=0;s.waypoint=null;s.waterRoute=[];this.notify('已到海图资料边缘。');}
  s.sailed+=Math.hypot(v.x-before.x,v.z-before.z);s.boatX=v.x;s.boatZ=v.z;s.heading=v.heading;s.speed=v.speed;s.tiller=v.tiller;s.roll=v.roll;s.pitch=v.pitch;
 }
 stepDocking(dt){const s=this.state,d=s.docking;d.progress=Math.min(1,d.progress+dt/d.duration);s.boatX=d.fromX+(HARBOR.boatX-d.fromX)*d.progress;s.boatZ=d.fromZ+(HARBOR.boatZ-d.fromZ)*d.progress;s.heading=d.fromHeading*(1-d.progress);s.speed=0;if(d.progress===1){s.docking=null;s.moored=true;s.mode='walk';s.playerX=HARBOR.boardingX;s.playerZ=HARBOR.boardingZ;s.yaw=0;s.loaded=false;s.standing=false;s.tripComplete=true;s.phase='complete';syncVessel(this.vessel,{x:s.boatX,z:s.boatZ,heading:0,clearMotion:true});this.journal('平安靠泊，带上装备走回小屋。');this.notify('缆绳已系好，带上鱼获回小屋。');}}
 stepFishing(dt,input){const s=this.state,active=['sinking','waiting','bite','fight'].includes(s.fishState)&&!this.inspectionChecking();s.reeling=active&&Boolean(input.reel);s.pumping=active&&Boolean(input.pump);if(s.casting){s.castPower=clamp(s.castPower+dt*.42,.12,1);return;}if(s.castFlight){const f=s.castFlight;f.t=Math.min(f.duration,f.t+dt);const p=f.t/f.duration;s.bobber={x:f.start.x+(f.endX-f.start.x)*p,z:f.start.z+(f.endZ-f.start.z)*p,height:Math.max(0,f.start.height+f.vy*f.t-4.905*f.t*f.t)};if(f.t>=f.duration){s.castFlight=null;s.fishState='sinking';s.bobber.height=0;}return;}
  if(s.fishState==='sinking'||s.fishState==='waiting'){
   const env=this.rigEnvironment(),presentation=stepRigLure({...env,dt,depth:s.lureDepth,pumpHeight:s.pumpHeight});s.lureDepth=presentation.depth;s.pumpHeight=presentation.pumpHeight;s.rigPresentation=presentation;
   if(s.reeling){const dx=s.boatX-s.bobber.x,dz=s.boatZ-s.bobber.z,d=Math.hypot(dx,dz),move=Math.min(Math.max(0,d-1.8),dt*.75*this.stats.retrieve);if(d>0){s.bobber.x+=dx/d*move;s.bobber.z+=dz/d*move;}s.lineDistance=Math.hypot(s.boatX-s.bobber.x,s.boatZ-s.bobber.z);if(s.lineDistance<2.1&&s.lureDepth<.25){this.retrieve();return;}}
   s.paidLineMeters=Math.hypot(Math.hypot(s.boatX-s.bobber.x,s.boatZ-s.bobber.z),s.lureDepth)+1.5;
   if(s.baitOnHook)s.baitOnHook.condition=Math.max(.05,s.baitOnHook.condition-dt*.0005);s.biteTimer+=dt*presentation.attraction;s.snagExposure+=presentation.snagRiskPerSecond*dt;
   if(s.snagExposure>s.snagThreshold){this.escape('snag');return;}s.fishState=Math.abs(s.lureDepth-presentation.targetDepth)<.25?'waiting':'sinking';
   if(s.biteTimer>s.biteAt){s.fishState='bite';s.biteTimer=0;this.notify('咬钩！提竿！','bite');}
  }
  else if(s.fishState==='bite'){s.biteTimer+=dt;if(s.biteTimer>9)this.escape('miss');}
  else if(s.fishState==='fight'){s.fightTime+=dt;const surge=Math.max(0,Math.sin(s.fightTime*.51+1)),pull=(17+surge*39)*(s.fish?.power||1),eq=this.stats,desired=(pull*(.5+s.drag*.8)*eq.smooth+(s.reeling?26:0)+(s.pumping?15:0))/eq.strength;s.tension+=(desired-s.tension)*(1-Math.exp(-dt*1.5));s.stamina=clamp(s.stamina-dt*((s.reeling?.6:.22)+(s.pumping?.62:0)+surge*.12),0,100);if(s.reeling)s.lineDistance-=dt*(.62+s.drag*.5)*eq.retrieve*(1-surge*.55)*(s.stamina<20?1.5:1);else if(surge>.72&&s.stamina>22)s.lineDistance+=dt*.38*(1-s.drag);if(s.tension>96){s.breakMeter+=dt;if(s.breakMeter>1.9){this.escape('break');return;}}else s.breakMeter=Math.max(0,s.breakMeter-dt*2);if(s.lineDistance>64){this.escape('miss');return;}s.lineDistance=Math.max(1.3,s.lineDistance);if(s.lineDistance<2.1&&s.stamina<19){s.fishState='landed';s.reeling=false;s.pumping=false;this.notify(`${s.fish.name} 上船了！`,'catch');return;}const a=s.heading+s.yaw+Math.sin(s.fightTime*.43)*.32;s.bobber={x:s.boatX-Math.sin(a)*(s.lineDistance+2.8),z:s.boatZ-Math.cos(a)*(s.lineDistance+2.8),height:0};}
 }
 stepPatrol(dt){
  const s=this.state,events=this.patrol.update(s,dt,{assessment:()=>assessCatchLedger(s.catches)});
  for(const event of events){
   if(event.type==='inspection-start'){this.stopPropulsion();s.reeling=false;s.pumping=false;if(s.fishState!=='landed'&&s.fishState!=='idle'){this.retrieve();}}
   if(event.type!=='inspection-result')continue;
   const assessment=assessCatchLedger(s.catches),indices=[...new Set(event.violations.map(v=>v.index).filter(Number.isInteger))],confiscated=[];
   for(const index of indices){const f=s.catches[index];if(!f?.kept||f.settled||f.confiscated)continue;f.confiscated=true;f.settled=true;f.reward=0;f.confiscatedAt=this.captureTimestamp();if(f.catchId&&!s.profile.settled.includes(f.catchId))s.profile.settled.push(f.catchId);confiscated.push({index,catchId:f.catchId,name:f.name,kg:f.kg});}
   s.lastInspection={id:event.id,reason:event.reason,checkedAt:this.captureTimestamp(),ruleset:assessment.ruleset,violations:event.violations,unsupported:assessment.unsupported,confiscated};
   const message=confiscated.length?`检查结束，${confiscated.length} 条不符规定的鱼获已被收走。`:'例行检查结束，可以继续航程。';this.journal(message);this.notify(message,'inspection');
  }
 }
 interaction(){const s=this.state;if(s.mode==='walk'){if(this.atCounter)return'码头小屋';if(canBoardFrom(s.playerX,s.playerZ))return s.launchStage==='afloat'?'登船':'等候吊艇';return'';}if(s.mode==='swim'){const p=ladderPoint(s.boatX,s.boatZ,s.heading);return s.swim.latched&&distance(s.swim,p)<2.2&&!s.engine&&s.launchStage==='afloat'?'抓住船尾梯':'';}if(s.mode==='boat'){if(s.moored)return'解开缆绳';if(s.docking)return'正在靠泊';if(s.fishState==='bite')return'提竿！';if(s.fishState==='idle'&&Math.hypot(s.boatX-HARBOR.boatX,s.boatZ-HARBOR.boatZ)<16&&Math.abs(s.speed)<.85)return'靠泊上岸';}return'';}
 publicState(){
  const s=this.state,p=s.mode==='walk'?{x:s.playerX,z:s.playerZ}:s.mode==='swim'?s.swim:{x:s.boatX,z:s.boatZ},nav=this.navigationInstruments(),fish=s.fish?clone(s.fish):null;if(fish&&!nav.gps)delete fish.caughtGPS;
  const presentation=s.rigPresentation?{...s.rigPresentation,depth:nav.sounder?s.rigPresentation.depth:null,targetDepth:nav.sounder?s.rigPresentation.targetDepth:null}:null;
  return{edition:'pixel',renderer:'Canvas 2D',version:4,mode:s.mode,phase:s.phase,time:s.clock,dayStartAt:s.dayStartAt,activeSeconds:Math.round(s.elapsed),position:{x:round(p.x),z:round(p.z)},boat:{x:round(s.boatX),z:round(s.boatZ),heading:nav.compass||nav.gps?round(s.heading,3):null},navigation:nav,navigationScale:s.navigationScale,gps:nav.gpsPosition,referenceDepth:nav.depth,launchStage:s.launchStage,launchProgress:round(s.launchProgress,2),packed:[...s.packed],profile:{credits:s.profile.credits,owned:[...s.profile.owned],stock:{...s.profile.stock}},loaded:s.loaded,moored:s.moored,engine:s.engine,throttle:round(s.throttle,2),anchor:s.anchor,speedKnots:nav.speedKnots==null?null:round(nav.speedKnots),fuel:Math.round(s.fuel),standing:s.standing,swim:s.swim?clone(s.swim):null,waypoint:s.waypoint?.name||null,arrival:s.arrival,fishState:s.fishState,casting:s.casting,castPower:round(s.castPower,2),rig:s.rig,rigWeightGrams:s.rigWeightGrams,fishingDepthMeters:s.fishingDepthMeters,rigPresentation:presentation,hookCount:getRigProfile(s.rig).hooks,paidLineMeters:round(s.paidLineMeters),tension:Math.round(s.tension),stamina:Math.round(s.stamina),lineDistance:round(s.lineDistance),lureDepth:nav.sounder?round(s.lureDepth):null,fish,casts:s.casts,catches:s.catches.map(f=>({name:f.name,length:f.length,kg:f.kg,kept:f.kept,settled:Boolean(f.settled),confiscated:Boolean(f.confiscated),caughtAt:f.caughtAt,rig:f.rig,hookCount:f.hookCount})),inspection:s.inspection?clone(s.inspection):null,lastInspection:s.lastInspection?clone(s.lastInspection):null,misses:s.misses,breaks:s.breaks,sailedMeters:Math.round(s.sailed),walkedMeters:Math.round(s.walked),paused:s.paused,interaction:this.interaction(),tripComplete:s.tripComplete,conditions:{...this.conditions}};
 }

}
