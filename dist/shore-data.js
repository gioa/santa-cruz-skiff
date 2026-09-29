import {gameSeconds} from './game-clock.js';
// Authored coastal cross-sections informed by NOAA/NWS surf-zone science.
// These are game bathymetry, not a survey, forecast or navigation chart.
const TAU=Math.PI*2,GRAVITY=9.81,PIXELS_PER_METRE=3.2,TIDE_PERIOD=44712;
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const safeTime=value=>Math.max(-1e10,Math.min(1e10,finite(value)));
const safeX=(value,fallback)=>Math.max(-1e6,Math.min(1e6,finite(value,fallback)));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const bell=(v,width)=>Math.exp(-Math.pow(v/width,2));
const shop=Object.freeze({x:1050,y:670,width:160,height:120,door:Object.freeze({x:1130,y:815})});
const spawn=Object.freeze({x:1100,y:865});
const coast=(id,x)=>id==='pacifica'
  ?420+18*Math.sin(x/240)+9*Math.sin(x/87)+26*Math.sin(x/1100)
  :450+31*Math.sin(x/1450)+14*Math.sin(x/340)+7*Math.sin(x/110);
const pierX=1550,pierShore=coast('pacifica',pierX),pierTop=pierShore-1080;
const pier=Object.freeze({
  x:pierX,width:56,top:pierTop,bottom:pierShore+105,length:1080,
  gate:Object.freeze({x:pierX,y:pierShore+112}),
  entry:Object.freeze({x:pierX,y:pierShore+60}),
  tip:Object.freeze({x:pierX+85,y:pierTop+30}),
  deck:Object.freeze([
    Object.freeze({left:pierX-28,right:pierX+28,top:pierTop,bottom:pierShore+105}),
    Object.freeze({left:pierX-28,right:pierX+190,top:pierTop,bottom:pierTop+60}),
  ]),
});
function scene(def){
  const shoreY=x=>coast(def.id,x);
  return Object.freeze({...def,shop,spawn,shoreY,world:Object.freeze({width:def.width,height:1080,minY:-1000,shoreY})});
}
export const SHORE_SCENES=Object.freeze({
  pacifica:scene({id:'pacifica',name:'Pacifica Beach',shortName:'Sharp Park',subtitle:'Sharp Park · 黑沙与栈桥',caption:'SHARP PARK, CA',coordinates:'37°38′ N · 122°30′ W',saveKey:'pacifica-surf-save-v1',width:6400,pier,
    palette:Object.freeze({sand:'#767671',dry:'#8d8c81',wet:'#494f50',grain:'#a29c88',grainDark:'#565d5b',sea:'#4d858d',deep:'#315d70',shallow:'#709b96',foam:'#e0e6d5',grass:'#7d8768'}),
    channels:Object.freeze([{x:760,width:140},{x:1660,width:115},{x:3240,width:190},{x:4890,width:160},{x:5960,width:130}]),
    zones:Object.freeze([
      {id:'north',name:'北段浅滩',x:440,description:'短浪翻过浅沙坝，湿沙上散着深色卵石。'},
      {id:'pier',name:'旧栈桥',x:1550,description:'L 形旧栈桥伸向外海，入口被维修围栏挡着。'},
      {id:'trough',name:'中段沙槽',x:2440,description:'第一道白浪内侧有较深暗带，近岸槽随岸线起伏。'},
      {id:'gap',name:'沙坝缺口',x:3240,description:'白浪在这里断开，钓组会被汇流带向外侧。'},
      {id:'south',name:'南段长滩',x:4570,description:'更宽的浪区与多段沙坝，沿岸漂移明显。'},
      {id:'mori',name:'Mori Point 岬角',x:5980,description:'南端岩岬与黑沙相接，结构附近水流不同。'},
    ]),
  }),
  'half-moon-bay':scene({id:'half-moon-bay',name:'Half Moon Bay',shortName:'Half Moon Bay',subtitle:'Francis · Venice · Dunes',caption:'HALF MOON BAY, CA',coordinates:'37°28′ N · 122°27′ W',saveKey:'half-moon-bay-surf-save-v1',width:7600,pier:null,
    palette:Object.freeze({sand:'#c8bea6',dry:'#dfd5bd',wet:'#96998e',grain:'#ece2ca',grainDark:'#b2aa93',sea:'#639c9d',deep:'#3c7183',shallow:'#86b5aa',foam:'#edf0da',grass:'#889779'}),
    channels:Object.freeze([{x:970,width:150},{x:2670,width:185},{x:4760,width:210},{x:6320,width:165}]),
    creeks:Object.freeze([{name:'Frenchmans Creek',x:2670},{name:'Pilarcitos Creek',x:4760}]),
    zones:Object.freeze([
      {id:'dunes',name:'Dunes 沙丘段',x:560,description:'低沙丘、浅色细沙，北端波能相对柔和。'},
      {id:'frenchmans',name:'Frenchmans Creek',x:2670,description:'溪口冲沟穿过沙滩，外侧沙坝出现缺口。'},
      {id:'venice',name:'Venice 中段',x:3660,description:'宽阔缓滩，白浪后方有连续的近岸沙槽。'},
      {id:'pilarcitos',name:'Pilarcitos Creek',x:4760,description:'弯曲水道与较深冲沟相接，浪线和漂流方向改变。'},
      {id:'francis',name:'Francis Beach',x:6110,description:'营地外侧的开阔浪区，外沙坝更远。'},
      {id:'south',name:'Francis 南段',x:7220,description:'南侧较暴露的岸段，浪组更有力，注意张力变化。'},
    ]),
  }),
});
export function getShoreScene(id='pacifica'){return typeof id==='object'&&id?.world?id:SHORE_SCENES[id]||SHORE_SCENES.pacifica;}
export function onPier(sceneId,x,y,margin=0){const p=getShoreScene(sceneId).pier;return Boolean(p?.deck.some(r=>x>=r.left+margin&&x<=r.right-margin&&y>=r.top+margin&&y<=r.bottom-margin));}
export function shoreZone(sceneId,x){const s=getShoreScene(sceneId);return s.zones.reduce((best,z)=>Math.abs(z.x-x)<Math.abs(best.x-x)?z:best,s.zones[0]);}
// Overrides describe a deterministic authored scenario, never a live forecast.
// Direction is incidence from the shore normal (+ angles travel toward +x).
export function shoreProfile(sceneId,x,elapsed=0,seaState={}){
  const s=getShoreScene(sceneId),hmb=s.id==='half-moon-bay',sea=seaState||{};
  x=safeX(x,s.spawn.x);elapsed=safeTime(elapsed);
  const barDistance=(hmb?57:43)+11*Math.sin(x/530)+7*Math.sin(x/183);
  const troughDistance=barDistance*.46;
  const slope=(hmb?.038:.051)+.006*Math.sin(x/760);
  let gap=0,feeder=0;
  for(const c of s.channels){const delta=x-c.x,a=bell(delta,c.width);gap=Math.max(gap,a);feeder+=-delta/c.width*a*.46;}
  // One M2-like 12.42-hour cycle; fixed bottom features do not move with tide.
  const tidePhase=gameSeconds(elapsed)*TAU/TIDE_PERIOD-.5;
  const tide=clamp(finite(sea.tideM,.65+.52*Math.sin(tidePhase)),-1,3);
  const exposure=hmb?.73+.35*clamp(x/s.width,0,1):.93+.15*Math.sin(x/930);
  const waveHeight=clamp(finite(sea.waveHeightM,hmb?1.12:1.48),0,8)*exposure;
  const wavePeriod=clamp(finite(sea.wavePeriodS,hmb?11:12),3,24);
  const waveDirectionDeg=clamp(finite(sea.waveDirectionDeg,hmb?12:18),-75,75);
  const zone=shoreZone(s,x);
  return{barDistance,troughDistance,slope,gap,feeder,tide,waveHeight,wavePeriod,waveDirectionDeg,
    zoneId:zone.id,zoneName:zone.name,tideLabel:Number.isFinite(sea.tideM)?'固定潮位':Math.cos(tidePhase)>0?'涨潮':'退潮',seaStateSource:'authored'};
}

