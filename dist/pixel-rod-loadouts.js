import {GEAR_CATALOG} from './equipment.js?v=20260927-pixel-v28';
import {RIG_PROFILES} from './fishing-rigs.js?v=20260927-pixel-v28';
import {ensureConsumables,installBait,installRig,USABLE_CONDITION} from './pixel-consumables.js?v=20260927-pixel-v28';
import {formatDepth} from './units.js?v=20260927-pixel-v28';

/** Rod hardware is a premade set. Legacy mounted upgrades are preserved but
 * cannot be edited. Terminal rigs and bait are finite separate supplies. */
export const ROD_LOADOUTS_VERSION=2;
export const ROD_IDS=Object.freeze(GEAR_CATALOG.filter(g=>g.slot==='rod').map(g=>g.id));
export const BASE_ROD_ASSEMBLY=Object.freeze({reel:null,line:null,leader:null,rig:'bottom',bait:'squid',weightGrams:85,drag:.48,fishingDepthMeters:null});
export const ROD_ASSEMBLY_SLOTS=Object.freeze([
 {key:'rig',name:'预组装钓组',iconId:'tackle'},
 {key:'bait',name:'鱼饵',iconId:'bait'},
].map(Object.freeze));
const ITEMS=new Map(GEAR_CATALOG.map(g=>[g.id,g]));
const HARDWARE=['reel','line','leader'];
const BAITS=Object.freeze({squid:{name:'鱿鱼条',iconId:'bait'},anchovy:{name:'鳀鱼饵',iconId:'bait_anchovy'},shrimp:{name:'虾饵',iconId:'bait_shrimp'},sardine:{name:'沙丁鱼饵',iconId:'bait_sardine'},jig:{name:'软饵',iconId:'bait_soft'}});
const BASIC_NAMES={reel:'基础绕线轮',line:'20 lb 拉力尼龙主线',leader:'15 lb 拉力前导线'};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const finite=(n,fallback)=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
const record=v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const owns=(profile,id)=>Array.isArray(profile?.owned)&&profile.owned.includes(id);
const ownedRods=profile=>ROD_IDS.filter(id=>owns(profile,id));
const rigItem=rig=>RIG_PROFILES[rig]?.item;
const fail=message=>({ok:false,message,assembly:null,transferred:[]});
function defaultsForRig(rig){const r=RIG_PROFILES[rig];return{weightGrams:r.defaultWeightGrams,fishingDepthMeters:r.defaultFishingDepth??null};}
function normalizeAssembly(profile,raw={}){
 const assembly={...BASE_ROD_ASSEMBLY};
 for(const slot of HARDWARE)if(raw[slot]===null||owns(profile,raw[slot])&&ITEMS.get(raw[slot])?.slot===slot)assembly[slot]=raw[slot];
 if(Object.hasOwn(RIG_PROFILES,raw.rig)&&owns(profile,rigItem(raw.rig)))assembly.rig=raw.rig;
 if(Object.hasOwn(BAITS,raw.bait))assembly.bait=raw.bait;
 Object.assign(assembly,defaultsForRig(assembly.rig));
 assembly.drag=clamp(finite(raw.drag,.48),.2,.85);
 assembly.fishingDepthMeters=raw.fishingDepthMeters===null?null:typeof raw.fishingDepthMeters==='number'&&Number.isFinite(raw.fishingDepthMeters)?clamp(raw.fishingDepthMeters,.25,assembly.rig==='float'?40:80):assembly.fishingDepthMeters;
 return assembly;
}
export function ensureRodLoadouts(profile,legacy={}){
 if(!record(profile))return{};
 const rods=ownedRods(profile),active=rods.includes(profile.loadout?.rod)?profile.loadout.rod:rods[0],saved=record(profile.rodLoadouts)?profile.rodLoadouts:{},result={};
 const migration={reel:profile.loadout?.reel??null,line:profile.loadout?.line??null,leader:profile.loadout?.leader??null,...legacy};
 for(const id of rods)result[id]=normalizeAssembly(profile,record(saved[id])?saved[id]:id===active?migration:{});
 const seen=new Set();for(const id of [active,...rods.filter(id=>id!==active)].filter(Boolean))for(const slot of HARDWARE){const item=result[id][slot];if(!item)continue;if(seen.has(item))result[id][slot]=null;else seen.add(item);}
 profile.rodLoadouts=result;profile.rodLoadoutsVersion=ROD_LOADOUTS_VERSION;ensureConsumables(profile,legacy);
 for(const [id,a] of Object.entries(result)){const supply=profile.rodSupplies[id];if(!supply)continue;if(a.rig!==supply.rig)Object.assign(a,{rig:supply.rig},defaultsForRig(supply.rig));if(supply.bait)a.bait=supply.bait.kind;}
 return result;
}
export function getRodAssembly(profile,rodId=profile?.loadout?.rod){const map=ensureRodLoadouts(profile);return Object.hasOwn(map,rodId)?{...map[rodId]}:null;}
export function syncActiveRodLoadout(profile,rodId=profile?.loadout?.rod){const assembly=getRodAssembly(profile,rodId);if(!assembly)return null;profile.loadout={...profile.loadout,rod:rodId,reel:assembly.reel,line:assembly.line,leader:assembly.leader};return assembly;}
/** Atomic explicit inventory change. Selecting the already installed rig/bait
 * is a no-op; replacing worn supplies uses the simulation's replace actions. */
