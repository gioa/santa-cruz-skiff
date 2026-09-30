import {getShoreScene,sampleShore} from './shore-data.js';
import {shoreCastPosition} from './shore-casting.js';
import {shoreFishPosition} from './shore-line-geometry.js';
import {fishSpriteKind,fishSpriteBounds} from './pixel-fish-art.js';
import {fishBodyPose,drawFishBody} from './pixel-fish-motion.js';
import {createFishSprite} from './pixel-sprites.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
export const SHORE_WORLD_PIXELS_PER_METRE=3.2;

export function shoreRodPose(state={},options={}){
 const p=state.player||{x:0,y:0},controls=state.fishingControls||{};
 const lift=clamp(finite(options.rodLift,finite(controls.rodLift,.35)),0,1),sweep=clamp(finite(options.rodSweep,finite(controls.rodSweep)), -1,1);
 const twitch=clamp(finite(state.presentation?.twitch),0,1),heldLift=clamp(lift+twitch*.18,0,1);
 const tension=clamp(finite(state.tension),0,1),bend=state.phase==='casting'?0:12*tension;
 const butt={x:p.x-12,y:p.y-27},shoulder={x:p.x-22+sweep*16,y:p.y-43-heldLift*23};
 const tip={x:p.x-21+sweep*36+bend,y:p.y-52-heldLift*40+bend*.7};
 const points=Array.from({length:9},(_,i)=>{const t=i/8,u=1-t;return{x:u*u*butt.x+2*u*t*shoulder.x+t*t*tip.x,y:u*u*butt.y+2*u*t*shoulder.y+t*t*tip.y};});
 return{butt,tip,points,bend,controls:{rodLift:lift,rodSweep:sweep}};
}

export function shoreActionPoint(sceneId,state={}){
 const scene=getShoreScene(sceneId),p=state.player||scene.spawn;
 if(state.phase==='walk'&&state.castPreview?.target)return{...state.castPreview.target};
 if(!state.cast||['walk','landed'].includes(state.phase))return{x:p.x,y:p.y-45};
 if(state.phase==='casting'){const q=shoreCastPosition(state.cast,state.cast.flight||0);return{x:q.x,y:q.y-finite(q.height)*3.2};}
 const q=state.phase==='fighting'?shoreFishPosition(scene,state):state.cast.target;
 return{x:q.x,y:q.y-Math.max(0,finite(state.fishMotion?.airHeight))*3.2};
}

// The same camera stays in the scene. Its preferred zoom reacts to real tackle
// activity, while a fit envelope always leaves the angler and action together.
export function shoreActionCameraTarget(sceneId,state,{width,height,top=0,bottom=0,left=0,right=0,baseScale=.65,manualFocus=null,actionFocus,rodLift,rodSweep}={}){
 const scene=getShoreScene(sceneId),p=state.player||scene.spawn,preview=state.phase==='walk'&&state.castPreview?.target,active=Boolean(preview||state.cast&&!['walk','landed'].includes(state.phase));
 const motion=state.fishMotion||{},presentation=state.presentation||{};
 let focus=preview?.55:state.phase==='fighting'?.72+clamp(finite(motion.run)/3,0,1)*.15+(motion.jumpActive?.13:0):state.phase==='bite'?.95:state.phase==='casting'?.6:active?.35+clamp(finite(presentation.retrieveSpeed),0,1)*.3+clamp(finite(presentation.twitch),0,1)*.2:0;
 if(actionFocus===true)focus=Math.max(focus,.75);
 else if(Number.isFinite(actionFocus))focus=clamp(actionFocus,0,1);
 const safe={left:left+Math.min(28,width*.08),right:width-right-Math.min(28,width*.08),top:top+12,bottom:height-bottom-12};
 const safeWidth=Math.max(1,safe.right-safe.left),safeHeight=Math.max(1,safe.bottom-safe.top),screenY=(safe.top+safe.bottom)/2;
 const action=shoreActionPoint(scene,state),rod=shoreRodPose(state,{rodLift,rodSweep});
 const points=active?[{x:p.x-32,y:p.y-77},{x:p.x+32,y:p.y+20},rod.tip,{x:action.x-25,y:action.y-25},{x:action.x+25,y:action.y+20}]:[];
 if(preview)for(const q of state.castPreview.trajectory||[])points.push({x:q.x,y:q.y-finite(q.height)*3.2-10});
 let target={x:p.x,y:p.y-130},scale=baseScale;
 if(active){
  const lo={x:Math.min(...points.map(q=>q.x)),y:Math.min(...points.map(q=>q.y))},hi={x:Math.max(...points.map(q=>q.x)),y:Math.max(...points.map(q=>q.y))};
  const fit=Math.min(safeWidth/Math.max(1,hi.x-lo.x),safeHeight/Math.max(1,hi.y-lo.y));
  scale=Math.min(fit,Math.max(baseScale,Math.min(width/340,safeHeight/190)*(.9+focus*.7)));
  target={x:(lo.x+hi.x)/2,y:(lo.y+hi.y)/2};
 }
 if(manualFocus){target={...manualFocus};scale=baseScale;}
 else target.x+=(width/2-(safe.left+safe.right)/2)/Math.max(.08,scale);
 return{...target,scale:Math.max(.08,scale),screenY,focus,mode:manualFocus?'inspect':preview?'aiming':active?state.phase:'walk',safeBounds:safe,points:manualFocus?[]:points,action};
}

