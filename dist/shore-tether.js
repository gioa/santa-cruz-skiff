// Closed-bail terminal tackle has a finite amount of paid-out line. Current
// may swing it sideways, and sinking may draw it toward the rod, but neither
// creates more line. This constraint is separate from a hooked fish's drag.
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
export const shoreTetherReach=(tip,target,depth=0)=>Math.hypot(
 (target.x-tip.x)/3.2,(target.y-tip.y)/3.2,Math.max(0,finite(tip.height))+Math.max(0,finite(depth)));

export function stepShoreTether({tip,previous,target,depth=0,previousDepth=0,paidLength,windSpeed=0,dt=0}){
 const height=Math.max(0,finite(tip.height));
 const initial=Math.max(height,finite(paidLength,shoreTetherReach(tip,previous,previousDepth)));
 const pickup=Math.min(initial,Math.max(0,finite(windSpeed))*Math.max(0,finite(dt)));
 const length=Math.max(0,initial-pickup);
 const nextDepth=Math.min(Math.max(0,finite(depth)),Math.max(0,length-height));
 const dx=finite(target.x,previous.x)-tip.x,dy=finite(target.y,previous.y)-tip.y;
 const distance=Math.hypot(dx,dy)/3.2;
 const radius=Math.sqrt(Math.max(0,length*length-(height+nextDepth)**2));
 const fraction=distance>radius?radius/Math.max(distance,1e-9):1;
 const point={x:tip.x+dx*fraction,y:tip.y+dy*fraction};
 const reach=shoreTetherReach(tip,point,nextDepth);
 return{target:point,depth:nextDepth,paidLength:length,pickup,slack:Math.max(0,length-reach),constrained:fraction<1||nextDepth<depth};
}
