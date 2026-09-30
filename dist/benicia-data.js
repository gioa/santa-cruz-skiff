// First Street waterfront, south-facing camera (east is screen-left).
// Shoreline/landmarks follow city references; metres, bottom profiles and flow
// magnitudes below are authored game approximations, NOT a surveyed chart.
import {gameSeconds} from './game-clock.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const TAU=Math.PI*2;
export function beniciaShoreY(x){
 // Broad reclaimed spit, shallow pocket east, riprap west. Orthogonal pixels.
 const d=Math.abs(x-1090);
 return d<185?320:d<255?320+(d-185)*3.6:572+22*Math.sin(x/370);
}
const py=beniciaShoreY(1090);
export const BENICIA_SCENE=Object.freeze({id:'benicia',name:'Benicia · First Street',shortName:'Benicia',subtitle:'First Street · 岸边追鲑',caption:'BENICIA, CA',coordinates:'38°02′ N · 122°10′ W',saveKey:'benicia-shore-save-v1',width:2300,
 spawn:Object.freeze({x:1115,y:405}),shoreY:beniciaShoreY,
 shop:Object.freeze({x:1050,y:670,width:160,height:120,door:Object.freeze({x:1130,y:815})}),
 world:Object.freeze({width:2300,height:1120,minY:-760,shoreY:beniciaShoreY}),
 palette:Object.freeze({sand:'#b9ad8a',dry:'#c9c1a8',wet:'#858775',grain:'#dad1b0',grainDark:'#969982',sea:'#608d88',deep:'#466e71',shallow:'#87a49a',foam:'#d5dfc3',grass:'#8a9872'}),channels:[],
 pier:Object.freeze({x:1090,width:64,top:py-180,bottom:py+62,length:180,open:true,gate:{x:1090,y:py+80},entry:{x:1090,y:py+48},tip:{x:1090,y:py-155},deck:[{left:1058,right:1122,top:py-180,bottom:py+62}]}),
 zones:Object.freeze([
  {id:'east-pocket',name:'东侧浅湾',x:440,description:'退潮露出泥滩，水浅，先观察有没有小鱼活动。'},
  {id:'old-pilings',name:'旧桩滩边',x:760,description:'岸边有旧木桩，拟饵太贴底容易挂住。'},
  {id:'first-street',name:'First Street 尽头',x:1090,description:'岬尖能抛到过路鱼经过的水，旺季钓友多，要给旁边留出收线空间。'},
  {id:'riprap',name:'西侧块石岸',x:1430,description:'块石外沿随潮流换向，长时间把拟饵沉在石缝里会挂底。'},
  {id:'west-bank',name:'西段岸线',x:1910,description:'往西走人少一些，顺流收线和逆流收线的速度感不同。'},
 ]),
});
export function beniciaTide(elapsed=0){
 const phase=gameSeconds(elapsed)*TAU/44712+.45;
 // Current is phase-shifted from HEIGHT; no tidal-height-as-speed shortcut.
 return{phase,height:.85+.7*Math.sin(phase),speed:.82*Math.cos(phase-.35)};
}
export function beniciaSample(x,y,elapsed=0,sea={}){
 const offshore=Math.max(0,(beniciaShoreY(x)-y)/3.2),t=beniciaTide(elapsed);
 const tip=Math.exp(-(((x-1090)/245)**2)),pocket=x<800,rocks=x>1280&&x<1670||x>650&&x<870;
 const tide=Number.isFinite(sea.tideM)?sea.tideM:t.height;
 const depth=Math.max(.05,(pocket?.018:.045)*offshore+tip*(1.25+offshore*.055)+tide-.65);
 // South-facing camera: flood runs east (screen-left), ebb west.
 const currentX=-t.speed*(.35+.65*Math.min(1,offshore/30))*(1+.22*tip),currentY=.06*t.speed*Math.sin(x/190);
 const waveHeight=clamp(Number.isFinite(sea.waveHeightM)?sea.waveHeightM:.18,0,.9);
 const wavePhase=elapsed*TAU/3.4-x*.055-y*.11,waveVelocityX=waveHeight*.2*Math.cos(wavePhase),waveVelocityY=waveHeight*.15*Math.sin(wavePhase);
 const zone=BENICIA_SCENE.zones.reduce((a,z)=>Math.abs(z.x-x)<Math.abs(a.x-x)?z:a);
 return{sceneId:'benicia',offshore,depth,tide,tideLabel:t.speed>.08?'涨潮':t.speed<-.08?'退潮':'平潮',waveHeight,wavePeriod:3.4,waveDirectionDeg:65,
  zoneId:zone.id,zoneName:zone.name,habitat:rocks&&offshore<18?'rock':'channel',substrate:rocks&&offshore<18?'rock':pocket?'mud':'sand',
  currentX,currentY,flowX:currentX+waveVelocityX,flowY:currentY+waveVelocityY,flowSpeed:Math.hypot(currentX,currentY),waveVelocityX,waveVelocityY,
  orbitalVelocity:waveHeight*.2,localWaveHeight:waveHeight,wavePhase,waveNumber:.18,waveLength:35,surfaceElevation:waveHeight*.25*Math.sin(wavePhase),waveLoad:waveHeight*.07,
  turbidity:pocket?.6:.32,whitewater:0,meanWhitewater:0,activeBreaking:0,breakStrength:0,crestHeight:0,crestState:'unbroken',crestType:'none',
  rockStructure:rocks?Math.exp(-offshore/17):0,pierStructure:Math.exp(-Math.abs(x-1090)/22)*Math.exp(-Math.abs(offshore-35)/35),
  structure:rocks?.7:tip*.25,barDistance:45,troughDistance:22,barStrength:0,troughStrength:.2,channelStrength:.5+tip*.5,
  slope:.045,faceSlope:.15,exposure:.15,gap:0,feeder:0,runupMeters:0,runupR2:0,swashMeters:0,setupMeters:0,swashPhase:0,surfZoneWidth:0,seaStateSource:'authored-estuary'};
}
export function beniciaSea(date,hour){
 const seed=[...String(date)].reduce((a,c)=>a*31+c.charCodeAt(0),0)>>>0;
 return{climate:true,waveHeightM:.09+(seed%19)/100+.1*Math.max(0,Math.sin((hour-9)*Math.PI/12)),wavePeriodS:3.4,waveDirectionDeg:65};
}
