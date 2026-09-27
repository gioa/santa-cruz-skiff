import {buildingFootprints,insidePolygon} from './geography.js?v=20260927-pixel-v6.1';
import {walkAllowed,walkHeight} from './harbor-layout.js?v=20260927-pixel-v6.1';

// Only nearby footprints matter to a walking point. The rental porch remains
// traversable, matching the shared harbor layout used by the other edition.
const bucketSize=24,buckets=new Map(),key=(x,z)=>`${x},${z}`;
for(const building of buildingFootprints){
 if(String(building.id)==='1345388623')continue;
 const xs=building.points.map(p=>p.x),zs=building.points.map(p=>p.z),bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),points:building.points};
 for(let x=Math.floor(bounds.minX/bucketSize);x<=Math.floor(bounds.maxX/bucketSize);x++)for(let z=Math.floor(bounds.minZ/bucketSize);z<=Math.floor(bounds.maxZ/bucketSize);z++){
  const id=key(x,z);if(!buckets.has(id))buckets.set(id,[]);buckets.get(id).push(bounds);
 }
}
export function walkingBlocked(x,z){
 return (buckets.get(key(Math.floor(x/bucketSize),Math.floor(z/bucketSize)))||[]).some(b=>x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&insidePolygon(x,z,b.points));
}
export function walkingPointOpen(x,z){return walkAllowed(x,z)&&!walkingBlocked(x,z);}
export function walkingSegmentOpen(a,b,spacing=.025){
 const length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(length/spacing)),px=-(b.z-a.z)/(length||1)*.1,pz=(b.x-a.x)/(length||1)*.1;
 let previousHeight=walkHeight(a.x,a.z);
 for(let i=0;i<=n;i++){
  const t=i/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,height=walkHeight(x,z);
  if(Math.abs(height-previousHeight)>.3)return false;previousHeight=height;
  for(const side of[-1,0,1])if(!walkingPointOpen(x+px*side,z+pz*side))return false;
 }
 return true;
}

class MinHeap{
 constructor(){this.items=[];}
 push(node){const a=this.items;a.push(node);let i=a.length-1;while(i){const parent=(i-1)>>1;if(a[parent].f<=node.f)break;a[i]=a[parent];i=parent;}a[i]=node;}
 pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].f<a[child].f)child++;if(a[child].f>=last.f)break;a[i]=a[child];i=child;}a[i]=last;}return first;}
}

// This is a local detour planner, not a navmesh of the city. Straight paths and
// the authored narrow stair route are tried first by the simulation. Both a
// node cap and a wall-time budget bound a failed/complex click on mobile.
export function planGroundWalk(from,target,{maxExpanded=1600,maxMilliseconds=45,cellSize=.8,padding=24}={}){
 const failed=(expanded,reason)=>({route:null,expanded,reason}),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 if(![from?.x,from?.z,target?.x,target?.z].every(Number.isFinite)||distance(from,target)>180||!walkingPointOpen(target.x,target.z))return failed(0,'destination');
 const deadline=performance.now()+maxMilliseconds,minI=Math.floor((Math.min(from.x,target.x)-padding-from.x)/cellSize),maxI=Math.ceil((Math.max(from.x,target.x)+padding-from.x)/cellSize),minJ=Math.floor((Math.min(from.z,target.z)-padding-from.z)/cellSize),maxJ=Math.ceil((Math.max(from.z,target.z)+padding-from.z)/cellSize);
 const nodes=new Map(),open=new MinHeap(),nodeAt=(i,j)=>{
  const id=key(i,j);if(nodes.has(id))return nodes.get(id);
  const x=from.x+i*cellSize,z=from.z+j*cellSize;
  const node={i,j,x,z,g:Infinity,f:Infinity,parent:null,closed:false,open:walkingPointOpen(x,z)&&walkingPointOpen(x-.12,z)&&walkingPointOpen(x+.12,z)&&walkingPointOpen(x,z-.12)&&walkingPointOpen(x,z+.12)};
  nodes.set(id,node);return node;
 };
 const start=nodeAt(0,0);start.g=0;start.f=distance(start,target);open.push({node:start,f:start.f,g:0});let expanded=0,end=null;
 while(open.items.length&&expanded<maxExpanded){
  if(expanded%16===0&&performance.now()>deadline)return failed(expanded,'budget');
  const entry=open.pop(),current=entry.node;if(current.closed||entry.g!==current.g)continue;current.closed=true;expanded++;
  if(distance(current,target)<=cellSize*1.5&&walkingSegmentOpen(current,target)){end=current;break;}
  for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
   if(!di&&!dj)continue;const i=current.i+di,j=current.j+dj;if(i<minI||i>maxI||j<minJ||j>maxJ)continue;
   const next=nodeAt(i,j);if(next.closed||!next.open)continue;
   if(di&&dj&&(!nodeAt(current.i+di,current.j).open||!nodeAt(current.i,current.j+dj).open))continue;
   const g=current.g+cellSize*Math.hypot(di,dj);if(g>=next.g||!walkingSegmentOpen(current,next,.15))continue;
   next.g=g;next.f=g+distance(next,target);next.parent=current;open.push({node:next,f:next.f,g});
  }
 }
 if(!end)return failed(expanded,'unreachable');
 const raw=[{x:target.x,z:target.z}];for(let node=end;node&&node!==start;node=node.parent)raw.push({x:node.x,z:node.z});raw.reverse();
 // Collapse straight grid runs first. Then use precise clearance to remove
 // stair-step turns without cutting through a wall or over a wharf edge.
 const corners=[];for(let i=0;i<raw.length;i++){
  const before=i?raw[i-1]:from,p=raw[i],after=raw[i+1];
  if(!after||Math.abs((p.x-before.x)*(after.z-p.z)-(p.z-before.z)*(after.x-p.x))>1e-7)corners.push(p);
 }
 const route=[];let anchor=from;
 for(let i=0;i<corners.length;){
  let chosen=i;for(let j=corners.length-1;j>i;j--){if(performance.now()>deadline)return failed(expanded,'budget');if(walkingSegmentOpen(anchor,corners[j])){chosen=j;break;}}
  if(performance.now()>deadline)return failed(expanded,'budget');
  if(!walkingSegmentOpen(anchor,corners[chosen]))return failed(expanded,'clearance');
  const point=corners[chosen];route.push(point);anchor=point;i=chosen+1;
 }
 return performance.now()>deadline?failed(expanded,'budget'):{route,expanded,reason:null};
}
