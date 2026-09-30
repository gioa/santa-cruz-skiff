import {getShoreScene,sampleShore,onPier} from './shore-data.js';
import {shoreRodGeometry} from './shore-scale.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;

// Orthographic projection: a strand below the deck is occluded wherever its
// projected point lies inside the projected deck, even if it hangs underneath.
export function shorePierOccludes(sceneId,point,height=0){
 const scene=getShoreScene(sceneId),deckHeight=3.5;
 return Boolean(scene.pier&&height<deckHeight&&onPier(scene,point.x,point.y+deckHeight*3.2));
}
export function shoreVisibleLineSegments(sceneId,points,fromHeight,toHeight=0){
 const segments=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],t=(i-.5)/(points.length-1),height=fromHeight+(toHeight-fromHeight)*t;
  if(!shorePierOccludes(sceneId,{x:(a.x+b.x)/2,y:(a.y+b.y)/2},height))segments.push([a,b]);
 }
 return segments;
}

// The mounted tackle is authoritative. A previous cast's presentation must
// never add a bobber to a Carolina/fish-finder rig after equipment changes.
export function shoreRigUsesFloat(state={}){
  if(state.activeRod&&state.rodSupplies)return state.rodSupplies[state.activeRod]?.id==='float_rig';
  if(state.rig)return state.rig==='float'||state.rig==='float_rig';
  return state.presentation?.mode==='float';
}

// Bottom tackle stays underwater. The visible strand ends where it crosses
// the water, before reaching the submerged bait/sinker. Only a float places
// the surface attachment directly over the terminal position.
export function shoreLineWaterEntry(sceneId,state,target,depth){
  if(shoreRigUsesFloat(state))return{...target};
  const scene=getShoreScene(sceneId),player=state.player||scene.spawn;
  const origin=shoreRodGeometry({...state,player}).tipWorld;
  const tipHeight=origin.height;
  const fraction=tipHeight/(tipHeight+Math.max(0,finite(depth)));
  const x=origin.x+(target.x-origin.x)*fraction;
  return{x,y:Math.min(origin.y+(target.y-origin.y)*fraction,scene.shoreY(x)-1.6)};
}

// Read-only water contact shared by the two shore cameras. Horizontal tackle
// travel already comes from the simulation: never add a second orbital drift.
export function shoreWaterContact(sceneId,point,elapsed,seaState={}, {reducedMotion=false}={}){
  const sample=sampleShore(sceneId,point.x,point.y,reducedMotion?0:finite(elapsed),seaState);
  const flowX=finite(sample.flowX),flowY=finite(sample.flowY);
  return{sample,height:finite(sample.surfaceElevation),flowX,flowY,
    tilt:clamp(flowX*.26+flowY*.10,-.45,.45),
    foam:clamp(finite(sample.whitewater),0,1),breaking:clamp(finite(sample.activeBreaking),0,1)};
}

// A projected line, not an additional tackle solver. Tension takes up sag;
// water drag bends the last part of the strand while both ends stay attached.
export function shoreTackleLine(tip,entry,{tension=0,sag=0,flowX=0,flowY=0,scale=1,segments=18}={}){
  const taut=clamp(finite(tension),0,1),size=Math.max(0,finite(scale,1));
  const count=clamp(Math.round(finite(segments,18)),2,48);
  const slack=Math.max(0,finite(sag))*(1-taut)**2;
  const response=(1-taut)*size;
  const dragX=clamp(finite(flowX),-3,3)*4*response,dragY=clamp(finite(flowY),-3,3)*2*response;
  return Array.from({length:count+1},(_,i)=>{
    if(i===0)return{...tip};if(i===count)return{...entry};
    const t=i/count,waterBend=6.75*t*t*(1-t);
    return{x:tip.x+(entry.x-tip.x)*t+dragX*waterBend,
      y:tip.y+(entry.y-tip.y)*t+4*t*(1-t)*slack+dragY*waterBend};
  });
}
