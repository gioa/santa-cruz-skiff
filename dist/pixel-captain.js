import {FISHING_SPOTS,onLand,onPier} from './pixel-geography.js';
import {HARBOR,harborWaterBlocked} from './pixel-harbor-layout.js';
import {depthAt} from './bathymetry.js';
import {fishingHabitatAt} from './pixel-seafloor.js';
import {waterRoute,clearWaterSegment,contactAwareControl} from './pixel-navigation.js';
import {vesselAutopilot} from './vessel-physics.js';
import {getRigProfile} from './fishing-rigs.js';
import {USABLE_CONDITION,rigRequiresBait} from './pixel-consumables.js';

// Fictional guide and virtual per-outing fee. York reads the same seabed and
// drives the same outboard as the player; he never spawns or guarantees fish.
export const YORK_FEE=25;
export const YORK_TRIPS=Object.freeze({
 blue:{name:'找蓝斑群',fish:'Blue rockfish',brief:'找礁石和海带边的蓝斑群。停车后从中层往下找，不必一直压底。'},
 halibut:{name:'慢拖 Halibut',fish:'California halibut',brief:'找沙底缓坡，贴近底层慢拖鳀鱼、沙丁鱼或软饵。'},
 salmon:{name:'搜索 Salmon',fish:'Chinook salmon',brief:'去较深水域拖行鱼饵或软饵，先找中层。鱼群会过路，不保证遇到。'},
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const vesselPoint=s=>({x:s.boatX,z:s.boatZ});
const water=p=>!onLand(p.x,p.z)&&!onPier(p.x,p.z)&&!harborWaterBlocked(p.x,p.z)&&depthAt(p.x,p.z)>2;
export function captainSpotQuality(mission,p){
 const depth=depthAt(p.x,p.z),bed=fishingHabitatAt(p.x,p.z);
 if(!water(p))return 0;
 if(mission==='blue')return ['reef','kelp','mixed'].includes(bed.kind)&&depth>=6&&depth<=60?(['reef','kelp'].includes(bed.kind)?2:1):0;
 if(mission==='halibut')return ['sand','mud','mixed'].includes(bed.kind)&&depth>=6&&depth<=30?(bed.kind==='sand'?2:1):0;
 return depth>=18&&depth<=65?1:0;
}
export function planCaptainSpot(s){
 const c=s.captain,from=vesselPoint(s),bases=c.mission==='blue'?[FISHING_SPOTS[1]]:c.mission==='halibut'?[FISHING_SPOTS[2],FISHING_SPOTS[0]]:[FISHING_SPOTS[2],FISHING_SPOTS[1]],candidates=[];
 for(const base of bases)for(let dx=-720;dx<=720;dx+=120)for(let dz=-720;dz<=720;dz+=120){
  const p={x:base.x+dx,z:base.z+dz},q=captainSpotQuality(c.mission,p);
  if(!q||c.lastSpot&&dist(p,c.lastSpot)<140)continue;
  const variety=(Math.sin(p.x*.07+p.z*.03+c.visit*2.71)+1)*100;
  candidates.push({...p,score:q*450-dist(from,p)*.12-dist(base,p)*.08+variety});
 }
 candidates.sort((a,b)=>b.score-a.score);
 for(const p of candidates.slice(0,20)){const route=waterRoute(from,p);if(route)return{target:{x:p.x,z:p.z},route};}
 return null;
}
export function captainRigAdvice(s,{deployment=false}={}){
 const c=s.captain,mission=c?.mission||'blue',rig=getRigProfile(s.rig),supply=s.profile.rodSupplies?.[s.profile.loadout.rod];
 if(!s.profile.loadout.rod||!s.packed.includes(s.profile.loadout.rod))return{ok:false,reason:'先在背包里启用一根船竿，我不会替你换装。'};
 if(!supply||supply.rig!==s.rig||supply.condition<=USABLE_CONDITION)return{ok:false,reason:'这副钓组缺失或已经磨损；收回后在鱼钩配置里换一副。'};
 const bait=s.baitOnHook?.condition>USABLE_CONDITION?s.baitOnHook.kind:null;
 if(rigRequiresBait(s.rig)&&!bait)return{ok:false,reason:'钩上的饵已经没有了。收回钓组，在鱼钩配置里换饵；背包有饵不等于钩上有饵。'};
 if(mission==='blue'){
  if(!['bottom','dropper','jig','feather40'].includes(s.rig))return{ok:false,reason:'我们找的是蓝斑群。这套小钩或浮漂组不适合这次搜索；沉底组、双支线、软饵或双支羽毛更合适，先找中层。'};
 }else{
  if(!['bottom','slider','jig'].includes(s.rig))return{ok:false,reason:`拖 ${YORK_TRIPS[mission].fish} 我会用单钩沉底、滑铅或铅头软饵。双支羽毛和小钩饵鱼组不适合这次拖法，不代表绝不咬。`};
  if(s.rig!=='jig'&&!['anchovy','sardine','jig'].includes(bait))return{ok:false,reason:'这次拖行要有鱼饵的轮廓和泳姿。换鳀鱼、沙丁鱼或软饵；静止鱿鱼条更适合其他钓法。'};
 }
 const weight=s.rigWeightGrams||0;
 if(weight<(mission==='salmon'?55:28))return{ok:false,reason:'配重太轻，走流或拖行后钓组很难进入目标水层。收回后加铅坠，再看线角调整。'};
 if(!deployment)return{ok:true,reason:mission==='blue'?'这套可以。停车后先在中层试，再逐渐往下找。':`这套可以。沿船边下线，放到${c?.side==='starboard'?'右':'左'}舷竿架；到水层后合上线杯。`};
 if(s.fishState==='idle')return{ok:false,reason:`先沿船边下线，再放到${c?.side==='starboard'?'右':'左'}舷竿架。我等你准备好。`};
 if(s.rodMount!==c.side)return{ok:false,reason:`这趟从${c.side==='starboard'?'右':'左'}舷拖，鱼竿插在那侧竿架里，让鱼线避开船尾发动机。`};
 if(s.reelMode==='free')return{ok:false,reason:'还在自由出线。到目标水层后合上线杯，再开始拖；否则会一直放线。'};
 const depth=depthAt(s.boatX,s.boatZ),desired=mission==='halibut'?Math.max(1,depth-3):Math.min(18,depth*.5);
 if(c.phase!=='trolling'&&s.lureDepth<desired)return{ok:false,reason:mission==='halibut'?'饵还太高。比目鱼贴底伏击，继续放到接近底层，再合上线杯。':'饵还贴着水面，再放一些到中层后合上线杯。'};
 return{ok:true,reason:'竿架和线杯都就绪，我开始慢拖。留意竿尖，中鱼我会立刻收油。'};
}
export function captainSay(sim,text){const c=sim.state.captain;if(c.message===text)return;c.message=text;sim.journal(`York：${text}`);sim.notify(`York：${text}`);}
export function hireCaptain(sim,mission='blue'){
 const s=sim.state;if(!sim.atCounter)return sim.notify('到码头小屋预约 York。',null,false);
 if(!YORK_TRIPS[mission])return{ok:false,message:'请选择一个行程。'};
 if(s.captain?.hired)return sim.notify('York 已在本次船上，不会重复收费。',null,false);
 const reserve=s.rentalPaid?0:15;
 if(s.profile.credits<YORK_FEE+reserve)return sim.notify(`雇佣 York 需要 ${YORK_FEE} 潮汐点，并留出船租。`,null,false);
 s.profile.credits-=YORK_FEE;s.profile.transactions.unshift({kind:'captain',id:'york',delta:-YORK_FEE,time:sim.captureTimestamp()});s.profile.transactions=s.profile.transactions.slice(0,80);
 s.captain={hired:true,name:'York',mission,phase:'boarding',route:[],target:null,side:'port',visit:0,phaseTime:0,message:'',pending:null};
 captainSay(sim,`我来掌舵。${YORK_TRIPS[mission].brief} 租船后到平台登船。`);return{ok:true,message:'York 已受雇，本次出海有效。'};
}
export function captainCommand(sim,command){
 const s=sim.state,c=s.captain;if(!c?.hired)return{ok:false,message:'还没有雇佣 York。'};
 if(command==='dismiss'){if(s.mode!=='walk')return sim.notify('回码头后再结束雇佣。',null,false);s.captain=null;return sim.notify('已结束本次雇佣，船长费用不退还。');}
 if(command==='advice')return sim.notify(`York：${captainRigAdvice(s).reason}`);
 if(command==='pause'){c.pending=null;c.stoppedForFish=false;c.phase='paused';c.route=[];sim.stopPropulsion();captainSay(sim,'我收油了。你可以整理装备，准备好再叫我。');return{ok:true};}
 if(command==='continue'||command==='next'||command==='return'||YORK_TRIPS[command]){
  if(YORK_TRIPS[command]){c.mission=command;c.lastSpot=null;}
  if(command==='continue'&&['rigging','fishing'].includes(c.phase))return{ok:true};
  c.pending=command==='return'?'return':'search';c.route=[];sim.stopPropulsion();
  captainSay(sim,s.fishState==='idle'?'收到，我来安排航向。':'先把鱼处理好、收回钓组，我再换航线。');return{ok:true};
 }
 return{ok:false,message:'没有这个船长指令。'};
}
export function restoreCaptain(s){
 const c=s.captain;if(!c?.hired||!YORK_TRIPS[c.mission]){s.captain=null;return;}
 Object.assign(c,{name:'York',route:[],phase:s.mode==='boat'?'paused':'boarding',pending:null,phaseTime:0,visit:Number.isFinite(c.visit)?c.visit:0,side:['port','starboard'].includes(c.side)?c.side:'port'});
 c.stoppedForFish=false;c.message='航程还在，费用已付。准备好后叫我继续。';
}
function startRoute(sim,returning){
 const s=sim.state,c=s.captain,target=returning?{x:HARBOR.returnX,z:HARBOR.returnZ}:null;
 const plan=returning?{target,route:waterRoute(vesselPoint(s),target)}:planCaptainSpot(s);
 if(!plan?.route){c.phase='paused';captainSay(sim,'这条安全航线暂时找不到，我先停船。稍后再试或改个目标。');return;}
 c.target=plan.target;c.route=plan.route;c.phase=returning?'returning':'travel';c.phaseTime=0;c.pending=null;c.visit++;c.side=c.visit%2?'port':'starboard';
 s.motorMode='off';s.motorTarget=null;s.waypoint=null;s.waterRoute=[];
 captainSay(sim,returning?'收好竿，我们回登船平台。':'坐稳，我来开船。到点收油后你再下竿。');
}
function nextTrollLeg(sim){
 const s=sim.state,c=s.captain,from=vesselPoint(s),center=c.target;
 for(let i=0;i<12;i++){
  const a=(c.leg||0)*1.7+i*Math.PI/6,p={x:center.x+Math.cos(a)*150,z:center.z+Math.sin(a)*150};
  if(captainSpotQuality(c.mission,p)&&clearWaterSegment(from,p)){c.route=[p];c.leg=(c.leg||0)+1;return true;}
 }
 return false;
}
export function stepCaptain(sim,dt){
 const s=sim.state,c=s.captain;if(!c?.hired||s.mode!=='boat'||!sim.rentalReady||s.docking)return;
 c.phaseTime=(c.phaseTime||0)+dt;
 if(['approaching','checking'].includes(s.inspection?.phase)||s.bailing||s.snagged||['bite','fight','landed'].includes(s.fishState)){
  s.throttle=0;if(c.phase!=='paused')c.stoppedForFish=true;
  captainSay(sim,s.snagged?'像是挂底，我已收油。先处理挂底，别硬顶着船速拉。':['approaching','checking'].includes(s.inspection?.phase)?'先配合检查，我已收油。':s.bailing?'我已收油，先把船里的水舀出去。':'有鱼，我收油。船慢下来后拿起竿，我等你把这条处理好。');return;
 }
 if(c.stoppedForFish){c.stoppedForFish=false;c.phase=c.mission==='blue'?'fishing':'rigging';c.route=[];c.phaseTime=0;}
 if((s.gameElapsed>=10.5*3600||sim.conditions.waveHeight>1.5||sim.conditions.windKnots>18)&&c.phase!=='returning'&&c.pending!=='return'){
  c.pending='return';captainSay(sim,s.gameElapsed>=10.5*3600?'该留时间返航了。收回钓组，我们回码头。':'风浪起来了。收回钓组，我带你返航。');
 }
 if(c.pending){s.throttle=0;if(s.fishState==='idle')startRoute(sim,c.pending==='return');return;}
 if(c.phase==='boarding')startRoute(sim,false);
 if(c.phase==='paused'){s.throttle=0;return;}
 if(['travel','returning'].includes(c.phase)){
  if(s.fishState!=='idle'){s.throttle=0;captainSay(sim,'航行前要把钓组收回。长距离开船不能带着拖线。');return;}
  if(!c.route.length){startRoute(sim,c.phase==='returning');return;}
  const p=c.route[0],d=dist(vesselPoint(s),p);
  if(d<(c.route.length===1?9:10)){
   c.route.shift();if(!c.route.length){s.throttle=0;c.phaseTime=0;if(c.phase==='returning'){c.phase='docking';captainSay(sim,'到平台了，等船慢下来我来靠泊。');}else{c.lastSpot=c.target;c.phase=c.mission==='blue'?'fishing':'rigging';captainSay(sim,c.mission==='blue'?'这片礁边可以搜索蓝斑。我已收油，等船慢下来，从中层开始试。':captainRigAdvice(s).reason);}}return;
  }
 }
 if(c.phase==='docking'){s.throttle=0;if(Math.abs(s.speed)<.85&&dist(vesselPoint(s),{x:HARBOR.boatX,z:HARBOR.boatZ})<16)sim.dock();else if(dist(vesselPoint(s),{x:HARBOR.boatX,z:HARBOR.boatZ})>15)startRoute(sim,true);return;}
 if(c.phase==='fishing'){
  s.throttle=0;const advice=captainRigAdvice(s);if(!advice.ok)captainSay(sim,advice.reason);if(c.phaseTime>150&&s.fishState==='idle'){c.pending='search';captainSay(sim,'这次没有留住鱼群。竿已收好，我换一段礁边再找。');}
  return;
 }
 if(c.phase==='rigging'||c.phase==='trolling'){
  const advice=captainRigAdvice(s,{deployment:true});
  if(!advice.ok){s.throttle=0;c.phase='rigging';captainSay(sim,advice.reason);return;}
  if(c.phase==='rigging'){c.phase='trolling';c.phaseTime=0;captainSay(sim,advice.reason);}
  if(!c.route.length||dist(vesselPoint(s),c.route[0])<15){if(!nextTrollLeg(sim)){s.throttle=0;c.phase='paused';captainSay(sim,'前面不适合继续带线转弯，我先停船。收好竿再换点。');}}
 }
}
export function captainHelm(sim,dt){
 const s=sim.state,c=s.captain,stop={steer:0,throttle:0};
 if(!c?.hired||!c.route?.length||['approaching','checking'].includes(s.inspection?.phase)||s.bailing||s.snagged||['bite','fight','landed'].includes(s.fishState)||c.pending)return stop;
 const trolling=c.phase==='trolling';if(!trolling&&!['travel','returning'].includes(c.phase))return stop;
 if(!trolling&&s.fishState!=='idle')return stop;
 const control=vesselAutopilot(sim.vessel,c.route[0],{final:!trolling&&c.route.length===1,cruise:.68});
 if(trolling){const speed=c.mission==='halibut'?.4:1;control.throttle=clamp(.035+(speed-Math.abs(s.speed))*.2,0,.28);if(Math.abs(control.error)>1)control.throttle=Math.min(control.throttle,.06);}
 const safe=contactAwareControl(sim.vessel,control,{dt});
 // Never reverse into a deployed line while recovering from an obstacle.
 if(trolling&&safe.throttle<0){c.phase='paused';c.route=[];captainSay(sim,'前面空间不足，我停船了。先收好钓组，再换航线。');return stop;}
 return safe;
}
