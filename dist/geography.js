import {loadData} from './data-url.js';
export const geography=await loadData('geography.json','Coast map unavailable');
const bearing=geography.axisBearingDegrees*Math.PI/180, sin=Math.sin(bearing),cos=Math.cos(bearing);
const eastPerDegree=111320*Math.cos(geography.rental.lat*Math.PI/180),northPerDegree=111132;
export const LOCAL_ORIGIN={x:-2.2,z:-56};
export function fromGPS(lon,lat){const e=(lon-geography.rental.lon)*eastPerDegree,n=(lat-geography.rental.lat)*northPerDegree;return{x:LOCAL_ORIGIN.x+e*cos-n*sin,z:LOCAL_ORIGIN.z-e*sin-n*cos};}
export function toGPS(x,z){x-=LOCAL_ORIGIN.x;z-=LOCAL_ORIGIN.z;return{lat:geography.rental.lat+(-x*sin-z*cos)/northPerDegree,lon:geography.rental.lon+(x*cos-z*sin)/eastPerDegree};}
export const coastLines=geography.coast.map(ring=>ring.map(p=>fromGPS(...p)));
export const pierRings=geography.pier.map(ring=>ring.map(p=>fromGPS(...p)));
export const buildingFootprints=geography.buildings.map(b=>({...b,points:b.outline.map(p=>fromGPS(...p))}));
export function insidePolygon(x,z,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)hit=!hit;}return hit;}
export function onPier(x,z){return pierRings.some(r=>insidePolygon(x,z,r));}
// OSM coast lines have land on the left. Close this local extract through inland north.
const inlandCorners=[fromGPS(-121.90,37.05),fromGPS(-122.12,37.05)];
export const landPolygons=coastLines.filter(r=>r.length>50).map(r=>[...r,...inlandCorners]);
export function onLand(x,z){return landPolygons.some(r=>insidePolygon(x,z,r));}
export function bearingDegrees(heading){return ((geography.axisBearingDegrees-heading*180/Math.PI)%360+360)%360;}
export const MAP_BOUNDS={minX:-4400,maxX:3900,minZ:-4700,maxZ:2600};
export const FISHING_SPOTS=[
 {name:'Wharf 西侧近岸',...fromGPS(-122.0233,36.9595),kind:'sand',depth:'NOAA 地形参考水深',species:'近岸混合鱼群 · 约 260 m'},
 {name:'Lighthouse Point 外侧',...fromGPS(-122.0288,36.9505),kind:'kelp',depth:'海带与岩礁参考区',species:'岩鱼 · 绿鳕类 · 约 1.4 km'},
 {name:'Main Beach 外侧',...fromGPS(-122.0118,36.9585),kind:'sand',depth:'近岸沙地参考区',species:'比目鱼 · 鲭鱼 · 约 850 m'},
 {name:'Black Point 外侧',...fromGPS(-121.9845,36.9515),kind:'reef',depth:'远处海岸地标',species:'混合鱼群 · 约 3.4 km'}
];
