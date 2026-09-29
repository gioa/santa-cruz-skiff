/** Visible forage fish and catch candidates share these exact world positions.
 * Sizes, search radii and rates are bounded game approximations, not surveys.
 * NOAA species sources and CDFW 27.60 are recorded in docs/visible-baitfish.md.
 */
import {getRigProfile} from './fishing-rigs.js';
import {hookSizeFit} from './pixel-hook-size.js';
import {fishMassKg} from './pixel-fish-mass.js';
const finite=(v,f=0)=>Number.isFinite(v)?v:f,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SMALL_FISH=Object.freeze({
 'anchovy-school':{id:'anchovy',name:'北方鳀鱼',commonName:'Northern Anchovy',latin:'Engraulis mordax',color:'#a9cccb',min:8,max:15,baitfish:true},
 'sardine-school':{id:'sardine',name:'太平洋沙丁鱼',commonName:'Pacific Sardine',latin:'Sardinops sagax',color:'#9fbec1',min:12,max:23,baitfish:true},
 'mackerel-school':{id:'mackerel',name:'太平洋鲭鱼',commonName:'Pacific Mackerel',latin:'Scomber japonicus',color:'#73b8c1',min:15,max:26,baitfish:true},
});
export function schoolFish(school){
 const template=SMALL_FISH[school?.species];
 if(!template||school.type!=='bait'||school.age>=school.duration||!Number.isFinite(school.x)||!Number.isFinite(school.z))return[];
 const count=Math.round(clamp(finite(school.visualFishCount,24),0,160)),radius=clamp(finite(school.radius,8),1,18),removed=new Set(school.removedFish||[]),age=finite(school.age),fish=[];
 for(let slot=0;slot<count;slot++){
  if(removed.has(slot))continue;
  const phase=slot*2.399+age*.35,r=Math.sqrt((slot+.5)/Math.max(1,count));
  const fraction=((Math.imul(slot+1,1664525)+(finite(school.seed,1)>>>0))>>>0)%1000/1000;
  const length=Math.round((template.min+(template.max-template.min)*fraction)*10)/10;
  fish.push({...template,length,kg:fishMassKg(template,length),schoolId:school.id,schoolSlot:slot,
   x:school.x+Math.cos(phase)*r*radius,z:school.z+Math.sin(phase)*r*radius*.7,
   depth:Math.max(.25,finite(school.depth,3.4)+Math.sin(slot*1.7+age*.18)*finite(school.thickness,1.3)*.45),heading:phase+Math.PI/2});
 }
 return fish;
}
export function baitFishCandidates(schools,options={}){
 const p=options.point,depth=options.lureDepth;if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z)||!Number.isFinite(depth)||depth<=.15)return[];
 const rig=getRigProfile(options.rig),artificial=['sabiki','sabiki6','jig','feather40'].includes(rig.id);
 const action=clamp(Math.abs(finite(options.lureVerticalSpeedMps))/.45,0,1);
 const method=rig.id==='sabiki'||rig.id==='sabiki6'?.8+.6*action:artificial?.06+.12*action:.13;
 const candidates=[];
 for(const school of schools||[]){
  if(Math.hypot(school.x-p.x,school.z-p.z)>finite(school.radius,8)+4)continue;
  const fade=clamp(Math.min(finite(school.age)/3,(finite(school.duration)-finite(school.age))/6),0,1);
  for(const fish of schoolFish(school)){
   const horizontal=Math.hypot(fish.x-p.x,fish.z-p.z),vertical=Math.abs(fish.depth-depth);
   if(horizontal>3||vertical>1.5)continue;
   const fit=hookSizeFit(fish,rig),weight=5*Math.exp(-.5*(horizontal/1.4)**2-.5*(vertical/.65)**2)*method*fade*fit.mouthFit;
   if(weight>.00001)candidates.push({...fish,encounterWeight:weight});
  }
 }
 // A dense shoal does not guarantee an instant bite. Selection and timing use
 // the same weights; moving to the wrong layer cannot retain a hidden bonus.
 const sum=candidates.reduce((n,f)=>n+f.encounterWeight,0),scale=Math.min(1,16/Math.max(1e-9,sum));
 return candidates.map(f=>({...f,encounterWeight:f.encounterWeight*scale}));
}
