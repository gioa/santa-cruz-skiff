// 空军大队长 — a Sharp Park regular who really fishes. His sand crab on a
// 3 oz fish-finder rig is a bait in the same fish population as the player's:
// schools find it by scent, inspect it and bite through the ordinary model, and
// a fish he lands is gone from its school. He goes for striped bass, so the big
// hook turns away most perch and he often goes home skunked (空军), hence the
// nickname. While he fishes beyond the simulated water around the player, his
// bites come from the same habitat and bait preferences as a rate instead.
// He shares tips (they go into the coastal notebook) and may give free bait or
// a rig to a player who has run out.
import {sampleShore,shoreZone} from './shore-data.js';
import {shoreBaitAppeal,shoreBaitFlash,shoreEncounterRates,SHORE_BAIT_SCENT,SHORE_ECOLOGY,SHORE_POPULATION_SPECIES} from './shore-fish-ecology.js';
import {resolveBite,disturb} from './fish-population.js';
import {SHORE_RULES} from './shore-regulations.js';

const PX=3.2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,f=0)=>Number.isFinite(v)?v:f;
export const REGULAR=Object.freeze({name:'空军大队长',coat:'#4d6b8c',hat:'#2c4868',scene:'pacifica'});
// Rip-channel edges: bass wait where the gap current carries food out.
export const REGULAR_SPOTS=Object.freeze([{x:1760,weight:.4},{x:880,weight:.35},{x:3120,weight:.25}]);
// Dawn and evening sessions (game hours). He turns up on most days.
const SESSIONS=[[5.5,11],[16.5,20.5]],PRESENT=.85,WALK=78,OFFSCREEN_M=95;
const BAIT='sandcrab',RIG='fishfinder_rig';

export const REGULAR_TIPS=Object.freeze([
 {id:'gap-edge',zoneId:'gap',title:'沟边找鲈',text:'条纹鲈爱守在白浪断开的那道沟边上，等浪把沙蟹、小鱼冲出来。别往沟正中间扔，扔在沟和沙坝交界的边上。'},
 {id:'first-trough',zoneId:'trough',title:'近岸第一道沟',text:'别总想着甩到最远。鲈鱼常常就在第一道浪后面的深槽里转，离脚下也就二三十米。我好几条都是在这儿上的。'},
 {id:'low-light',zoneId:'north',title:'早晚两头',text:'条纹鲈看光吃饭：天刚亮和傍晚那一两个钟头最好。大中午太阳把水照得透亮，我一般就坐着喝咖啡。'},
 {id:'rising-tide',zoneId:'trough',title:'涨潮贴岸',text:'涨潮的时候水漫上陡坡，沙槽变深，鱼会贴得很近。退到最低那会儿，槽里水浅，鱼就往外走了。'},
 {id:'scout-low',zoneId:'pier',title:'低潮看地形',text:'低潮的时候别急着钓，先走一遍，看哪里水色深、哪里浪断开，记下来。等潮水涨上来，那些就是你的钓点。'},
 {id:'dig-crabs',zoneId:'north',title:'挖沙蟹',text:'沙蟹就在浪退回去的那一溜湿沙里。浪退时冒出一串小 V 字形的水纹，下面就是一窝。软壳的最好，鲈鱼和海鲫都抢。'},
 {id:'hook-crab',zoneId:'trough',title:'怎么挂沙蟹',text:'沙蟹从肚子底下、尾巴那头穿进去，钩尖从背壳靠头那边出来。这样甩出去不容易掉，鱼一口就能吃到钩。'},
 {id:'hold-bottom',zoneId:'gap',title:'铅要压得住',text:'Sharp Park 坡陡、浪急，一两的铅根本站不住，滚到浪脚去全是海鲫。钓鲈我用 3 到 4 oz 的铅，能抓住沙。'},
 {id:'big-hook',zoneId:'south',title:'大钩少口',text:'钓鲈我用滑铅钓组、2/0 以上的大钩，小鱼咬不进去——所以咬口少，空军多，哈哈。想多点动静，就换 #6、#4 的小钩钓海鲫。'},
 {id:'birds',zoneId:'pier',title:'看鸟',text:'看见鹈鹕、燕鸥一头扎下来，说明鳀鱼群靠岸了，鲈鱼多半跟在后面。夏天那几周，整个 Pacifica 都会疯一阵。'},
 {id:'seasons',zoneId:'south',title:'看季节',text:'海鲫是冬天到春天的主角；条纹鲈要等到五六月，鳀鱼多了才上来，七八月最热闹。季节不对，再好的沟也可能空。'},
 {id:'sneaker',zoneId:'mori',title:'别背对大海',text:'千万别背对大海。这里坡陡，偶尔一道偷袭浪能冲到你脚后跟，把冰桶和人一起卷走。站稳，眼睛常看着海。'},
 {id:'big-surf',zoneId:'gap',title:'大浪天',text:'浪太大的日子，鱼退到外面去了，饵也站不住。别跟海较劲，等浪小了再来，或者去 Mori Point 那头找个背风的角落。'},
 {id:'rod-tip',zoneId:'trough',title:'看竿尖',text:'竿插在沙钉上，眼睛看竿尖。海鲫是一顿一顿地点；鲈鱼吃饵常常是竿尖突然一松，或者直接压弯。等竿子吃上劲再扬。'},
 {id:'drag',zoneId:'north',title:'泄力别太死',text:'鲈鱼第一下冲得很猛，泄力别拧太死。让它跑，线保持绷着，等它冲完再收。硬拉是断线最快的办法。'},
 {id:'measure',zoneId:'pier',title:'先量再留',text:'条纹鲈 18 寸以下必须放，一天最多留 2 条。我冰桶盖上贴着尺子，量完再说，鱼警来了也不慌。'},
 {id:'fresh-crab',zoneId:'trough',title:'勤换饵',text:'沙蟹泡个七八分钟就被浪洗白了，没味道了。别偷懒，收回来换一只新鲜的，再甩回原来的地方。'},
 {id:'move-on',zoneId:'south',title:'走动找鱼',text:'我外号怎么来的？在一个地方死守。现在学乖了：一个钓点三竿没动静，就沿着滩往下走，换下一道沟试试。'},
 {id:'fog',zoneId:'mori',title:'阴天不嫌',text:'雾天别嫌冷清。光线暗，鲈鱼反而敢靠岸；大晴天水清，它们就躲远了。'},
 {id:'perch-first',zoneId:'north',title:'先开张',text:'想先开张，就用沙蟹配小钩往第一道浪脚扔，海鲫很给面子。等手感上来了，再去跟鲈鱼较劲。'},
 {id:'release',zoneId:'pier',title:'好好放流',text:'留够了就放。放鱼别扔，托着它在浪里站一会儿，等它自己摆尾游走。'},
 {id:'rip',zoneId:'gap',title:'认离岸流',text:'那道看着平静、颜色发深、白浪断开的水就是离岸流。钓鱼好，下水要命。钓组挂在里面也别进去捡。'},
]);
const TIP_TOPIC='regular';
// Index in shore-lore's ANGLERS list, for notebook attribution.
export const REGULAR_ANGLER=3;

