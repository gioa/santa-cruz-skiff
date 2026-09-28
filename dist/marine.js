export const marine=await fetch(new URL('./data/marine.json',import.meta.url)).then(r=>r.json()).catch(()=>({errors:['snapshot unavailable']}));
import {surfaceCurrentConditions} from './surface-current.js?v=20260927-pixel-v48';
export const sea={mode:'real',windKnots:0,windDirection:315,waveHeight:0,period:9,waveDirection:294,waterTemp:14,tideMLLW:null,fresh:false,daylight:.1,clockMode:'morning',customHour:8};
export function localDateParts(date=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
export function clockText(date=new Date()){const p=localDateParts(date);return `${p.hour}:${p.minute}:${p.second}`;}
function localHourOnDate(date,hour){const p=localDateParts(date),utcNoon=new Date(`${p.year}-${p.month}-${p.day}T20:00:00Z`),offset=20-Number(localDateParts(utcNoon).hour);return new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),hour+offset));}
let morningStart=localHourOnDate(new Date(),6).getTime(),clockSeconds=0;
export function resetTripClock(date=new Date()){morningStart=localHourOnDate(date,6).getTime();clockSeconds=0;}
export function advanceTripClock(dt){if(Number.isFinite(dt)&&dt>0)clockSeconds+=dt;}
export function gameDate(now=new Date()){return sea.clockMode==='morning'?new Date(morningStart+clockSeconds*1000):now;}
function observation(station,key){return marine[station]?.values?.[key];}
export function updateSea(now=Date.now()){
 const wind=observation('46042','WSPD'),wave=observation('46236','WVHT');
 sea.fresh=Boolean(wind&&wave&&now-Date.parse(wind.observedAt)<6*3600e3&&now-Date.parse(wave.observedAt)<6*3600e3&&now>=Date.parse(wave.observedAt)&&now>=Date.parse(wind.observedAt));
 if(sea.mode==='real'){
  Object.assign(sea,surfaceCurrentConditions(marine.surfaceCurrent,now));
  sea.windKnots=(wind?.value??0)*1.94384;sea.windDirection=observation('46042','WDIR')?.value??315;
  sea.waveHeight=wave?.value??0;sea.period=observation('46236','DPD')?.value??9;sea.waveDirection=observation('46236','MWD')?.value??294;sea.waterTemp=observation('46236','WTMP')?.value??14;
 }
 const points=marine.tide?.predictions||[];sea.tideMLLW=null;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],ta=Date.parse(a.t.replace(' ','T')+'Z'),tb=Date.parse(b.t.replace(' ','T')+'Z');if(now>=ta&&now<=tb){const t=(now-ta)/(tb-ta),smooth=(1-Math.cos(t*Math.PI))/2;sea.tideMLLW=Number(a.v)+(Number(b.v)-Number(a.v))*smooth;break;}}
 return sea;
}
// Solar position uses NOAA's fractional-year approximation, not an accelerated game clock.
export function solarPosition(date=new Date(),lat=36.9605644,lon=-122.0207135){
 date=sea.clockMode==='custom'?localHourOnDate(date,sea.customHour):gameDate(date);
 const year=date.getUTCFullYear(),day=Math.floor((date-Date.UTC(year,0,0))/864e5),hour=date.getUTCHours()+date.getUTCMinutes()/60;
 const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/864e5;const gamma=2*Math.PI/days*(day-1+(hour-12)/24);
 const eq=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
 const dec=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 const hourAngle=((hour*60+eq+4*lon)/4-180)*Math.PI/180,phi=lat*Math.PI/180;
 const up=Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(hourAngle);
 const east=-Math.cos(dec)*Math.sin(hourAngle),north=Math.cos(phi)*Math.sin(dec)-Math.sin(phi)*Math.cos(dec)*Math.cos(hourAngle);
 return {east,north,up,altitude:Math.asin(Math.max(-1,Math.min(1,up)))};
}
export function marineSummary(){const updated=marine['46236']?.values?.WVHT?.observedAt;return{label:sea.mode==='real'?(sea.fresh?'NOAA 区域观测':'历史观测 / 非实时'):'自定义海况',currentStatus:sea.currentStatus,currentObservedAt:sea.currentObservedAt,currentSource:sea.currentSource,waveHeight:sea.waveHeight,period:sea.period,windKnots:sea.windKnots,waterTemp:sea.waterTemp,observedAt:updated||null,waveStation:marine['46236']?.name,stationDistanceKm:marine['46236']?.distanceKm,tideMLLW:sea.tideMLLW,tideStatus:sea.tideMLLW===null?'无可用预报':'现实时间 · 高低潮之间近似插值 · MLLW',clock:sea.clockMode==='morning'?'06:00 开始 · 1:1 航程时间':'America/Los_Angeles · 1:1',lighting:sea.clockMode==='morning'?'航程昼夜':sea.clockMode==='real'?'真实昼夜':'自定义晨光'};}
updateSea();

// Same-origin snapshot refresh; failed updates retain the original observation timestamps.
if(typeof window!=='undefined')setInterval(async()=>{try{const response=await fetch(new URL('./data/marine.json',import.meta.url),{cache:'no-store'});if(!response.ok)return;const next=await response.json();if(next['46236']){Object.assign(marine,next);updateSea();}}catch{}},600000);