// Linear dispersion: omega² = g k tanh(k h). This is the local wave number
// used for shoaling and bottom orbital velocity, including longer-period swell.
function waveNumber(period,depth){
  const omega=TAU/period,omega2=omega*omega;
  let k=Math.max(omega2/GRAVITY,omega/Math.sqrt(GRAVITY*depth));
  for(let i=0;i<6;i++){
    const kh=k*depth,tanh=Math.tanh(kh),f=GRAVITY*k*tanh-omega2;
    k=Math.max(.000001,k-f/(GRAVITY*(tanh+kh*(1-tanh*tanh))));
  }
  return k;
}

// Smooth travel-time approximation through the sloping cross-section. It has
// the shallow/deep phase-speed limits and a monotonic shoreward phase, unlike
// k(localDepth)*distance which can make crests reverse at a sandbar. Detailed
// bar/channel bathymetry still controls local breaking and orbital velocity.
function waveTravel(offshore,p){
  const cDeep=GRAVITY*p.wavePeriod/TAU,a=GRAVITY/(cDeep*cDeep),h0=Math.max(.15,p.tide);
  const integral=h=>Math.sqrt(h*(1+a*h))+Math.asinh(Math.sqrt(a*h))/Math.sqrt(a);
  return(integral(h0+p.slope*offshore)-integral(h0))/(p.slope*Math.sqrt(GRAVITY));
}
function wavePhaseAt(x,offshore,elapsed,p){
  const theta=p.waveDirectionDeg*Math.PI/180,omega=TAU/p.wavePeriod,kDeep=omega*omega/GRAVITY;
  return omega*(elapsed+waveTravel(offshore,p)*Math.cos(theta))-kDeep*x/PIXELS_PER_METRE*Math.sin(theta);
}