function random(r){let x=r.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;r.rng=x>>>0||1;return r.rng/4294967296;}
const dayHash=(day,salt)=>{let h=2166136261^salt;for(const c of String(day))h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>13;h=Math.imul(h,0x5bd1e995);h^=h>>>15;return(h>>>0)/4294967296;};
const MODES=['away','arriving','rigging','casting','soaking','bite','fighting','landed','retrieving','moving','leaving'];
const speciesName=id=>SHORE_ECOLOGY.find(s=>s.id===id)?.name||'鱼';
const inches=cm=>Math.round(cm/2.54);
const defs=SHORE_POPULATION_SPECIES;

export function createShoreRegular(scene,saved,seed=1){
 if(scene.id!==REGULAR.scene)return null;
 const r={version:1,rng:(Math.floor(finite(saved?.rng,seed))>>>0)||1,day:null,present:false,mode:'away',x:REGULAR_SPOTS[0].x,y:scene.shoreY(REGULAR_SPOTS[0].x)+300,
  spot:0,route:[],timer:0,serial:0,bait:null,bite:null,fight:null,landed:null,castsSinceBite:0,catches:[],tips:[],gifts:{bait:null,gear:null},talk:{at:-1e9,count:0},lastTalkLine:''};
 if(saved?.version===1){
  if(typeof saved.day==='string')r.day=saved.day;r.present=saved.present===true;
  r.spot=clamp(Math.floor(finite(saved.spot)),0,REGULAR_SPOTS.length-1);r.serial=Math.max(0,Math.floor(finite(saved.serial)));
  r.castsSinceBite=Math.max(0,Math.floor(finite(saved.castsSinceBite)));
  r.catches=(Array.isArray(saved.catches)?saved.catches:[]).filter(c=>defs.some(d=>d.id===c?.species)&&Number.isFinite(c.lengthCm)).slice(-40).map(c=>({species:c.species,lengthCm:c.lengthCm,kept:c.kept===true,hour:finite(c.hour)}));
  r.tips=(Array.isArray(saved.tips)?saved.tips:[]).filter(id=>REGULAR_TIPS.some(t=>t.id===id));
  r.gifts={bait:typeof saved.gifts?.bait==='string'?saved.gifts.bait:null,gear:typeof saved.gifts?.gear==='string'?saved.gifts.gear:null};
  // A reload never resumes mid-cast or mid-fight: he is back at his spot re-rigging.
  if(MODES.includes(saved.mode)&&saved.mode!=='away'&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){
   const spot=REGULAR_SPOTS[r.spot];r.x=spot.x;r.y=scene.shoreY(spot.x)+22;r.mode='rigging';r.timer=10;
  }
 }
 return r;
}
export function serializeRegular(r){
 if(!r)return null;
 return{version:1,rng:r.rng,day:r.day,present:r.present,mode:r.mode,x:Math.round(r.x),y:Math.round(r.y),spot:r.spot,serial:r.serial,
  castsSinceBite:r.castsSinceBite,catches:r.catches,tips:r.tips,gifts:r.gifts};
}

