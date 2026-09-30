import {SHORE_MOVEMENT as M,shorePierExitPosition} from './shore-movement.js';
// Local discovery events. Geometry is deliberately separate from the wider
// transaction radius; entering a doorway is different from browsing a bag.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function places(scene,state){
 const player=state.player;
 if(!player)return[];
 if(state.onPier){const point=shorePierExitPosition(scene);return point?[{id:'pier-exit',kind:'pier-exit',point,radius:M.pierReach,release:M.pierRelease,distance:distance(player,point)}]:[];}
 const result=[{id:'shop',kind:'shop',point:scene.shop.door,radius:M.doorReach,release:M.doorRelease,distance:distance(player,scene.shop.door)}];
 // The closed gate is scenery: walking up to it opens nothing. (E beside it, or
 // tapping the deck from there, is how curious players find their way on.)
 if(scene.pier)result.push({id:'pier',kind:'pier',silent:true,point:scene.pier.gate,radius:M.pierReach,release:M.pierRelease,distance:distance(player,scene.pier.gate)});
 const regular=state.regular;
 // The Sharp Park regular, wherever he is standing or walking.
 if(regular&&regular.mode!=='away')result.push({id:'regular',kind:'regular',point:{x:regular.x,y:regular.y},radius:M.talkReach,release:M.talkRelease,distance:distance(player,regular)});
 const angler=state.shoreLore?.encounter;
 if(angler&&angler.expiresAt>state.elapsed)result.push({id:`angler:${angler.id}`,kind:'angler',anglerId:angler.id,point:{x:angler.x,y:angler.y},
  radius:M.talkReach,release:M.talkRelease,distance:distance(player,angler)});
 return result;
}
const available=state=>state.phase==='walk'&&!state.inspection&&!state.leavingPier;
export function nearbyShoreInteraction(scene,state){
 if(!available(state))return null;
 return places(scene,state).filter(p=>p.distance<=p.radius).sort((a,b)=>a.distance/a.radius-b.distance/b.radius)[0]||null;
}
export function createShoreInteractions(scene){
 let lastPosition=null,lastOnPier=false,occupied=new Set(),known=new Set();
 function reset(state){
  const points=places(scene,state);known=new Set(points.map(p=>p.id));occupied=new Set(points.filter(p=>p.distance<=p.radius).map(p=>p.id));
  lastPosition={...state.player};lastOnPier=Boolean(state.onPier);
 }
 function step(state,{paused=false}={}){
  if(!lastPosition||lastOnPier!==Boolean(state.onPier)){reset(state);return null;}
  const moved=distance(lastPosition,state.player)>.01,points=places(scene,state),nextKnown=new Set(points.map(p=>p.id));
  lastPosition={...state.player};
  for(const id of occupied)if(!nextKnown.has(id))occupied.delete(id);
  for(const p of points){
   if(p.distance>p.release+1e-6)occupied.delete(p.id);
   // Spawning NPCs and paused/loaded positions never open a surprise modal.
   if((!known.has(p.id)||paused||!available(state))&&p.distance<=p.radius)occupied.add(p.id);
  }
  known=nextKnown;
  if(paused||!available(state)||!moved)return null;
  const target=points.filter(p=>!p.silent&&p.distance<=p.radius&&!occupied.has(p.id)).sort((a,b)=>a.distance/a.radius-b.distance/b.radius)[0];
  if(!target)return null;
  occupied.add(target.id);return target;
 }
 return{reset,step};
}
