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
 const rect=(x,y,ww,hh,c)=>{g.fillStyle=c;g.fillRect(x,y,ww,hh);};
 const line=(x,y,xx,yy,c,width=1)=>{g.strokeStyle=c;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();};
 const poly=(pts,c)=>{g.fillStyle=c;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
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
 // Stable sub-metre marks survive a close camera: the physical dimensions
 // stay fixed while the density is culled at a wider view.
 function groundGrain(v,shoreOnly=false){
  const step=cam.scale<1?3.2:1.2;
  for(let x=Math.floor(v.left/step)*step;x<v.right;x+=step)for(let y=Math.floor(v.top/step)*step;y<v.bottom;y+=step){
   const sy=beniciaShoreY(x),inland=y-sy;if(inland<.5||inland>m(42)||onPier(scene,x,y))continue;
   if(shoreOnly&&inland>m(6))continue;
   const n=hash(Math.round(x*10),Math.round(y*10));if(n<.42)continue;
   const xx=x+hash(x*11,y*7)*step,yy=y+hash(x*13,y*3)*step;
   rect(xx,yy,.055+n*.16,.035+n*.065,n>.76?'#d4cbb0':n>.53?'#aea78f':'#b4af95');
   if(n>.95)line(xx,yy,xx+.23,yy-.025,'#e0d7b9',.025);
  }
 }
 function shoreGround(){
  const v=view(),step=Math.max(.35,2/cam.scale),lo=Math.floor(v.left/step)*step,hi=v.right+step;
  const shore=[];for(let x=lo;x<=hi;x+=step)shore.push([x,beniciaShoreY(x)]);
  poly([...shore,[hi,1300],[lo,1300]],'#c3bca1');
  // A weathered waterside walking strip sits behind the armoured edge. Its
  // narrow joints and gritty shoulders give scale without a giant blank band.
  const near=shore.map(([x,y])=>[x,y+m(1.4)]),far=shore.map(([x,y])=>[x,y+m(4.8)]);
  poly([...near,...far.reverse()],'#b5b39f');
  const curb=shore.map(([x,y])=>[x,y+m(1.4)]);
  for(let i=1;i<curb.length;i++)line(...curb[i-1],...curb[i],'#d6cdb0',m(.06));
  for(let x=Math.floor(lo/m(2))*m(2);x<hi;x+=m(2)){
   const sy=beniciaShoreY(x),yy=sy+m(1.5);line(x,yy,x+.25,sy+m(4.75),'#a6a797',m(.012));
   if(hash(x,62)>.8)line(x,yy+m(1),x+m(.3),yy+m(1.25),'#969e90',m(.016));
  }
  const tide=beniciaTide(now);
  // Two irregular rows of small riprap have shadowed gaps and wet edges.
  // This avoids turning dozens of identical boulders into a single sawtooth.
  const rockStep=m(.52),firstRock=Math.floor(lo/rockStep)*rockStep;
  for(let x=firstRock;x<hi+rockStep;x+=rockStep){
   const sy=beniciaShoreY(x);
   if(x<800){const exposed=Math.max(0,1.7-tide.height)*m(2),yy=sy-exposed;rect(x,yy,rockStep+.05,exposed+m(.3),'#929b88');
    if(hash(x,7)>.52)line(x,yy+.15,x+.5,yy+.12,'#b7b6a0',.045);
   }else for(let row=0;row<2;row++){
    const n=hash(Math.round(x*10),row+4),rx=x+(row?.46:0)+(n-.5)*.55,ry=beniciaShoreY(rx)+row*m(.27)+n*m(.08);
    const r=m(.17+n*.2);poly([[rx-r,ry],[rx-r*.8,ry-r*.65],[rx-r*.1,ry-r],[rx+r*.8,ry-r*.63],[rx+r,ry],[rx+.1,ry+.14]],n>.5?'#78877b':'#65796f');
    poly([[rx-r*.8,ry-r*.65],[rx-r*.1,ry-r],[rx+r*.8,ry-r*.63],[rx+r*.36,ry-r*.35]],n>.5?'#b7bba6':'#a4afa0');
    line(rx-r*.65,ry-.03,rx+r*.65,ry+.025,'#4e7269',.07);
   }
  }
 }
 function bankFurniture(){
  const v=view(),spacing=m(14),lo=Math.floor(v.left/spacing)*spacing;
  for(let x=lo;x<v.right+spacing;x+=spacing){
   if(x>865&&x<1315)continue;
   const sy=beniciaShoreY(x);if(visible(x,sy+m(5),m(5))){
    bench(x,sy+m(5));
    if((Math.round(x/spacing)&1)===0)lamp(x+m(2.1),sy+m(5.2));
    // Low salt grass at the back of the promenade, with clear walking space.
    for(let i=0;i<7;i++){const gx=x-m(2)+i*.4,gy=sy+m(6)+hash(i,x)*.6;line(gx,gy,gx-.12,gy-.32,'#859777',.035);line(gx+.07,gy,gx+.21,gy-.45,'#718871',.035);}
   }
  }
 }
 function land(){
  const v=view();shoreGround();
  // The promenade opens onto First Street's rounded turnaround.
  rect(850,570,475,570,'#969c92');rect(898,560,380,590,'#777f7a');
  poly([[900,585],[864,510],[896,439],[948,409],[1230,409],[1282,439],[1312,510],[1278,585]],'#858d83');
  for(let y=650;y<1130;y+=70)rect(1086,y,4,28,'#dfd0a5');
  // A low promenade barrier keeps its geographic span, with human-scale
  // rails and posts instead of the old metre-thick road decoration.
  const barrierFoot=477,barrierTop=barrierFoot-m(.8);
  line(914,barrierTop,1264,barrierTop,'#c2c3ab',m(.07));
  line(914,barrierFoot-m(.35),1264,barrierFoot-m(.35),'#879488',m(.04));
  for(let x=914;x<=1264;x+=m(2.4))line(x,barrierFoot,x,barrierTop,'#556f68',m(.075));
  label('FIRST STREET',1090,951,20,'#c9ceb5');
  // Waterfront lawns, worn walking paths and historic pilings east of the spit.
  rect(80,735,720,420,'#96a581');rect(1340,760,850,380,'#96a581');
  rect(80,792,720,29,'#cfc6a6');rect(1340,790,850,29,'#cfc6a6');

  for(let i=0;i<11;i++){const x=510+i*23,y=beniciaShoreY(x)-25-(i%3)*13;if(visible(x,y)){withShoreProp(g,x,y+11,.09,()=>{rect(x+4,y+6,9,10,'#456f69');rect(x,y-16,9,27,'#6c6350');rect(x-1,y-18,11,3,'#b9a27b');},.22);}}
  for(const x of[815,1340,1480,650])if(visible(x,850))palm(x,850);
  // Parked cars stay behind the active bank and leave pedestrian space.
  for(const [x,y,c] of[[934,617,'#e0d8bc'],[1190,590,'#4d6f78'],[931,870,'#ad7260'],[1216,905,'#a2afaa']])if(visible(x,y)){
   withShoreProp(g,x,y,m(1.8)/42,()=>{rect(x+6,y+7,42,74,'#637a70');rect(x,y,42,72,c);rect(x+5,y+14,32,20,'#455d60');rect(x+5,y+40,32,13,'#516d6d');rect(x-3,y+12,5,13,'#354646');rect(x+40,y+12,5,13,'#354646');rect(x+3,y+3,9,3,'#eae2c1');rect(x+31,y+3,8,3,'#eae2c1');},m(4.5)/72);
  }
  for(const [x,y]of[[860,595],[1310,595],[1450,692],[1710,680],[900,389],[1270,389]])if(visible(x,y))lamp(x,y);

  // Old brick storefronts at the inland edge; silhouettes, no invented brands.
  for(let i=0;i<6;i++){const x=200+i*280,y=1040;if(visible(x,y)){withShoreProp(g,x+80,y+105,.2,()=>{rect(x,y,160,105,i%2?'#a68c75':'#b59b7d');rect(x-4,y-8,168,12,'#56716a');for(let j=0;j<4;j++){rect(x+14+j*37,y+17,23,30,'#e3d1a7');rect(x+17+j*37,y+20,17,23,'#5a8180');}rect(x+66,y+63,29,42,'#44696a');});}}
  groundGrain(v);bankFurniture();
  if(visible(1130,730,220))shop();
 }
 function pier(){const p=scene.pier;
  // The elevated deck casts a translucent shadow onto both water and land;
  // the shoreline and ground texture must remain visible underneath it.
  g.save();g.globalAlpha=.12;rect(p.x-25,p.top+15,74,p.bottom-p.top,'#3e6765');g.restore();
  g.save();g.translate(0,-m(3.5));rect(p.x-32,p.top,64,p.bottom-p.top,'#b9bba5');
  // Joints and railings are metric props too, not metre-thick strokes left
  // over from the old enlarged-person artwork.
  const v=view();
  for(let y=p.top+5;y<p.bottom;y+=m(2.4))line(p.x-32,y,p.x+32,y,'#939e90',m(.016));
  for(let x=p.x-24;x<p.x+32;x+=m(2.4))line(x,p.top,x,p.bottom,'#a5ac99',m(.012));
  const grainStep=cam.scale<1?3.2:1.25;
  for(let x=Math.max(p.x-31,Math.floor(v.left/grainStep)*grainStep);x<Math.min(p.x+31,v.right);x+=grainStep)for(let y=Math.max(p.top,Math.floor(v.top/grainStep)*grainStep);y<Math.min(p.bottom,v.bottom+m(3.5));y+=grainStep){const n=hash(Math.round(x*10),Math.round(y*10));if(n>.58)rect(x+n*.7,y+n*.3,.09+n*.06,.035+n*.045,n>.86?'#d7d8bd':'#a1ab96');}
  for(const x of[p.x-29,p.x+29])for(let y=p.top+8;y<p.bottom;y+=m(5)){
   rect(x-.27,y-.14,.54,.28,'#6e837b');for(let k=0;k<3;k++)line(x-.2+k*.17,y-.11,x-.2+k*.17,y+.1,'#364f50',.022);
  }
  function rail(x0,y0,x1,y1){
   const height=m(1.1),count=Math.ceil(Math.hypot(x1-x0,y1-y0)/m(2.4));
   line(x0,y0-height,x1,y1-height,'#e0d4b2',m(.05));
   line(x0,y0-height*.5,x1,y1-height*.5,'#879488',m(.035));
   for(let i=0;i<=count;i++){const f=i/count,x=x0+(x1-x0)*f,y=y0+(y1-y0)*f;line(x,y,x,y-height,'#546861',m(.065));}
  }
  rail(p.x-31.5,p.top,p.x-31.5,p.bottom);rail(p.x+31.5,p.top,p.x+31.5,p.bottom);rail(p.x-31.5,p.top,p.x+31.5,p.top);
  for(const y of[p.top+42,p.top+123]){lamp(p.x+29,y);bench(p.x-3,y+20);}
  g.restore();
  withShoreProp(g,p.x,p.bottom+25,.08,()=>{rect(p.x-68,p.bottom+10,136,22,'#355e5d');label('BENICIA FISHING PIER',p.x,p.bottom+25,9,'#f1dfb4');});
 }
 function water(){
  const v=view(),tide=beniciaTide(now);rect(v.left,v.top,v.right-v.left,v.bottom-v.top,'#608c86');
  // Continuous colour through the turbid shallows. Rendering resolution is
  // screen-sized, while shoreline/depth coordinates remain in world metres.
  const step=Math.max(.25,2/cam.scale),lo=Math.floor(v.left/step)*step;
  for(let x=lo;x<v.right+step;x+=step){
   const sy=beniciaShoreY(x+step*.5),tip=Math.exp(-(((x-1090)/245)**2)),reach=m(60+tip*50);
   const gradient=g.createLinearGradient(x,sy,x,sy-reach);
   if(gradient?.addColorStop){gradient.addColorStop(0,'#86a89a');gradient.addColorStop(.10,'#7ba396');gradient.addColorStop(.32,'#6c998f');gradient.addColorStop(.67,'#5a8783');gradient.addColorStop(1,'#4d777a');g.fillStyle=gradient;}
   else g.fillStyle='#729b90';
   g.fillRect(x,v.top,step+1/cam.scale,Math.max(0,Math.min(v.bottom,sy)-v.top));
  }
  // Deterministic small surface facets are seeded by world cells, not by the
  // viewport. They drift with the tide but never jump when the camera moves.
  const grid=cam.scale<1?m(1.6):m(.5),drift=now*tide.speed*3.2;
  const start=Math.floor((v.left+drift)/grid)-1,end=Math.ceil((v.right+drift)/grid)+1;
  for(let i=start;i<=end;i++)for(let j=Math.floor(v.top/grid)-1;j<=Math.ceil(v.bottom/grid);j++){
   const n=hash(i,j);if(n<.56)continue;
   const x=(i+hash(i+831,j))*grid-drift,y=(j+hash(i,j+613))*grid,sy=beniciaShoreY(x);
   if(y>sy-.25||y<v.top||y>v.bottom||x<v.left-2||x>v.right+2)continue;
   const wave=Math.sin(now*1.85+i*.31+j*.77),length=m(.09+n*.19),alpha=.16+Math.abs(wave)*.18;
   g.globalAlpha=alpha;rect(x,y,length,.025+n*.026,n>.8?'#d1dfc6':'#365f66');
   if(n>.85){rect(x+.1,y-.07,length*.55,.024,'#cedec8');}
  }
  g.globalAlpha=1;
  // Shore reflection threads stay broken and narrow: estuary water has no
  // beach-like white surf, only small highlights beside the riprap.
  for(let x=Math.floor(v.left/.8)*.8;x<v.right;x+=.8){const n=hash(Math.round(x*10),91);if(n>.58){const sy=beniciaShoreY(x),yy=sy-.2-Math.abs(Math.sin(now*1.85+x*.055))*.22;g.globalAlpha=.22;rect(x,yy,.18+n*.32,.035,'#d1dbc0');}}
  g.globalAlpha=1;
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
  g.save();g.translate(foot.x,foot.y);g.fillStyle='#7c8b79';g.fillRect(-m(.3),0,m(.6),m(.12));drawShorePerson(g,{style,scale:shorePersonScale(style),walking:n.walking,fishing:player||['casting','retrieving'].includes(n.mode),facing:player?n.facing:-1,time:now});g.restore();
 }
 function locals(state){
  for(const n of state.crowd||[]){person(n);if(!visible(n.x,n.y))continue;
   if(!n.walking){const x=n.x+m(.6),y=n.y;rect(x,y-m(.3),m(.6),m(.3),'#d2d7be');rect(x-.04,y-m(.3),m(.625),m(.045),n.offset>.5?'#4c777e':'#a77751');rect(x+m(.22),y-m(.23),m(.16),m(.045),'#8d9a8b');}
   const casting=n.mode==='casting',rod=shoreRodPose({player:n,onPier:onPier(scene,n.x,n.y),fishingControls:{rodLift:casting?.35+Math.sin(clamp(n.phase/2,0,1)*Math.PI)*.45:n.mode==='retrieving'?.4:.8,rodSweep:0}},{style:n.style});drawMetricRod(g,rod);
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
