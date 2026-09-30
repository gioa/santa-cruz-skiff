import {fightViewGeometry} from './pixel-fight-view.js';
import {drawCloseTackle} from './pixel-fight-tackle.js';
import {getShoreScene,sampleShore,shoreSurfField} from './shore-data.js';
import {shoreFishPosition} from './shore-line-geometry.js';
import {shorePresentation} from './shore-presentation.js';

const TAU=Math.PI*2,PIXELS_PER_METRE=3.2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const mix=(a,b,t)=>a+(b-a)*t;
const hash=n=>{let x=Math.imul(n|0,1597334677);x^=x>>>15;return((Math.imul(x,2246822507)^(x>>>13))>>>0)/4294967295;};
export const shoreFightActive=state=>['fighting','landed'].includes(state?.phase);

// A read-only camera adapter. Shore coordinates are pixels; tackle coordinates
// are metres. Bottom-rig fighting depth is authored; a float rig retains its
// simulated hook depth. Fish remain below opaque surf until the catch panel.
export function shoreFightPose(sceneId,state={}){
 const scene=getShoreScene(sceneId),player=state.player||scene.spawn,cast=state.cast;
 const origin=cast?.origin||{x:player.x,y:player.y-18};
 const fishWorld=shoreFishPosition(scene,state);
 const sample=sampleShore(scene,fishWorld.x,fishWorld.y,finite(state.elapsed),state.seaState);
 const floating=state.presentation?.mode==='float'||state.rig==='float';
 const tipHeight=state.onPier?5.5:1.8,depth=floating?Math.max(.05,shorePresentation(sample,'float_rig',finite(state.presentation?.depth,1)).depth):Math.max(.05,sample.depth*.72);
 const rodTip={x:0,z:0,height:tipHeight};
 const fishMeters={x:(fishWorld.x-player.x)/PIXELS_PER_METRE,z:(fishWorld.y-origin.y)/PIXELS_PER_METRE,height:-depth};
 // The suspended hook hangs below the float, so line meets the water there.
 const surfaceFraction=floating?1:tipHeight/(tipHeight+depth);
 const entryMeters={x:fishMeters.x*surfaceFraction,z:fishMeters.z*surfaceFraction};
 const entryWorld={x:player.x+entryMeters.x*PIXELS_PER_METRE,y:origin.y+entryMeters.z*PIXELS_PER_METRE};
 // At the last few metres the strand-line clamp prevents a submerged endpoint
// being projected onto dry sand before the simulation's landing transition.
 entryWorld.y=Math.min(entryWorld.y,scene.shoreY(entryWorld.x)-1.6);
 const tension=clamp(finite(state.tension),0,1),run=clamp(finite(state.fish?.run),0,2);
 const visual={fishState:state.phase==='fighting'?'fight':'landed',rodMount:'hand',rodElevation:46,rodAzimuth:62,
  rodBend:clamp(tension*.78+run*.10,0,.95),lineSlackMeters:Math.max(0,.16-tension)*3,
  rodTip,lineEntry:entryMeters,lureDepth:depth,paidLineMeters:finite(state.lineDistance),rig:floating?'float':'bottom',...(floating?{floatPosition:{...entryMeters,height:0}}:{})};
 return{visual,fishWorld,entryWorld,depth,sample,ground:state.onPier&&scene.pier?'pier':'sand'};
}

// Stylised perspective shares the existing coast's sandbar / trough field.
// Its near-shore scale matches the enlarged rod, rather than a survey camera.
export function shoreSurfaceProjection(width,height,sceneId,state,point){
 const scene=getShoreScene(sceneId),pl=state.player||scene.spawn,pier=Boolean(state.onPier&&scene.pier);
 const d=pier?Math.max(.5,(pl.y-point.y)/3.2):Math.max(.5,(scene.shoreY(point.x)-point.y)/3.2);
 const horizon=height*.255,nearY=height*(pier?.87:.83),perspective=18/(18+d);
 return{x:clamp(width*.5+(point.x-pl.x)/3.2*width*.025*perspective,width*.035,width*.965),y:horizon+(nearY-horizon)*perspective};
}

