// CSS-pixel layout for object-attached buttons. x is the button centre and y
// its bottom edge, matching translate(-50%, -100%) in the world-action style.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const number=(value,fallback)=>Number.isFinite(value)?value:fallback;
const offsets=[[0,0],[-50,0],[50,0],[0,-50],[0,50],[-100,0],[100,0],[0,-100],[0,100],[-50,-50],[50,-50],[-50,50],[50,50]];
function normalizedRect(rect){
  const left=number(rect.left,number(rect.x,0)),top=number(rect.top,number(rect.y,0));
  return{left,top,right:number(rect.right,left+number(rect.width,0)),bottom:number(rect.bottom,top+number(rect.height,0))};
}
function overlap(a,b,gap){return Math.max(0,Math.min(a.right,b.right+gap)-Math.max(a.left,b.left-gap))*Math.max(0,Math.min(a.bottom,b.bottom+gap)-Math.max(a.top,b.top-gap));}

/**
 * Put the next button close to its object, avoiding previously placed buttons
 * and supplied HUD/joystick rectangles. Occupied rectangles may be DOMRects or
 * plain {left,top,right,bottom} / {x,y,width,height} objects. The caller appends
 * each returned rect to occupiedRects; this function never mutates its inputs.
 * If every candidate is blocked, choose the least-overlapping visible one.
 */
export function layoutWorldAction(desired,bounds,occupiedRects=[]){
  const width=Math.max(1,number(desired.width,116)),height=Math.max(1,number(desired.height,44));
  const viewportWidth=Math.max(width,number(bounds.width,width)),viewportHeight=Math.max(height,number(bounds.height,height));
  const left=Math.max(0,number(bounds.left,10)),right=Math.max(0,number(bounds.right,10)),top=Math.max(0,number(bounds.top,124)),bottom=Math.max(0,number(bounds.bottom,18));
  const minX=Math.min(viewportWidth/2,left+width/2),maxX=Math.max(minX,viewportWidth-right-width/2);
  const minY=Math.min(viewportHeight,height+top),maxY=Math.max(minY,viewportHeight-bottom);
  const origin={x:number(desired.x,viewportWidth/2),y:number(desired.y,minY)},base={x:clamp(origin.x,minX,maxX),y:clamp(origin.y,minY,maxY)};
  const occupied=occupiedRects.filter(Boolean).map(normalizedRect),gap=Math.max(0,number(bounds.gap,6));
  // Obstacle edges and viewport edges cover clear space beyond the old
  // fixed 100px search, including the entire boat/crane animation corridor.
  const xs=[minX,maxX,base.x],ys=[minY,maxY,base.y];
  for(const r of occupied){xs.push(r.left-gap-width/2-1,r.right+gap+width/2+1);ys.push(r.top-gap-1,r.bottom+gap+height+1);}
  const candidates=[...offsets,...xs.flatMap(x=>ys.map(y=>[x-base.x,y-base.y]))];
  let best=null;
  for(const [dx,dy]of candidates){
    const x=Math.round(clamp(base.x+dx,minX,maxX)),y=Math.round(clamp(base.y+dy,minY,maxY));
    const rect={left:x-width/2,top:y-height,right:x+width/2,bottom:y,width,height};
    const area=occupied.reduce((sum,other)=>sum+overlap(rect,other,gap),0),distance=(x-origin.x)**2+(y-origin.y)**2;
    if(!best||area<best.area||area===best.area&&distance<best.distance)best={x,y,rect,area,distance};
  }
  return{x:best.x,y:best.y,rect:best.rect};
}
