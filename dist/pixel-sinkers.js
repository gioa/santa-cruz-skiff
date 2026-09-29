// Finite interchangeable sinkers. Values/prices are game inventory choices.
export const OUNCE_GRAMS=28.349523125;
export const SINKER_SIZES=Object.freeze([.5,1,2,3,4,6,8,12]);
export const SINKER_ITEMS=Object.freeze(SINKER_SIZES.map(oz=>Object.freeze({id:`sinker_${String(oz).replace('.','_')}oz`,slot:'consumable',name:`${oz} oz 铅坠`,price:Math.max(2,Math.round(oz*1.5)),kg:oz*OUNCE_GRAMS/1000,sinkerOz:oz,desc:'独立铅坠 · 每次兑换 1 枚；装卸会转移库存，断线会丢失'})));
export const separateSinker=rig=>['bottom','slider','dropper','sabiki','feather40'].includes(rig);
export const defaultSinkerOz=rig=>({bottom:3,slider:2,dropper:4,sabiki:1,feather40:4})[rig]??null;
export const validSinker=oz=>SINKER_SIZES.includes(oz);
export function rigWeight(rig,supply){return separateSinker(rig)?(validSinker(supply?.sinkerOz)?Math.round(supply.sinkerOz*OUNCE_GRAMS):6):rig==='jig'?42:rig==='sabiki6'?28:7;}
export function ensureSinkers(profile){
 const legacy=profile.sinkerVersion!==1;
 profile.sinkerStock=Object.fromEntries(SINKER_SIZES.map(oz=>[oz,Math.max(0,Math.floor(Number.isFinite(profile.sinkerStock?.[oz])?profile.sinkerStock[oz]:0))]));
 for(const [rig,stock] of Object.entries(profile.rigStock||{}))for(const s of stock)s.sinkerOz=separateSinker(rig)?validSinker(s.sinkerOz)?s.sinkerOz:legacy&&s.sinkerOz===undefined?defaultSinkerOz(rig):null:null;
 for(const s of Object.values(profile.rodSupplies||{}))if(s)s.sinkerOz=separateSinker(s.rig)?validSinker(s.sinkerOz)?s.sinkerOz:legacy&&s.sinkerOz===undefined?defaultSinkerOz(s.rig):null:null;
 profile.sinkerVersion=1;
 for(const item of SINKER_ITEMS)if(profile.sinkerStock[item.sinkerOz]>0&&!profile.owned.includes(item.id))profile.owned.push(item.id);
}
export function installSinker(profile,rodId,oz){
 ensureSinkers(profile);const supply=profile.rodSupplies?.[rodId];
 if(!supply||supply.condition<=.08&&oz!==null)return{ok:false,message:'先装上一套可用钓组。'};
 if(!separateSinker(supply.rig))return{ok:false,message:'这套钓组的铅头或浮漂配铅已固定，需整套更换。'};
 if(oz!==null&&!validSinker(oz))return{ok:false,message:'没有这种规格的铅坠。'};
 const old=supply.sinkerOz;if(old===oz)return{ok:true,message:''};
 if(oz!==null&&!(profile.sinkerStock[oz]>0))return{ok:false,message:'没有这枚铅坠，到小屋购买。'};
 if(oz!==null)profile.sinkerStock[oz]--;
 if(validSinker(old)){profile.sinkerStock[old]++;const item=SINKER_ITEMS.find(i=>i.sinkerOz===old);if(!profile.owned.includes(item.id))profile.owned.push(item.id);}
 supply.sinkerOz=oz;
 return{ok:true,message:oz===null?'铅坠已收回背包。':`已装上 ${oz} oz 铅坠${validSinker(old)?'，原铅坠收回背包':''}。`};
}
