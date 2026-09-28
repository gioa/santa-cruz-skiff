// First-person artwork uses the same rod pose, load, surface intersection and
// crank speed as the simulation. It is a camera change, never another fight.
import {reelMotion} from './pixel-fishing-feedback.js?v=20260927-pixel-v28';
import {fishSpriteKind,fishSpriteBounds} from './pixel-fish-art.js?v=20260927-pixel-v28';
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
 const horizontalDistance=Math.hypot(target.x-origin.x,target.z-origin.z),distanceMeters=Math.hypot(horizontalDistance,1.35+depth);
 const focalPixels=Math.max(1,finite(width,1))/(2*Math.tan(31*Math.PI/180));
 return{lengthCm,lengthPixels:lengthCm/100*focalPixels/distanceMeters,distanceMeters,depth};
}

/** Geometry is in logical pixels. Shared endpoints keep line and rod attached. */
export function fightViewGeometry(width,height,state={},options={}){
 const w=Math.max(1,finite(width,1)),h=Math.max(1,finite(height,1)),landscape=w>h*1.2;
 const inset=clamp(finite(options.bottomInset),0,h*.48),bottom=clamp(h-inset-8,h*.48,h*.88);
 const mount=['port','starboard'].includes(state.rodMount)?state.rodMount:'hand',mounted=mount!=='hand';
 const elevation=clamp(finite(state.rodElevation,45),5,85),azimuth=clamp(finite(state.rodAzimuth,70),-110,110),bend=clamp(finite(state.rodBend),0,1);
 const heave=options.reducedMotion?0:Math.sin(finite(options.clock)*.72)*Math.min(1.1,h*.003);
 const horizon=Math.round(h*(landscape?.25:.31)),railY=Math.min(h*.86,bottom+23)+heave;
 const scale=clamp(Math.min(w/200,h/260),.68,1.45);
 const base={x:w*(mount==='port'?.25:mount==='starboard'?.73:.36),y:bottom-15*scale+heave};
 const length=Math.min(w*.70,(bottom-horizon)*1.04),e=elevation*Math.PI/180;
 // Perspective compresses the sideways sweep near the camera edges. Reserve
 // some of that span for the loaded tip so full left/right sweeps never clip.
 const span=azimuth<0?base.x-w*.06:w*.94-base.x,dx=span*(azimuth/110)*.80,dy=-length*(.34+.74*Math.sin(e));
 const flexX=span*(azimuth/110)*.18*bend,flexY=bend*Math.min(length*.50,-dy*.90);
 const points=[];for(let i=0;i<=28;i++){const t=i/28,flex=t*t*t;points.push({x:base.x+dx*t+flexX*flex,y:base.y+dy*t+flexY*flex});}
 const tip=points.at(-1),norm=Math.hypot(dx,dy)||1,ux=dx/norm,uy=dy/norm;
 const butt={x:base.x-ux*29*scale,y:base.y-uy*29*scale};
 const reel={x:base.x-uy*11*scale-ux*10*scale,y:base.y+ux*11*scale-uy*10*scale};
 const angle=finite(options.crankAngle),knob={x:reel.x+Math.cos(angle)*15*scale,y:reel.y+Math.sin(angle)*10*scale};
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
 const slack=clamp(finite(state.lineSlackMeters)*1.5,0,18)*scale;
 const control={x:mix(tip.x,waterEntry.x,.5),y:mix(tip.y,waterEntry.y,.5)+slack};
 const line=[];for(let i=0;i<=18;i++){const t=i/18,u=1-t;line.push({x:u*u*tip.x+2*u*t*control.x+t*t*waterEntry.x,y:u*u*tip.y+2*u*t*control.y+t*t*waterEntry.y});}
 line[0]=tip;line[line.length-1]=waterEntry;
 const fishProjection=fightFishProjection(w,state);
 return{width:w,height:h,landscape,horizon,railY,bottom,scale,mount,mounted,elevation,azimuth,bend,base,butt,reel,knob,tip,points,line,waterEntry,heave,
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
 function sky(g){
  const {width:w,height:h,horizon:y}=g;
  rect(0,0,w,y,'#82afb7');rect(0,y*.23,w,y*.32,'#a9c5c0');rect(0,y*.55,w,y*.25,'#ccd4bd');rect(0,y*.80,w,y*.20+1,'#e5d4b0');
  // Long broken cloud banks give depth without a busy screen or text overlays.
  for(let i=0;i<6;i++){
   const x=w*(hash(41+i)*1.25-.13),cy=y*(.10+hash(75+i)*.54),cw=w*(.10+hash(11+i)*.21),ch=3+hash(i+5)*5;
   rect(x,cy+ch,cw,ch*.5,'#acc1bb');rect(x+cw*.08,cy+2,cw*.84,ch,'#e8ddc0');rect(x+cw*.26,cy-1,cw*.51,ch,'#eee4ca');rect(x+cw*.55,cy-3,cw*.24,ch,'#f2e9d1');
  }
  const sunX=w*.76,sunY=y-3,r=Math.max(5,Math.min(w*.038,y*.13));
  ellipse(sunX,sunY,r+3,r+3,'#e8d3a8');ellipse(sunX,sunY,r,r,'#f6e6b7');
  rect(0,y-1,w,2,'#d4d5ba');
  // An open horizon avoids inventing a shoreline in whichever direction the
  // angler faces; the navigation map remains the geographic authority.
  // The last sky band is intentionally bright enough to read at the 06:00 start.
  void h;
 }
 function ocean(g,reducedMotion){
  const {width:w,height:h,horizon:y}=g,seaH=h-y;
  const bands=['#598e9b','#4b8d99','#438c97','#398b92','#32898d','#328b88','#3c918b'];
  for(let i=0;i<bands.length;i++)rect(0,y+seaH*i/bands.length,w,seaH/bands.length+1,bands[i]);
  rect(0,y,w,2,'#7fa9aa');
  const tick=reducedMotion?0:clock;
  for(let row=0;row<26;row++){
   const p=(row+.5)/26,yy=y+3+(seaH-3)*p*p,span=4+p*24;
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
  if(g.surfaceFish&&pull>.2){const burst=clamp(finite(s.fishMotion?.headShake)+Math.abs(finite(s.fishMotion?.lateralMps))*.3,0,1)*pull,footprint=g.fishProjection.lengthPixels;for(let i=0;i<9;i++){const a=i/9*TAU,dist=footprint*(.08+burst*.28);rect(x+Math.cos(a)*dist,y+Math.sin(a)*dist*.30-burst*footprint*(.02+hash(i+99)*.035),2,1,'#d6e9cf');}rect(x-footprint*.05,y-1,footprint*.10,2,'#c5dfc7');}
  if(g.showFloat){rect(x-1,y-5,3,4,'#e4bb79');rect(x-1,y-7,3,3,'#c7624a');rect(x,y-9,1,2,'#273e41');}
 }
 function surfaceFish(g,s){
  fishVisible=false;if(s.rig==='sabiki6'&&s.sabiki){const occupied=s.sabiki.hooks.filter(h=>h.fish),depth=finite(s.lureDepth);if(depth<2&&s.paidLineMeters<8){for(const h of occupied){const hookDepth=Math.max(0,depth-h.index*.28);if(hookDepth>=1.15)continue;const asset=sprites?.fish?.[fishSpriteKind(h.fish)];if(!asset)continue;const crop=fishSpriteBounds(asset),length=h.fish.length/100*g.width/(2*Math.tan(31*Math.PI/180))/Math.hypot(1.6,1.35+hookDepth),height=length*crop.height/crop.width,x=g.waterEntry.x+(h.index%2?8:-8)*g.scale,y=g.waterEntry.y-(h.index*.28)*20*g.scale;line(g.waterEntry,{x,y},'#bdc7ac');c.save();c.globalAlpha=1-hookDepth/1.15*.42;c.drawImage(asset,crop.x,crop.y,crop.width,crop.height,x-length,y-height/2,length,height);c.restore();fishVisible=true;}}return;}const p=g.fishProjection,asset=p&&sprites?.fish?.[fishSpriteKind(s.fish)];if(!asset)return;
  const crop=fishSpriteBounds(asset);if(!crop.width||!crop.height)return;
  const length=p.lengthPixels,height=length*crop.height/crop.width;
  // The line meets the head, not the centre of a scaled icon. Species artwork
  // keeps its original aspect ratio, so a slender lingcod stays slender.
  c.save();c.globalAlpha=1-p.depth/1.15*.42;
  c.drawImage(asset,crop.x,crop.y,crop.width,crop.height,g.waterEntry.x-length,g.waterEntry.y-height*.5,length,height);
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
 function arm(from,to,scale,right=false){
  const dx=to.x-from.x,dy=to.y-from.y,n=Math.hypot(dx,dy)||1,nx=-dy/n,ny=dx/n,r=9*scale;
  polygon([{x:from.x-nx*r*1.45,y:from.y-ny*r*1.45},{x:from.x+nx*r*1.45,y:from.y+ny*r*1.45},{x:to.x+nx*r*.7,y:to.y+ny*r*.7},{x:to.x-nx*r*.7,y:to.y-ny*r*.7}],'#243f51');
  polygon([{x:from.x-nx*r*.9,y:from.y-ny*r*.9},{x:from.x+nx*r*.6,y:from.y+ny*r*.6},{x:to.x+nx*r*.45,y:to.y+ny*r*.45},{x:to.x-nx*r*.7,y:to.y-ny*r*.7}],'#3d6777');
  line({x:mix(from.x,to.x,.2)-nx*r*.6,y:mix(from.y,to.y,.2)-ny*r*.6},{x:to.x-nx*r*.5,y:to.y-ny*r*.5},'#658c95',Math.max(1,scale));
  const cuff={x:mix(from.x,to.x,.92),y:mix(from.y,to.y,.92)};line({x:cuff.x-nx*r*.72,y:cuff.y-ny*r*.72},{x:cuff.x+nx*r*.72,y:cuff.y+ny*r*.72},'#a1b4b0',3*scale);
  ellipse(to.x,to.y,7.5*scale,6*scale,'#b57f58');ellipse(to.x-1.5*scale,to.y-1.5*scale,6.5*scale,4.7*scale,'#e2ad78');
  if(right)line({x:to.x-4*scale,y:to.y-3*scale},{x:to.x+3*scale,y:to.y-3*scale},'#f5c68c',2*scale);
 }
 function tackle(g,s){
  const {width:w,height:h,scale:k,base,reel,knob,points,butt,mounted}=g;
  if(!mounted){
   // The left hand wraps the foregrip; the right hand stays on the actual crank.
   arm({x:w*.06,y:h+14*k},{x:base.x-4*k,y:base.y+4*k},k);
   arm({x:w*.81,y:h+16*k},{x:knob.x+3*k,y:knob.y+4*k},k,true);
  }else{
   const mountX=base.x;rect(mountX-7*k,g.railY-7*k,15*k,4*k,'#324d51');rect(mountX-6*k,g.railY-7*k,12*k,2*k,'#b6c4b3');
   line({x:mountX,y:g.railY-4*k},butt,'#263e44',11*k);line({x:mountX-1*k,y:g.railY-4*k},{x:butt.x-1*k,y:butt.y},'#a7bcb1',7*k);line({x:mountX-3*k,y:g.railY-4*k},{x:butt.x-3*k,y:butt.y},'#d2dac3',2*k);
  }
  line(butt,points[4],'#202e32',8*k);line(butt,points[4],'#a88956',5*k);line({x:butt.x-1,y:butt.y},points[4],'#d2b57d',2*k);
  for(let i=0;i<5;i++){const p={x:mix(butt.x,base.x,i/5),y:mix(butt.y,base.y,i/5)};rect(p.x-2*k,p.y,4*k,1,'#786349');}
  // A continuous tapered blank, with the upper section curving under real load.
  for(let i=1;i<points.length;i++){const p=points[i-1],q=points[i],width=i<5?5*k:i<12?3*k:i<21?2*k:1;line(p,q,i<5?'#203b3d':'#264b4a',width);if(i<18)line({x:p.x-1,y:p.y},{x:q.x-1,y:q.y},i<5?'#8f9270':'#849c87',1);}
  const guides=[5,10,15,20,24,28];for(const index of guides){const p=points[index],r=index<12?2:1;rect(p.x-r,p.y+r,r*2+1,1,'#c1c8a3');rect(p.x-r,p.y,1,r+1,'#9aaa91');rect(p.x+r,p.y,1,r+1,'#536e66');}
  // Above-blank conventional reel: dark side plates, brass wound spool and
  // steel handle. Both the painted knob and right palm use one crank endpoint.
  const r=11*k;ellipse(reel.x,reel.y,r+2*k,r+1*k,'#203e42');ellipse(reel.x,reel.y,r,r,'#a3b7a3');ellipse(reel.x,reel.y,r-2*k,r-2*k,'#365951');ellipse(reel.x,reel.y,r-4*k,r-4*k,'#c4ac71');
  for(let i=0;i<5;i++){const yy=reel.y-5*k+i*2*k;line({x:reel.x-5*k,y:yy},{x:reel.x+5*k,y:yy},i%2?'#e0ce99':'#8c815d',1);}
  for(let i=0;i<4;i++){const a=spoolAngle+i*TAU/4;rect(reel.x+Math.cos(a)*(r-1)-.5,reel.y+Math.sin(a)*(r-1)-.5,1,1,'#eef0d1');}
  line(reel,knob,'#294b48',4*k);line(reel,knob,'#c7cdb2',2*k);ellipse(reel.x,reel.y,3*k,3*k,'#d8b670');ellipse(knob.x,knob.y,5*k,3*k,'#233e3d');rect(knob.x-3*k,knob.y-2*k,6*k,1,'#6d8c78');
  if(!mounted){
   // Fingers overlap the cork and crank instead of hovering beside the tackle.
   for(let i=0;i<3;i++){line({x:base.x-5*k,y:base.y-3*k+i*3*k},{x:base.x+3*k,y:base.y-3*k+i*3*k},i===0?'#f3c58b':'#e2ad78',2*k);rect(base.x+3*k,base.y-3*k+i*3*k,1,2*k,'#ae7655');}
   line({x:base.x-7*k,y:base.y-4*k},{x:base.x-3*k,y:base.y-9*k},'#f3c58b',3*k);
   line({x:knob.x+1*k,y:knob.y+3*k},{x:knob.x+5*k,y:knob.y-1*k},'#eab985',4*k);rect(knob.x+1*k,knob.y+3*k,4*k,1,'#b78259');
  }
  if(g.lineVisible){
   let prev=reel;for(const index of guides){const p=points[index],q={x:p.x,y:p.y+1};line(prev,q,'#d3d5b4',1);prev=q;}
   for(let i=1;i<g.line.length;i++)line(g.line[i-1],g.line[i],i>g.line.length-4?'#b4d0bd':'#ece6c8',1);
   if(s.rig!=='float')line(g.waterEntry,{x:g.waterEntry.x+1,y:g.waterEntry.y+4},'#669e92',1);
  }
 }
 function draw(state,dt,{active:visible=true,paused=false,reducedMotion=false,bottomInset=0}={}){
  active=Boolean(visible);if(!active){fishVisible=false;return;}
  const advance=!paused&&!state.paused?clamp(finite(dt),0,.1):0;
  clock+=advance;if(advance){crankAngle=(crankAngle+Math.max(0,finite(state.crankRate))*TAU*advance)%TAU;spoolAngle=(spoolAngle+reelMotion(state).spoolRadiansPerSecond*advance)%TAU;}
  const g=fightViewGeometry(canvas.width,canvas.height,state,{bottomInset:bottomInset*canvas.height/cssHeight,clock,crankAngle,reducedMotion});lastGeometry=g;lastPhase=state.fishState;
  sky(g);ocean(g,reducedMotion);surfaceFish(g,state);waterContact(g,state,reducedMotion);skiff(g);tackle(g,state);
 }
 function snapshot(){
  if(!lastGeometry)return{active,view:'first-person',phase:lastPhase,width:cssWidth,height:cssHeight};
  const g=lastGeometry,cssPoint=p=>({x:Math.round(p.x*cssWidth/g.width),y:Math.round(p.y*cssHeight/g.height)});
  return{active,view:'first-person',phase:lastPhase,width:cssWidth,height:cssHeight,mount:g.mount,rodElevation:g.elevation,rodAzimuth:g.azimuth,bend:g.bend,crankAngle,spoolAngle,rodTip:cssPoint(g.tip),lineEntry:cssPoint(g.waterEntry),lineVisible:g.lineVisible,floatVisible:g.showFloat,surfaceFish:g.surfaceFish,fishVisible,fishLengthCm:g.fishProjection?.lengthCm??null,fishLengthPixels:g.fishProjection?g.fishProjection.lengthPixels*cssWidth/g.width:null,fishDistanceMeters:g.fishProjection?.distanceMeters??null};
 }
 resize(cssWidth,cssHeight);return{resize,draw,snapshot};
}
