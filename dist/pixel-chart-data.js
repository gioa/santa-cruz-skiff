import {bathymetry,elevationAtGPS} from './bathymetry.js?v=20260928-pixel-v75';
import {seafloorAtGPS} from './pixel-seafloor.js?v=20260928-pixel-v75';
import {fromGPS,onLand,onPier} from './pixel-geography.js?v=20260928-pixel-v75';
export const CHART_HOME=Object.freeze({lon:-122.015,lat:36.946,spanMeters:6000});
const EAST=111320*Math.cos(CHART_HOME.lat*Math.PI/180),NORTH=111132;
export const FEET_PER_METER=1/.3048;
export const BED_COLORS=Object.freeze({unknown:'#b1c5c4',sand:'#e4ce94',mud:'#acae96',mixed:'#9eaaa1',reef:'#756958',artificial:'#8a658d'});
export const BED_LABELS=Object.freeze({unknown:'底质资料空缺',sand:'沙底',mud:'细沙／泥底',mixed:'砂砾／混合底',reef:'岩礁／巨石',artificial:'人工硬底'});
export function chartMeters(lon,lat){return{x:(lon-CHART_HOME.lon)*EAST,y:(lat-CHART_HOME.lat)*NORTH};}
export function chartGPS(x,y){return{lon:CHART_HOME.lon+x/EAST,lat:CHART_HOME.lat+y/NORTH};}
export function chartProjection(view,width,height){
 return{
  screen:(lon,lat)=>{const p=chartMeters(lon,lat);return{x:width/2+(p.x-view.x)/view.mpp,y:height/2-(p.y-view.y)/view.mpp};},
  gps:(x,y)=>chartGPS(view.x+(x-width/2)*view.mpp,view.y-(y-height/2)*view.mpp),
 };
}
export function zoomChart(view,factor,point,width,height){
 const before=chartProjection(view,width,height).gps(point.x,point.y),anchor=chartMeters(before.lon,before.lat);
 const mpp=Math.max(1.5,Math.min(11000/width,view.mpp*factor));
 return{x:anchor.x-(point.x-width/2)*mpp,y:anchor.y+(point.y-height/2)*mpp,mpp};
}
export function chartSample(lon,lat){
 const p=fromGPS(lon,lat),land=onLand(p.x,p.z)||onPier(p.x,p.z),bed=seafloorAtGPS(lon,lat),elevation=elevationAtGPS(lon,lat);
 return{lon,lat,land,bed,depthMeters:!land&&Number.isFinite(elevation)&&elevation<0?-elevation:null,datum:bathymetry.datum};
}
// Marching squares on native NOAA samples. Never interpolate across NoData.
// Input rows run south-to-north; results are geographic coordinates, not pixels.
export function depthContours(grid,levelsFeet){
 const result=new Map(levelsFeet.map(ft=>[ft,[]])),dx=(grid.east-grid.west)/(grid.width-1),dy=(grid.north-grid.south)/(grid.height-1);
 for(let row=0;row<grid.height-1;row++)for(let col=0;col<grid.width-1;col++){
  const i=row*grid.width+col,e=[grid.values[i],grid.values[i+1],grid.values[i+grid.width+1],grid.values[i+grid.width]];
  if(e.some(v=>!Number.isFinite(v)))continue;
  const d=e.map(v=>-v),min=Math.min(...d),max=Math.max(...d),corners=[[col,row],[col+1,row],[col+1,row+1],[col,row+1]];
  for(const ft of levelsFeet){const level=ft*.3048;if(level<=min||level>max)continue;const hits=[];
   for(let a=0;a<4;a++){const b=(a+1)%4;if((d[a]<level)===(d[b]<level))continue;const t=(level-d[a])/(d[b]-d[a]);hits.push({edge:a,lon:grid.west+(corners[a][0]+t*(corners[b][0]-corners[a][0]))*dx,lat:grid.south+(corners[a][1]+t*(corners[b][1]-corners[a][1]))*dy});}
   if(hits.length===2)result.get(ft).push([hits[0],hits[1]]);
   else if(hits.length===4){
    // Resolve saddle cells using the bilinear center, without joining diagonals.
    const pairAdjacent=(d.reduce((a,b)=>a+b,0)/4>=level)===(d[0]>=level);
    for(const [a,b]of pairAdjacent?[[0,1],[2,3]]:[[0,3],[1,2]])result.get(ft).push([hits[a],hits[b]]);
   }
  }
 }
 return result;
}
export function depthColor(depth){
 if(!Number.isFinite(depth))return BED_COLORS.unknown;
 const ft=depth*FEET_PER_METER;
 return ft<20?'#d1e7df':ft<40?'#a9d5ce':ft<60?'#7fbdbf':ft<80?'#559cae':ft<100?'#397b96':'#285c7a';
}
