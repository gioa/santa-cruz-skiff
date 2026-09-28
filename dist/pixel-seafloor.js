import {toGPS} from './pixel-geography.js?v=20260928-pixel-v60';
// Categories are sampled, never interpolated. Unknown coastal strips remain
// unknown instead of borrowing substrate from the nearest named waypoint.
export const seafloor=await fetch(new URL('./data/seafloor.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Seafloor map unavailable');return r.json();});
export function seafloorAtGPS(lon,lat){
 const b=seafloor,u=(lon-b.west)/(b.east-b.west),v=(b.north-lat)/(b.north-b.south);
 const inside=Number.isFinite(u)&&Number.isFinite(v)&&u>=0&&v>=0&&u<1&&v<1;
 const col=inside?Math.floor(u*b.width):-1,row=inside?Math.floor(v*b.height):-1;
 const code=inside?(b.rows[row]?.[col]||'0'):'0',entry=b.classes[code]||b.classes['0'];
 return{...entry,code:Number(code),mapped:code!=='0',resolutionMeters:b.cellSizeMetersApprox,source:b.source,sourceUrl:b.sourceUrl};
}
export function seafloorAt(x,z){const p=toGPS(x,z);return seafloorAtGPS(p.lon,p.lat);}

// Local first-person accounts archived by CDFW describe sand around the middle
// wharf, and sand plus accumulated structure at the outer fishing wells. These
// deliberately narrow gameplay context zones are not extra USGS measurements.
export function fishingHabitatAt(x,z){
 const bed=seafloorAt(x,z),wharfSand=Math.abs(x)<110&&z>-410&&z<90;
 const outerPiles=z>-500&&z<-330&&((x>-46&&x<-27)||(x>22&&x<40));
 if(outerPiles)return{...bed,bottomKind:bed.kind,kind:'mixed',contextual:true,context:'outer-wharf-piles',contextSource:'https://www.pierfishing.com/santa-cruz-wharf/'};
 if(!bed.mapped&&wharfSand)return{...bed,kind:'sand',label:'码头近岸沙底（文字资料推定）',contextual:true,context:'middle-wharf-sand',contextSource:'https://www.pierfishing.com/santa-cruz-wharf/'};
 return{...bed,contextual:false};
}
