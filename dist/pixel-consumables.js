import {USABLE_CONDITION,wearFishingSupply} from './fishing-supply-wear.js?v=species-1';
import {ensureSinkers,validSinker,rigWeight,SINKER_SIZES,OUNCE_GRAMS} from './pixel-sinkers.js?v=20260928-pixel-v80';
/** Finite, persistent physical supplies. Rates and wear are game tuning.
 * Bait portions are numeric stock; spare rigs hold their own condition and bait.
 * Casting never installs supplies. Only explicit replacements transfer stock.
 */
export const CONSUMABLES_VERSION=1;
export const RIG_IDS=Object.freeze(['bottom','slider','jig','float','dropper','sabiki','feather40']);
export const BAIT_IDS=Object.freeze(['squid','anchovy','shrimp','sardine','jig']);
export {USABLE_CONDITION};
const ROD_IDS=['rod','rod_light','rod_boat','rod_electric'];
const RIG_ITEMS={bottom:'tackle',slider:'rig_slider',jig:'rig_jig',float:'rig_float',dropper:'rig_dropper',sabiki:'rig_sabiki',feather40:'rig_feather40'};
const clone=x=>x==null?null:JSON.parse(JSON.stringify(x));
const bounded=v=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
const cleanBait=b=>b&&BAIT_IDS.includes(b.kind)?{kind:b.kind,condition:bounded(b.condition)}:null;
const cleanSpare=r=>r&&typeof r==='object'?{condition:bounded(r.condition),hookDamage:bounded(r.hookDamage),bait:cleanBait(r.bait),...(r.sinkerOz!==undefined?{sinkerOz:r.sinkerOz}:{})}:null;
export const rigRequiresBait=rig=>!['sabiki','feather40'].includes(rig);
export function starterConsumables(){return{sinkerVersion:1,sinkerStock:{1:2,2:2,3:1,4:1},consumablesVersion:CONSUMABLES_VERSION,rigStock:Object.fromEntries(RIG_IDS.map(id=>[id,id==='bottom'?[{condition:1,hookDamage:0,bait:null,sinkerOz:3},{condition:1,hookDamage:0,bait:null,sinkerOz:3}]:[]])),rodSupplies:{rod:{rig:'bottom',sinkerOz:3,condition:1,hookDamage:0,bait:{kind:'squid',condition:1}}}};}
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
 profile.rigStock=Object.fromEntries(RIG_IDS.map(id=>[id,Array.isArray(profile.rigStock?.[id])?profile.rigStock[id].map(cleanSpare).filter(r=>r&&r.condition>USABLE_CONDITION&&r.hookDamage<1):[]]));
 profile.rodSupplies??={};
 for(const rod of ROD_IDS.filter(id=>profile.owned?.includes(id))){const old=profile.rodSupplies[rod];if(old&&RIG_IDS.includes(old.rig)&&bounded(old.hookDamage)<1){old.condition=bounded(old.condition);old.hookDamage=bounded(old.hookDamage);if(old.bait&&BAIT_IDS.includes(old.bait.kind))old.bait.condition=bounded(old.bait.condition);else old.bait=null;}else profile.rodSupplies[rod]=null;}
 for(const bait of BAIT_IDS)profile.stock[bait]=Math.max(0,Math.floor(Number.isFinite(profile.stock?.[bait])?profile.stock[bait]:0));
 ensureSinkers(profile);return profile.rodSupplies;
}
export function consumableStatus(profile,rodId=profile.loadout?.rod){
 ensureConsumables(profile);const supply=profile.rodSupplies[rodId];
 return{rig:{id:supply?.rig||profile.rodLoadouts?.[rodId]?.rig||'bottom',condition:supply?.condition||0,hookDamage:supply?.hookDamage||0,present:Boolean(supply)},bait:clone(supply?.bait),sinkerOz:supply?.sinkerOz??null,sinkerStock:{...profile.sinkerStock},requiresBait:rigRequiresBait(supply?.rig||profile.rodLoadouts?.[rodId]?.rig||'bottom'),rigStock:Object.fromEntries(RIG_IDS.map(id=>[id,profile.rigStock[id].length])),baitStock:{...profile.stock}};
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
 if(old&&old.condition>USABLE_CONDITION)profile.rigStock[old.rig].push({condition:old.condition,hookDamage:old.hookDamage,bait:clone(old.bait),sinkerOz:old.sinkerOz});
 if(old&&old.condition<=USABLE_CONDITION&&validSinker(old.sinkerOz))profile.sinkerStock[old.sinkerOz]++;
 profile.rodSupplies[rodId]={rig,condition:next.condition,hookDamage:next.hookDamage,bait:clone(next.bait),sinkerOz:next.sinkerOz};
 ensureSinkers(profile);return{ok:true,message:old&&old.condition>USABLE_CONDITION?'已更换整套钓组，原钓组与鱼饵收回背包。':'已装上备用钓组。'};
}
export function loseRig(profile,rodId){ensureConsumables(profile);profile.rodSupplies[rodId]=null;if(profile.rodLoadouts?.[rodId])profile.rodLoadouts[rodId].weightGrams=rigWeight(profile.rodLoadouts[rodId].rig,null);}
export function damageSupplies(profile,rodId,event){wearFishingSupply(profile.rodSupplies?.[rodId],event);}
export function suppliesWeight(profile,packed){
 const carry=new Set(packed);let total=0;
 if(carry.has('tackle'))for(const [id,stock] of Object.entries(profile.rigStock||{}))for(const rig of stock)total+=rigWeight(id,rig)/1000+.018*Number(Boolean(rig.bait));
 for(const [rod,supply] of Object.entries(profile.rodSupplies||{}))if(carry.has(rod)&&supply)total+=rigWeight(supply.rig,supply)/1000+.018*Number(Boolean(supply.bait));
 if(carry.has('tackle'))for(const oz of SINKER_SIZES)total+=(profile.sinkerStock?.[oz]||0)*oz*OUNCE_GRAMS/1000;
 return total;
}
