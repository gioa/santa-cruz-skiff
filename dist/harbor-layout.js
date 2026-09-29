import {onPier as defaultOnPier,onLand as defaultOnLand,insidePolygon as defaultInsidePolygon,buildingFootprints as defaultBuildings} from './geography.js';

// Looking seaward along the wharf (-z), the rental stair is on the left (-x).
// Plan dimensions are authored estimates from reference photographs. The City
// reports 23 ft MLLW main deck / 8 ft MLLW rental landing; the 1.45 m datum offset
// here is approximate, not a surveyed conversion to the terrain's MHW datum.
export const HARBOR=Object.freeze({
 revision:2,deckHeight:5.56,landingHeight:.99,
 spawnX:-10,spawnZ:-45,counterX:-7.8,counterZ:-54,
 boatX:-34.2,boatZ:-55,boardingX:-31.8,boardingZ:-55.2,
 craneX:-29.3,craneZ:-55,craneRotation:Math.PI,craneOutreach:4.9,
 returnX:-38,returnZ:-49,
 mooringX:-32.1,mooringZ:-54.2,
 stair:{minX:-31.9,maxX:-30.5,minZ:-65.2,maxZ:-57},
 landing:{minX:-32.2,maxX:-30.3,minZ:-57,maxZ:-54},
 connector:{minX:-31.9,maxX:-27.8,minZ:-66.7,maxZ:-65.2},
});
const within=(x,z,r)=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ;
const rectangle=r=>[{x:r.minX,z:r.minZ},{x:r.maxX,z:r.minZ},{x:r.maxX,z:r.maxZ},{x:r.minX,z:r.maxZ}];
export const harborObstacleRings=[HARBOR.stair,HARBOR.landing,HARBOR.connector].map(rectangle);
export function harborWaterBlocked(x,z){return[HARBOR.stair,HARBOR.landing,HARBOR.connector].some(r=>within(x,z,r));}
export const BOARDING_WALK_PATH=[
 {x:HARBOR.counterX,z:HARBOR.counterZ},{x:-12,z:-54},{x:-24.5,z:-63.8},
 {x:-28.6,z:-65.8},{x:-31.2,z:-65.8},{x:-31.2,z:-65.15},{x:-31.2,z:-57},{x:-31.2,z:-56},
 {x:HARBOR.boardingX,z:HARBOR.boardingZ},
];
export function createHarborLayout({onPier=defaultOnPier,onLand=defaultOnLand,insidePolygon=defaultInsidePolygon,buildingFootprints=defaultBuildings}={}){
function walkHeight(x,z){
 if(within(x,z,HARBOR.landing))return HARBOR.landingHeight;
 if(within(x,z,HARBOR.stair)){
  const f=(z-HARBOR.stair.minZ)/(HARBOR.stair.maxZ-HARBOR.stair.minZ);
  return HARBOR.deckHeight+(HARBOR.landingHeight-HARBOR.deckHeight)*f;
 }
 if(within(x,z,HARBOR.connector)||onPier(x,z))return HARBOR.deckHeight;
 return .75;
}
function walkAllowed(x,z){return onPier(x,z)||onLand(x,z)||harborWaterBlocked(x,z);}
function walkBlocked(x,z){return buildingFootprints.some(b=>String(b.id)!=='1345388623'&&insidePolygon(x,z,b.points));}
function canBoardFrom(x,z){return Math.hypot(x-HARBOR.boardingX,z-HARBOR.boardingZ)<1.65&&within(x,z,HARBOR.landing)&&walkHeight(x,z)<1.5;}
function clearWalkSegment(a,b){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15));
 let height=walkHeight(a.x,a.z);
 for(let i=0;i<=steps;i++){
  const f=i/steps,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f,nextHeight=walkHeight(x,z);
  // A clear top-down footprint must not permit an assisted shortcut over a
  // multi-metre ledge. The proper staircase changes height continuously.
  if(!walkAllowed(x,z)||walkBlocked(x,z)||Math.abs(nextHeight-height)>.3)return false;
  height=nextHeight;
 }
 return true;
}
 return{walkHeight,walkAllowed,walkBlocked,canBoardFrom,clearWalkSegment};
}
export const {walkHeight,walkAllowed,walkBlocked,canBoardFrom,clearWalkSegment}=createHarborLayout();
export function migrateHarborSave(state){
 if(state.harborRevision===HARBOR.revision)return false;
 // Only relocate land-side sessions and their moored vessel. A saved offshore
 // trip keeps its coordinates, fish, equipment, credits and trip statistics.
 if(state.mode==='walk'){state.playerX=HARBOR.spawnX;state.playerZ=HARBOR.spawnZ;state.yaw=0;}
 if(state.moored||['stored','lowering','raising','attaching'].includes(state.launchStage)){
  state.boatX=HARBOR.boatX;state.boatZ=HARBOR.boatZ;state.heading=0;state.anchor=false;
 }
 state.harborRevision=HARBOR.revision;
 return true;
}
