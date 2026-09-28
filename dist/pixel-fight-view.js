import {drawWeatherOverlay} from './pixel-daily-weather.js?v=20260928-pixel-v75';
import {drawCloseTackle} from './pixel-fight-tackle.js?v=20260928-pixel-v75';
import {fishBodyPose,drawFishBody} from './pixel-fish-motion.js?v=20260928-pixel-v75';
import {rodFlexPoint} from './pixel-rod-response.js?v=20260928-pixel-v75';
// First-person artwork uses the same rod pose, load, surface intersection and
// crank speed as the simulation. It is a camera change, never another fight.
import {reelMotion} from './pixel-fishing-feedback.js?v=20260928-pixel-v75';
import {fishSpriteKind,fishSpriteBounds} from './pixel-fish-art.js?v=20260928-pixel-v75';
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
const mix=(a,b,t)=>a+(b-a)*t;
const hash=(n)=>{let x=Math.imul(n|0,1597334677);x^=x>>>15;return((Math.imul(x,2246822507)^(x>>>13))>>>0)/4294967295;};

/** A broadside fish uses its physical nose-to-tail length, never an icon size.
 * The camera is an angler's eye 1.35 m above the water with a 62° horizontal
 * field of view. At a shared distance, doubling fish length doubles its image.
 */
export function fightFishProjection(width,state={}){
 const lengthCm=state.fish?.length,depth=state.lureDepth;
 if(state.fishState!=='fight'||!Number.isFinite(lengthCm)||lengthCm<=0||!Number.isFinite(depth)||depth<0||depth>=1.15||!Number.isFinite(state.paidLineMeters)||state.paidLineMeters>=8)return null;
 const target=state.bobber||state.lineEntry;
 const origin=Number.isFinite(state.boatX)&&Number.isFinite(state.boatZ)?{x:state.boatX,z:state.boatZ}:state.rodTip;
 if(!Number.isFinite(target?.x)||!Number.isFinite(target?.z)||!Number.isFinite(origin?.x)||!Number.isFinite(origin?.z))return null;
 const horizontalDistance=Math.hypot(target.x-origin.x,target.z-origin.z),distanceMeters=Math.max(.5,Math.hypot(horizontalDistance,1.35-finite(target.height,-depth)));
 const focalPixels=Math.max(1,finite(width,1))/(2*Math.tan(31*Math.PI/180));
 return{lengthCm,lengthPixels:lengthCm/100*focalPixels/distanceMeters,distanceMeters,depth,airHeight:Math.max(0,finite(target.height)),pixelsPerMeter:focalPixels/distanceMeters};
}

