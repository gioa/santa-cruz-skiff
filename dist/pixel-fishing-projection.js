// Fishing and seabed share one world coordinate system. A boat-relative scale
// made a stationary hook slide across the bottom as the boat drifted away.
// Hull sprites retain their established readability scale independently.
export {FISHING_SCENE_SCALE} from './skiff-dimensions.js?v=20260928-pixel-v63';
export function fishingScenePoint(state,point){return{x:point.x,z:point.z};}
export function fishingPhysicalPoint(state,point){return{x:point.x,z:point.z};}
export function fishingProjector(state,project){return(x,z)=>project(x,z);}