export function createShoreFightView(canvas,{sceneId='pacifica'}={}){
 const scene=getShoreScene(sceneId),c=canvas.getContext('2d',{alpha:false}),palette=scene.palette;
 let cssWidth=390,cssHeight=844,crankAngle=0,rotorAngle=0,spoolAngle=0,lastDistance=null,lastElapsed=null,lastGeometry=null,lastPose=null,active=false;
 const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 const polygon=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](Math.round(p.x),Math.round(p.y)));c.closePath();c.fill();};
 const line=(a,b,color,width=1)=>{
  let x=Math.round(a.x),y=Math.round(a.y),tx=Math.round(b.x),ty=Math.round(b.y),dx=Math.abs(tx-x),sx=x<tx?1:-1,dy=-Math.abs(ty-y),sy=y<ty?1:-1,error=dx+dy;
  const size=Math.max(1,Math.round(width));c.fillStyle=color;
  for(let i=0;i<2048;i++){c.fillRect(x-Math.floor(size/2),y-Math.floor(size/2),size,size);if(x===tx&&y===ty)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
 };
 const ellipse=(x,y,rx,ry,color)=>{for(let row=-Math.ceil(ry);row<=Math.ceil(ry);row++){const span=Math.round(rx*Math.sqrt(Math.max(0,1-(row/Math.max(1,ry))**2)));if(span>0)rect(x-span,y+row,span*2+1,1,color);}};
 function resize(width,height){
  cssWidth=Math.max(1,finite(width,390));cssHeight=Math.max(1,finite(height,844));
  const factor=Math.max(1.6,Math.min(2.6,cssWidth/510));canvas.width=Math.round(cssWidth/factor);canvas.height=Math.round(cssHeight/factor);c.imageSmoothingEnabled=false;
 }
 function coast(g,s,t){
  const {width:w,height:h,horizon}=g,pl=s.player||scene.spawn,pier=Boolean(s.onPier&&scene.pier);
  rect(0,0,w,horizon,'#9db8b9');rect(0,horizon*.3,w,horizon*.36,'#b7c9c4');rect(0,horizon*.66,w,horizon*.35,'#d5d9c9');
  for(let i=0;i<9;i++){const x=hash(i+41)*w,cy=horizon*(.13+hash(i+75)*.46),cw=w*(.14+hash(i+11)*.2);rect(x,cy,cw,3,'#cbd6cf');rect(x+cw*.18,cy-2,cw*.64,3,'#d9dfd3');}
  const bottom=pier?h:h*.9;
  for(let i=0;i<4;i++)rect(0,horizon+(bottom-horizon)*i/4,w,(bottom-horizon)/4+1,[palette.deep,palette.sea,palette.sea,palette.shallow][i]);
  rect(0,horizon,w,2,'#a8c7c1');
  // Broken reflections give the quiet water texture without hiding the trough.
  for(let row=0;row<28;row++){
   const p=(row+.5)/28,yy=horizon+(bottom-horizon)*p*p,span=3+p*14;
   for(let i=0;i<w/(span*3);i++){
    const seed=row*311+i,x=i*span*3+hash(seed+51)*span;
    if(hash(seed+12)>.36)rect(x,yy,span*(.4+hash(seed+27)),1,row%3?palette.sea:'#82aaa5');
   }
  }
  // Perspective projects the same individual waves as the overhead view and
  // tackle simulation: swell lines, breaking lips, bores and foam.
  for(let worldX=pl.x-1800;worldX<=pl.x+1800;worldX+=22){
   const shore=scene.shoreY(worldX),field=shoreSurfField(scene,worldX,t,s.seaState);
   for(const c of field.crests){
    const worldY=shore-c.offshore*3.2,forward=(pier?pl.y-worldY:shore-worldY)/3.2;
    if(forward<.5||forward>220)continue;
    const scale=18/(18+forward),rawX=w*.5+(worldX-pl.x)/3.2*w*.025*scale;
    if(rawX<0||rawX>w)continue;
    const p=shoreSurfaceProjection(w,h,scene,s,{x:worldX,y:worldY}),segment=Math.max(2,22/3.2*w*.025*scale+1);
    const rise=c.height*scale*6,broken=c.state==='breaking'||c.state==='bore';
    if(!broken){
     if(hash(c.index*727+Math.floor(worldX/22))>.25){rect(rawX,p.y-rise,segment,Math.max(1,rise*.35),palette.deep);rect(rawX,p.y-rise,segment,1,'#91b6af');}
     continue;
    }
    const thickness=Math.max(2,rise*(c.state==='breaking'?.9:.6));
    rect(rawX,p.y-rise-2,segment,thickness+2,palette.deep);
    rect(rawX,p.y-rise,segment,thickness,palette.foam);
    rect(rawX,p.y-rise+thickness,segment,Math.max(1,thickness*.6),'#c9d9cc');
    if(c.type==='plunging'&&c.state==='breaking'&&hash(Math.floor(worldX/22)+437)>.3)rect(rawX+1,p.y-rise-thickness,Math.max(1,segment*.5),2,palette.foam);
   }
  }
  if(pier){
   // Weathered concrete deck and steel railing, never the skiff's wooden hull.
   rect(0,h*.925,w,h*.075,'#777e77');rect(0,h*.925,w,3,'#bbc0ad');
   for(let i=0;i<35;i++)rect(hash(i+192)*w,h*(.937+hash(i+243)*.06),2,1,'#555f5b');
   for(const x of [w*.06,w*.94]){rect(x-2,h*.76,4,h*.17,'#344c50');rect(x-1,h*.76,1,h*.17,'#98a9a0');}
   rect(0,h*.76,w,4,'#3d5658');rect(0,h*.76,w,1,'#adb7a6');
  }else{
   const swash=sampleShore(scene,pl.x,scene.shoreY(pl.x),t,s.seaState),field=shoreSurfField(scene,pl.x,t,s.seaState);
   const edge=h*.85+field.swashMeters*h*.004+field.waterlineMeters*h*.004;
   const points=[{x:0,y:h},{x:0,y:edge}];
   for(let x=0;x<=w+8;x+=8)points.push({x,y:edge+Math.sin(x/w*7+pl.x/270)*h*.01});
   points.push({x:w,y:h});polygon(points,palette.wet);
   rect(0,h*.925,w,h*.075,palette.sand);rect(0,h*.975,w,h*.025,palette.dry);
   for(let i=0;i<160;i++){const x=hash(i+931)*w,y=h*(.88+hash(i+193)*.12);rect(x,y,hash(i+84)>.9?2:1,1,i%3?palette.grainDark:palette.grain);}
   if(swash.waveHeight>0)for(let x=0;x<w;x+=5)rect(x,edge+Math.sin(x/w*7+pl.x/270)*h*.01-1,6,1,palette.foam);
  }
 }
 function draw(state,dt,{active:visible=true,paused=false,reeling=false,reducedMotion=false}={}){
  const wasActive=active;active=Boolean(visible&&shoreFightActive(state));
  if(!active){lastDistance=null;lastElapsed=null;return;}
  const advance=paused?0:clamp(finite(dt),0,.1),elapsed=finite(state.elapsed);
  if(advance&&state.phase==='fighting'){
   if(reeling){crankAngle=(crankAngle+TAU*1.6*advance)%TAU;rotorAngle=(rotorAngle+TAU*1.6*5.2*advance)%TAU;}
   if(wasActive&&lastElapsed!==null&&elapsed>lastElapsed&&lastDistance!==null)spoolAngle=(spoolAngle+(lastDistance-state.lineDistance)*3)%TAU;
  }
  lastDistance=finite(state.lineDistance);lastElapsed=elapsed;
  const pose=shoreFightPose(scene,state),g=fightViewGeometry(canvas.width,canvas.height,pose.visual,{crankAngle,reducedMotion:true});
  // A standing angler has no boat heave. Only rod load and the held crank move.
  const entry=shoreSurfaceProjection(g.width,g.height,scene,state,pose.entryWorld);
  g.waterEntry=entry;g.hookPoint=entry;const sag=pose.visual.lineSlackMeters*9*g.scale;
  g.line=Array.from({length:19},(_,i)=>{const t=i/18;return{x:mix(g.tip.x,entry.x,t),y:mix(g.tip.y,entry.y,t)+4*t*(1-t)*sag};});g.line[0]=g.tip;g.line[18]=entry;
  coast(g,state,reducedMotion?0:elapsed);
  if(g.lineVisible){const {x,y}=entry;rect(x-4,y,3,1,palette.foam);rect(x+2,y,3,1,palette.foam);}
  if(g.showFloat&&g.lineVisible){rect(entry.x-1,entry.y-8,2,4,'#e26e50');rect(entry.x-2,entry.y-4,4,4,'#fff0cf');rect(entry.x-1,entry.y,2,2,'#c96a47');}
  drawCloseTackle(c,g,{line,rect,ellipse,spoolAngle,rotorAngle,reelStyle:'spinning',drawFishingLine(){
   if(!g.lineVisible)return;
   let prev=g.reel;for(const i of[5,10,15,20,24,28]){const p=g.points[i];line(prev,p,'#d3d5b4');prev=p;}
   for(let i=1;i<g.line.length;i++)line(g.line[i-1],g.line[i],i>15?'#b4d0bd':'#ece6c8');
  }});
  lastGeometry=g;lastPose=pose;
 }
 function snapshot(){
  const g=lastGeometry,toCSS=p=>({x:Math.round(p.x*cssWidth/g.width),y:Math.round(p.y*cssHeight/g.height)});
  return{active,view:'first-person',scene:scene.id,ground:lastPose?.ground||'sand',width:cssWidth,height:cssHeight,crankAngle,rotorAngle,spoolAngle,
   ...(g?{rodTip:toCSS(g.tip),reelKnob:toCSS(g.knob),lineEntry:toCSS(g.waterEntry),lineVisible:active&&g.lineVisible,floatVisible:active&&g.lineVisible&&g.showFloat,bend:g.bend,surfaceFish:false,fishVisible:false,sandColor:palette.sand,depth:lastPose.depth,fishWorld:lastPose.fishWorld}:{} )};
 }
 resize(cssWidth,cssHeight);return{resize,draw,snapshot};
}
