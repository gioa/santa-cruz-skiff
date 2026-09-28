// 55 lbf (~245 N) class bow motor. Tuned controller, not a specific commercial
// autopilot: all output is finite thrust through the same hull/wind/current solver.
const finite=n=>Number.isFinite(n)?n:0;
export function trollingMotorForce(v,{mode='off',target=null,current={x:0,z:0},wind={},payloadKg=0}={}){
 if(!['hold','navigate'].includes(mode))return{x:0,z:0,thrust:0,angle:0};
 let dx=0,dz=0;
 if(target){const x=target.x-v.x,z=target.z-v.z,d=Math.hypot(x,z),speed=Math.min(mode==='navigate'?1.1:.55,d*(mode==='navigate'?.25:.3));if(d>.001){dx=x/d*speed;dz=z/d*speed;}}
 // With no GPS target this resists drift but never returns to a stored position.
 const c=Math.cos(v.heading),s=Math.sin(v.heading),fx=-s,fz=-c,rx=c,rz=-s;
 const ux=dx-finite(current.x),uz=dz-finite(current.z),u=ux*fx+uz*fz,l=ux*rx+uz*rz,scale=((345+Math.max(0,payloadKg))/345)**.35;
 const wx=finite(wind.windX)-dx,wz=finite(wind.windZ)-dz,wf=wx*fx+wz*fz,ws=wx*rx+wz*rz;
 const f=(28*u+75*u*Math.abs(u))*scale-.5*1.225*1.1*wf*Math.abs(wf),side=(150*l+700*l*Math.abs(l))*scale-.5*1.225*2.2*ws*Math.abs(ws);
 let x=fx*f+rx*side+(dx-v.vx)*260,z=fz*f+rz*side+(dz-v.vz)*260;
 const thrust=Math.hypot(x,z),limit=Math.min(1,245/Math.max(1,thrust));x*=limit;z*=limit;
 return{x,z,thrust:Math.hypot(x,z),angle:Math.atan2(-x,-z)};
}
