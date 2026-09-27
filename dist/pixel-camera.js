// Camera and presentation geometry only. Gameplay coordinates and collision
// polygons are never rewritten by this module.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
export function cameraOffset(camera){return{x:Math.round(camera.width*.5-camera.x*camera.scale),y:Math.round(camera.height*.47-camera.z*camera.scale)};}
export function projectPixel(camera,x,z){const o=cameraOffset(camera);return{x:Math.round(x*camera.scale)+o.x,y:Math.round(z*camera.scale)+o.y};}
export function unprojectPixel(camera,x,y){const o=cameraOffset(camera);return{x:(x-o.x)/camera.scale,z:(y-o.y)/camera.scale};}
export function cameraDeadzone(camera,mode='walk'){
  const boat=mode==='boat',swim=mode==='swim',width=camera.width,height=camera.height;
  const horizontal=boat?.30:swim?.24:.18,top=boat?.31:swim?.25:.21,bottom=boat?.68:swim?.73:.76;
  return{left:Math.round(width*horizontal),right:Math.round(width*(1-horizontal)),top:Math.round(height*top),bottom:Math.round(height*bottom)};
}
/** Returns a new camera. Motion inside the deadzone changes no camera field. */
export function stepDeadzoneCamera(camera,focus,{mode='walk',dt=1/60,force=false}={}){
  const next={...camera},box=cameraDeadzone(camera,mode),p=projectPixel(camera,focus.x,focus.z),dx=p.x-clamp(p.x,box.left,box.right),dy=p.y-clamp(p.y,box.top,box.bottom);
  if(!dx&&!dy)return next;
  const far=p.x<camera.width*.08||p.x>camera.width*.92||p.y<camera.height*.10||p.y>camera.height*.9;
  const blend=force||far?1:1-Math.exp(-clamp(finite(dt),0,.1)*10);
  next.x+=dx*blend/camera.scale;next.z+=dy*blend/camera.scale;
  return next;
}
/** Keep the rod and float visible during a long cast without recentring them. */
export function keepCameraPointsVisible(camera,points,{paddingX=28,paddingTop=32,paddingBottom=62}={}){
  const pixels=points.map(p=>projectPixel(camera,p.x,p.z));if(!pixels.length)return{...camera};
  const minX=Math.min(...pixels.map(p=>p.x)),maxX=Math.max(...pixels.map(p=>p.x)),minY=Math.min(...pixels.map(p=>p.y)),maxY=Math.max(...pixels.map(p=>p.y));
  const dx=minX<paddingX?minX-paddingX:maxX>camera.width-paddingX?maxX-(camera.width-paddingX):0,dy=minY<paddingTop?minY-paddingTop:maxY>camera.height-paddingBottom?maxY-(camera.height-paddingBottom):0;
  return{...camera,x:camera.x+dx/camera.scale,z:camera.z+dy/camera.scale};
}
/**
 * Build a cached, orthogonal art outline from geographic points. Long edges
 * become broad horizontal/vertical segments, rather than crawling 1 px slopes.
 * The source array and its real collision boundary are left untouched.
 */
export function rectilinearOutline(points,{grid=1,span=8,closed=true}={}){
  if(!Array.isArray(points)||points.length<2)return(points||[]).map(p=>({...p}));
  grid=Math.max(.125,finite(grid,1));span=Math.max(grid,finite(span,8));
  const snap=p=>({x:Math.round(p.x/grid)*grid,z:Math.round(p.z/grid)*grid}),out=[];
  const push=p=>{const a=out.at(-1);if(a&&a.x===p.x&&a.z===p.z)return;const b=out.at(-2);if(a&&b&&((a.x===b.x&&a.x===p.x)||(a.z===b.z&&a.z===p.z)))out.pop();out.push(p);};
  push(snap(points[0]));
  const count=closed?points.length:points.length-1;
  for(let i=0;i<count;i++){
    const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dz=b.z-a.z,n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/span));
    for(let j=1;j<=n;j++){
      const p=snap({x:a.x+dx*j/n,z:a.z+dz*j/n}),last=out.at(-1);
      if(Math.abs(dx)>=Math.abs(dz))push({x:p.x,z:last.z});else push({x:last.x,z:p.z});
      push(p);
    }
  }
  if(closed&&out.length>1){const first=out[0],last=out.at(-1);if(first.x===last.x&&first.z===last.z)out.pop();}
  return out;
}
