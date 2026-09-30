// California ocean sport-fishing rules for the shore species at Pacifica and
// Half Moon Bay (north of Point Sur and Pigeon Point), from the CDFW 2026 Ocean
// Sport Fishing Regulations booklet (2026-07-17). Same numbers as the in-game
// handbook (regulations-book.js). Enforcement, fines and confiscation are game
// rules shared with Santa Cruz: 100 points per violating fish and the whole
// carried catch is confiscated when anything is wrong.
export const SHORE_RULES=Object.freeze({
 surfperch:Object.freeze({minimumCm:0,speciesBag:10,group:'surfperch',law:'T14 CCR §28.59'}),
 striped_bass:Object.freeze({minimumCm:18*2.54,speciesBag:2,law:'T14 CCR §27.85'}),
 halibut:Object.freeze({minimumCm:22*2.54,speciesBag:2,law:'T14 CCR §28.15'}),
 white_croaker:Object.freeze({minimumCm:0,speciesBag:10,law:'T14 CCR §27.60(a)'}),
 jacksmelt:Object.freeze({minimumCm:0,speciesBag:null,unlimited:true,law:'T14 CCR §27.60(b)'}),
 // Surfperch (§28.59): 20 combined (shiner excluded), no more than 10 of one
 // species; redtail 10.5 in minimum. Shiner perch have their own limit of 20,
 // taken in addition to the general 20-finfish limit.
 redtail_surfperch:Object.freeze({minimumCm:10.5*2.54,speciesBag:10,group:'surfperch',law:'T14 CCR §28.59'}),
 calico_surfperch:Object.freeze({minimumCm:0,speciesBag:10,group:'surfperch',law:'T14 CCR §28.59'}),
 silver_surfperch:Object.freeze({minimumCm:0,speciesBag:10,group:'surfperch',law:'T14 CCR §28.59'}),
 walleye_surfperch:Object.freeze({minimumCm:0,speciesBag:10,group:'surfperch',law:'T14 CCR §28.59'}),
 pile_perch:Object.freeze({minimumCm:0,speciesBag:10,group:'surfperch',law:'T14 CCR §28.59'}),
 striped_seaperch:Object.freeze({minimumCm:0,speciesBag:10,group:'surfperch',law:'T14 CCR §28.59'}),
 shiner_perch:Object.freeze({minimumCm:0,speciesBag:20,separate:true,law:'T14 CCR §28.59(c)(2)'}),
});
export const SHORE_GROUP_BAGS=Object.freeze({surfperch:20});
export const GENERAL_FINFISH_BAG=20;
export const FINE_PER_FISH=100;

// Daily bag counts every fish kept on its capture date, including fish that
// were later sold or confiscated. Only fish still carried can be inspected.
export function assessShoreCatch(carried=[],keptLog=[],sceneId='pacifica'){
 const findings=[],flagged=new Set(),byDate=new Map();
 const order=[...keptLog].filter(k=>k&&typeof k.date==='string').sort((a,b)=>a.catchId-b.catchId);
 for(const k of order){const day=byDate.get(k.date)||{species:{},group:{},general:0};byDate.set(k.date,day);
  const rule=k.species==='chinook_salmon'&&sceneId==='benicia'?{speciesBag:2,separate:true}:SHORE_RULES[k.species];if(!rule)continue;
  const n=day.species[k.species]=(day.species[k.species]||0)+1;
  const g=rule.group?day.group[rule.group]=(day.group[rule.group]||0)+1:0;
  const general=rule.unlimited||rule.separate?day.general:++day.general;
  const fish=carried.find(f=>f.catchId===k.catchId);if(!fish)continue;
  if(rule.speciesBag!=null&&n>rule.speciesBag){findings.push({catchId:fish.catchId,code:'daily_species_bag',category:'bag',actual:n,maximum:rule.speciesBag,date:k.date});flagged.add(fish.catchId);}
  else if(rule.group&&g>SHORE_GROUP_BAGS[rule.group]){findings.push({catchId:fish.catchId,code:'daily_group_bag',category:'bag',actual:g,maximum:SHORE_GROUP_BAGS[rule.group],date:k.date});flagged.add(fish.catchId);}
  else if(!rule.unlimited&&!rule.separate&&general>GENERAL_FINFISH_BAG){findings.push({catchId:fish.catchId,code:'daily_general_bag',category:'bag',actual:general,maximum:GENERAL_FINFISH_BAG,date:k.date});flagged.add(fish.catchId);}
 }
 for(const fish of carried){
  if(fish.id==='chinook_salmon'&&sceneId==='benicia'){
   const date=fish.caughtDate||keptLog.find(k=>k.catchId===fish.catchId)?.date||'',md=date.slice(5);
   if(!date.startsWith('2026-')||md<'07-16'||md>'12-16')findings.push({catchId:fish.catchId,code:'salmon_closed',date});
   if(carried.filter(f=>f.id==='chinook_salmon').indexOf(fish)>=4)findings.push({catchId:fish.catchId,code:'salmon_possession',maximum:4});
  }
  const rule=SHORE_RULES[fish.id];
  if(sceneId==='benicia'&&rule?.speciesBag!=null&&carried.filter(f=>f.id===fish.id).indexOf(fish)>=rule.speciesBag)findings.push({catchId:fish.catchId,code:'possession_species',maximum:rule.speciesBag});
  if(rule?.minimumCm>0&&Number.isFinite(fish.length)&&fish.length<rule.minimumCm)findings.push({catchId:fish.catchId,code:'undersize',category:'size',actualCm:fish.length,minimumCm:rule.minimumCm});
 }
 const violating=new Set(findings.map(f=>f.catchId));
 return{findings,violatingFish:violating.size,fine:violating.size*FINE_PER_FISH};
}
const inches=cm=>(cm/2.54).toFixed(1).replace(/\.0$/,'');
export function shoreFindingDetail(f){
 if(f.code==='possession_species')return `当前携带该鱼种超过持有量上限 ${f.maximum} 尾；跨日留鱼也计入持有量。`;
 if(f.code==='salmon_closed')return `Benicia 属 Knights Landing—Carquinez Bridge 河段。2026 帝王鲑开放 7/16–12/16；本鱼记录日期 ${f.date} 不在已核实开放期内（§7.40(b)(80)(E)）。`;
 if(f.code==='salmon_possession')return '本河段帝王鲑持有量限 4 尾，当前携带数量超额（§7.40）。';
 if(f.code==='undersize')return `实测全长 ${inches(f.actualCm)} in；最低允许 ${inches(f.minimumCm)} in。`;
 const label={daily_species_bag:'该鱼种每日限额',daily_group_bag:'海鲫类合计每日限额',daily_general_bag:'每日 20 条鱼类总限额'}[f.code]||'每日限额';
 return `${label}：${f.date} 已留 ${f.actual} 尾，限额 ${f.maximum} 尾。`;
}
