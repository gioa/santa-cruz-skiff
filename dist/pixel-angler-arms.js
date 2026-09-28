// Shared pixel forearm anatomy for the first-person view and rod instrument.
// The hand endpoint belongs to the grip/crank; elbow and sleeve follow it.
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function drawAnglerArm(ctx,{root,elbow,hand,scale=1,right=false}){
 const polygon=(p,color)=>{ctx.fillStyle=color;ctx.beginPath();p.forEach((q,i)=>ctx[i?'lineTo':'moveTo'](Math.round(q.x),Math.round(q.y)));ctx.closePath();ctx.fill();};
 const segment=(a,b,ra,rb,color,offset=0)=>{
  const n=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/n,ny=(b.x-a.x)/n;
  polygon([{x:a.x+nx*(ra+offset),y:a.y+ny*(ra+offset)},{x:b.x+nx*(rb+offset),y:b.y+ny*(rb+offset)},{x:b.x+nx*(-rb+offset),y:b.y+ny*(-rb+offset)},{x:a.x+nx*(-ra+offset),y:a.y+ny*(-ra+offset)}],color);
 };
 const cuff=mix(elbow,hand,.28),wrist=mix(elbow,hand,.88),s=scale;
 // The sleeve has a visible elbow, rolled cuff, then a tapered bare forearm.
 segment(root,elbow,15*s,12*s,'#213e4e');segment(elbow,cuff,12*s,10*s,'#213e4e');
 segment(root,elbow,10*s,8*s,'#416b7a',-2*s);segment(elbow,cuff,8*s,7*s,'#416b7a',-2*s);
 segment(mix(root,elbow,.25),elbow,2*s,2*s,'#648a94',-7*s);
 segment(elbow,wrist,9*s,5*s,'#a46d50');segment(elbow,wrist,6.8*s,4*s,'#d49a6e',-1*s);
 segment(mix(elbow,wrist,.1),wrist,3*s,2*s,'#edba88',-3*s);
 segment(mix(elbow,hand,.20),cuff,11*s,10*s,'#a7b6a9');
 segment(mix(elbow,hand,.24),cuff,10.5*s,10*s,'#d4d6bd');
 segment(wrist,hand,5*s,6.5*s,'#b77e58');segment(wrist,hand,3.8*s,5*s,'#e2ad7b',-1*s);
 // Palm is connected to the wrist, with knuckle planes instead of a circle.
 const sign=right?1:-1;
 polygon([{x:hand.x-7*s,y:hand.y+2*s},{x:hand.x-6*s,y:hand.y-4*s},{x:hand.x+2*s,y:hand.y-6*s},{x:hand.x+7*s,y:hand.y-2*s},{x:hand.x+6*s,y:hand.y+5*s},{x:hand.x-sign*2*s,y:hand.y+7*s}],'#b77e58');
 polygon([{x:hand.x-5*s,y:hand.y+1*s},{x:hand.x-4*s,y:hand.y-3*s},{x:hand.x+2*s,y:hand.y-4*s},{x:hand.x+5*s,y:hand.y-1*s},{x:hand.x+3*s,y:hand.y+4*s},{x:hand.x-3*s,y:hand.y+4*s}],'#e9b887');
 return{root,elbow,cuff,wrist,hand};
}
