// Metres / seconds, using measured hull speed rather than throttle demand.
// Each emitted crest keeps its own strength while the vessel accelerates.
export function wakeProfile(speed=0){
 const v=Number.isFinite(speed)?Math.abs(speed):0,t=Math.min(1,v/5);
 return{active:v>.15,width:.7+t*1.7,expansion:.12+t*.65,opacity:.12+t*.53,foam:.12+t*.52,duration:1.5+t*6,spacing:.8-t*.45};
}
export function wakeOrigin(x,z,heading,speed){
 // Enlarged art stern is 34 px * .18 m/px from the sprite centre. Reverse
 // displacement trails the bow, avoiding a wake in front of reverse motion.
 const offset=speed<0?-43*.18:34*.18;
 return{x:x+Math.sin(heading)*offset,z:z+Math.cos(heading)*offset};
}
