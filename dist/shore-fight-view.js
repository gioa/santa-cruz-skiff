import {fightViewGeometry} from './pixel-fight-view.js?v=20260928-pixel-v80';
import {drawCloseTackle} from './pixel-fight-tackle.js?v=coast-7';
import {getShoreScene,sampleShore} from './shore-data.js?v=coast-6';

const TAU=Math.PI*2,PIXELS_PER_METRE=3.2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const mix=(a,b,t)=>a+(b-a)*t;
const hash=n=>{let x=Math.imul(n|0,1597334677);x^=x>>>15;return((Math.imul(x,2246822507)^(x>>>13))>>>0)/4294967295;};
export const shoreFightActive=state=>['fighting','landed'].includes(state?.phase);

// A read-only camera adapter. Shore coordinates are pixels; tackle coordinates
// are metres. Depth here is an authored bottom-rig presentation, not a new fish
// simulation. Fish remain below the opaque surf until the existing catch panel.
export function shoreFightPose(sceneId,state={}){
 const scene=getShoreScene(sceneId),player=state.player||scene.spawn,cast=state.cast;
 const origin=cast?.origin||{x:player.x,y:player.y-18};
 const target=cast?.target||{x:player.x,y:scene.shoreY(player.x)-32};
 const ratio=clamp(finite(state.lineDistance,cast?.distance||1)/Math.max(1,finite(cast?.distance,1)),.025,1.5);
 const fishX=mix(origin.x,target.x,ratio);
 const fishWorld={x:fishX,y:Math.min(scene.shoreY(fishX)-3.2,mix(origin.y,target.y,ratio))};
 const sample=sampleShore(scene,fishWorld.x,fishWorld.y,finite(state.elapsed));
 const tipHeight=state.onPier?5.5:1.8,depth=Math.max(.05,sample.depth*.72);
 const rodTip={x:0,z:0,height:tipHeight};
 const fishMeters={x:(fishWorld.x-player.x)/PIXELS_PER_METRE,z:(fishWorld.y-origin.y)/PIXELS_PER_METRE,height:-depth};
 const surfaceFraction=tipHeight/(tipHeight+depth);
 const entryMeters={x:fishMeters.x*surfaceFraction,z:fishMeters.z*surfaceFraction};
 const entryWorld={x:player.x+entryMeters.x*PIXELS_PER_METRE,y:origin.y+entryMeters.z*PIXELS_PER_METRE};
 // At the last few metres the strand-line clamp prevents a submerged endpoint
// being projected onto dry sand before the simulation's landing transition.
 entryWorld.y=Math.min(entryWorld.y,scene.shoreY(entryWorld.x)-1.6);
 const tension=clamp(finite(state.tension),0,1),run=clamp(finite(state.fish?.run),0,2);
 const visual={fishState:state.phase==='fighting'?'fight':'landed',rodMount:'hand',rodElevation:46,rodAzimuth:62,
  rodBend:clamp(tension*.78+run*.10,0,.95),lineSlackMeters:Math.max(0,.16-tension)*3,
  rodTip,lineEntry:entryMeters,lureDepth:depth,paidLineMeters:finite(state.lineDistance),rig:'bottom'};
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
    const seed=row*311+i,x=i*span*3+hash(seed+51)*span+Math.sin(t*.22+seed)*p*2;
    if(hash(seed+12)>.36)rect(x,yy,span*(.4+hash(seed+27)),1,row%3?palette.sea:'#82aaa5');
   }
  }
  // Wave fronts advance shoreward. Each segment tests the same depth and
  // breaking criterion as the overhead world; troughs and rip gaps stay dark.
  for(let row=0;row<11;row++){
   const distance=(row*15+165-(t*1.8)%15)%165+1;
   for(let x=0;x<w;x+=5){
    const scale=18/(18+distance),worldX=pl.x+(x/w-.5)/(.025*scale)*3.2;
    const worldY=pier?pl.y-distance*3.2:scene.shoreY(worldX)-distance*3.2;
    const sample=sampleShore(scene,worldX,worldY,t),p=shoreSurfaceProjection(w,h,scene,s,{x:worldX,y:worldY});
    const crest=(Math.sin(x*.048+row*.9+t*.17)*2+Math.sin(x*.17+row)*1.1)*scale,breaking=sample.breakStrength>.10;
    if(breaking||hash(row*727+Math.floor(x/5))>.28){
     const thickness=breaking?Math.max(2,scale*sample.waveHeight*10*sample.breakStrength):1;
     if(breaking)rect(x,p.y+crest-2,6,thickness+4,palette.deep);
     rect(x,p.y+crest,6,thickness,breaking?palette.foam:'#91b6af');
     if(breaking){
      rect(x,p.y+crest+thickness,6,2,palette.shallow);
      if(hash(row*437+Math.floor(x/5))>.3)rect(x+1,p.y+crest+thickness+3,3,1,palette.foam);
     }
    }
   }
  }
  if(pier){
   // Weathered concrete deck and steel railing, never the skiff's wooden hull.
   rect(0,h*.925,w,h*.075,'#777e77');rect(0,h*.925,w,3,'#bbc0ad');
   for(let i=0;i<35;i++)rect(hash(i+192)*w,h*(.937+hash(i+243)*.06),2,1,'#555f5b');
   for(const x of [w*.06,w*.94]){rect(x-2,h*.76,4,h*.17,'#344c50');rect(x-1,h*.76,1,h*.17,'#98a9a0');}
   rect(0,h*.76,w,4,'#3d5658');rect(0,h*.76,w,1,'#adb7a6');
  }else{
   const runup=Math.sin(t*.7)*h*.007,edge=h*.85+runup;
   const points=[{x:0,y:h},{x:0,y:edge}];
   for(let x=0;x<=w+8;x+=8)points.push({x,y:edge+Math.sin(x/w*7+pl.x/270)*h*.01});
   points.push({x:w,y:h});polygon(points,palette.wet);
   rect(0,h*.925,w,h*.075,palette.sand);rect(0,h*.975,w,h*.025,palette.dry);
   for(let i=0;i<160;i++){const x=hash(i+931)*w,y=h*(.88+hash(i+193)*.12);rect(x,y,hash(i+84)>.9?2:1,1,i%3?palette.grainDark:palette.grain);}
   for(let x=0;x<w;x+=5)rect(x,edge+Math.sin(x/w*7+pl.x/270)*h*.01-1,6,1,palette.foam);
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
   ...(g?{rodTip:toCSS(g.tip),reelKnob:toCSS(g.knob),lineEntry:toCSS(g.waterEntry),lineVisible:active&&g.lineVisible,bend:g.bend,surfaceFish:false,fishVisible:false,sandColor:palette.sand,depth:lastPose.depth,fishWorld:lastPose.fishWorld}:{} )};
 }
 resize(cssWidth,cssHeight);return{resize,draw,snapshot};
}