function hourOf(sim){const c=sim.calendar();return c.getUTCHours()+c.getUTCMinutes()/60;}
function inSession(r,hour){return r.present&&SESSIONS.some(([a,b])=>hour>=a&&hour<b);}
function standAt(sim,x){return{x,y:sim.world.shoreY(x)+22};}
function entryFor(sim,x){return{x:x+70,y:Math.min(sim.world.height-60,sim.world.shoreY(x)+420)};}
// Walk inland of the pier's landward deck when moving along the beach.
function routeAlong(sim,from,to){const lane=x=>sim.world.shoreY(x)+150;return[{x:from.x,y:lane(from.x)},{x:to.x,y:lane(to.x)},to];}
function startDay(sim,r,day){
 r.day=day;r.present=dayHash(day,7)<PRESENT;r.catches=[];r.castsSinceBite=0;
 let roll=dayHash(day,11),spot=0;for(let i=0;i<REGULAR_SPOTS.length;i++){roll-=REGULAR_SPOTS[i].weight;if(roll<0){spot=i;break;}}
 r.spot=spot;
}
function endLine(sim,r){if(r.bait){r.bait=null;}if(r.bite){if(r.bite.population)resolveBite(sim.population,'refused',defs,r.bite.id);r.bite=null;}}
function cast(sim,r){
 const sample=sampleShore(sim.scene,r.x,r.y-40,sim.state.elapsed,sim.state.seaState||{},{surf:false});
 // To the trough edge short of the bar, a little either side of where he stands.
 const offshore=clamp(sample.troughDistance+4+random(r)*14,24,52),tx=r.x+(random(r)-.5)*50;
 r.bait={id:`regular:${++r.serial}`,x:tx,y:sim.world.shoreY(tx)-offshore*PX,condition:1,soak:0,limit:300+random(r)*200,sampleAt:-1,sample:null};
 r.mode='casting';r.timer=1.8;
}
function baitSample(sim,r){
 const b=r.bait;if(!b)return null;
 if(!b.sample||sim.state.elapsed-b.sampleAt>5){b.sample=sampleShore(sim.scene,b.x,b.y,sim.state.elapsed,sim.state.seaState||{},{surf:false});b.sampleAt=sim.state.elapsed;}
 return b.sample;
}
/** His bait as a population stimulus, while it is soaking and fishable. */
export function regularStimuli(sim){
 // The bait stays in the water while he reacts to a bite, so the bite waits for him.
 const r=sim.state.regular;if(!r||!['soaking','bite'].includes(r.mode)||!r.bait||(!r.bite&&r.bait.condition<=.08))return[];
 const b=r.bait,sample=baitSample(sim,r),plane=sim.toPlane(b.x,b.y),condition=b.condition;
 const presentation={depth:sample.depth,bottomContact:1,stability:clamp(.95-.25*finite(sample.breakStrength),.55,.95)};
 return[{id:b.id,side:true,...plane,depth:sample.depth,scent:(SHORE_BAIT_SCENT[BAIT]||.5)*condition**1.25,flash:shoreBaitFlash(RIG,BAIT),motion:.05,
  soakSeconds:b.soak,currentX:sample.currentX,currentY:-sample.currentY,
  appeal:def=>shoreBaitAppeal(def.id,{bait:BAIT,rig:RIG,baitCondition:condition,presentation})}];
}
/** A population bite on his bait (event from stepPopulation). */
export function regularBite(sim,event){
 const r=sim.state.regular;
 if(!r||r.mode!=='soaking'||!r.bait||event.stimulus!==r.bait.id||r.bite){resolveBite(sim.population,'refused',defs,event.stimulus);return;}
 r.bite={id:event.stimulus,species:event.species,lengthCm:event.lengthCm,population:true};r.mode='bite';r.timer=.8+random(r)*1.6;
}
function offscreen(sim,r){
 const c=sim.population.center;if(!c||!r.bait)return true;
 const p=sim.toPlane(r.bait.x,r.bait.y);return Math.hypot(p.x-c.x,p.y-c.y)>OFFSCREEN_M;
}
// Beyond the simulated water his bites follow the same preference index as a rate.
function offscreenBite(sim,r,dt){
 const sample=baitSample(sim,r),hour=hourOf(sim),month=sim.calendar().getUTCMonth()+1;
 const rates=shoreEncounterRates({sample,bait:BAIT,rig:RIG,baitCondition:r.bait.condition,month,hour,presentation:{depth:sample.depth,bottomContact:1,stability:.85}});
 if(!(random(r)<1-Math.exp(-rates.totalRatePerSecond*dt)))return;
 let roll=random(r)*rates.totalRatePerSecond,species=rates.perSpecies[0]?.id;
 for(const s of rates.perSpecies){roll-=s.ratePerSecond;if(roll<0){species=s.id;break;}}
 const def=defs.find(d=>d.id===species);if(!def)return;
 const lengthCm=def.lengthCm[0]+(def.lengthCm[1]-def.lengthCm[0])*Math.pow(random(r),1.7);
 r.bite={id:r.bait.id,species,lengthCm,population:false};r.mode='bite';r.timer=.8+random(r)*1.6;
}
function keeps(r,species,lengthCm){
 if(species!=='striped_bass')return false;
 const rule=SHORE_RULES.striped_bass;return lengthCm>=rule.minimumCm&&r.catches.filter(c=>c.kept&&c.species==='striped_bass').length<rule.speciesBag;
}

