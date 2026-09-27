const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;

// Relative travel: touching the rod must never jump its saved posture.
export function rodPoseFromDrag(pose,dx,dy,{width=200,height=140}={}){
 return{elevation:clamp(finite(pose.elevation,45)-finite(dy)/Math.max(1,height)*85,5,85),azimuth:clamp(finite(pose.azimuth,70)+finite(dx)/Math.max(1,width)*180,-110,110)};
}
export function clockwiseTurns(previous,next){
 if(!Number.isFinite(previous)||!Number.isFinite(next))return 0;
 return Math.max(0,Math.atan2(Math.sin(next-previous),Math.cos(next-previous))/(2*Math.PI));
}
// Queue actual clockwise crank travel, never an indefinitely latched speed.
// Stopping, releasing, or losing the touch stops reeling immediately.
export function createCrankInput(){
 let pending=0,active=false,age=0;
 return{
  start(){pending=0;active=true;age=0;},
  turn(turns){if(active&&Number.isFinite(turns)&&turns>0){pending=Math.min(.3,pending+turns);age=0;}},
  sample(dt){if(!active||!Number.isFinite(dt)||dt<=0)return 0;age+=dt;if(age>.16){pending=0;return 0;}const rate=Math.min(2,pending/dt);pending=Math.max(0,pending-rate*dt);return rate;},
  stop(){pending=0;active=false;age=0;},
  snapshot(){return{pending,active};}
 };
}
