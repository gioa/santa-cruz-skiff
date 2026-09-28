import {createHarborLayout} from './harbor-layout.js?v=20260927-pixel-v22';
import {onPier,onLand,insidePolygon,buildingFootprints} from './pixel-geography.js?v=20260927-pixel-v22';

export {HARBOR,BOARDING_WALK_PATH,harborObstacleRings,harborWaterBlocked,migrateHarborSave} from './harbor-layout.js?v=20260927-pixel-v22';
export const {walkHeight,walkAllowed,walkBlocked,canBoardFrom,clearWalkSegment}=createHarborLayout({onPier,onLand,insidePolygon,buildingFootprints});
