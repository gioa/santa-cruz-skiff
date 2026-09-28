/** Forage aggregations. Radius, density and predator attendance are independent
 * simulation draws, not measured Monterey Bay school sizes/probabilities.
 * Forage links: NOAA northern anchovy species page and fishery management plan.
 * Influence multiplies existing habitat/month/presentation weights, never
 * bypassing substrate, depth, tackle, freshness or hook-size constraints. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,f=0)=>Number.isFinite(v)?v:f;
export function createBaitSchool(random,{depth=25,month=9,waterTemp=14}={}){
 const radius=3+Math.pow(random(),1.65)*15,density=.18+random()*.82,thickness=.6+random()*2.4;
 const centre=Math.min(Math.max(1,depth-1),1.3+random()*Math.min(7,depth*.3));
 const species=['anchovy-school','anchovy-school','anchovy-school','sardine-school','mackerel-school'][Math.min(4,Math.floor(random()*5))];
 const followers=[],eligible=[];
 if(depth>=18)eligible.push({kind:'salmon',weight:month>=3&&month<=8?1:.22,min:55,max:90});
 if(depth>=6&&waterTemp>=14&&month>=6&&month<=11)eligible.push({kind:'bonito',weight:.8,min:42,max:72});
 if(depth>=5&&depth<=55&&month>=5&&month<=10)eligible.push({kind:'seabass',weight:.28,min:65,max:115});
 const attendance=clamp(.12+density*.27+radius*.006,.12,.5);
 if(eligible.length&&random()<attendance){
  let ticket=random()*eligible.reduce((n,p)=>n+p.weight,0),selected=eligible.at(-1);
  for(const p of eligible){ticket-=p.weight;if(ticket<=0){selected=p;break;}}
  const count=1+(random()<density*.45?1:0);
  for(let i=0;i<count;i++)followers.push({kind:selected.kind,lengthCm:selected.min+random()*(selected.max-selected.min),phase:random()*Math.PI*2,offset:1.05+random()*.45});
 }
 return{species,radius,density,depth:centre,thickness,followers,visualFishCount:Math.round(12+radius*radius*density*.42)};
}
export function baitSchoolInfluence(schools,point,depth){
 const result={mackerel:1,salmon:1,bonito:1,seabass:1};
 if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z)||!Number.isFinite(depth)||depth<=.15)return result;
 for(const e of schools||[]){
  if(e.type!=='bait'||!Number.isFinite(e.x)||!Number.isFinite(e.z)||e.age>=e.duration)continue;
  const radius=clamp(finite(e.radius,8),1,18),density=clamp(finite(e.density,.5),0,1),distance=Math.hypot(point.x-e.x,point.z-e.z);
  if(distance>radius*2.5)continue;
  const fade=clamp(Math.min(finite(e.age,3)/3,(finite(e.duration,100)-finite(e.age))/6),0,1);
  const horizontal=Math.exp(-.5*(distance/radius)**2),vertical=Math.exp(-.5*((depth-finite(e.depth,3.4))/Math.max(.5,finite(e.thickness,1.3)))**2);
  const local=horizontal*vertical*density*fade;
  if(e.species==='mackerel-school')result.mackerel=Math.max(result.mackerel,1+5*local);
  for(const p of e.followers||[])if(p.kind in result)result[p.kind]=Math.max(result[p.kind],1+7*local);
 }
 return result;
}
export function followerPosition(e,f){
 const angle=finite(e.age)*.19+finite(f.phase),radius=finite(e.radius,8)*finite(f.offset,1.2);
 return{x:e.x+Math.cos(angle)*radius,z:e.z+Math.sin(angle)*radius*.7,heading:-angle,visible:Math.sin(finite(e.age)*.55+finite(f.phase))>.1};
}
