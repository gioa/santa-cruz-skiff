// Uniform current at every depth. SI units; coefficients are simulation tuning.
// A rig has its own ground velocity: water drag must never use boat speed alone.
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
export function rigHydrodynamics({dt,current={},velocity={},boatVelocity={},weightGrams=85,dragArea=.0005,lineDiameterMm=.36,lineMeters=0,contact=false,habitat='sand'}){
 let vx=finite(velocity.vx),vz=finite(velocity.vz),x=0,z=0,bedHolding=false;
 const mass=Math.max(.04,weightGrams*.002+lineMeters*.003),weight=Math.max(0,weightGrams)*.001*9.81*.91;
 const mu=habitat==='rock'||habitat==='reef'||habitat==='kelp'?.65:habitat==='mud'?.45:.38;
 const rigK=.5*1025*Math.max(.00005,dragArea),lineK=.5*1025*Math.max(0,lineDiameterMm)*.001*Math.min(35,lineMeters)*.45;
 let lineForce=0,rigForce=0;
 for(let remaining=Math.max(0,dt);remaining>1e-9;){
  const h=Math.min(remaining,1/120);remaining-=h;
  const rx=finite(current.x)-vx,rz=finite(current.z)-vz,rs=Math.hypot(rx,rz);
  // Midpoint velocity integrates the line between moving rod and moving rig.
  const lx=finite(current.x)-(finite(boatVelocity.vx)+vx)/2,lz=finite(current.z)-(finite(boatVelocity.vz)+vz)/2,ls=Math.hypot(lx,lz);
  lineForce=lineK*ls*ls;rigForce=rigK*rs*rs;
  let fx=rigK*rs*rx+lineK*ls*lx*.5,fz=rigK*rs*rz+lineK*ls*lz*.5;
  const force=Math.hypot(fx,fz),speed=Math.hypot(vx,vz);
  bedHolding=contact&&speed<.015&&force<=mu*weight;
  if(bedHolding){vx=0;vz=0;}
  else{
   // Semi-implicit damping keeps fine braid / light sinkers stable on phones.
   const damping=1+h*(rigK*rs+lineK*ls*.25)/mass;
   vx+=fx*h/mass/damping;vz+=fz*h/mass/damping;
   if(contact){const v=Math.hypot(vx,vz),retain=Math.max(0,1-mu*.8*weight*h/(mass*Math.max(v,1e-9)));vx*=retain;vz*=retain;}
  }
  x+=vx*h;z+=vz*h;
 }
 return{x,z,vx,vz,bedHolding,lineForce,rigForce};
}
