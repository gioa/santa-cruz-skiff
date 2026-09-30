import {shoreWorldMetres} from './shore-scale.js';

// All interaction distances are in the same world metres as casts and waves.
export const SHORE_MOVEMENT=Object.freeze({
 walkSpeed:shoreWorldMetres(1.6),bodyRadius:shoreWorldMetres(.32),
 shoreClearance:shoreWorldMetres(.65),stand:shoreWorldMetres(1.25),castReach:shoreWorldMetres(12),
 talkReach:shoreWorldMetres(2.2),talkRelease:shoreWorldMetres(3.2),
 shopReach:shoreWorldMetres(3),doorReach:shoreWorldMetres(2),doorRelease:shoreWorldMetres(3.2),
 pierReach:shoreWorldMetres(2.5),pierRelease:shoreWorldMetres(3.5),routeArrival:shoreWorldMetres(.12),
});
export function shoreWalkBoundaryY(scene,x){
 const r=SHORE_MOVEMENT.bodyRadius;
 return Math.max(scene.shoreY(x-r),scene.shoreY(x),scene.shoreY(x+r))+SHORE_MOVEMENT.shoreClearance;
}
export function shoreStandPosition(scene,x){return{x,y:shoreWalkBoundaryY(scene,x)+SHORE_MOVEMENT.stand-SHORE_MOVEMENT.shoreClearance};}
export function shoreArrivalPosition(scene){
 const point=scene.pier?.open?scene.pier.gate:scene.shop.door;
 return{x:point.x,y:point.y+shoreWorldMetres(scene.pier?.open?1.5:2.5)};
}
// The doorway remains the authored location; the shop artwork and footprint
// share its metric scale (a seven-metre shop rather than a fifty-metre one).
export function shoreShopBounds(shop){
 const scale=.14,r=SHORE_MOVEMENT.bodyRadius,d=shop.door;
 return{left:d.x+(shop.x-d.x)*scale-r,right:d.x+(shop.x+shop.width-d.x)*scale+r,
  top:d.y+(shop.y-d.y)*scale-r,bottom:d.y+(shop.y+shop.height-d.y)*scale+r};
}
// Entering/leaving the gate is a discrete access action. On the deck its
// interaction belongs at the authored entry, not the remote landside gate.
export function shorePierExitPosition(scene){return scene.pier?.entry||null;}