export function advanceShoreActionCamera(camera,target,dt,{initialized=true,reducedMotion=false}={}){
 const ease=initialized?1-Math.exp(-clamp(finite(dt),0,.1)*(reducedMotion?4:6)):1;
 const next={...camera,x:camera.x+(target.x-camera.x)*ease,y:camera.y+(target.y-camera.y)*ease,scale:camera.scale+(target.scale-camera.scale)*ease};
 // Constrain only when an actual moving endpoint would leave the safe frame.
 // This also preserves cast origin/flight visibility during the smooth zoom.
 if(target.points.length){
  const s=target.safeBounds,cx=camera.width/2,cy=target.screenY;
  const lo={x:Math.min(...target.points.map(p=>p.x)),y:Math.min(...target.points.map(p=>p.y))},hi={x:Math.max(...target.points.map(p=>p.x)),y:Math.max(...target.points.map(p=>p.y))};
  next.scale=Math.min(next.scale,(s.right-s.left)/Math.max(1,hi.x-lo.x),(s.bottom-s.top)/Math.max(1,hi.y-lo.y));
  next.x=clamp(next.x,hi.x-(s.right-cx)/next.scale,lo.x+(cx-s.left)/next.scale);
  next.y=clamp(next.y,hi.y-(s.bottom-cy)/next.scale,lo.y+(cy-s.top)/next.scale);
 }
 return next;
}

const fishSprites=new Map();
// Fish artwork only enters the scene when the actual motion reaches visible
// surface water. Deep fish remain hidden; a splash alone never reveals them.
export function shoreFishVisual(sceneId,state,{time=0,reducedMotion=false,cameraScale=1}={}){
 const scene=getShoreScene(sceneId),motion=state.fishMotion,fish=state.fish;
 if(state.phase!=='fighting'||!fish||!motion)return{visible:false,kind:null,world:null,surfaceWorld:null,airHeight:0,depth:null,length:0,splash:0};
 const ground=shoreFishPosition(scene,state),sample=sampleShore(scene,ground.x,ground.y,reducedMotion?0:time,state.seaState);
 const depth=Math.max(0,finite(motion.depth,99)),airHeight=Math.max(0,finite(motion.airHeight)),clarity=clamp(1-finite(sample.turbidity,.5),0,1);
 const visibilityDepth=.08+clarity*.22,visible=airHeight>0||depth<visibilityDepth;
 const surfaceWorld={x:ground.x,y:ground.y-finite(sample.surfaceElevation)*3.2},world={x:surfaceWorld.x,y:surfaceWorld.y-airHeight*3.2};
 const kind=fishSpriteKind(fish),length=Math.min(clamp(finite(fish.length,30)*.16,5,36),48/Math.max(.1,cameraScale));
 const opacity=airHeight>0?1:clamp((1-depth/visibilityDepth)*.8,.08,.8);
 return{visible,kind,world,surfaceWorld,ground,airHeight,depth,length,opacity,splash:clamp(finite(motion.splash),0,1),
  angle:Math.atan2((state.player||scene.spawn).y-ground.y,(state.player||scene.spawn).x-ground.x),
  pose:fishBodyPose(kind,{time,mass:finite(fish.weightKg,finite(fish.kg,1)),energy:finite(motion.energy,.5),headShake:finite(motion.headShake),phase:motion.phase,reducedMotion,jumpVelocity:finite(motion.jumpVelocity),airborne:airHeight>0})};
}

export function drawShoreFish(ctx,visual,{line,ring,foam='#e6eddb'}={}){
 if(!visual.world)return;
 const p=visual.surfaceWorld,splash=visual.splash;
 if(splash>.02){
  ring(p.x,p.y,5+(1-splash)*15,foam,splash*.85);
  for(let i=0;i<5;i++){const dx=(i-2)*(2+(1-splash)*3),lift=(1-Math.abs(i-2)/3)*splash*11;line(p.x+dx,p.y-2,p.x+dx*1.1,p.y-lift,foam,1);}
 }
 if(!visual.visible)return;
 let sprite=fishSprites.get(visual.kind);if(!sprite){sprite=createFishSprite(visual.kind);fishSprites.set(visual.kind,sprite);}
 const bounds=fishSpriteBounds(sprite);
 if(!bounds.width||!bounds.height)return;
 const height=visual.length*bounds.height/bounds.width;
 ctx.save();ctx.globalAlpha=visual.opacity;ctx.translate(visual.world.x,visual.world.y);ctx.rotate(visual.angle);
 drawFishBody(ctx,sprite,bounds,{x:-visual.length/2,y:-height/2,length:visual.length,height,pose:visual.pose});ctx.restore();
}

export function shoreCastPreviewVisual(state={}){
 const cast=state.phase==='walk'?state.castPreview:null;
 if(!cast?.target)return null;
 const points=Array.from({length:25},(_,i)=>{const p=shoreCastPosition(cast,finite(cast.flightDuration,1)*i/24);return{x:p.x,y:p.y-p.height*3.2};});
 return{points,endpoint:{...cast.target},landing:cast.landing,charge:clamp(finite(state.castCharge),0,1)};
}
export function drawShoreCastPreview(visual,line){
 if(!visual)return;const color=visual.landing==='water'?'#e9d499':'#dd9377';
 for(let i=1;i<visual.points.length;i+=2){const a=visual.points[i-1],b=visual.points[i];line(a.x,a.y,b.x,b.y,color,1);}
 const p=visual.endpoint;line(p.x-5,p.y,p.x+5,p.y,color,1);line(p.x,p.y-5,p.x,p.y+5,color,1);
}
