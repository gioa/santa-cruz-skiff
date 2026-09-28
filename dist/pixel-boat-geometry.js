import {SKIFF_LENGTH_METERS,SKIFF_HULL_PIXELS,SKIFF_METERS_PER_PIXEL,SKIFF_DISPLAY_METERS_PER_PIXEL} from './skiff-dimensions.js?v=20260927-pixel-v56';
export {SKIFF_LENGTH_METERS,SKIFF_HULL_PIXELS,SKIFF_METERS_PER_PIXEL,SKIFF_DISPLAY_METERS_PER_PIXEL};
// Presentation only: the simulation retains the surveyed boarding point and
// water coordinates. Every rental uses the same hull and sprite dimensions.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export const SKIFF_RACKS=Object.freeze([
  {x:-19,z:-44,heading:Math.PI/2,assigned:true},
  {x:-19,z:-33,heading:Math.PI/2,assigned:false},
  {x:-19,z:-22,heading:Math.PI/2,assigned:false},
].map(Object.freeze));
// Keep hulls the same size in metres even when casting zooms the camera out.
// A minimum screen size would let dry boats grow beyond their rack/pier.
export const skiffScale=scale=>Math.max(0,scale)*SKIFF_DISPLAY_METERS_PER_PIXEL;

// Canvas-local, bow-up coordinates. Match stepVessel's actual propeller
// deflection (±0.5 rad): the forward tiller moves toward the stern's thrust,
// opposite the bow's turn. Reverse gear changes thrust, not motor orientation.
export function outboardPose(tiller=0){
  const angle=clamp(Number.isFinite(tiller)?tiller:0,-1,1)*.5,pivot={x:0,y:34},c=Math.cos(angle),s=Math.sin(angle);
  const point=(x,y)=>({x:pivot.x+x*c-y*s,y:pivot.y+x*s+y*c});
  return{angle,pivot,grip:point(-5,-11),forward:{x:s,y:-c}};
}

export function boatRenderPose(state,harbor){
  const stage=state.launchStage||'afloat',rack=SKIFF_RACKS[0];
  const water={x:state.boatX??harbor.boatX,z:state.boatZ??harbor.boatZ};
  const base={stage,lift:0,afloat:false,rigged:false,stored:false,bobWeight:0};
  if(stage==='stored')return{...base,...rack,stored:true,phase:'rack'};
  if(stage!=='lowering')return{...base,...water,heading:state.heading||0,afloat:true,bobWeight:1,phase:'water'};
  const p=clamp(Number.isFinite(state.launchProgress)?state.launchProgress:0,0,1),staging={x:harbor.craneX+4.8,z:harbor.craneZ};
  if(p<=.3){const f=smooth(p/.3);return{...base,x:mix(rack.x,staging.x,f*f),z:mix(rack.z,staging.z,f),heading:rack.heading*(1-f),stored:p===0,phase:'deck-transfer'};}
  if(p<=.45)return{...base,...staging,heading:0,lift:22*smooth((p-.3)/.15),rigged:true,phase:'hoist'};
  if(p<=.8){const f=smooth((p-.45)/.35);return{...base,x:mix(staging.x,water.x,f),z:mix(staging.z,water.z,f),heading:0,lift:22,rigged:true,phase:'swing'};}
  const f=smooth((p-.8)/.2);
  return{...base,...water,heading:state.heading||0,lift:22*(1-f),rigged:p<1,afloat:p===1,bobWeight:smooth((p-.96)/.04),phase:'lower'};
}
export function parkedSkiffPoses(){return SKIFF_RACKS.slice(1).map(rack=>({...rack,stage:'stored',phase:'rack',lift:0,afloat:false,rigged:false,stored:true,bobWeight:0}));}
export function skiffScreenPose(pose,{cameraScale,project,time=0}){
  const scale=skiffScale(cameraScale),p=project(pose.x,pose.z),screenX=p.x,screenY=p.y-Math.round(pose.lift*scale)+Math.round(Math.sin(time*1.8)*.8*pose.bobWeight),width=48*scale,height=88*scale;
  const c=Math.abs(Math.cos(pose.heading)),s=Math.abs(Math.sin(pose.heading)),rx=(width*c+height*s)/2,ry=(width*s+height*c)/2;
  return{...pose,scale,width,height,hullLength:SKIFF_HULL_PIXELS*scale,hullLengthMeters:SKIFF_LENGTH_METERS,screenX,screenY,bounds:{left:screenX-rx,top:screenY-ry,right:screenX+rx,bottom:screenY+ry}};
}
export function hitSkiff(x,y,geometry,{minimum=44}={}){
  const dx=x-geometry.screenX,dy=y-geometry.screenY,c=Math.cos(geometry.heading),s=Math.sin(geometry.heading);
  return Math.abs(dx*c-dy*s)<=Math.max(minimum,geometry.width)/2&&Math.abs(dx*s+dy*c)<=Math.max(minimum,geometry.height)/2;
}

export const SKIFF_HULL_OUTLINE=Object.freeze([[24,1],[29,4],[34,10],[39,21],[42,36],[42,66],[39,78],[9,78],[6,66],[6,36],[9,21],[14,10],[19,4]].map(p=>Object.freeze(p)));
