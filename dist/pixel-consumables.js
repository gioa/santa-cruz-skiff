/** Finite, persistent physical supplies. Rates and wear are game tuning.
 * Bait portions are numeric stock; spare rigs hold their own condition and bait.
 * Casting never installs supplies. Only explicit replacements transfer stock.
 */
export const CONSUMABLES_VERSION=1;
export const RIG_IDS=Object.freeze(['bottom','slider','jig','float','dropper','sabiki']);
export const BAIT_IDS=Object.freeze(['squid','anchovy','shrimp','sardine','jig']);
export const USABLE_CONDITION=.08;
const ROD_IDS=['rod','rod_light','rod_boat'];
const RIG_ITEMS={bottom:'tackle',slider:'rig_slider',jig:'rig_jig',float:'rig_float',dropper:'rig_dropper',sabiki:'rig_sabiki'};
const clone=x=>x==null?null:JSON.parse(JSON.stringify(x));
const bounded=v=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
const cleanBait=b=>b&&BAIT_IDS.includes(b.kind)?{kind:b.kind,condition:bounded(b.condition)}:null;
const cleanSpare=r=>r&&typeof r==='object'?{condition:bounded(r.condition),bait:cleanBait(r.bait)}:null;
export const rigRequiresBait=rig=>rig!=='sabiki';
export function starterConsumables(){return{consumablesVersion:CONSUMABLES_VERSION,rigStock:Object.fromEntries(RIG_IDS.map(id=>[id,id==='bottom'?[{condition:1,bait:null},{condition:1,bait:null}]:[]])),rodSupplies:{rod:{rig:'bottom',condition:1,bait:{kind:'squid',condition:1}}}};}
export function ensureConsumables(profile,legacy={}){
 if(profile.consumablesVersion!==CONSUMABLES_VERSION){
  const rigs=Object.fromEntries(RIG_IDS.map(id=>[id,[]])),supplies={},mounted=new Set();
  for(const rod of ROD_IDS.filter(id=>profile.owned?.includes(id))){
   const a=profile.rodLoadouts?.[rod]||{rig:'bottom',bait:'squid'};
   const bait=legacy.rodBaitOnHooks?.[rod]??(rod===profile.loadout?.rod?legacy.baitOnHook:null);
   supplies[rod]={rig:a.rig,condition:1,bait:cleanBait(bait)};mounted.add(a.rig);
  }
  rigs.bottom=[{condition:1,bait:null},{condition:1,bait:null}];
  for(const id of RIG_IDS)if(id!=='bottom'&&profile.owned?.includes(RIG_ITEMS[id])&&!mounted.has(id))rigs[id].push({condition:1,bait:null});
  profile.rigStock=rigs;profile.rodSupplies=supplies;profile.consumablesVersion=CONSUMABLES_VERSION;
 }
 profile.rigStock=Object.fromEntries(RIG_IDS.map(id=>[id,Array.isArray(profile.rigStock?.[id])?profile.rigStock[id].map(cleanSpare).filter(r=>r&&r.condition>USABLE_CONDITION):[]]));
 profile.rodSupplies??={};
 for(const rod of ROD_IDS.filter(id=>profile.owned?.includes(id))){const old=profile.rodSupplies[rod];if(old&&RIG_IDS.includes(old.rig)){old.condition=bounded(old.condition);if(old.bait&&BAIT_IDS.includes(old.bait.kind))old.bait.condition=bounded(old.bait.condition);else old.bait=null;}else profile.rodSupplies[rod]=null;}
 for(const bait of BAIT_IDS)profile.stock[bait]=Math.max(0,Math.floor(Number.isFinite(profile.stock?.[bait])?profile.stock[bait]:0));
 return profile.rodSupplies;
}
export function consumableStatus(profile,rodId=profile.loadout?.rod){
 ensureConsumables(profile);const supply=profile.rodSupplies[rodId];
 return{rig:{id:supply?.rig||profile.rodLoadouts?.[rodId]?.rig||'bottom',condition:supply?.condition||0,present:Boolean(supply)},bait:clone(supply?.bait),requiresBait:rigRequiresBait(supply?.rig||profile.rodLoadouts?.[rodId]?.rig||'bottom'),rigStock:Object.fromEntries(RIG_IDS.map(id=>[id,profile.rigStock[id].length])),baitStock:{...profile.stock}};
}
export function installBait(profile,rodId,bait){
 ensureConsumables(profile);const supply=profile.rodSupplies[rodId];
 if(!supply||supply.condition<=USABLE_CONDITION)return{ok:false,message:'先装上一套可用钓组。'};
 if(!BAIT_IDS.includes(bait)||!(profile.stock[bait]>0))return{ok:false,message:'这种鱼饵用完了，到小屋补给。'};
 profile.stock[bait]--;supply.bait={kind:bait,condition:1};
 return{ok:true,message:'已换上新饵。'};
}
export function installRig(profile,rodId,rig){
 ensureConsumables(profile);if(!ROD_IDS.includes(rodId)||!profile.owned.includes(rodId))return{ok:false,message:'还没有这根船竿。'};
 if(!RIG_IDS.includes(rig)||!profile.rigStock[rig].length)return{ok:false,message:'没有备用钓组，到小屋补给。'};
 const next=profile.rigStock[rig].shift(),old=profile.rodSupplies[rodId];
 if(old&&old.condition>USABLE_CONDITION)profile.rigStock[old.rig].push({condition:old.condition,bait:clone(old.bait)});
 profile.rodSupplies[rodId]={rig,condition:next.condition,bait:clone(next.bait)};
 return{ok:true,message:old&&old.condition>USABLE_CONDITION?'已更换整套钓组，原钓组与鱼饵收回背包。':'已装上备用钓组。'};
}
export function loseRig(profile,rodId){ensureConsumables(profile);profile.rodSupplies[rodId]=null;}
export function damageSupplies(profile,rodId,event){
 const supply=profile.rodSupplies?.[rodId];if(!supply)return;
 // Soft plastic survives several fish; natural bait is eaten/torn and must be
 // replaced after a landed fish. A missed bite can leave usable natural bait.
 if(supply.bait){const soft=supply.bait.kind==='jig',loss=event==='bite'?(soft?.025:.15):event==='catch'?(soft?.23:1):event==='escape'?(soft?.14:.28):0;supply.bait.condition=Math.max(0,supply.bait.condition-loss);}
 if(event==='catch')supply.condition=Math.max(0,supply.condition-.025);
}
export function suppliesWeight(profile,packed){
 const carry=new Set(packed),mass={bottom:.085,slider:.057,jig:.042,float:.007,dropper:.113,sabiki:.028};let total=0;
 if(carry.has('tackle'))for(const [id,stock] of Object.entries(profile.rigStock||{}))for(const rig of stock)total+=(mass[id]||.05)+.018*Number(Boolean(rig.bait));
 for(const [rod,supply] of Object.entries(profile.rodSupplies||{}))if(carry.has(rod)&&supply)total+=(mass[supply.rig]||.05)+.018*Number(Boolean(supply.bait));
 return total;
}
