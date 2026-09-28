import {SKIFF_DISPLAY_METERS_PER_PIXEL} from './skiff-dimensions.js?v=20260927-pixel-v40';
// Metres / seconds, using measured hull speed rather than throttle demand.
// Each emitted crest keeps its own strength while the vessel accelerates.
export function wakeProfile(speed=0){
 const v=Number.isFinite(speed)?Math.abs(speed):0,t=Math.min(1,v/5);
 return{active:v>.15,width:.7+t*1.7,expansion:.12+t*.65,opacity:.12+t*.53,foam:.12+t*.52,duration:1.5+t*6,spacing:.8-t*.45};
}
export function wakeOrigin(x,z,heading,speed){
 // The stern is 34 sprite pixels from the displayed hull centre. Reverse
 // displacement trails the bow, avoiding a wake in front of reverse motion.
 const offset=(speed<0?-43:34)*SKIFF_DISPLAY_METERS_PER_PIXEL;
 return{x:x+Math.sin(heading)*offset,z:z+Math.cos(heading)*offset};
}
