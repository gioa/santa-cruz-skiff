// Public shore conditions use California civil time. Physics still advances
// in active seconds; a paused tab never fast-forwards a cast or fish fight.
export const SHORE_WORLD_VERSION=1;
export const SHORE_TIME_ZONE='America/Los_Angeles';
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:SHORE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
let cachedSecond=null,cachedParts=null;
export function shoreDayHash(...parts){
 let h=2166136261;for(const c of ['shore-world-v1',...parts].join('|'))h=Math.imul(h^c.charCodeAt(0),16777619);
 h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return(h^(h>>>16))>>>0;
}
export const shoreDayUnit=(...parts)=>(shoreDayHash(...parts)+.5)/4294967296;
export function shoreWorldTime(instant=new Date()){
 const ms=instant instanceof Date?instant.getTime():Number(instant);
 if(!Number.isFinite(ms))throw new TypeError('Shared shore clock requires a valid instant');
 const second=Math.floor(ms/1000);
 if(second!==cachedSecond){cachedSecond=second;cachedParts=Object.fromEntries(formatter.formatToParts(new Date(second*1000)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));}
 const p=cachedParts,date=`${p.year}-${p.month}-${p.day}`,timeSeconds=Number(p.hour)*3600+Number(p.minute)*60+Number(p.second)+(ms-second*1000)/1000;
 return{version:SHORE_WORLD_VERSION,date,timeSeconds,instantMs:ms,
  // Continuous epoch seconds avoid a wave/tide reset at midnight or DST.
  environmentSeconds:ms/1000,clock:`${p.hour}:${p.minute}`};
}
export function shoreWorldCalendar(world){return new Date(Date.parse(world.date+'T00:00:00Z')+world.timeSeconds*1000);}
