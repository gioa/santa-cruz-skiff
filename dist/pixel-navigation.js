import {createNavigation} from './navigation.js?v=20260928-pixel-v79';
import {onLand,onPier,landPolygons,pierRings,PIXEL_PIER_BOUNDS} from './pixel-geography.js?v=20260928-pixel-v79';
import {HARBOR,harborWaterBlocked,harborObstacleRings} from './pixel-harbor-layout.js?v=20260928-pixel-v79';

export const {clearWaterSegment,hullPenetration,resolveVesselContact,contactAwareControl,waterRoute}=createNavigation({onLand,onPier,landPolygons,pierRings,harborWaterBlocked,harborObstacleRings,detourBounds:{minX:PIXEL_PIER_BOUNDS.minX-60,maxX:PIXEL_PIER_BOUNDS.maxX+60,minZ:PIXEL_PIER_BOUNDS.minZ-60,maxZ:PIXEL_PIER_BOUNDS.maxZ+60}});

// A geometry update may replace an old water pocket with straight deck. Only
// overlapping restored hulls move; normal navigation never calls this helper.
// Candidates preserve heading and clear the whole hull, including the stairs.
export function clearResumeVesselPose(pose){
 if(hullPenetration(pose)===0)return pose;
 const bounds=[PIXEL_PIER_BOUNDS,...harborObstacleRings.map(r=>({minX:Math.min(...r.map(p=>p.x)),maxX:Math.max(...r.map(p=>p.x)),minZ:Math.min(...r.map(p=>p.z)),maxZ:Math.max(...r.map(p=>p.z))}))],candidates=[],margin=2.6,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 for(const b of bounds){const x=clamp(pose.x,b.minX,b.maxX),z=clamp(pose.z,b.minZ,b.maxZ);candidates.push({x:b.minX-margin,z,heading:pose.heading},{x:b.maxX+margin,z,heading:pose.heading},{x,z:b.minZ-margin,heading:pose.heading},{x,z:b.maxZ+margin,heading:pose.heading});}
 const clear=candidates.filter(p=>hullPenetration(p)===0).sort((a,b)=>Math.hypot(a.x-pose.x,a.z-pose.z)-Math.hypot(b.x-pose.x,b.z-pose.z));
 return clear[0]||{x:HARBOR.boatX,z:HARBOR.boatZ,heading:0};
}
