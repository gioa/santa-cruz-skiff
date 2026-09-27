// Two-segment anatomical reach, in metres. The pole is a point on the desired
// elbow side of the shoulder-to-wrist plane, not an arbitrary Euler angle.
export function solveTwoBone(shoulder,target,pole,upperLength=.30,lowerLength=.27){
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),len=v=>Math.hypot(...v),add=(a,b,k=1)=>a.map((v,i)=>v+b[i]*k);
 const delta=sub(target,shoulder),requestedDistance=len(delta),direction=requestedDistance>1e-9?delta.map(v=>v/requestedDistance):[0,-1,0];
 const minDistance=Math.abs(upperLength-lowerLength)+1e-7,maxDistance=upperLength+lowerLength-1e-7,distance=Math.min(maxDistance,Math.max(minDistance,requestedDistance));
 let bend=sub(pole,shoulder);bend=add(bend,direction,-dot(bend,direction));
 if(len(bend)<1e-7){const fallback=Math.abs(direction[1])<.95?[0,-1,0]:[1,0,0];bend=add(fallback,direction,-dot(fallback,direction));}
 const bendLength=len(bend);bend=bend.map(v=>v/bendLength);
 const along=(upperLength*upperLength-lowerLength*lowerLength+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
 const elbow=add(add(shoulder,direction,along),bend,height),wrist=add(shoulder,direction,distance),reachError=Math.abs(distance-requestedDistance);
 return{elbow,wrist,reachable:reachError<1e-6,reachError};
}