export function stepShoreRegular(sim,dt){
 const r=sim.state.regular;if(!r)return;
 const day=sim.calendarDate(),hour=hourOf(sim);
 if(r.day!==day)startDay(sim,r,day);
 const open=inSession(r,hour),spot=REGULAR_SPOTS[r.spot];
 if(r.mode==='away'){
  if(!open)return;
  const entry=entryFor(sim,spot.x);Object.assign(r,{x:entry.x,y:entry.y,mode:'arriving',route:[standAt(sim,spot.x)]});return;
 }
 // Session over: finish a fish, then pack up and walk off.
 if(!open&&['rigging','soaking','casting','retrieving'].includes(r.mode)){endLine(sim,r);r.mode='leaving';r.route=[entryFor(sim,r.x)];}
 if(['arriving','moving','leaving'].includes(r.mode)){
  const next=r.route[0];if(!next){r.mode=r.mode==='leaving'?'away':'rigging';r.timer=20+random(r)*25;return;}
  const dx=next.x-r.x,dy=next.y-r.y,d=Math.hypot(dx,dy),step=WALK*dt;
  if(d<=step){r.x=next.x;r.y=next.y;r.route.shift();}else{r.x+=dx/d*step;r.y+=dy/d*step;}
  return;
 }
 r.timer-=dt;
 if(r.mode==='rigging'){if(r.timer<=0)cast(sim,r);return;}
 if(r.mode==='casting'){
  if(r.timer>0)return;
  // A 4 oz sinker's splash spooks wary fish where it lands.
  disturb(sim.population,{...sim.toPlane(r.bait.x,r.bait.y),radius:6,strength:.7},defs);
  r.mode='soaking';return;
 }
 if(r.mode==='soaking'){
  const b=r.bait,sample=baitSample(sim,r);b.soak+=dt;
  // Surf washes a sand crab out in several minutes; faster in heavy water.
  b.condition=Math.max(0,b.condition-dt/600*(1+finite(sample?.breakStrength)));
  if(offscreen(sim,r))offscreenBite(sim,r,dt);
  if(r.mode==='soaking'&&(b.soak>=b.limit||b.condition<.3)){r.mode='retrieving';r.timer=8;r.castsSinceBite++;}
  return;
 }
 if(r.mode==='bite'){
  if(r.timer>0)return;
  const bite=r.bite,hooked=random(r)<.7;
  if(bite.population)resolveBite(sim.population,hooked?'hooked':'missed',defs,bite.id);
  r.bite=null;
  if(!hooked){r.bait.condition=Math.max(0,r.bait.condition-.45);r.mode=r.bait.condition<.3?'retrieving':'soaking';r.timer=8;r.lastEvent='missed';return;}
  const bass=bite.species==='striped_bass',duration=bass?20+bite.lengthCm*.6:6+bite.lengthCm*.25;
  r.fight={species:bite.species,lengthCm:bite.lengthCm,elapsed:0,duration,from:{x:r.bait.x,y:r.bait.y},lost:random(r)<(bass?.12:.05)};
  r.bait=null;r.mode='fighting';r.timer=duration;return;
 }
 if(r.mode==='fighting'){
  r.fight.elapsed+=dt;
  if(r.fight.lost&&r.fight.elapsed>r.fight.duration*.55){r.fight=null;r.mode='rigging';r.timer=30+random(r)*20;r.lastEvent='lost';return;}
  if(r.timer>0)return;
  const f=r.fight,kept=keeps(r,f.species,f.lengthCm);
  r.catches.push({species:f.species,lengthCm:Math.round(f.lengthCm*10)/10,kept,hour:Math.round(hour*100)/100});
  r.landed={...f,kept};r.fight=null;r.castsSinceBite=0;r.mode='landed';r.timer=7;r.lastEvent='landed';return;
 }
 if(r.mode==='landed'){if(r.timer<=0){r.landed=null;r.mode='rigging';r.timer=25+random(r)*20;}return;}
 if(r.mode==='retrieving'){
  if(r.timer>0)return;
  r.bait=null;
  // Three quiet casts: walk down the beach to the next gap.
  if(r.castsSinceBite>=3&&random(r)<.6){
   r.spot=(r.spot+1+Math.floor(random(r)*(REGULAR_SPOTS.length-1)))%REGULAR_SPOTS.length;r.castsSinceBite=0;
   r.mode='moving';r.route=routeAlong(sim,{x:r.x,y:r.y},standAt(sim,REGULAR_SPOTS[r.spot].x));return;
  }
  r.mode='rigging';r.timer=20+random(r)*20;
 }
}