export function setRodAssembly(profile,rodId,patch={},packed){
 if(!record(profile)||!ownedRods(profile).includes(rodId))return fail('还没有这根船竿。');
 if(!record(patch)||Object.keys(patch).some(key=>!['rig','bait','drag','fishingDepthMeters'].includes(key)))return fail('目前仅支持预组装鱼竿和整套钓组。');
 if(packed!==undefined&&!Array.isArray(packed))return fail('随身装备列表无效。');
 if(packed&&!packed.includes(rodId))return fail('先启用这根船竿。');
 const draft=JSON.parse(JSON.stringify(profile)),map=ensureRodLoadouts(draft),next=map[rodId];
 if(Object.hasOwn(patch,'rig')){
  const rig=patch.rig;if(!Object.hasOwn(RIG_PROFILES,rig))return fail('没有这套钓组。');
  if(packed&&!packed.includes(rigItem(rig)))return fail('先启用这套钓组。');
  const supply=draft.rodSupplies[rodId];if(!supply||supply.rig!==rig||supply.condition<=USABLE_CONDITION){const result=installRig(draft,rodId,rig);if(!result.ok)return fail(result.message);Object.assign(next,{rig},defaultsForRig(rig));next.bait=draft.rodSupplies[rodId].bait?.kind||(rig==='jig'?'jig':'squid');}
 }
 if(Object.hasOwn(patch,'bait')){
  const bait=patch.bait;if(!Object.hasOwn(BAITS,bait))return fail('没有这种鱼饵。');
  const current=draft.rodSupplies[rodId]?.bait;
  if(!current||current.kind!==bait||current.condition<=USABLE_CONDITION){if(packed&&!packed.includes('bait'))return fail('先启用鱼饵盒。');const result=installBait(draft,rodId,bait);if(!result.ok)return fail(result.message);}
  next.bait=bait;
 }
 if(Object.hasOwn(patch,'drag')){const drag=patch.drag;if(typeof drag!=='number'||!Number.isFinite(drag)||drag<.2||drag>.85)return fail('泄力设置需要在 20%–85% 之间。');next.drag=drag;}
 if(Object.hasOwn(patch,'fishingDepthMeters')){const depth=patch.fishingDepthMeters,max=next.rig==='float'?40:80;if(depth!==null&&(typeof depth!=='number'||!Number.isFinite(depth)||depth<.25||depth>max))return fail(`饵层需要在 ${formatDepth(.25)}–${formatDepth(max)} 之间。`);next.fishingDepthMeters=depth;}
 for(const key of ['rodLoadouts','rodLoadoutsVersion','rodSupplies','rigStock','stock','consumablesVersion'])profile[key]=draft[key];
 if(profile.rodLoadouts[profile.loadout?.rod]){const active=profile.rodLoadouts[profile.loadout.rod];Object.assign(profile.loadout,{reel:active.reel,line:active.line,leader:active.leader});}
 return{ok:true,message:'这根船竿的预组装配置已保存。',assembly:{...next},transferred:[]};
}
export function rodAssemblyOptions(profile,rodId,slot,packed){
 const assembly=getRodAssembly(profile,rodId);if(!assembly)return[];
 const carry=id=>packed===undefined||packed.includes(id),options=[];
 const add=(id,name,iconId,{stock=null,available=true,selected=assembly[slot]===id,required=null,reason=''}={})=>options.push({id,name,iconId,owned:available,packed:!required||carry(required),selected,available,mountedOn:null,stock,reason});
 if(slot==='rig')for(const rig of Object.values(RIG_PROFILES)){const stock=profile.rigStock[rig.id].length,installed=profile.rodSupplies[rodId]?.rig===rig.id;add(rig.id,rig.name,rig.item,{stock,available:stock>0||installed,selected:installed,required:rig.item,reason:stock||installed?'':'没有备用钓组。'});}
 else if(slot==='bait')for(const [id,bait] of Object.entries(BAITS)){const stock=profile.stock[id]||0;add(id,bait.name,bait.iconId,{stock,available:stock>0,required:'bait',reason:stock?'':'鱼饵已用完。'});}
 else if(slot==='fishingDepthMeters')for(const depth of [null,1,2.5,4,6,10,15,20,30,40,...(assembly.rig==='float'?[]:[60,80])])add(depth,depth===null?'默认饵层':formatDepth(depth),'rig_float');
 // Readonly legacy values are intentionally not offered as editable options.
 return options;
}
