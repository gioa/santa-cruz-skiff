import {SKIFF_DISPLAY_METERS_PER_PIXEL} from './skiff-dimensions.js?v=20260927-pixel-v55';
// Metres / seconds, using measured hull speed rather than throttle demand.
// Each emitted crest keeps its own strength while the vessel accelerates.
export function wakeProfile(speed=0){
 const v=Number.isFinite(speed)?Math.abs(speed):0,t=Math.min(1,v/5);
 return{active:v>.15,width:2.1+t*.9,expansion:.12+t*.65,opacity:.12+t*.53,foam:.12+t*.52,duration:2+t*9,spacing:.8-t*.45};
}
export function wakeOrigin(x,z,heading,speed){
 // The stern is 34 sprite pixels from the displayed hull centre. Reverse
 // displacement trails the bow, avoiding a wake in front of reverse motion.
 const offset=(speed<0?-43:34)*SKIFF_DISPLAY_METERS_PER_PIXEL;
 return{x:x+Math.sin(heading)*offset,z:z+Math.cos(heading)*offset};
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=v=>Number.isFinite(v)?v:0;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
// World-space samples drift with the water after the hull passes. Camera motion and later
// steering cannot rotate an already emitted wake around the boat.
export function createWakeTrail(){
 const crests=[],foam=[];let previous=null,distanceCarry=0,foamCarry=0,serial=0;
 function clear(){crests.length=0;foam.length=0;previous=null;distanceCarry=foamCarry=0;}
 function update(state,dt,current={x:0,z:0}){
  if(state.launchStage!=='afloat'||state.mode==='walk'){clear();return;}
  if(state.paused||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.25);
  for(const list of[crests,foam])for(let i=list.length-1;i>=0;i--){list[i].age+=dt;list[i].x+=finite(current.x)*dt;list[i].z+=finite(current.z)*dt;if(list[i].age>=list[i].duration)list.splice(i,1);}
  const now={x:finite(state.boatX),z:finite(state.boatZ),h:finite(state.heading)},old=previous||now;
  const dx=now.x-old.x,dz=now.z-old.z,waterDx=dx-(previous?finite(current.x)*dt:0),waterDz=dz-(previous?finite(current.z)*dt:0),d=Math.hypot(waterDx,waterDz),speed=finite(state.speed),profile=wakeProfile(speed);
  if(d>Math.max(12,dt*60)){clear();previous=now;return;}
  const pose=t=>({x:old.x+dx*t,z:old.z+dz*t,h:old.h+angleDelta(old.h,now.h)*t});
  if(profile.active&&d>1e-8){
   const direction={x:-waterDx/d,z:-waterDz/d};let next=profile.spacing-distanceCarry;
   while(next<=d){const t=next/d,p=pose(t),origin=wakeOrigin(p.x,p.z,p.h,speed);crests.push({...origin,x:origin.x+finite(current.x)*dt*(1-t),z:origin.z+finite(current.z)*dt*(1-t),...profile,age:dt*(1-t),direction,reverse:speed<0,id:serial++});next+=profile.spacing;}
   distanceCarry=(distanceCarry+d)%profile.spacing;
  }else if(!profile.active)distanceCarry=0;
  // Propeller wash responds to thrust and motor angle, separately from the
  // speed-driven hull wake. Neutral coasting produces no new propeller foam.
  const power=state.engine===false?0:Math.abs(finite(state.throttle)),rate=power>.01?8+power*12:0;
  if(rate){let next=1/rate-foamCarry;while(next<=dt){const t=next/dt,p=pose(t),origin=wakeOrigin(p.x,p.z,p.h,1),h=p.h-clamp(finite(state.tiller),-1,1)*.5,sign=state.throttle<0?-1:1;foam.push({...origin,x:origin.x+Math.sin(p.h)*1.1+finite(current.x)*(dt-next),z:origin.z+Math.cos(p.h)*1.1+finite(current.z)*(dt-next),direction:{x:Math.sin(h)*sign,z:Math.cos(h)*sign},age:dt-next,duration:1.1+power*2.1,power,id:serial++});next+=1/rate;}foamCarry=(foamCarry+dt)%(1/rate);}else foamCarry=0;
  if(crests.length>220)crests.splice(0,crests.length-220);if(foam.length>120)foam.splice(0,foam.length-120);previous=now;
 }
 return{update,clear,crests,foam};
}
export function crestPoints(w){
 const u=clamp(w.age/w.duration,0,1),back=w.age*.22,spread=w.width+w.age*w.expansion,d=w.direction,r={x:d.z,z:-d.x};
 return[-1,1].map(side=>{
  const x=w.x+d.x*back+r.x*side*spread,z=w.z+d.z*back+r.z*side*spread;
  return{x,z,endX:x+d.x*(.35+w.foam)+r.x*side*(.45+w.foam),endZ:z+d.z*(.35+w.foam)+r.z*side*(.45+w.foam),opacity:(1-u)**1.6*w.opacity,width:.12+w.foam*.2};
 });
}
export function foamPoint(w){
 const jet=(1-Math.exp(-w.age*1.6))*(1.8+w.power*4),side=Math.sin(w.id*2.4)*w.age*.24;
 return{x:w.x+w.direction.x*jet+w.direction.z*side,z:w.z+w.direction.z*jet-w.direction.x*side,size:.16+w.power*.35+w.age*.12,opacity:(1-w.age/w.duration)**1.7*(.24+w.power*.35)};
}
