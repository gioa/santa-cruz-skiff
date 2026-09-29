import {toGPS} from './geography.js';
import {loadData} from './data-url.js';
// Browsers show the title screen first and fetch this 1.4 MB grid in the
// background (starting a trip waits for bathymetryReady). Node loads it up front.
export let bathymetry=null;
export const bathymetryReady=typeof window==='undefined'?Promise.resolve(bathymetry=await loadData('bathymetry.json','Bathymetry data missing')):loadData('bathymetry.json','Bathymetry data missing').then(data=>(bathymetry=data));
export function elevationAtGPS(lon,lat){const b=bathymetry;if(!b)return null;const u=(lon-b.west)/(b.east-b.west)*(b.width-1),v=(lat-b.south)/(b.north-b.south)*(b.height-1);if(u<0||v<0||u>b.width-1||v>b.height-1)return null;const x=Math.min(b.width-2,Math.floor(u)),y=Math.min(b.height-2,Math.floor(v)),fx=u-x,fy=v-y;const q=[b.values[y*b.width+x],b.values[y*b.width+x+1],b.values[(y+1)*b.width+x],b.values[(y+1)*b.width+x+1]];if(q.some(n=>n===null||!Number.isFinite(n)))return null;return(q[0]*(1-fx)+q[1]*fx)*(1-fy)+(q[2]*(1-fx)+q[3]*fx)*fy;}
export function elevationAt(x,z){const p=toGPS(x,z);return elevationAtGPS(p.lon,p.lat);}
export function depthInfoAt(x,z){const e=elevationAt(x,z);return{value:e===null?null:Math.max(0,-e),datum:bathymetry?.datum,source:bathymetry?.source,resolutionMeters:bathymetry?.resolutionMeters,measured:e!==null};}
// Unknown cells use a simulation fallback internally, always disclosed by depthInfoAt.
export function depthAt(x,z){return depthInfoAt(x,z).value??12;}