export const regularVisible=r=>Boolean(r&&r.mode!=='away');

function todayLine(r){
 const kept=r.catches.filter(c=>c.kept),released=r.catches.filter(c=>!c.kept);
 if(!r.catches.length)return['今天到现在还是空军。大队长的名号不是白来的。','还没开张。不急，鲈鱼都是等出来的。','一口都没有。不过海这么好看，也不算亏。'][r.serial%3];
 const parts=[];
 if(kept.length)parts.push(`留了 ${kept.map(c=>`一条 ${inches(c.lengthCm)} 寸的${speciesName(c.species)}`).join('、')}`);
 if(released.length)parts.push(`放了 ${released.length} 条${released.every(c=>c.species!=='striped_bass')?'小鱼':''}（${[...new Set(released.map(c=>speciesName(c.species)))].join('、')}）`);
 return `今天：${parts.join('，')}。${kept.length?'今天不算空军！':'鲈鱼还没留着，继续。'}`;
}
function moodLine(r){
 if(r.mode==='fighting')return'等等等等——有鱼！让我先把它弄上来！';
 if(r.mode==='landed'&&r.landed)return r.landed.kept?`看见没？${inches(r.landed.lengthCm)} 寸的${speciesName(r.landed.species)}，够尺寸，留了！`:`${speciesName(r.landed.species)}，${inches(r.landed.lengthCm)} 寸。${r.landed.species==='striped_bass'?'不够 18 寸，放它回去长大。':'不是我要的，放了。'}`;
 if(r.mode==='bite')return'嘘——竿尖在动。';
 if(r.lastEvent==='lost')return'刚才那条跑了，脱钩。常有的事。';
 if(r.lastEvent==='missed')return'刚才一口没挂上，饵被啃了半只。';
 return todayLine(r);
}
function nextTip(sim,r){
 const sea=sim.state.shoreSample||{},hour=hourOf(sim),heard=new Set(r.tips);
 const wanted=[...(finite(sea.waveHeight)>2.2?['big-surf','hold-bottom']:[]),...(hour>=11&&hour<16?['low-light']:[]),...(r.catches.length===0?['move-on']:[])];
 let tip=REGULAR_TIPS.find(t=>wanted.includes(t.id)&&!heard.has(t.id));
 if(!tip){const fresh=REGULAR_TIPS.filter(t=>!heard.has(t.id));tip=fresh.length?fresh[Math.floor(random(r)*fresh.length)]:null;}
 return tip;
}
function baitLeft(s){return Object.values(s.inventory||{}).reduce((a,b)=>a+finite(b),0)+Object.values(s.rodSupplies||{}).filter(x=>x?.bait?.condition>.08).length;}
function rigLeft(s){return Object.values(s.rigStock||{}).reduce((a,list)=>a+(list?.length||0),0)+Object.values(s.rodSupplies||{}).filter(Boolean).length;}
const daysBetween=(a,b)=>a&&b?Math.round((Date.parse(b)-Date.parse(a))/864e5):Infinity;
// Free bait when the player is nearly out; a rig when they have none, and
// now and then a fish-finder rig for someone who has never had one.
function gifts(sim,r){
 const s=sim.state,day=r.day,out=[];
 if(r.gifts.bait!==day&&baitLeft(s)<3){s.inventory.sandcrab=Math.min(999,finite(s.inventory.sandcrab)+6);r.gifts.bait=day;
  out.push({kind:'bait',line:'你饵快没了吧？拿着，我早上挖的沙蟹，分你六只。',item:'沙蟹 ×6'});}
 if(daysBetween(r.gifts.gear,day)>=1&&rigLeft(s)===0){s.rigStock.carolina_rig.push({id:'carolina_rig',condition:1,bait:null},{id:'carolina_rig',condition:1,bait:null});r.gifts.gear=day;
  out.push({kind:'gear',line:'钓组都断光了？我多绑了两套 Carolina，送你。',item:'Carolina 岸钓组 ×2'});}
 else if(daysBetween(r.gifts.gear,day)>=3&&!s.rigStock.fishfinder_rig?.length&&!Object.values(s.rodSupplies).some(x=>x?.id==='fishfinder_rig')&&random(r)<.3){
  s.rigStock.fishfinder_rig.push({id:'fishfinder_rig',condition:1,bait:null});r.gifts.gear=day;
  out.push({kind:'gear',line:'想试试鲈鱼？送你一套滑铅钓组。3 oz 的铅挂在入门竿上会超载，最好配沙滩竿。',item:'滑铅钓组 ×1'});}
 return out;
}