/** Geometry is in logical pixels. Shared endpoints keep line and rod attached. */
export function fightViewGeometry(width,height,state={},options={}){
 const w=Math.max(1,finite(width,1)),h=Math.max(1,finite(height,1)),landscape=w>h*1.2;
 const inset=clamp(finite(options.bottomInset),0,h*.48),bottom=clamp(h-inset*.12-8,h*.76,h*.86);
 const mount=['port','starboard'].includes(state.rodMount)?state.rodMount:'hand',mounted=mount!=='hand';
 const elevation=clamp(finite(state.rodElevation,45),5,85),azimuth=clamp(finite(state.rodAzimuth,70),-110,110),bend=clamp(finite(state.rodBend),0,1);
 const heave=options.reducedMotion?0:Math.sin(finite(options.clock)*.72)*Math.min(1.1,h*.003);
 const horizon=Math.round(h*.255),railY=h*.855+heave;
 const scale=Math.min(w/260,h/(landscape?310:487))*1.15;
 const armRoom=mounted?15*scale:0;
 const base={x:w*(mount==='port'?.25:mount==='starboard'?.73:.35),y:(mounted?bottom-armRoom:h*(landscape?.61:.745))+heave};
 const length=Math.min(w*.66,Math.max(20,(base.y-horizon)*.95)),e=elevation*Math.PI/180;
 // Perspective compresses the sideways sweep near the camera edges. Reserve
 // some of that span for the loaded tip so full left/right sweeps never clip.
 const span=azimuth<0?base.x-w*.06:w*.94-base.x,dx=span*(azimuth/110)*.80,dy=-length*(.34+.74*Math.sin(e));
 const flexX=span*(azimuth/110)*.18*bend,flexY=bend*Math.min(length*.50,-dy*.90);
 // The grip and first three blank segments are rigid and collinear. Flex
 // starts smoothly beyond the foregrip, with zero slope at that junction.
 const points=[];for(let i=0;i<=28;i++){const t=i/28,motion=rodFlexPoint(state,Math.max(0,(t-3/28)/(1-3/28)),length),flex=motion.shape;points.push({x:clamp(base.x+dx*t+flexX*flex+motion.x,w*.06,w*.94),y:base.y+dy*t+flexY*flex+motion.y});}
 const tip=points.at(-1),norm=Math.hypot(dx,dy)||1,ux=dx/norm,uy=dy/norm;
 const butt={x:base.x-ux*87*scale,y:base.y-uy*87*scale};
 const reelSeat={x:base.x-ux*35*scale,y:base.y-uy*35*scale};
 const reel={x:reelSeat.x-uy*26*scale,y:reelSeat.y+ux*26*scale};
 const grip={x:base.x-ux*66*scale,y:base.y-uy*66*scale};
 const reelHub={x:reel.x+13.2*scale,y:reel.y+3.3*scale};
 const angle=finite(options.crankAngle),knob={x:reelHub.x+Math.cos(angle)*36*scale,y:reelHub.y+Math.sin(angle)*23*scale};
 // Only the line's actual surface entry is visible; no invented float or
 // underwater fish marker. Translate the actual displacement relative to the
 // rod tip into this deliberately enlarged first-person rod presentation.
 const heading=finite(state.heading),entry=state.lineEntry,physicalTip=state.rodTip;
 let lateral=0,forward=0;
 if(Number.isFinite(entry?.x)&&Number.isFinite(entry?.z)&&Number.isFinite(physicalTip?.x)&&Number.isFinite(physicalTip?.z)){
  const x=entry.x-physicalTip.x,z=entry.z-physicalTip.z;
  lateral=x*Math.cos(heading)-z*Math.sin(heading);forward=-x*Math.sin(heading)-z*Math.cos(heading);
 }
 const entryX=clamp(tip.x+lateral*w*.022,w*.06,w*.94);
 const entryY=clamp(railY-22*scale-Math.max(0,forward)*h*.016,horizon+12,railY-14*scale);
 const waterEntry={x:entryX,y:entryY};
 const fishProjection=fightFishProjection(w,state),hookPoint=fishProjection?.airHeight>0?{x:waterEntry.x,y:waterEntry.y-fishProjection.airHeight*fishProjection.pixelsPerMeter}:waterEntry;
 const slack=clamp(finite(state.lineSlackMeters)*1.5,0,18)*scale;
 const control={x:mix(tip.x,hookPoint.x,.5),y:mix(tip.y,hookPoint.y,.5)+slack};
 const line=[];for(let i=0;i<=18;i++){const t=i/18,u=1-t;line.push({x:u*u*tip.x+2*u*t*control.x+t*t*hookPoint.x,y:u*u*tip.y+2*u*t*control.y+t*t*hookPoint.y});}
 line[0]=tip;line[line.length-1]=hookPoint;
 return{width:w,height:h,landscape,horizon,railY,bottom,scale,mount,mounted,elevation,azimuth,bend,base,butt,grip,reelSeat,reel,reelHub,knob,tip,points,line,waterEntry,hookPoint,heave,
  showFloat:state.rig==='float'&&Boolean(state.floatPosition)&&state.fishState!=='landed',
  surfaceFish:Boolean(fishProjection),fishProjection,
  lineVisible:['bite','fight'].includes(state.fishState)};
}

