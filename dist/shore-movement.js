// Authored navigation proportions match the original large character artwork.
// Fishing distances keep their separate physical metre conversion.
export const SHORE_MOVEMENT=Object.freeze({
 walkSpeed:112,bodyRadius:5,edgeClearance:20,bottomClearance:25,
 shoreClearance:20,stand:25,castReach:130,
 talkReach:70,talkDiscovery:55,talkRelease:80,
 shopReach:88,doorReach:40,doorRelease:64,
 pierReach:72,pierDiscovery:42,pierRelease:68,pierExitReach:34,pierExitRelease:54,pierPushReach:30,routeArrival:2,
});
export function shoreWalkBoundaryY(scene,x){
 return scene.shoreY(x)+SHORE_MOVEMENT.shoreClearance;
}
export function shoreStandPosition(scene,x){return{x,y:shoreWalkBoundaryY(scene,x)+SHORE_MOVEMENT.stand-SHORE_MOVEMENT.shoreClearance};}
export function shoreArrivalPosition(scene){
 return{...scene.spawn};
}
// The authored footprint includes clearance for the large character sprite.
export function shoreShopBounds(shop){
 return{left:shop.x-18,right:shop.x+shop.width+18,top:shop.y-18,bottom:shop.y+shop.height+18};
}
// Entering/leaving the gate is a discrete access action. On the deck its
// interaction belongs at the authored entry, not the remote landside gate.
export function shorePierExitPosition(scene){return scene.pier?.entry||null;}
