// Camera and presentation geometry only. Gameplay coordinates and collision
// polygons are never rewritten by this module.
import {skiffScale} from './pixel-boat-geometry.js?v=20260927-pixel-v33';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
export function cameraOffset(camera){return{x:Math.round(camera.width*.5-camera.x*camera.scale),y:Math.round(camera.height*.47-camera.z*camera.scale)};}
export function projectPixel(camera,x,z){const o=cameraOffset(camera);return{x:Math.round(x*camera.scale)+o.x,y:Math.round(z*camera.scale)+o.y};}
export function unprojectPixel(camera,x,y){const o=cameraOffset(camera);return{x:(x-o.x)/camera.scale,z:(y-o.y)/camera.scale};}
function viewportMetrics(camera){
  const viewport=camera.viewport,ratio=camera.height/Math.max(1,finite(viewport?.height,camera.height));
  return{top:Math.max(0,finite(viewport?.top,0))*ratio,bottom:Math.max(0,camera.height-Math.max(0,finite(viewport?.bottom,0))*ratio),gap:Math.max(0,finite(viewport?.gap,10))*ratio};
}
export function cameraPlayfield(camera,{paddingX=20}={}){
  const view=viewportMetrics(camera),top=Math.ceil(view.top+view.gap),bottom=Math.max(top,Math.floor(view.bottom-view.gap));
  return{left:paddingX,right:Math.max(paddingX,camera.width-paddingX),top,bottom};
}
/** Fit rendered bounds once, after normal edge tracking. Bounds include the
 * actual hull/rod extent, so a secondary float cannot push the boat under HUD.
 * All camera motion is in whole logical pixels, as in the sailing deadzone. */
export function fitCameraBounds(camera,bounds,{primaryBounds=bounds}={}){
  const field=cameraPlayfield(camera),fits=b=>b.right-b.left<=field.right-field.left&&b.bottom-b.top<=field.bottom-field.top;
  const target=fits(bounds)?bounds:primaryBounds;
  const shift=(low,high,min,max)=>{const a=Math.ceil(low-min),b=Math.floor(high-max);return a<=b?clamp(0,a,b):Math.round((low+high-min-max)/2);};
  const dx=shift(field.left,field.right,target.left,target.right),dy=shift(field.top,field.bottom,target.top,target.bottom),next={...camera};
  if(!dx&&!dy)return next;
  const offset=cameraOffset(camera);next.x=(camera.width*.5-(offset.x+dx))/camera.scale;next.z=(camera.height*.47-(offset.y+dy))/camera.scale;
  return next;
}
export function cameraDeadzone(camera,mode='walk'){
  const boat=mode==='boat',swim=mode==='swim',width=camera.width,height=camera.height;
  const horizontal=boat?.30:swim?.24:.18,top=boat?.31:swim?.25:.21,bottom=boat?.68:swim?.73:.76;
  let bottomEdge=Math.round(height*bottom);
  if(boat&&camera.viewport){
    // The CSS console has a fixed height, so a percentage alone cannot keep a
    // boat visible on both tall and short phones. Reserve its rotated sprite
    // radius as well as the console; collapse a tiny playfield safely.
    const view=viewportMetrics(camera),radius=54*skiffScale(camera.scale);
    bottomEdge=Math.min(bottomEdge,Math.floor(Math.max(0,view.bottom-radius-view.gap)));
  }
  return{left:Math.round(width*horizontal),right:Math.round(width*(1-horizontal)),top:Math.min(Math.round(height*top),bottomEdge),bottom:bottomEdge};
}
/** Returns a new camera. Motion inside the deadzone changes no camera field. */
export function stepDeadzoneCamera(camera,focus,{mode='walk'}={}){
  const next={...camera},box=cameraDeadzone(camera,mode),p=projectPixel(camera,focus.x,focus.z),dx=p.x-clamp(p.x,box.left,box.right),dy=p.y-clamp(p.y,box.top,box.bottom);
  if(!dx&&!dy)return next;
  // The sprite and camera must cross a logical pixel together. Easing an
  // already rounded overflow makes the sprite move first, then the camera
  // catch up one pixel in the opposite direction on a later frame.
  const offset=cameraOffset(camera);
  if(dx)next.x=(camera.width*.5-(offset.x-dx))/camera.scale;
  if(dy)next.z=(camera.height*.47-(offset.y-dy))/camera.scale;
  return next;
}
/** Stable normal framing; the engine switch never changes the map scale. */
export function cameraZoomForState(camera,state){
  const fishing=state.mode==='boat'&&!['idle','landed'].includes(state.fishState||'idle');
  if(!fishing||!state.bobber)return 6;
  if(camera.viewport){
    // Fit the cast in the same unobscured region used by the sailing camera.
    for(let scale=6;scale>=2;scale--){const bottom=cameraDeadzone({...camera,scale},'boat').bottom;if((Math.abs(state.bobber.x-state.boatX)+5)*scale<=camera.width-80&&(Math.abs(state.bobber.z-state.boatZ)+6)*scale<=bottom-32)return scale;}
    return 2;
  }
  return clamp(Math.floor(Math.min(6,(camera.width-80)/(Math.abs(state.bobber.x-state.boatX)+5),(camera.height-100)/(Math.abs(state.bobber.z-state.boatZ)+6))),3,6);
}
/** A necessary cast-fit zoom preserves the boat's exact projected pixel. */
export function zoomCameraAt(camera,scale,focus){
  if(scale===camera.scale)return{...camera};
  const p=projectPixel(camera,focus.x,focus.z);
  return{...camera,scale,x:(camera.width*.5-(p.x-Math.round(focus.x*scale)))/scale,z:(camera.height*.47-(p.y-Math.round(focus.z*scale)))/scale};
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