/** Talk to him: his day so far, one tip (recorded in the notebook) and any gifts. */
export function talkRegular(sim,{more=false}={}){
 const s=sim.state,r=s.regular;
 if(!regularVisible(r))return{ok:false,message:'大队长今天不在。'};
 if(s.phase!=='walk'||s.onPier||s.inspection||Math.hypot(r.x-s.player.x,r.y-s.player.y)>70)return{ok:false,message:'先走近一点，收好钓竿再打招呼。'};
 if(!more||s.elapsed-r.talk.at>120)r.talk={at:s.elapsed,count:0};
 const busy=['fighting','bite'].includes(r.mode);
 if(busy)return{ok:true,name:REGULAR.name,line:moodLine(r),tip:null,gifts:[],more:false};
 if(more&&r.talk.count>=3)return{ok:true,name:REGULAR.name,line:'先让我钓会儿，一会儿再聊。',tip:null,gifts:[],more:false};
 const tip=nextTip(sim,r);r.talk.count++;
 let fresh=false;
 if(tip){
  r.tips.push(tip.id);
  const lore=s.shoreLore,id=`${TIP_TOPIC}:${tip.id}`;
  if(lore&&!lore.notes.some(n=>n.id===id)){lore.notes.push({id,zoneId:tip.zoneId,topic:TIP_TOPIC,title:tip.title,text:tip.text,angler:REGULAR_ANGLER,learnedAt:s.elapsed});fresh=true;}
 }
 const given=more?[]:gifts(sim,r);
 return{ok:true,name:REGULAR.name,line:more?'':moodLine(r),tip:tip?{title:tip.title,text:tip.text}:{title:'老生常谈',text:'该说的都跟你说啦。剩下的，就是多来、多看、多空军几次。'},fresh,gifts:given,more:r.talk.count<3};
}
export function regularNotes(scene){return scene.id===REGULAR.scene?REGULAR_TIPS.map(t=>({id:`${TIP_TOPIC}:${t.id}`,zoneId:t.zoneId,topic:TIP_TOPIC,title:t.title,text:t.text})):[];}
