import {HARBOR} from './harbor-layout.js?v=20260928-pixel-v67';

/**
 * Offshore navigation uses a 1:2 game-distance scale. Geographic coordinates,
 * shoreline geometry, knots and the 1:1 game clock remain unchanged. This is
 * deliberately a navigation approximation, not a claim of real-world speed.
 * Only a powered, seated, forward-moving boat receives the shorter passage.
 */
export const NAVIGATION_COMPRESSION=.5;
export const NAVIGATION_HARBOR_RADIUS=24;
export const NAVIGATION_OFFSHORE_RADIUS=72;

const finite=Number.isFinite;
function smoothstep(low,high,value){const t=Math.max(0,Math.min(1,(value-low)/(high-low)));return t*t*(3-2*t);}
function spatialScale(x,z){
  const distance=Math.hypot(x-HARBOR.boatX,z-HARBOR.boatZ);
  return 1+(1/NAVIGATION_COMPRESSION-1)*smoothstep(NAVIGATION_HARBOR_RADIUS,NAVIGATION_OFFSHORE_RADIUS,distance);
}

/** Multiplier for vessel navigation time ONLY. Never multiply the whole sim dt. */
export function navigationStepScale(state={}){
  if(!state||state.mode!=='boat'||state.paused||state.moored||state.anchor||state.docking||state.standing||(!state.engine&&state.motorMode!=='navigate')||state.casting||state.fishState!=='idle')return 1;
  if(Number.isFinite(state.throttle)&&Math.abs(state.throttle)<=.01&&state.motorMode!=='navigate')return 1;
  if(!finite(state.boatX)||!finite(state.boatZ)||!finite(state.speed)||state.speed<=.35)return 1;
  return 1+(spatialScale(state.boatX,state.boatZ)-1)*smoothstep(.35,1.15,state.speed);
}

/**
 * Optional wrapper support for a low-frame-rate caller. The force solver caps
 * individual dt at .25 s; these <= .1 s pieces retain the entire scaled interval
 * while also allowing collision and assisted steering checks between pieces.
 */
export function navigationSubsteps(state,dt){
  if(!finite(dt)||dt<=0)return[];
  const total=Math.min(dt,.25)*navigationStepScale(state),count=Math.max(1,Math.ceil(total/.1));
  return Array(count).fill(total/count);
}

/**
 * Chart straight-line distance in game metres, NOT a nautical chart distance.
 * Integrates the same spatial transition: shore-side/dock manoeuvring stays
 * full scale, clear offshore segments measure half their geographic length.
 * Route distance is the sum over route segments; this function does not route
 * through obstacles and must not be used as a collision or GPS conversion.
 */
export function compressedDistance(a,b){
  if(!a||!b||![a.x,a.z,b.x,b.z].every(finite))return 0;
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  if(!length)return 0;
  // Simpson integration at <= 4 m spacing resolves the 48 m transition smoothly.
  const n=Math.max(2,Math.ceil(Math.min(8192,length/4)/2)*2),h=1/n;
  let sum=0;
  for(let i=0;i<=n;i++){
    const t=i*h,density=1/spatialScale(a.x+dx*t,a.z+dz*t);
    sum+=(i===0||i===n?1:i%2?4:2)*density;
  }
  return length*h*sum/3;
}
