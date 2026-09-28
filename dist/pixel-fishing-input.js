const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;

// Relative travel: touching the rod must never jump its saved posture.
export function rodPoseFromDrag(pose,dx,dy,{width=200,height=140}={}){
 return{elevation:clamp(finite(pose.elevation,45)-finite(dy)/Math.max(1,height)*85,5,85),azimuth:clamp(finite(pose.azimuth,70)+finite(dx)/Math.max(1,width)*180,-110,110)};
}
