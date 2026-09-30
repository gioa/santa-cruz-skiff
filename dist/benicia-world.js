import {BENICIA_SCENE as scene,beniciaShoreY,beniciaTide} from './benicia-data.js';
import {drawShorePerson} from './shore-people.js';
import {shoreCastPosition} from './shore-casting.js';
import {shoreWaterContact,shoreTackleLine,shoreLineWaterEntry,shoreRigUsesFloat,shoreVisibleLineSegments,shorePierOccludes} from './shore-tackle-visual.js';
import {shoreFishPosition} from './shore-line-geometry.js';
import {sampleShore} from './shore-data.js';
import {shoreRodPose,shoreActionCameraTarget,advanceShoreActionCamera,shoreFishVisual,drawShoreFish,shoreCastPreviewVisual,drawShoreCastPreview} from './shore-action-view.js';
import {shoreWorldMetres as m,shorePersonScale,shorePersonFoot} from './shore-scale.js';
import {shoreFineLine,drawMetricRod,drawMetricFloat,drawMetricWeight,withShoreProp} from './shore-metric-art.js';
import {onPier} from './shore-data.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(x,y=0)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
// South-facing view: eastward flood moves left. Wrap both signs offshore.
export const beniciaRippleX=(start,time,speed)=>((start-time*speed*3.2)%2600+2600)%2600-150;
export function createBeniciaWorld(canvas){
 const g=canvas.getContext('2d',{alpha:false});let w=900,h=700,now=0,insets={top:120,bottom:180},lastState=null,focus=null,lastTime=null,offsetY=350,lastTackle=null,drawOptions={};
 const cam={x:scene.spawn.x,y:scene.spawn.y-50,scale:.9,width:w,height:h};let first=true;
 const rect=(x,y,ww,hh,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(ww),Math.round(hh));};
 const line=(x,y,xx,yy,c,width=1)=>{g.strokeStyle=c;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();};
 const poly=(pts,c)=>{g.fillStyle=c;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fill();};
 const label=(t,x,y,size=12,c='#3d5552')=>{g.font=`bold ${size}px monospace`;g.textAlign='center';g.fillStyle=c;g.fillText(t,x,y);};
 const view=()=>({left:cam.x-w/2/cam.scale,right:cam.x+w/2/cam.scale,top:cam.y-offsetY/cam.scale,bottom:cam.y+(h-offsetY)/cam.scale});
 const visible=(x,y,r=100)=>{const v=view();return x>v.left-r&&x<v.right+r&&y>v.top-r&&y<v.bottom+r;};
 function rock(x,y,r=12){
  poly([[x-r,y],[x-r,y-r*.5],[x-r*.4,y-r],[x+r*.5,y-r*.8],[x+r,y-r*.25],[x+r,y+3]],'#657672');
  poly([[x-r+2,y-r*.5],[x-r*.4,y-r],[x+r*.5,y-r*.8],[x+r*.7,y-r*.45]],'#a9aca0');rect(x-r*.4,y-r*.5,r*.7,2,'#c4c0a8');
 }
 function lamp(x,y){withShoreProp(g,x,y,m(4)/88,()=>lampArt(x,y));}
 function lampArt(x,y){rect(x+7,y,20,4,'#a2a38f');rect(x-2,y-65,4,65,'#344f50');rect(x-5,y-68,10,4,'#304c4d');rect(x-6,y-82,12,14,'#3a5251');rect(x-4,y-80,8,10,'#efdab0');rect(x-1,y-82,2,14,'#67726b');poly([[x-8,y-82],[x,y-88],[x+8,y-82]],'#3a5251');}
 function bench(x,y){withShoreProp(g,x,y,m(1.8)/54,()=>benchArt(x,y));}
 function benchArt(x,y){rect(x-26,y-10,52,8,'#a1845e');rect(x-26,y-16,52,3,'#c7aa7b');rect(x-26,y-21,52,3,'#c7aa7b');rect(x-20,y-13,4,19,'#3a5653');rect(x+17,y-13,4,19,'#3a5653');rect(x-27,y-7,54,3,'#dec092');}
 function palm(x,y){withShoreProp(g,x,y,m(6)/90,()=>palmArt(x,y));}
 function palmArt(x,y){
  rect(x+6,y,45,5,'#a8ae92');line(x,y,x-4,y-75,'#806f52',9);for(let i=0;i<8;i++)rect(x-7,y-i*9,7,3,'#c4a378');
  for(let i=0;i<7;i++){const a=i*Math.PI/3.5,dx=Math.cos(a)*47,dy=Math.sin(a)*20;poly([[x-4,y-80],[x+dx*.6,y-90+dy],[x+dx,y-73+dy],[x+dx*.5,y-84+dy*.5]],i%2?'#65836a':'#466c58');}
 }
 function shop(){withShoreProp(g,scene.shop.door.x,scene.shop.door.y,.14,()=>shopArt());}
 function shopArt(){
  // Fictional mobile tackle stand. No claim of a real shop at this coordinate.
  const x=scene.shop.x,y=scene.shop.y;rect(x+10,y+113,152,13,'#a1a58b');rect(x+10,y+35,144,82,'#e0d5ae');rect(x+10,y+105,144,12,'#66807c');
  rect(x+17,y+51,76,45,'#385d60');rect(x+20,y+55,70,3,'#bcd3bc');rect(x+102,y+48,39,57,'#5c817c');rect(x+107,y+52,29,32,'#9bb9a7');
  rect(x+27,y+113,20,12,'#354a48');rect(x+118,y+113,20,12,'#354a48');
  for(let i=0;i<12;i++){rect(x-5+i*14,y+25,14,18,i%2?'#e9dcb5':'#987356');rect(x-5+i*14,y+41,14,6,i%2?'#d4c39a':'#785e48');}
  rect(x+9,y-4,142,28,'#2f5659');label('TACKLE EXCHANGE',x+80,y+14,12,'#f4e2b8');
  for(let i=0;i<5;i++){line(x+25+i*11,y+90,x+22+i*11,y+63,'#dbbd7f',2);rect(x+20+i*11,y+75,4,6,i%2?'#bd8b47':'#b8c9bd');}
  rect(x+163,y+95,30,24,'#778b82');rect(x+160,y+93,36,5,'#e6dec0');
 }
 function land(){
  const v=view(),lo=Math.floor(v.left/2)*2,hi=v.right+12,shore=[];
  for(let x=lo;x<hi;x+=2)shore.push([x,beniciaShoreY(x)]);
  poly([...shore,[hi,1300],[lo,1300]],'#c3bca1');
  // Wet tidal pocket and armour rocks follow the outline, never a surf beach.
  for(let x=lo;x<hi;x+=12){const y=beniciaShoreY(x);
   if(x<800){const exposed=(1.7-beniciaTide(now).height)*20;rect(x,y-exposed,13,exposed+12,'#909583');if(hash(x,2)>.45)rect(x,y-exposed+4,8,1,'#bdbaa0');}
   else if(visible(x,y))for(let dx=0;dx<12;dx+=2.2){const ry=beniciaShoreY(x+dx);withShoreProp(g,x+dx,ry+1.2,.11,()=>rock(x+dx,ry+1.2,12+hash(x+dx,4)*9));}
   rect(x,y+22,13,4,'#d4c9a6');
  }
  // The promenade opens onto First Street's rounded turnaround.
  rect(850,570,475,570,'#969c92');rect(898,560,380,590,'#777f7a');
  poly([[900,585],[864,510],[896,439],[948,409],[1230,409],[1282,439],[1312,510],[1278,585]],'#858d83');
  for(let y=650;y<1130;y+=70)rect(1086,y,4,28,'#dfd0a5');
  rect(914,470,350,7,'#c2c3ab');for(let x=930;x<1270;x+=50)rect(x,463,3,20,'#556f68');
  label('FIRST STREET',1090,951,20,'#c9ceb5');
  // Waterfront lawns, worn walking paths and historic pilings east of the spit.
  rect(80,735,720,420,'#96a581');rect(1340,760,850,380,'#96a581');
  rect(80,792,720,29,'#cfc6a6');rect(1340,790,850,29,'#cfc6a6');
  for(let x=100;x<800;x+=73)if(visible(x,beniciaShoreY(x)+93)){
   const yy=beniciaShoreY(x)+94;bench(x,yy);if(x%3)lamp(x+28,yy-4);
  }
  for(let i=0;i<11;i++){const x=510+i*23,y=beniciaShoreY(x)-25-(i%3)*13;if(visible(x,y)){withShoreProp(g,x,y+11,.09,()=>{rect(x+4,y+6,9,10,'#456f69');rect(x,y-16,9,27,'#6c6350');rect(x-1,y-18,11,3,'#b9a27b');},.22);}}
  for(const x of[815,1340,1480,650])if(visible(x,850))palm(x,850);
  // Parked cars stay behind the active bank and leave pedestrian space.
  for(const [x,y,c] of[[934,617,'#e0d8bc'],[1190,590,'#4d6f78'],[931,870,'#ad7260'],[1216,905,'#a2afaa']])if(visible(x,y)){
   withShoreProp(g,x,y,m(1.8)/42,()=>{rect(x+6,y+7,42,74,'#637a70');rect(x,y,42,72,c);rect(x+5,y+14,32,20,'#455d60');rect(x+5,y+40,32,13,'#516d6d');rect(x-3,y+12,5,13,'#354646');rect(x+40,y+12,5,13,'#354646');rect(x+3,y+3,9,3,'#eae2c1');rect(x+31,y+3,8,3,'#eae2c1');},m(4.5)/72);
  }
  for(const [x,y]of[[860,595],[1310,595],[1450,692],[1710,680],[900,389],[1270,389]])if(visible(x,y))lamp(x,y);
  for(const x of[1480,1680,1880])if(visible(x,700))bench(x,700);
  // Old brick storefronts at the inland edge; silhouettes, no invented brands.
  for(let i=0;i<6;i++){const x=200+i*280,y=1040;if(visible(x,y)){withShoreProp(g,x+80,y+105,.2,()=>{rect(x,y,160,105,i%2?'#a68c75':'#b59b7d');rect(x-4,y-8,168,12,'#56716a');for(let j=0;j<4;j++){rect(x+14+j*37,y+17,23,30,'#e3d1a7');rect(x+17+j*37,y+20,17,23,'#5a8180');}rect(x+66,y+63,29,42,'#44696a');});}}
  if(visible(1130,730,220))shop();
 }
 function pier(){const p=scene.pier;
  rect(p.x-25,p.top+15,74,p.bottom-p.top,'#3e6765');g.save();g.translate(0,-m(3.5));rect(p.x-32,p.top,64,p.bottom-p.top,'#b9bba5');
  for(let y=p.top+5;y<p.bottom;y+=16){rect(p.x-29,y,58,1,'#8a9589');for(const x of[p.x-32,p.x+30]){rect(x,y,3,14,'#546861');rect(x-2,y+13,7,5,'#415a53');}}
  for(const x of[p.x-32,p.x+30])rect(x,p.top,3,p.bottom-p.top,'#e0d4b2');rect(p.x-32,p.top,64,3,'#e4dab9');
  for(const y of[p.top+42,p.top+123]){lamp(p.x+29,y);bench(p.x-3,y+20);}
  g.restore();
  withShoreProp(g,p.x,p.bottom+25,.08,()=>{rect(p.x-68,p.bottom+10,136,22,'#355e5d');label('BENICIA FISHING PIER',p.x,p.bottom+25,9,'#f1dfb4');});
 }
 function water(){
  const v=view(),tide=beniciaTide(now);rect(v.left,v.top,v.right-v.left,v.bottom-v.top,'#608c86');
  // Authored estuarine depth tones and turbid shallow pocket.
  for(let x=Math.floor(v.left/16)*16;x<v.right+16;x+=16){const sy=beniciaShoreY(x);
   for(let y=Math.floor(v.top/16)*16;y<Math.min(v.bottom,sy);y+=16){const d=(sy-y)/3.2;rect(x,y,17,17,d<12?'#8aaba0':d<32?'#769c91':d<70?'#638f87':'#557f7e');}
  }
  // Ripples advect east/west with the tidal stream. No ocean breaker bands.
  for(let i=0;i<470;i++){const x=beniciaRippleX(hash(i,4)*2600,now,tide.speed),y=hash(i,6)*1500-760;
   if(y>beniciaShoreY(x)-3||!visible(x,y,10))continue;rect(x,y,5+hash(i,9)*17,1,hash(i,10)>.5?'#92afa0':'#486f70');
  }
  for(let i=0;i<3;i++){const x=280+i*180,y=-180+i*36;if(visible(x,y)){for(let j=0;j<8;j++)rock(x+j*13,y+Math.sin(j)*5,11);}}
  // Distant working ship travels through the strait, with its own fading wake.
  const shipX=(now*1.7+350)%3000-350,shipY=-330;
  if(visible(shipX,shipY,300)){
   for(let i=1;i<18;i++)rect(shipX-i*15-30,shipY+24+Math.sin(i)*2,11,2,i<8?'#9bb8aa':'#6f988f');
   poly([[shipX-70,shipY],[shipX+84,shipY],[shipX+68,shipY+33],[shipX-62,shipY+33]],'#374e51');rect(shipX-63,shipY+4,128,19,'#986e54');
   for(let i=0;i<7;i++){rect(shipX-31+i*12,shipY-9,11,16,i%2?'#9b755a':'#687f72');rect(shipX-31+i*12,shipY-8,9,2,'#b9ad89');}
   rect(shipX-60,shipY-18,25,24,'#d8d8bf');rect(shipX-58,shipY-14,20,5,'#446164');rect(shipX-53,shipY-30,5,12,'#4b5550');
  }
 }
 function person(n,player=false){
  if(!visible(n.x,n.y))return;const style=player?'player':n.style,foot=shorePersonFoot({player:n,onPier:onPier(scene,n.x,n.y)});
  g.save();g.translate(foot.x,foot.y);g.fillStyle='#7c8b79';g.fillRect(-m(.3),0,m(.6),m(.12));drawShorePerson(g,{style,scale:shorePersonScale(style),walking:n.walking,fishing:true,facing:player?n.facing:-1,time:now});g.restore();
 }
 function locals(state){
  for(const n of state.crowd||[]){person(n);if(!visible(n.x,n.y))continue;
   g.fillStyle='#d2d7be';g.fillRect(n.x+m(.6),n.y-m(.3),m(.6),m(.3));
   const rod=shoreRodPose({player:n,onPier:onPier(scene,n.x,n.y)},{style:n.style});drawMetricRod(g,rod);
   if(n.mode==='retrieving'||n.mode==='casting'){const progress=n.mode==='casting'?n.phase/2:1-(n.phase-2)/38,tx=n.x-25+n.offset*50,ty=n.y-55-progress*110;shoreFineLine(g,rod.tip,{x:tx,y:ty},'#c2c4a5',.025);}
  }
 }
 function ring(x,y,r,color,alpha=1){
  g.save();g.globalAlpha=alpha;for(let i=0;i<20;i++){const a=i/20*Math.PI*2,b=(i+1)/20*Math.PI*2;line(x+Math.cos(a)*r,y+Math.sin(a)*r*.42,x+Math.cos(b)*r,y+Math.sin(b)*r*.42,color,.045);}g.restore();
 }
 function playerLine(s){
  lastTackle=null;const p=s.player||scene.spawn;
  if(!s.cast||['walk','landed'].includes(s.phase)){drawMetricRod(g,shoreRodPose(s,drawOptions));return null;}
  const casting=s.phase==='casting',fight=s.phase==='fighting',floating=!casting&&shoreRigUsesFloat(s),rod=shoreRodPose(s,drawOptions),tip=rod.tip;
  const ground=casting?shoreCastPosition(s.cast,s.cast.flight||0):fight?shoreFishPosition(scene,s):s.cast.target;
  const sample=casting||floating?null:sampleShore(scene,ground.x,ground.y,now,s.seaState);
  const depth=sample?(fight?Number.isFinite(s.fishMotion?.depth)?s.fishMotion.depth:sample.depth*.72:s.presentation?.depth??sample.depth):0;
  const entryWorld=casting?ground:shoreLineWaterEntry(scene,s,ground,depth),contact=casting?null:shoreWaterContact(scene,entryWorld,now,s.seaState);
  const target={x:entryWorld.x,y:entryWorld.y-(casting?ground.height*3.2:contact.height*3.2)};
  const airHeight=fight?Math.max(0,s.fishMotion?.airHeight||0):0;
  const attachment={x:target.x,y:target.y+(floating&&s.phase==='bite'?m(.04):0)-(floating?0:airHeight*3.2)};
  const strand=shoreTackleLine(tip,attachment,{tension:s.tension,sag:casting?m(.25):m(.2),flowX:contact?.flowX,flowY:contact?.flowY,scale:.08});
  const attachmentHeight=casting?ground.height:(contact?.height||0)+airHeight;
  const visibleLine=shoreVisibleLineSegments(scene,strand,rod.tipWorld.height,attachmentHeight);
  for(const [a,b]of visibleLine)shoreFineLine(g,a,b,'#e1dab7',.025);
  drawMetricRod(g,rod);
  if(!shorePierOccludes(scene,attachment,attachmentHeight)){if(casting)drawMetricWeight(g,target);else if(floating)drawMetricFloat(g,attachment,contact);}
  if(floating&&airHeight>0)shoreFineLine(g,attachment,{x:ground.x,y:ground.y-contact.height*3.2-airHeight*3.2},'#e1dab7',.025);
  lastTackle={rodTip:tip,waterEntry:target,entryWorld,terminalPosition:ground,attachment,line:strand,bend:rod.bend,surfaceHeight:contact?.height||0,tilt:floating?contact.tilt:0,breaking:contact?.breaking||0,floatVisible:floating,rodControls:rod.controls,rodPoints:rod.points,airHeight};
  return casting?target:ground;
 }
 function worldToScreen(p,y){p=typeof p==='object'?p:{x:p,y};const x=(p.x-cam.x)*cam.scale+w/2,yy=(p.y-cam.y)*cam.scale+offsetY,r=canvas.getBoundingClientRect();return{x:x*r.width/w,y:yy*r.height/h,clientX:r.left+x*r.width/w,clientY:r.top+yy*r.height/h,visible:x>=0&&x<=w&&yy>=0&&yy<=h};}
 function resize(width,height){w=width;h=height;canvas.width=Math.round(w);canvas.height=Math.round(h);cam.width=w;cam.height=h;cam.scale=w<600?.88:1.05;first=true;}
 function draw(s={},time=0,options={}){
  const {reducedMotion=false}=options;drawOptions=options;lastState=s;now=reducedMotion?0:s.elapsed||0;const p=s.player||scene.spawn;
  const raw=Number.isFinite(time)?time:now,dt=lastTime===null?.016:clamp(raw-lastTime,0,.1);lastTime=raw;
  const targetCamera=shoreActionCameraTarget(scene,s,{width:w,height:h,top:insets.top,bottom:insets.bottom,left:insets.left||0,right:insets.right||0,baseScale:w<600?.88:1.05,manualFocus:focus,actionFocus:options.actionFocus,rodLift:options.rodLift,rodSweep:options.rodSweep});
  if(!first)cam.y+=(targetCamera.screenY-offsetY)/cam.scale;
  Object.assign(cam,advanceShoreActionCamera(cam,targetCamera,dt,{initialized:!first,reducedMotion}));offsetY=targetCamera.screenY;first=false;
  g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;rect(0,0,w,h,scene.palette.sea);
  g.setTransform(cam.scale,0,0,cam.scale,w/2-cam.x*cam.scale,offsetY-cam.y*cam.scale);
  water();land();pier();locals(s);
  const castPreview=shoreCastPreviewVisual(s);drawShoreCastPreview(castPreview,line);
  if(s.walkTarget){const q=s.walkTarget;line(q.x-m(.2),q.y,q.x+m(.2),q.y,'#f0dfb0',.04);line(q.x,q.y-m(.2),q.x,q.y+m(.2),'#f0dfb0',.04);}
  const fishVisual=shoreFishVisual(scene,s,{time:now,reducedMotion,cameraScale:cam.scale});
  person(p,true);const target=playerLine(s);drawShoreFish(g,fishVisual,{line,ring,foam:scene.palette.foam});
  const e=s.shoreLore?.encounter;if(e)person({...e,style:'oldhat',mode:'watching'});
  if(s.warden)person({...s.warden,style:'warden'});
  for(let i=0;i<5;i++){const x=700+i*190+Math.sin(now*.1+i)*85,y=130+Math.sin(now*.08+i)*80;if(visible(x,y)){const wing=Math.sin(now*4+i)*m(.22);line(x-m(.6),y-wing,x,y+m(.05),'#e2e5cc',m(.035));line(x,y+m(.05),x+m(.6),y-wing,'#e2e5cc',m(.035));}}
  g.setTransform(1,0,0,1,0,0);
  return{player:worldToScreen(p),shop:worldToScreen(scene.shop.door),pier:worldToScreen(scene.pier.gate),castTarget:target?worldToScreen(target):null,camera:{...cam},tackle:lastTackle,actionCamera:{mode:targetCamera.mode,focus:targetCamera.focus,desiredScale:targetCamera.scale,safeBounds:targetCamera.safeBounds},fishVisual,castPreview};
 }
 return{draw,resize,worldToScreen,screenToWorld(x,y){const r=canvas.getBoundingClientRect();return{x:((x-r.left)*w/r.width-w/2)/cam.scale+cam.x,y:((y-r.top)*h/r.height-offsetY)/cam.scale+cam.y};},focus(x,y){focus=x==null?null:typeof x==='object'?x:{x,y};first=true;},setInsets(v){insets={...insets,...v};},get camera(){return{...cam};},get state(){return lastState;}};
}