// Both cameras draw these roots of the same phase sampled by tackle physics.
// No independent renderer clock, arbitrary six-band cycle, or random surf sine.
export function shoreWaveCrests(sceneId,x,elapsed=0,seaState={},maxOffshore=220){
  const p=shoreProfile(sceneId,x,elapsed,seaState),limit=clamp(finite(maxOffshore,220),0,1200);
  if(p.waveHeight===0||limit===0)return[];
  x=safeX(x,getShoreScene(sceneId).spawn.x);elapsed=safeTime(elapsed);
  const start=wavePhaseAt(x,0,elapsed,p),end=wavePhaseAt(x,limit,elapsed,p),crests=[];
  for(let cycle=Math.ceil(start/TAU);cycle<=Math.floor(end/TAU);cycle++){
    let lo=0,hi=limit;
    for(let i=0;i<19;i++){const mid=(lo+hi)/2;if(wavePhaseAt(x,mid,elapsed,p)<cycle*TAU)lo=mid;else hi=mid;}
    crests.push((lo+hi)/2);
  }
  return crests;
}

export function sampleShore(sceneId,x,y,elapsed=0,seaState={}){
  const s=getShoreScene(sceneId);x=safeX(x,s.spawn.x);y=finite(y,s.shoreY(x));elapsed=safeTime(elapsed);
  const p=shoreProfile(s,x,elapsed,seaState),offshore=clamp((s.shoreY(x)-y)/PIXELS_PER_METRE,0,10000);
  const bar=bell(offshore-p.barDistance,11),trough=bell(offshore-p.troughDistance,10);
  const channel=p.gap*bell(offshore-p.barDistance,37);
  const depth=Math.max(.05,offshore*p.slope+1.1*trough-1.75*bar+2.65*channel+p.tide);
  const omega=TAU/p.wavePeriod,k=waveNumber(p.wavePeriod,depth),kh=k*depth;
  const groupSpeed=omega/k*.5*(1+2*kh/Math.sinh(Math.min(700,2*kh)));
  const shoaling=clamp(Math.sqrt((GRAVITY/(2*omega))/groupSpeed),.7,1.7);
  const wavePhase=wavePhaseAt(x,offshore,elapsed,p),theta=p.waveDirectionDeg*Math.PI/180;
  // A repeatable envelope of several waves gives sets and lulls. Hs itself is
  // not the height of each wave; incomingHeight is this representative wave.
  const setFactor=.84+.25*Math.cos(wavePhase/5)+.12*Math.cos(wavePhase/9+.8);
  // Waves lose energy crossing the upstream bar; a deep inside trough must
  // not regenerate the undiminished offshore swell behind that breaking bar.
  const bareBarDepth=Math.max(.05,p.barDistance*p.slope+1.1*bell(p.barDistance-p.troughDistance,10)-1.75+p.tide);
  const barDepth=bareBarDepth+2.65*p.gap,barLimit=.78*barDepth;
  const offshoreHeight=p.waveHeight*setFactor*shoaling;
  const crossedBar=clamp((p.barDistance-offshore)/12,0,1);
  const incomingHeight=offshoreHeight-crossedBar*Math.max(0,offshoreHeight-barLimit),breakingLimit=.78*depth;
  const localWaveHeight=Math.min(incomingHeight,breakingLimit);
  const breakStrength=incomingHeight>0?clamp(2*(incomingHeight-breakingLimit)/incomingHeight,0,1):0;
  const crest=Math.max(0,Math.cos(wavePhase))**3,whitewater=breakStrength*(.35+.65*crest);
  const orbitalVelocity=localWaveHeight*omega/(2*Math.sinh(Math.min(700,kh)));
  const waveVelocity=orbitalVelocity*Math.cos(wavePhase),waveVelocityX=waveVelocity*Math.sin(theta),waveVelocityY=waveVelocity*Math.cos(theta);
  // Mean surf circulation is powered by incoming wave energy. Gaps retain an
  // offshore rip even where local breaking is small; zero swell means no surf
  // current. Coefficients are gameplay calibration, not measured current data.
  const waveEnergy=p.waveHeight*p.waveHeight*setFactor*setFactor;
  const barBreaking=offshoreHeight>0?clamp((offshoreHeight-.78*bareBarDepth)/offshoreHeight,0,1):0;
  const forcing=waveEnergy/(1+waveEnergy)*clamp(p.wavePeriod/10,.5,1.7)*(.18+.82*barBreaking);
  const currentX=(.42*Math.sin(2*theta)+p.feeder)*forcing*bell(offshore-38,75);
  const currentY=-(.07+.95*p.gap)*forcing*bell(offshore-51,65);
  const flowX=currentX+waveVelocityX,flowY=currentY+waveVelocityY;
  // Quadratic drag pulses with each crest / backwash, not only with sets.
  const waveLoad=clamp((waveVelocity*waveVelocity+.5*incomingHeight*whitewater)/4,0,1);
  const turbidity=clamp(.03+.58*(1-Math.exp(-orbitalVelocity*orbitalVelocity*.45))+.32*whitewater+.1*channel*forcing,0,1);
  const surfaceElevation=localWaveHeight*.5*Math.cos(wavePhase);
  const shorePhase=wavePhaseAt(x,0,elapsed,p),swash=p.waveHeight*setFactor*Math.max(0,Math.cos(shorePhase));
  const runupMeters=clamp(swash*.65/Math.sqrt(p.slope),0,12);
  const habitat=channel>.5?'channel':trough>.5?'trough':bar>.5?'bar':offshore<12?'swash':offshore>95?'offshore':'surf';
  return{...p,offshore,depth,breakStrength,currentX,currentY,habitat,troughStrength:trough,barStrength:bar,channelStrength:channel,
    localWaveHeight,waveNumber:k,waveLength:TAU/k,wavePhase,setFactor,orbitalVelocity,waveVelocityX,waveVelocityY,
    flowX,flowY,flowSpeed:Math.hypot(flowX,flowY),waveLoad,whitewater,turbidity,surfaceElevation,runupMeters};
}
