import {getShoreScene,sampleShore} from './shore-data.js';
import {shoreCastPosition} from './shore-casting.js';
import {shoreFishPosition} from './shore-line-geometry.js';
import {fishSpriteKind,fishSpriteBounds} from './pixel-fish-art.js';
import {fishBodyPose,drawFishBody} from './pixel-fish-motion.js';
import {createFishSprite} from './pixel-sprites.js';
import {shoreRodGeometry,shoreWorldMetres,shorePersonFoot} from './shore-scale.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
export const SHORE_WORLD_PIXELS_PER_METRE=3.2;

export const shoreRodPose=shoreRodGeometry;

export function shoreActionPoint(sceneId,state={}){
 const scene=getShoreScene(sceneId),p=state.player||scene.spawn;
 if(!state.cast||['walk','landed'].includes(state.phase))return shorePersonFoot({...state,player:p});
 if(state.phase==='casting'){const q=shoreCastPosition(state.cast,state.cast.flight||0);return{x:q.x,y:q.y-finite(q.height)*3.2};}
 const q=state.phase==='fighting'?shoreFishPosition(scene,state):state.cast.target;
 return{x:q.x,y:q.y-Math.max(0,finite(state.fishMotion?.airHeight))*3.2};
}

// The same camera stays in the scene. Its preferred zoom reacts to real tackle
// activity, while a fit envelope always leaves the angler and action together.
export function shoreActionCameraTarget(sceneId,state,{width,height,top=0,bottom=0,left=0,right=0,baseScale=.65,manualFocus=null,actionFocus,rodLift,rodSweep}={}){
 const scene=getShoreScene(sceneId),p=state.player||scene.spawn,charging=state.phase==='walk'&&state.castCharge>0,active=Boolean(state.cast&&!['walk','landed'].includes(state.phase));
 const motion=state.fishMotion||{},presentation=state.presentation||{};
 let focus=charging?.55:state.phase==='fighting'?.72+clamp(finite(motion.run)/3,0,1)*.15+(motion.jumpActive?.13:0):state.phase==='bite'?.95:state.phase==='casting'?.6:active?.35+clamp(finite(presentation.retrieveSpeed),0,1)*.3+clamp(finite(presentation.twitch),0,1)*.2:0;
 if(actionFocus===true)focus=Math.max(focus,.75);
 else if(Number.isFinite(actionFocus))focus=clamp(actionFocus,0,1);
 const safe={left:left+Math.min(28,width*.08),right:width-right-Math.min(28,width*.08),top:top+12,bottom:height-bottom-12};
 const safeWidth=Math.max(1,safe.right-safe.left),safeHeight=Math.max(1,safe.bottom-safe.top),screenY=(safe.top+safe.bottom)/2;
 const action=shoreActionPoint(scene,state),rod=shoreRodPose(state,{rodLift,rodSweep});
 const foot=shorePersonFoot({...state,player:p}),margin=shoreWorldMetres(.6);
 const points=[{x:foot.x-shoreWorldMetres(.6),y:foot.y-shoreWorldMetres(1.85)},{x:foot.x+shoreWorldMetres(.6),y:foot.y+shoreWorldMetres(.15)},...rod.points];
 if(active)points.push({x:action.x-margin,y:action.y-margin},{x:action.x+margin,y:action.y+margin});
 const lo={x:Math.min(...points.map(q=>q.x)),y:Math.min(...points.map(q=>q.y))},hi={x:Math.max(...points.map(q=>q.x)),y:Math.max(...points.map(q=>q.y))};
 const fit=Math.min(safeWidth/Math.max(1,hi.x-lo.x),safeHeight/Math.max(1,hi.y-lo.y));
 // A close working view spans roughly twelve metres across. Distant casts
 // naturally pull the continuous camera back to fit their real endpoints.
 let scale=Math.min(fit,Math.min(safeWidth/shoreWorldMetres(12),safeHeight/shoreWorldMetres(8))*(1+focus*.45));
 let target=active?{x:(lo.x+hi.x)/2,y:(lo.y+hi.y)/2}:{x:foot.x,y:foot.y-shoreWorldMetres(1.8)};
 if(manualFocus){target={...manualFocus};scale=baseScale;}
 else target.x+=(width/2-(safe.left+safe.right)/2)/Math.max(.08,scale);
 return{...target,scale:Math.max(.08,scale),screenY,focus,mode:manualFocus?'inspect':charging?'charging':active?state.phase:'walk',safeBounds:safe,points:manualFocus?[]:points,action};
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
 const kind=fishSpriteKind(fish),length=shoreWorldMetres(Math.max(0,finite(fish.length,30))/100);
 const opacity=airHeight>0?1:clamp((1-depth/visibilityDepth)*.8,.08,.8);
 return{visible,kind,world,surfaceWorld,ground,airHeight,depth,length,opacity,splash:clamp(finite(motion.splash),0,1),
  angle:Math.atan2((state.player||scene.spawn).y-ground.y,(state.player||scene.spawn).x-ground.x),
  pose:fishBodyPose(kind,{time,mass:finite(fish.weightKg,finite(fish.kg,1)),energy:finite(motion.energy,.5),headShake:finite(motion.headShake),phase:motion.phase,reducedMotion,jumpVelocity:finite(motion.jumpVelocity),airborne:airHeight>0})};
}

export function drawShoreFish(ctx,visual,{line,ring,foam='#e6eddb'}={}){
 if(!visual.world)return;
 const p=visual.surfaceWorld,splash=visual.splash;
 if(splash>.02){
  ring(p.x,p.y,shoreWorldMetres(.12+(1-splash)*Math.max(.2,visual.length/3.2)),foam,splash*.85);
  for(let i=0;i<5;i++){const dx=(i-2)*shoreWorldMetres(.035+(1-splash)*.08),lift=(1-Math.abs(i-2)/3)*splash*shoreWorldMetres(.15);line(p.x+dx,p.y,p.x+dx*1.1,p.y-lift,foam,.035);}
 }
 if(!visual.visible)return;
 let sprite=fishSprites.get(visual.kind);if(!sprite){sprite=createFishSprite(visual.kind);fishSprites.set(visual.kind,sprite);}
 const bounds=fishSpriteBounds(sprite);
 if(!bounds.width||!bounds.height)return;
 const height=visual.length*bounds.height/bounds.width;
 ctx.save();ctx.globalAlpha=visual.opacity;ctx.translate(visual.world.x,visual.world.y);ctx.rotate(visual.angle);
 drawFishBody(ctx,sprite,bounds,{x:-visual.length/2,y:-height/2,length:visual.length,height,pose:visual.pose});ctx.restore();
}

// Future landing estimates remain in the solver; charging is shown by the
// loaded rod itself rather than an omniscient trajectory painted on water.
export const shoreCastPreviewVisual=()=>null;
export const drawShoreCastPreview=()=>{};
