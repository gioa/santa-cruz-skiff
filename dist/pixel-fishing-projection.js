import {FISHING_SCENE_SCALE} from './skiff-dimensions.js?v=20260927-pixel-v41';
export {FISHING_SCENE_SCALE};
// Boat-centred tackle projection. Geography, walking and helm waypoints keep
// their existing map projection; the physical spool remains in real metres.
export function fishingScenePoint(state,point){
 return{x:state.boatX+(point.x-state.boatX)*FISHING_SCENE_SCALE,z:state.boatZ+(point.z-state.boatZ)*FISHING_SCENE_SCALE};
}
export function fishingPhysicalPoint(state,point){
 return{x:state.boatX+(point.x-state.boatX)/FISHING_SCENE_SCALE,z:state.boatZ+(point.z-state.boatZ)/FISHING_SCENE_SCALE};
}
export function fishingProjector(state,project){return(x,z)=>{const p=fishingScenePoint(state,{x,z});return project(p.x,p.z);};}
