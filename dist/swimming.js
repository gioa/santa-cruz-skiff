// Recoverable immersion response. Effort/cold meters are gameplay feedback, not survival estimates.
export function newImmersion(x,z,y,pfd=true){return{x,z,y,verticalSpeed:0,seconds:0,effort:100,cold:0,pfd,assist:false,rescue:0,latched:false};}
export function stepImmersion(swim,{dt,dx=0,dz=0,water=0,temperature=14,windX=0,windZ=0}){
 if(!(dt>0))return swim;
 swim.seconds+=dt;const magnitude=Math.hypot(dx,dz);if(magnitude>1){dx/=magnitude;dz/=magnitude;}
 if(!swim.latched&&swim.y>water+.25){swim.verticalSpeed-=9.81*dt;swim.y+=swim.verticalSpeed*dt;if(swim.y<water+.15){swim.y=water+.15;swim.verticalSpeed=0;swim.latched=true;}}
 else{swim.latched=true;swim.verticalSpeed=0;const buoyancy=swim.pfd?.24:swim.effort>15?.13:-.12;swim.y+=(water+buoyancy-swim.y)*Math.min(1,dt*4);}
 const moving=Math.hypot(dx,dz)>.05,speed=(.45+.62*swim.effort/100)*(swim.pfd?.9:1);
 swim.x+=(dx*speed+windX)*dt;swim.z+=(dz*speed+windZ)*dt;
 swim.effort=Math.max(0,Math.min(100,swim.effort+dt*(moving?-.24:(swim.pfd?.13:.025))));
 swim.cold=Math.min(100,swim.cold+dt*Math.max(0,20-temperature)*.003);
 return swim;
}
export function ladderPoint(boatX,boatZ,heading){const x=-1.15,z=1.42;return{x:boatX+x*Math.cos(heading)+z*Math.sin(heading),z:boatZ-x*Math.sin(heading)+z*Math.cos(heading)};}