export function createFightView(canvas,{sprites}={}){
 const c=canvas.getContext('2d',{alpha:false});let cssWidth=390,cssHeight=844,clock=0,crankAngle=0,spoolAngle=0,lastGeometry=null,lastPhase='idle',active=false,fishVisible=false;
 const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 const polygon=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](Math.round(p.x),Math.round(p.y)));c.closePath();c.fill();};
 const line=(a,b,color,width=1)=>{
  let x=Math.round(a.x),y=Math.round(a.y),tx=Math.round(b.x),ty=Math.round(b.y),dx=Math.abs(tx-x),sx=x<tx?1:-1,dy=-Math.abs(ty-y),sy=y<ty?1:-1,error=dx+dy;const size=Math.max(1,Math.round(width));c.fillStyle=color;
  for(let i=0;i<2048;i++){c.fillRect(x-Math.floor(size/2),y-Math.floor(size/2),size,size);if(x===tx&&y===ty)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
 };
 const ellipse=(x,y,rx,ry,color)=>{for(let row=-Math.ceil(ry);row<=Math.ceil(ry);row++){const span=Math.round(rx*Math.sqrt(Math.max(0,1-(row/Math.max(1,ry))**2)));if(span>0)rect(x-span,y+row,span*2+1,1,color);}};
 function resize(width,height){
  cssWidth=Math.max(1,finite(width,390));cssHeight=Math.max(1,finite(height,844));
  // Pixel size is independent of screen DPR: phones retain crisp artwork and
  // desktop canvases do not accidentally become expensive retina paintings.
  const factor=Math.max(1.6,Math.min(2.6,cssWidth/510));
  const w=Math.max(1,Math.round(cssWidth/factor)),h=Math.max(1,Math.round(cssHeight/factor));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  c.imageSmoothingEnabled=false;
 }
 function sky(g,conditions={}){
  const {width:w,height:h,horizon:y}=g;
  rect(0,0,w,y,'#82afb7');rect(0,y*.23,w,y*.32,'#a9c5c0');rect(0,y*.55,w,y*.25,'#ccd4bd');rect(0,y*.80,w,y*.20+1,'#e5d4b0');
  // Long broken cloud banks give depth without a busy screen or text overlays.
  for(let i=0;i<6;i++){
   const x=w*(hash(41+i)*1.25-.13),cy=y*(.10+hash(75+i)*.54),cw=w*(.10+hash(11+i)*.21),ch=3+hash(i+5)*5;
   rect(x,cy+ch,cw,ch*.5,'#acc1bb');rect(x+cw*.08,cy+2,cw*.84,ch,'#e8ddc0');rect(x+cw*.26,cy-1,cw*.51,ch,'#eee4ca');rect(x+cw*.55,cy-3,cw*.24,ch,'#f2e9d1');
  }
  const sunX=w*.76,sunY=y-3,r=Math.max(5,Math.min(w*.038,y*.13));
  if((conditions.cloudCover||0)<.7&&(conditions.rain||0)<.15){ellipse(sunX,sunY,r+3,r+3,'#e8d3a8');ellipse(sunX,sunY,r,r,'#f6e6b7');}
  rect(0,y-1,w,2,'#d4d5ba');
  // An open horizon avoids inventing a shoreline in whichever direction the
  // angler faces; the navigation map remains the geographic authority.
  // The last sky band is intentionally bright enough to read at the 06:00 start.
  void h;
 }
 function ocean(g,reducedMotion,conditions={}){
  const {width:w,height:h,horizon:y}=g,seaH=h-y;
  const bands=['#598e9b','#4b8d99','#438c97','#398b92','#32898d','#328b88','#3c918b'];
  for(let i=0;i<bands.length;i++)rect(0,y+seaH*i/bands.length,w,seaH/bands.length+1,bands[i]);
  rect(0,y,w,2,'#7fa9aa');
  const tick=reducedMotion?0:clock*9/Math.max(2,conditions.period||9),rough=Math.min(2,conditions.waveHeight||0);
  for(let row=0;row<26;row++){
   const p=(row+.5)/26,yy=y+3+(seaH-3)*p*p+Math.sin(tick*.7+row)*rough*p*2,span=4+p*24;
   for(let i=-1;i<Math.ceil(w/(span*2))+1;i++){
    const seed=row*83+i+327,phase=hash(seed)*TAU,x=i*span*2+hash(seed+39)*span+(Math.sin(tick*.32+phase)*p*3),ww=span*(.36+hash(seed+1)*.8);
    if(hash(seed+42)>.32){rect(x,yy+1,ww+2,1,p>.5?'#267b7e':'#387f8e');rect(x+2,yy,ww,1,p>.5?'#64aca0':'#83b3b0');if(p>.56&&hash(seed+2)>.54)rect(x+ww*.3,yy-1,ww*.32,1,'#8fbcac');}
   }
  }
  for(let i=0;i<17;i++){const p=i/17,yy=y+3+p*p*seaH*.61,width=(4+p*16)*(1+Math.sin(i*4.7+tick*.3)*.22);rect(w*.76-width*.5+(hash(i+73)-.5)*13,yy,width,1,i%3?'#b3c6ad':'#d1d3b3');}
 }
 function waterContact(g,s,reducedMotion){
  if(!g.lineVisible)return;const {x,y}=g.waterEntry,t=reducedMotion?0:clock;
  const pull=s.fishState==='fight'?clamp(g.bend,0,1):clamp(g.bend*.7,0,.5),radius=3+(Math.sin(t*1.5)+1)*1.5+pull*2;
  // Tiny rings mark line entry. Large splashes only happen when the actual fish
  // has reached the surface; a fish thirty metres down never splashes above it.
  for(let side of[-1,1]){rect(x+side*radius-(side<0?2:0),y,3,1,'#a3cbbc');rect(x+side*(radius+3)-(side<0?2:0),y+2,3,1,'#68aca3');}
  if(g.surfaceFish&&(!s.fishMotion?.jumpActive||s.fishMotion?.splash>0)&&(pull>.2||s.fishMotion?.splash>0)){const burst=clamp(finite(s.fishMotion?.headShake)+finite(s.fishMotion?.splash)*3+Math.abs(finite(s.fishMotion?.lateralMps))*.3,0,1)*pull,footprint=g.fishProjection.lengthPixels;for(let i=0;i<9;i++){const a=i/9*TAU,dist=footprint*(.08+burst*.28);rect(x+Math.cos(a)*dist,y+Math.sin(a)*dist*.30-burst*footprint*(.02+hash(i+99)*.035),2,1,'#d6e9cf');}rect(x-footprint*.05,y-1,footprint*.10,2,'#c5dfc7');}
  if(g.showFloat){rect(x-1,y-5,3,4,'#e4bb79');rect(x-1,y-7,3,3,'#c7624a');rect(x,y-9,1,2,'#273e41');}
 }
 function surfaceFish(g,s,reducedMotion){
  fishVisible=false;const p=g.fishProjection,asset=p&&sprites?.fish?.[fishSpriteKind(s.fish)];if(!asset)return;
  const crop=fishSpriteBounds(asset);if(!crop.width||!crop.height)return;
  const length=p.lengthPixels,height=length*crop.height/crop.width;
  // The line meets the head, not the centre of a scaled icon. Species artwork
  // keeps its original aspect ratio, so a slender lingcod stays slender.
  if(p.airHeight>0)ellipse(g.waterEntry.x-length*.5,g.waterEntry.y,length*.38,2,'#2d7b7e');
  c.save();c.globalAlpha=1-p.depth/1.15*.42;
  const pose=fishBodyPose(fishSpriteKind(s.fish),{time:clock,mass:s.fish.kg,energy:s.fishFight?.energy??1,headShake:s.fishMotion?.headShake??.3,phase:s.fishMotion?.phase,reducedMotion,jumpVelocity:s.fishMotion?.jumpVelocity,airborne:p.airHeight>0});
  drawFishBody(c,asset,crop,{x:g.hookPoint.x-length,y:g.hookPoint.y-height*.5,length,height,pose});
  c.restore();fishVisible=true;
 }
 function skiff(g){
  const {width:w,height:h,railY:y,scale:s}=g;
  polygon([{x:0,y:y+10},{x:w*.13,y:y},{x:w*.86,y:y},{x:w,y:y+10},{x:w,y:h},{x:0,y:h}],'#604c3e');
  polygon([{x:0,y:y+16},{x:w*.14,y:y+7},{x:w*.84,y:y+7},{x:w,y:y+17},{x:w,y:h},{x:0,y:h}],'#9d7853');
  for(let x=-w*.1;x<w*1.2;x+=Math.max(19,w*.11))line({x,y:y+15},{x:x+(x-w*.5)*.29,y:h},'#6a5844',1);
  polygon([{x:0,y:y+2},{x:w*.13,y:y-8},{x:w*.86,y:y-8},{x:w,y:y+2},{x:w,y:y+12},{x:w*.85,y:y+4},{x:w*.14,y:y+4},{x:0,y:y+13}],'#425d58');
  polygon([{x:0,y:y},{x:w*.13,y:y-10},{x:w*.86,y:y-10},{x:w,y:y},{x:w,y:y+5},{x:w*.85,y:y-3},{x:w*.14,y:y-3},{x:0,y:y+6}],'#d3be8e');
  polygon([{x:0,y:y-1},{x:w*.13,y:y-11},{x:w*.86,y:y-11},{x:w,y:y-1},{x:w,y:y+1},{x:w*.85,y:y-7},{x:w*.14,y:y-7},{x:0,y:y+2}],'#f0dfb5');
  for(let i=0;i<14;i++){const x=w*.15+i*w*.05;rect(x,y-5,4+hash(i+100)*8,1,i%3?'#b39569':'#e2cca1');if(i%3===0){rect(x,y-7,2,2,'#746e58');rect(x,y-7,1,1,'#e5ddbe');}}
  // Interior ribs and a seat are part of the skiff, below the gunwale plane.
  const seatY=y+29*s;if(seatY<h){rect(0,seatY,w,7*s,'#715c46');rect(0,seatY,w,3*s,'#c09864');rect(0,seatY+1,w,1,'#d3b782');}
 }
 function tackle(g,s){
  const {scale:k,base,reel,points,butt,mounted}=g;
  if(mounted){
   rect(base.x-7*k,g.railY-7*k,15*k,4*k,'#324d51');
   line({x:base.x,y:g.railY-4*k},butt,'#a7bcb1',8*k);
  }
  drawCloseTackle(c,g,{line,ellipse,rect,spoolAngle});
  const guides=[5,10,15,20,24,28];
  if(g.lineVisible){
   let prev=reel;for(const index of guides){const p=points[index],q={x:p.x,y:p.y+1};line(prev,q,'#d3d5b4',1);prev=q;}
   for(let i=1;i<g.line.length;i++)line(g.line[i-1],g.line[i],i>g.line.length-4?'#b4d0bd':'#ece6c8',1);
   if(s.rig!=='float'&&!(g.fishProjection?.airHeight>0))line(g.waterEntry,{x:g.waterEntry.x+1,y:g.waterEntry.y+4},'#669e92',1);
  }
 }
 function draw(state,dt,{active:visible=true,paused=false,reducedMotion=false,bottomInset=0,conditions={}}={}){
  active=Boolean(visible);if(!active){fishVisible=false;return;}
  const advance=!paused&&!state.paused?clamp(finite(dt),0,.1):0;
  clock+=advance;if(advance){crankAngle=(crankAngle+Math.max(0,finite(state.crankRate))*TAU*advance)%TAU;spoolAngle=(spoolAngle+reelMotion(state).spoolRadiansPerSecond*advance)%TAU;}
  const g=fightViewGeometry(canvas.width,canvas.height,state,{bottomInset:bottomInset*canvas.height/cssHeight,clock,crankAngle,reducedMotion});lastGeometry=g;lastPhase=state.fishState;
  sky(g,conditions);ocean(g,reducedMotion,conditions);surfaceFish(g,state,reducedMotion);waterContact(g,state,reducedMotion);drawWeatherOverlay(c,canvas.width,canvas.height,conditions,clock,{layer:'atmosphere'});skiff(g);tackle(g,state);drawWeatherOverlay(c,canvas.width,canvas.height,conditions,clock,{layer:'rain'});
 }
 function snapshot(){
  if(!lastGeometry)return{active,view:'first-person',phase:lastPhase,width:cssWidth,height:cssHeight};
  const g=lastGeometry,cssPoint=p=>({x:Math.round(p.x*cssWidth/g.width),y:Math.round(p.y*cssHeight/g.height)});
  return{active,view:'first-person',phase:lastPhase,width:cssWidth,height:cssHeight,mount:g.mount,rodElevation:g.elevation,rodAzimuth:g.azimuth,bend:g.bend,crankAngle,spoolAngle,reelCenter:cssPoint(g.reelHub),reelKnob:cssPoint(g.knob),rearGrip:cssPoint(g.grip),reelTouchRadius:Math.round(46*g.scale*cssWidth/g.width),railY:Math.round(g.railY*cssHeight/g.height),rodTip:cssPoint(g.tip),lineEntry:cssPoint(g.waterEntry),hookPoint:cssPoint(g.hookPoint),fishAirHeight:g.fishProjection?.airHeight||0,lineVisible:g.lineVisible,floatVisible:g.showFloat,surfaceFish:g.surfaceFish,fishVisible,fishLengthCm:g.fishProjection?.lengthCm??null,fishLengthPixels:g.fishProjection?g.fishProjection.lengthPixels*cssWidth/g.width:null,fishDistanceMeters:g.fishProjection?.distanceMeters??null};
 }
 resize(cssWidth,cssHeight);return{resize,draw,snapshot};
}
