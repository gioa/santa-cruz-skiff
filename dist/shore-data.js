// Authored coastal cross-sections informed by NOAA/NWS surf-zone science.
// These are game bathymetry, not a survey, forecast or navigation chart.
const TAU=Math.PI*2;
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
      {id:'pier',name:'封闭栈桥',x:1550,description:'L 形旧栈桥伸向外海；入口封闭，越栏会有巡查风险。'},
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
export function shoreProfile(sceneId,x,elapsed=0){
  const s=getShoreScene(sceneId),hmb=s.id==='half-moon-bay';
  const barDistance=(hmb?57:43)+11*Math.sin(x/530)+7*Math.sin(x/183);
  const troughDistance=barDistance*.46;
  const slope=(hmb?.038:.051)+.006*Math.sin(x/760);
  let gap=0,feeder=0;
  for(const c of s.channels){const delta=x-c.x,a=bell(delta,c.width);gap=Math.max(gap,a);feeder+=-delta/c.width*a*.46;}
  // A slow, repeatable tide. It changes depth, not the fixed seabed geometry.
  const tide=.65+.52*Math.sin(elapsed*2*TAU/44700-.5);
  const exposure=hmb?.73+.35*clamp(x/s.width,0,1):.93+.15*Math.sin(x/930);
  const waveHeight=(hmb?1.12:1.48)*exposure*(.88+.12*Math.sin(elapsed/17));
  const zone=shoreZone(s,x);
  return{barDistance,troughDistance,slope,gap,feeder,tide,waveHeight,zoneId:zone.id,zoneName:zone.name,tideLabel:Math.cos(elapsed*2*TAU/44700-.5)>0?'涨潮':'退潮'};
}
export function sampleShore(sceneId,x,y,elapsed=0){
  const s=getShoreScene(sceneId),p=shoreProfile(s,x,elapsed),offshore=Math.max(0,(s.shoreY(x)-y)/3.2);
  const bar=bell(offshore-p.barDistance,11),trough=bell(offshore-p.troughDistance,10);
  const channel=p.gap*bell(offshore-p.barDistance,37);
  const depth=Math.max(.05,offshore*p.slope+1.1*trough-1.75*bar+2.65*channel+p.tide);
  const breakStrength=clamp((p.waveHeight/.78-depth)/Math.max(.3,p.waveHeight),0,1);
  const currentX=(.13+.1*Math.sin(x/1300)+p.feeder)*bell(offshore-38,75);
  const currentY=-(.06+.8*p.gap)*bell(offshore-51,65);
  const habitat=channel>.5?'channel':trough>.5?'trough':bar>.5?'bar':offshore<12?'swash':offshore>95?'offshore':'surf';
  return{...p,offshore,depth,breakStrength,currentX,currentY,habitat,troughStrength:trough,barStrength:bar,channelStrength:channel};
}
