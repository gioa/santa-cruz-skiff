import {getShoreScene} from './shore-data.js';

const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const finite=(value,fallback)=>Number.isFinite(value)?value:fallback;

// Shore world coordinates are pixels. Capture the actual deployed-line length
// at the strike so a diagonal cast or dry-sand offset cannot teleport the fish.
// The target remains fixed during a fight; line travel moves the fish toward
// the rod on either the beach or pier, not toward the geographic coastline.
export function shoreFishPosition(sceneId,state={}){
  const scene=getShoreScene(sceneId),player=state.player||scene.spawn,cast=state.cast;
  const origin=cast?.origin||{x:player.x,y:player.y-18};
  const target=cast?.target||{x:player.x,y:scene.shoreY(player.x)-32};
  const baseline=Math.max(1,finite(cast?.fightDistance,finite(cast?.distance,1)));
  const fraction=clamp(finite(state.lineDistance,baseline)/baseline,.025,1.5);
  const x=origin.x+(target.x-origin.x)*fraction;
  return{x,y:Math.min(scene.shoreY(x)-3.2,origin.y+(target.y-origin.y)*fraction)};
}
