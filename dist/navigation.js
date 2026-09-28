import {onLand as defaultOnLand,onPier as defaultOnPier,landPolygons as defaultLandPolygons,pierRings as defaultPierRings} from './geography.js?v=20260927-articulated-v5';
import {harborWaterBlocked as defaultHarborWaterBlocked,harborObstacleRings as defaultHarborObstacleRings} from './harbor-layout.js?v=20260927-articulated-v5';
export function createNavigation({onLand=defaultOnLand,onPier=defaultOnPier,landPolygons=defaultLandPolygons,pierRings=defaultPierRings,harborWaterBlocked=defaultHarborWaterBlocked,harborObstacleRings=defaultHarborObstacleRings,detourBounds=null}={}){
const geographicBlocked=(x,z)=>onLand(x,z)||onPier(x,z);
const blocked=(x,z)=>geographicBlocked(x,z)||harborWaterBlocked(x,z);
const polygonEdges=rings=>rings.flatMap(r=>r.map((a,i)=>[a,r[(i+1)%r.length]]));
const edges=polygonEdges([...landPolygons,...pierRings]),harborEdges=polygonEdges(harborObstacleRings);
function cross(a,b,c){return(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);}
function intersects(a,b,c,d){if(Math.max(a.x,b.x)<Math.min(c.x,d.x)||Math.min(a.x,b.x)>Math.max(c.x,d.x)||Math.max(a.z,b.z)<Math.min(c.z,d.z)||Math.min(a.z,b.z)>Math.max(c.z,d.z))return false;return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;}
function clearsObstacle(a,b,radius,isBlocked,obstacleEdges){const len=Math.hypot(b.x-a.x,b.z-a.z)||1,px=-(b.z-a.z)/len*radius,pz=(b.x-a.x)/len*radius;for(const side of [-1,0,1]){const p={x:a.x+px*side,z:a.z+pz*side},q={x:b.x+px*side,z:b.z+pz*side};if(isBlocked(p.x,p.z)||isBlocked(q.x,q.z))return false;if(obstacleEdges.some(([c,d])=>intersects(p,q,c,d)))return false;}return true;}
// Preserve coastal clearance; close alongside the fixed landing, use the
// vessel's 0.9 m half-beam plus 0.25 m to permit a real-sized berth departure.
function clearWaterSegment(a,b){return clearsObstacle(a,b,2.4,geographicBlocked,edges)&&clearsObstacle(a,b,1.15,harborWaterBlocked,harborEdges);}
const hullSamples=[[0,0],[-.9,0],[.9,0],[0,-2],[0,2]];
const contactManeuvers=new WeakMap();
const contactStalls=new WeakMap();
function edgeDistance(x,z,obstacles){let best=Infinity;for(const[a,b]of obstacles){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}return best;}
// A nonzero value measures actual intrusion, so an already touching vessel can
// move OUT of contact. A boolean-only test otherwise traps every escape step.
function hullPenetration(pose,{extraPenetration=null}={}){
 const c=Math.cos(pose.heading),s=Math.sin(pose.heading);let depth=0;
 for(const[x,z]of hullSamples){const px=pose.x+x*c+z*s,pz=pose.z-x*s+z*c;let d=0;
  if(geographicBlocked(px,pz))d=Math.max(d,edgeDistance(px,pz,edges));
  if(harborWaterBlocked(px,pz))d=Math.max(d,edgeDistance(px,pz,harborEdges));
  if(extraPenetration)d=Math.max(d,extraPenetration(px,pz)||0);
  depth+=d*d;
 }
 return depth;
}
// Resolve only movement produced by the force integrator: never push/teleport
// the boat to an invented safe point. Sliding and turning out of contact remain
// possible; blocked velocity components stop, while the real engine and tiller
// keep responding. In particular, reject a newly colliding heading as well as XY.
function resolveVesselContact(v,before,options={}){
 const requested={x:v.x,z:v.z,heading:v.heading},penetration=hullPenetration(requested,options);
 if(penetration===0){contactStalls.delete(v);return{collided:false,recovering:false,penetration:0};}
 const oldDepth=hullPenetration(before,options),angle=Math.atan2(Math.sin(requested.heading-before.heading),Math.cos(requested.heading-before.heading));
 let best={x:before.x,z:before.z,heading:before.heading},bestDepth=oldDepth,bestProgress=0;
 for(let bits=1;bits<8;bits++){
  const pose={x:bits&1?requested.x:before.x,z:bits&2?requested.z:before.z,heading:bits&4?requested.heading:before.heading},d=hullPenetration(pose,options);
  const allowed=d===0||(oldDepth>0&&d<oldDepth-1e-13);if(!allowed)continue;
  const progress=(pose.x-before.x)**2+(pose.z-before.z)**2+(bits&4?angle*angle*2.4**2:0);
  if(d<bestDepth-1e-13||(Math.abs(d-bestDepth)<1e-13&&progress>bestProgress)){best=pose;bestDepth=d;bestProgress=progress;}
 }
 if(best.x!==requested.x)v.vx=0;if(best.z!==requested.z)v.vz=0;if(best.heading!==requested.heading)v.yawRate=0;
 v.x=best.x;v.z=best.z;v.heading=best.heading;v.speed=-v.vx*Math.sin(v.heading)-v.vz*Math.cos(v.heading);
 // A fully rejected impact leaves the old pose technically outside geometry.
 // Detect sustained lack of progress there too. Brief sliding/turning contacts
 // must not restart reverse repeatedly during a successful departure.
 if(!contactManeuvers.has(v)){
  let stall=contactStalls.get(v);
  const turned=stall?Math.abs(Math.atan2(Math.sin(v.heading-stall.heading),Math.cos(v.heading-stall.heading))):0;
  if(!stall||Math.hypot(v.x-stall.x,v.z-stall.z)>.12||turned>.035){stall={x:v.x,z:v.z,heading:v.heading,seconds:0};contactStalls.set(v,stall);}
  stall.seconds+=options.dt??1/60;
  if(stall.seconds>=1.2){contactManeuvers.set(v,{x:v.x,z:v.z});contactStalls.delete(v);}
 }
 return{collided:true,recovering:bestDepth<oldDepth,penetration:bestDepth};
}
// A propeller cannot turn a 4.8 m hull in place while it is touching the wharf.
// The assisted helmsman first backs two metres under real reverse thrust, then
// resumes its heading controller. Manual helm inputs do not use this function.
function contactAwareControl(v,control,options={}){
 if(!contactManeuvers.has(v)&&hullPenetration(v,options)>0)contactManeuvers.set(v,{x:v.x,z:v.z});
 const maneuver=contactManeuvers.get(v);if(!maneuver)return control;
 if(Math.hypot(v.x-maneuver.x,v.z-maneuver.z)>2&&hullPenetration(v,options)===0){contactManeuvers.delete(v);return control;}
 return{...control,steer:0,throttle:-.25,arrived:false,recovering:true};
}
function waterRoute(start,target){if(blocked(target.x,target.z))return null;if(clearWaterSegment(start,target))return[{...target}];
 // Pixel charts may need to go around the entire long wharf, even for a nearby pin.
 const step=30,margin=450,minX=Math.min(Math.min(start.x,target.x)-margin,detourBounds?.minX??Infinity),minZ=Math.min(Math.min(start.z,target.z)-margin,detourBounds?.minZ??Infinity),maxX=Math.max(Math.max(start.x,target.x)+margin,detourBounds?.maxX??-Infinity),maxZ=Math.max(Math.max(start.z,target.z)+margin,detourBounds?.maxZ??-Infinity),w=Math.ceil((maxX-minX)/step)+1,h=Math.ceil((maxZ-minZ)/step)+1;
 if(w*h>25000)return null;const pos=i=>({x:minX+(i%w)*step,z:minZ+Math.floor(i/w)*step});const cell=p=>Math.round((p.z-minZ)/step)*w+Math.round((p.x-minX)/step),first=cell(start),last=cell(target);const costs=new Float64Array(w*h).fill(Infinity),parent=new Int32Array(w*h).fill(-1),closed=new Uint8Array(w*h),blockedCache=new Int8Array(w*h).fill(-1);const bad=i=>{if(blockedCache[i]<0){const p=pos(i);blockedCache[i]=blocked(p.x,p.z)?1:0;}return blockedCache[i];};
 if(first===last)return null;costs[first]=0;const open=[first],heuristic=i=>{const p=pos(i);return Math.hypot(p.x-target.x,p.z-target.z);};let found=false,iterations=0;
 while(open.length&&iterations++<25000){let best=0;for(let k=1;k<open.length;k++)if(costs[open[k]]+heuristic(open[k])<costs[open[best]]+heuristic(open[best]))best=k;const current=open.splice(best,1)[0];if(closed[current])continue;closed[current]=1;if(current===last){found=true;break;}const cx=current%w,cy=Math.floor(current/w);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const next=ny*w+nx;if(closed[next]||(next!==last&&bad(next)))continue;if(!clearWaterSegment(current===first?start:pos(current),next===last?target:pos(next)))continue;const cost=costs[current]+Math.hypot(dx,dy)*step;if(cost<costs[next]){costs[next]=cost;parent[next]=current;open.push(next);}}}
 if(!found)return null;const route=[{...target}];let cursor=parent[last];while(cursor!==-1&&cursor!==first){route.unshift(pos(cursor));cursor=parent[cursor];}route.unshift(start);const smooth=[];let i=0;while(i<route.length-1){let next=route.length-1;while(next>i+1&&!clearWaterSegment(route[i],route[next]))next--;if(!clearWaterSegment(route[i],route[next]))return null;smooth.push(route[next]);i=next;}return smooth;}

 return{clearWaterSegment,hullPenetration,resolveVesselContact,contactAwareControl,waterRoute};
}
export const {clearWaterSegment,hullPenetration,resolveVesselContact,contactAwareControl,waterRoute}=createNavigation();
