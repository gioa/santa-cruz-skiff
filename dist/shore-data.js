import {BENICIA_SCENE,beniciaSample} from './benicia-data.js';
import {gameSeconds} from './game-clock.js';
import {WAVE_CLIMATE,SURF_DOMAIN_M,SURF_INLAND_M,beachShape,bedDepth,waveNumber,surfColumn,sampleSurfColumn,stockdonRunup} from './shore-surf.js';
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
// Rip channels through the bar (x px, alongshore half-width px).
const RIPS=Object.freeze({
  pacifica:Object.freeze([{x:760,width:140},{x:1660,width:115},{x:3240,width:190},{x:4890,width:160},{x:5960,width:130}]),
  'half-moon-bay':Object.freeze([{x:970,width:150},{x:2670,width:185},{x:4760,width:210},{x:6320,width:165}]),
});
const hash=(i,seed)=>{let h=Math.imul((i|0)^Math.imul(seed,0x9e3779b1),0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return(h>>>0)/4294967296;};
// Smooth value noise in [-1, 1].
const wobble=(x,seed)=>{const i=Math.floor(x),f=x-i,s=f*f*(3-2*f),a=hash(i,seed),b=hash(i+1,seed);return 2*(a+(b-a)*s)-1;};
// Shoreline plan shape in px (+y is inland): the bay's broad curve, irregular
// shoreline sand waves, an erosional embayment (mega-cusp) behind each rip
// channel, and rhythmic beach cusps whose spacing and relief wander. Sharp
// Park's steep, coarse face keeps well-developed ~30 m cusps; Half Moon Bay's
// flatter face has longer, fainter ones.
const COAST=Object.freeze({
  pacifica:{base:x=>420+26*Math.sin(x/1100)+12*Math.sin(x/240+.8*Math.sin(x/900)),cusp:96,cuspRelief:7,embayment:13,sandWave:9},
  'half-moon-bay':{base:x=>450+31*Math.sin(x/1450)+9*Math.sin(x/340+.7*Math.sin(x/1300)),cusp:150,cuspRelief:3.5,embayment:20,sandWave:11},
});
const coast=(id,x)=>{
  const c=COAST[id]||COAST.pacifica;let y=c.base(x)+c.sandWave*wobble(x/260,11)+1.6*wobble(x/21,12);
  for(const r of RIPS[id]||RIPS.pacifica)y+=c.embayment*bell(x-r.x,r.width*1.4);
  const u=x/c.cusp+.3*Math.sin(x/517)+1.4*wobble(x/700,13),phase=u-Math.floor(u);
  return y+c.cuspRelief*(.55+.45*wobble(x/600,14))*(Math.pow(Math.sin(Math.PI*phase),1.4)-.47);
};
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
  benicia:BENICIA_SCENE,
  pacifica:scene({id:'pacifica',name:'Pacifica Beach',shortName:'Sharp Park',subtitle:'Sharp Park · 黑沙与栈桥',caption:'SHARP PARK, CA',coordinates:'37°38′ N · 122°30′ W',saveKey:'pacifica-surf-save-v1',width:6400,pier,
    palette:Object.freeze({sand:'#767671',dry:'#8d8c81',wet:'#494f50',grain:'#a29c88',grainDark:'#565d5b',sea:'#4d858d',deep:'#315d70',shallow:'#709b96',foam:'#e0e6d5',grass:'#7d8768'}),
    channels:RIPS.pacifica,
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
    channels:RIPS['half-moon-bay'],
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
// Sea state: an explicit scenario (tests, QA) or the day's climate state from
// shore-surf.js climateSeaState(). Without either, the September median of the
// scene's buoy climate is used. Direction is incidence from the shore normal
// (+ angles travel toward +x) after refraction to ~8 m depth.
const DEFAULT_MONTH=9;
export function shoreProfile(sceneId,x,elapsed=0,seaState={}){
  const s=getShoreScene(sceneId),hmb=s.id==='half-moon-bay',sea=seaState||{},climate=WAVE_CLIMATE[s.id]||WAVE_CLIMATE.pacifica;
  x=safeX(x,s.spawn.x);elapsed=safeTime(elapsed);
  const shape=beachShape(s.id,x);
  let gap=0,feeder=0;
  for(const c of s.channels){const delta=x-c.x,a=bell(delta,c.width);gap=Math.max(gap,a);feeder+=-delta/c.width*a*.46;}
  // One M2-like 12.42-hour cycle on the shared game clock; the bed stays fixed.
  const tidePhase=finite(sea.environmentSeconds,gameSeconds(elapsed))*TAU/TIDE_PERIOD-.5;
  const tide=clamp(finite(sea.tideM,.65+.52*Math.sin(tidePhase)),-1,3);
  // Alongshore exposure: Pillar Point shelters the north of Half Moon Bay.
  const [lo,hi]=climate.exposure,exposure=hmb?lo+(hi-lo)*clamp(x/s.width,0,1):lo+(hi-lo)*(.5+.5*Math.sin(x/930));
  const median=climate.months[DEFAULT_MONTH-1];
  const waveHeight=clamp(finite(sea.waveHeightM,median[0]),0,8)*exposure;
  const wavePeriod=clamp(finite(sea.wavePeriodS,median[3]),3,24);
  const waveDirectionDeg=clamp(finite(sea.waveDirectionDeg,hmb?14:4),-75,75);
  const zone=shoreZone(s,x);
  return{barDistance:shape.barDistance,troughDistance:shape.troughDistance,slope:shape.nearSlope,faceSlope:shape.faceSlope,faceWidth:shape.faceWidth,shape,
    gap,feeder,tide,waveHeight,wavePeriod,waveDirectionDeg,exposure,waveTime:finite(sea.environmentSeconds,elapsed),
    zoneId:zone.id,zoneName:zone.name,tideLabel:Number.isFinite(sea.tideM)?'固定潮位':Math.cos(tidePhase)>0?'涨潮':'退潮',
    seaStateSource:sea.climate?'climate':Number.isFinite(sea.waveHeightM)?'authored':'climate-median'};
}

// Smooth travel time across the cross-section with the right shallow/deep
// phase-speed limits: one monotonic shoreward phase shared by rendering,
// tackle and fish. Bars and troughs still set breaking and bottom velocity.
function waveTravel(offshore,p){
  const cDeep=GRAVITY*p.wavePeriod/TAU,a=GRAVITY/(cDeep*cDeep),h0=Math.max(.15,p.tide),slope=p.slope;
  const integral=h=>{h=Math.max(.02,h);return Math.sqrt(h*(1+a*h))+Math.asinh(Math.sqrt(a*h))/Math.sqrt(a);};
  return(integral(h0+slope*offshore)-integral(h0))/(slope*Math.sqrt(GRAVITY));
}
function wavePhaseAt(x,offshore,elapsed,p){
  const theta=p.waveDirectionDeg*Math.PI/180,omega=TAU/p.wavePeriod,kDeep=omega*omega/GRAVITY;
  return omega*(finite(p.waveTime,elapsed)+waveTravel(offshore,p)*Math.cos(theta))-kDeep*x/PIXELS_PER_METRE*Math.sin(theta);
}
function column(s,x,elapsed,p){
  return surfColumn({sceneId:s.id,shape:p.shape,tide:p.tide,gap:p.gap,period:p.wavePeriod,hs:p.waveHeight,
    omega:TAU/p.wavePeriod,alongshore:x/PIXELS_PER_METRE,phaseAt:d=>wavePhaseAt(x,d,elapsed,p)});
}

// Crest positions (offshore metres) of individual waves: roots of the shared phase.
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
/** Individual crests with their state: unbroken swell, breaking (plunging or
 * spilling lip), broken bore, or re-formed wave; plus each wave's height. */
export function shoreSurfCrests(sceneId,x,elapsed=0,seaState={},maxOffshore=SURF_DOMAIN_M){
  const s=getShoreScene(sceneId),p=shoreProfile(s,x,elapsed,seaState);
  if(p.waveHeight===0)return[];
  const col=column(s,safeX(x,s.spawn.x),safeTime(elapsed),p),names=['unbroken','breaking','bore','reformed'],types=['none','spilling','plunging','surging'];
  return shoreWaveCrests(s,x,elapsed,seaState,Math.min(maxOffshore,SURF_DOMAIN_M)).map(offshore=>{
    const index=Math.round(wavePhaseAt(safeX(x,s.spawn.x),offshore,safeTime(elapsed),p)/TAU),w=col.wave(index),i=col.cell(offshore);
    if(!w)return{offshore,index,height:0,state:'unbroken',type:'none',depth:col.depths[i]};
    // Where did this wave start breaking? (first broken sample from offshore)
    let breakAt=null;for(let j=col.n-1;j>=0;j--)if(w.state[j]===1){breakAt=col.offshoreOf(j);break;}
    return{offshore,index,height:w.H[i],state:names[w.state[i]],type:types[w.type[i]],depth:col.depths[i],breakAt,
      sinceBreak:breakAt===null?null:breakAt-offshore};
  });
}

export function sampleShore(sceneId,x,y,elapsed=0,seaState={},options={}){
  if(getShoreScene(sceneId).id==='benicia')return beniciaSample(x,y,elapsed,seaState||{});
  const s=getShoreScene(sceneId);x=safeX(x,s.spawn.x);y=finite(y,s.shoreY(x));elapsed=safeTime(elapsed);
  const p=shoreProfile(s,x,elapsed,seaState),offshore=clamp((s.shoreY(x)-y)/PIXELS_PER_METRE,0,10000),shape=p.shape;
  const bar=bell(offshore-p.barDistance,p.barDistance*.16),trough=bell(offshore-p.troughDistance,p.troughDistance*.38);
  const channel=p.gap*bell(offshore-p.barDistance,p.barDistance*.55);
  const depth=Math.max(.05,bedDepth(shape,offshore,p.tide,p.gap));
  const omega=TAU/p.wavePeriod,k=waveNumber(p.wavePeriod,depth),kh=k*depth,theta=p.waveDirectionDeg*Math.PI/180;
  const wavePhase=wavePhaseAt(x,offshore,elapsed,p);
  // `surf:false` skips individual waves (foam, crests, swash) for fish/habitat queries.
  const col=p.waveHeight>0&&options?.surf!==false?column(s,x,elapsed,p):null,surf=col?sampleSurfColumn(col,Math.min(offshore,SURF_DOMAIN_M)):null;
  // Statistical breaking fraction (Rayleigh exceedance of the depth limit) for
  // habitat and tackle: a location property, not a single wave's flicker.
  const edgeDepth=Math.max(.3,bedDepth(shape,SURF_DOMAIN_M,p.tide,p.gap));
  const cg=h=>{const kk=waveNumber(p.wavePeriod,h),q=Math.min(350,kk*h);return omega/kk*.5*(1+2*q/Math.sinh(2*q));};
  const shoaled=p.waveHeight*Math.sqrt(cg(edgeDepth)/cg(Math.max(.05,depth)));
  const hrms=Math.max(1e-6,shoaled/1.416),breakStrength=p.waveHeight>0?Math.exp(-Math.pow(.78*depth/hrms,2)):0;
  const localWaveHeight=p.waveHeight>0?Math.min(shoaled,surf?.significantHeight||Math.min(shoaled,.6*depth+.1*shoaled)):0;
  const meanWhitewater=clamp(breakStrength*1.3,0,1);
  const whitewater=surf?Math.max(surf.foam,surf.active):0;
  // Broken bores add turbulent surges on top of linear orbital motion (game factor).
  const orbitalVelocity=localWaveHeight*omega/(2*Math.sinh(Math.min(700,kh)))*(1+.5*breakStrength);
  const waveVelocity=orbitalVelocity*Math.cos(wavePhase),waveVelocityX=waveVelocity*Math.sin(theta),waveVelocityY=waveVelocity*Math.cos(theta);
  // Breaker line of the significant wave: where the surf zone begins.
  let surfZoneWidth=0;
  if(col?.sig)for(let j=col.n-1;j>=0;j--)if(col.sig.state[j]===1||col.sig.state[j]===2){surfZoneWidth=Math.max(0,col.offshoreOf(j));break;}
  // Mean surf currents. Longshore: Longuet-Higgins scale with the refracted
  // breaking angle, peaking mid-surf; rip: offshore jets through bar gaps fed
  // by alongshore flow. Coefficients beyond the published scale are game tuning.
  const hb=Math.max(.05,p.waveHeight*1.1),cb=Math.sqrt(GRAVITY*Math.max(.3,hb/.78)),c8=omega/waveNumber(p.wavePeriod,8);
  const thetaB=Math.asin(clamp(Math.sin(theta)*cb/c8,-.95,.95));
  // Currents live where waves break (Rayleigh breaking fraction), not beyond.
  const inSurf=clamp(breakStrength*1.6,0,1);
  const longshore=1.17*Math.sqrt(GRAVITY*hb/1.416)*Math.sin(thetaB)*Math.cos(thetaB);
  const currentX=(longshore+p.feeder*.18*Math.sqrt(GRAVITY*hb/1.416))*inSurf;
  const barBreaking=Math.exp(-Math.pow(.78*Math.max(.05,bedDepth(shape,p.barDistance,p.tide,0))/Math.max(1e-6,p.waveHeight*1.15/1.416),2));
  // Rip jets through bar gaps, plus near-bed undertow returning water that
  // breaking bores carry shoreward (order 0.1–0.3 √(g h) in the surf zone).
  const rip=-(.04+.96*p.gap)*.16*Math.sqrt(GRAVITY*hb/1.416)*bell(offshore-p.barDistance*.8,p.barDistance*.6)*clamp(barBreaking*2,0,1);
  const undertow=-.12*Math.sqrt(GRAVITY*Math.max(.1,depth))*breakStrength;
  const currentY=rip+undertow;
  const flowX=currentX+waveVelocityX,flowY=currentY+waveVelocityY;
  const crestHeight=surf?.crestHeight||0;
  const waveLoad=clamp((waveVelocity*waveVelocity+.5*crestHeight*whitewater)/4,0,1);
  const turbidity=clamp(.03+.58*(1-Math.exp(-orbitalVelocity*orbitalVelocity*.45))+.32*meanWhitewater+.1*channel*clamp(p.waveHeight,0,1),0,1);
  const surfaceElevation=(surf?.surfaceHeight??crestHeight)*.5*Math.cos(wavePhase);
  // Runup: Stockdon (2006) statistics on the beach face; each arriving bore
  // runs up in proportion to its own height over ~0.35 T, then backwashes.
  const run=stockdonRunup(Math.max(.01,p.waveHeight),p.wavePeriod,shape.faceSlope);
  let runupMeters=0,swashAge=0;
  if(col){
    const last=col.lastCrest(0),w=col.wave(last.index),bore=w?w.H[col.toe]:0,phase=last.age/p.wavePeriod;
    const incident=run.incident*.5*clamp(bore/Math.max(.05,col.sig?col.sig.H[col.toe]:bore),0,2.2);
    const infra=run.infragravity*.5*Math.sin(last.index*TAU/7.3);
    const shape01=phase<.35?Math.sin(phase/.35*Math.PI/2):Math.max(0,Math.cos((phase-.35)/.65*Math.PI/2));
    runupMeters=clamp(run.setup+infra+incident*shape01,0,12);swashAge=phase;
  }
  // Hard structure for perch that live on pilings and rock: the Pacifica pier's
  // pilings (within a few metres of the deck) and Mori Point's rocky toe.
  let pierStructure=0,rockStructure=0;
  if(s.pier){let best=Infinity;for(const r of s.pier.deck){const dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom);best=Math.min(best,Math.hypot(dx,dy)/PIXELS_PER_METRE);}
    pierStructure=offshore>1?Math.exp(-best/6):0;}
  if(s.id==='pacifica')rockStructure=clamp((x-5800)/160,0,1)*(offshore>1?1:0);
  const habitat=channel>.5?'channel':trough>.5?'trough':bar>.5?'bar':offshore<12?'swash':offshore>Math.max(95,p.barDistance*1.4)?'offshore':'surf';
  return{...p,shape:undefined,offshore,depth,breakStrength,currentX,currentY,habitat,troughStrength:trough,barStrength:bar,channelStrength:channel,
    localWaveHeight,waveNumber:k,waveLength:TAU/k,wavePhase,setFactor:1,orbitalVelocity,waveVelocityX,waveVelocityY,
    flowX,flowY,flowSpeed:Math.hypot(flowX,flowY),waveLoad,whitewater,meanWhitewater,turbidity,surfaceElevation,
    runupMeters,runupR2:run.r2,setupMeters:run.setup,swashMeters:runupMeters/shape.faceSlope,swashPhase:swashAge,beachIribarren:run.iribarren,
    pierStructure,rockStructure,structure:Math.max(pierStructure,rockStructure),
    surfZoneWidth,crestState:surf?.crestState||'unbroken',crestType:surf?.crestType||'none',crestHeight,activeBreaking:surf?.active||0};
}

/** One column of surf for renderers: the profile and wave column are built
 * once, then crests, foam and swash are sampled cheaply along it. */
export function shoreSurfField(sceneId,x,elapsed=0,seaState={}){
  if(getShoreScene(sceneId).id==='benicia')return {profile:beniciaSample(x,BENICIA_SCENE.shoreY(x),elapsed,seaState||{}),crests:[],foamAt:()=>0,swashMeters:0,waterlineMeters:0,surfZoneWidth:0,foamReach:0};
  const s=getShoreScene(sceneId);x=safeX(x,s.spawn.x);elapsed=safeTime(elapsed);
  const p=shoreProfile(s,x,elapsed,seaState);
  if(!(p.waveHeight>0))return{profile:p,crests:[],foamAt:()=>0,swashMeters:0,waterlineMeters:0,surfZoneWidth:0,foamReach:0};
  const col=column(s,x,elapsed,p),names=['unbroken','breaking','bore','reformed'],types=['none','spilling','plunging','surging'];
  const crests=[];
  const inner=Math.min(0,col.waterline),start=wavePhaseAt(x,inner,elapsed,p),end=wavePhaseAt(x,SURF_DOMAIN_M,elapsed,p);
  for(let cycle=Math.ceil(start/TAU);cycle<=Math.floor(end/TAU);cycle++){
    let lo=inner,hi=SURF_DOMAIN_M;
    for(let i=0;i<13;i++){const mid=(lo+hi)/2;if(wavePhaseAt(x,mid,elapsed,p)<cycle*TAU)lo=mid;else hi=mid;}
    const offshore=(lo+hi)/2,w=col.wave(cycle),i=col.cell(offshore);
    if(!w)continue;
    let breakAt=null;for(let j=col.n-1;j>=0;j--)if(w.state[j]===1){breakAt=col.offshoreOf(j);break;}
    crests.push({offshore,index:cycle,height:w.H[i],state:names[w.state[i]],type:types[w.type[i]],depth:col.depths[i],breakAt,roller:w.roller[i],
      sinceBreak:breakAt===null?null:breakAt-offshore,steepness:w.H[i]/Math.max(.05,col.depths[i])});
  }
  let surfZoneWidth=0,foamReach=0;
  if(col.sig)for(let j=col.n-1;j>=0;j--)if(col.sig.state[j]===1||col.sig.state[j]===2){surfZoneWidth=Math.max(0,col.offshoreOf(j));break;}
  // Outermost break of the waves whose foam can still be on the water.
  const near=col.lastCrest(0).index;
  for(let k=-6;k<=4;k++){const w=col.wave(near+k);if(w&&w.outer>=0)foamReach=Math.max(foamReach,col.offshoreOf(w.outer));}
  const run=stockdonRunup(p.waveHeight,p.wavePeriod,p.faceSlope),last=col.lastCrest(0),w0=col.wave(last.index),phase=last.age/p.wavePeriod;
  const bore=w0?w0.H[col.toe]:0,incident=run.incident*.5*clamp(bore/Math.max(.05,col.sig?col.sig.H[col.toe]:bore),0,2.2);
  const shape01=phase<.35?Math.sin(phase/.35*Math.PI/2):Math.max(0,Math.cos((phase-.35)/.65*Math.PI/2));
  const runup=clamp(run.setup+run.infragravity*.5*Math.sin(last.index*TAU/7.3)+incident*shape01,0,12);
  return{profile:p,crests,surfZoneWidth,foamReach,
    foamAt:d=>sampleSurfColumn(col,clamp(d,-SURF_INLAND_M,SURF_DOMAIN_M)).foam,
    swashMeters:runup/p.faceSlope,swashRising:phase<.35,swashPhase:phase,swashWave:last.index,
    // Still-water line relative to the mean-tide reference shoreline (+ = inland).
    waterlineMeters:(p.tide-finite(p.shape.datum,0))/p.faceSlope};
}
