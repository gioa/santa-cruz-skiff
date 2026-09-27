import {GEAR_CATALOG} from './equipment.js?v=20260927-pixel-v13';
import {RIG_PROFILES} from './fishing-rigs.js?v=20260927-pixel-v13';

/** Deterministic inventory model: no browser state, I/O, or random values.
 * Each rod includes its basic reel, mono and leader (null IDs). Purchased
 * hardware/rigs are single inventory objects and move between rods. Bait and
 * sinkers are shared supplies; choosing them never creates or consumes stock.
 */
export const ROD_LOADOUTS_VERSION=1;
export const ROD_IDS=Object.freeze(GEAR_CATALOG.filter(g=>g.slot==='rod').map(g=>g.id));
export const BASE_ROD_ASSEMBLY=Object.freeze({reel:null,line:null,leader:null,rig:'bottom',bait:'squid',weightGrams:85,drag:.48,fishingDepthMeters:null});
export const ROD_ASSEMBLY_SLOTS=Object.freeze([
 {key:'reel',name:'绕线轮',iconId:'reel_smooth'},
 {key:'line',name:'主线',iconId:'line_braid'},
 {key:'leader',name:'前导线',iconId:'leader_heavy'},
 {key:'rig',name:'钓组',iconId:'tackle'},
 {key:'bait',name:'鱼饵',iconId:'bait'},
 {key:'weightGrams',name:'配重',iconId:'sinker_heavy'},
 {key:'fishingDepthMeters',name:'饵层',iconId:'rig_float'},
].map(Object.freeze));

const ITEMS=new Map(GEAR_CATALOG.map(g=>[g.id,g]));
const HARDWARE=['reel','line','leader'];
const FIELDS=new Set(Object.keys(BASE_ROD_ASSEMBLY));
const BAITS=Object.freeze({squid:{name:'鱿鱼条',iconId:'bait'},anchovy:{name:'鳀鱼饵',iconId:'bait_anchovy'},shrimp:{name:'虾饵',iconId:'bait_shrimp'},sardine:{name:'沙丁鱼饵',iconId:'bait_sardine'},jig:{name:'软饵',iconId:'bait_soft'}});
const BASIC_NAMES={reel:'基础绕线轮',line:'基础尼龙主线',leader:'基础前导线'};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const finite=(n,fallback)=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
const record=v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const owns=(profile,id)=>Array.isArray(profile?.owned)&&profile.owned.includes(id);
const ownedRods=profile=>ROD_IDS.filter(id=>owns(profile,id));
const rigItem=rig=>RIG_PROFILES[rig]?.item;
const isPaid=id=>(ITEMS.get(id)?.price||0)>0;
const validHardware=(profile,slot,id)=>id===null||Boolean(owns(profile,id)&&ITEMS.get(id)?.slot===slot);
const rodName=id=>ITEMS.get(id)?.name||'另一根船竿';
const fail=message=>({ok:false,message,assembly:null,transferred:[]});

function defaultsForRig(rig){const r=RIG_PROFILES[rig];return{weightGrams:r.defaultWeightGrams,fishingDepthMeters:r.defaultFishingDepth??null};}
function resetSlot(assembly,slot){
 if(slot==='rig')Object.assign(assembly,{rig:'bottom'},defaultsForRig('bottom'));
 else assembly[slot]=null;
}
function normalizeAssembly(profile,raw={}){
 const assembly={...BASE_ROD_ASSEMBLY};
 for(const slot of HARDWARE)if(validHardware(profile,slot,raw[slot]))assembly[slot]=raw[slot];
 if(Object.hasOwn(RIG_PROFILES,raw.rig)&&owns(profile,rigItem(raw.rig)))assembly.rig=raw.rig;
 if(Object.hasOwn(BAITS,raw.bait))assembly.bait=raw.bait;
 const rig=RIG_PROFILES[assembly.rig],defaults=defaultsForRig(assembly.rig);
 assembly.weightGrams=clamp(finite(raw.weightGrams,defaults.weightGrams),1,500);
 if(rig.id==='float'||!owns(profile,'sinker_heavy'))assembly.weightGrams=defaults.weightGrams;
 assembly.drag=clamp(finite(raw.drag,.48),.2,.85);
 assembly.fishingDepthMeters=raw.fishingDepthMeters===null?null:
  typeof raw.fishingDepthMeters==='number'&&Number.isFinite(raw.fishingDepthMeters)?clamp(raw.fishingDepthMeters,.25,rig.id==='float'?40:80):defaults.fishingDepthMeters;
 return assembly;
}

/** Migrate once from the old active/global setup; preserve new per-rod saves.
 * A legacy simulation may pass its rig/bait/weight/drag/depth alongside the
 * profile. Ownership, credits, stock, packing and active rod are unchanged.
 */
export function ensureRodLoadouts(profile,legacy={}){
 if(!record(profile))return{};
 const rods=ownedRods(profile),active=rods.includes(profile.loadout?.rod)?profile.loadout.rod:rods[0];
 const saved=record(profile.rodLoadouts)?profile.rodLoadouts:{},result={};
 const migration={reel:profile.loadout?.reel??null,line:profile.loadout?.line??null,leader:profile.loadout?.leader??null,...legacy};
 if(migration.weightGrams===undefined&&legacy.rigWeightGrams!==undefined)migration.weightGrams=legacy.rigWeightGrams;
 for(const id of rods)result[id]=normalizeAssembly(profile,record(saved[id])?saved[id]:id===active?migration:{});
 // A corrupt/old save cannot duplicate one purchased component. Give the
 // active rod priority, followed by catalog order, and repair other mounts.
 const seen=new Set();
 for(const id of [active,...rods.filter(id=>id!==active)].filter(Boolean)){
  for(const slot of [...HARDWARE,'rig']){
   const item=slot==='rig'?rigItem(result[id][slot]):result[id][slot];
   if(!item||!isPaid(item))continue;
   if(seen.has(item))resetSlot(result[id],slot);else seen.add(item);
  }
 }
 profile.rodLoadouts=result;profile.rodLoadoutsVersion=ROD_LOADOUTS_VERSION;
 return result;
}

/** A detached config, safe for a UI draft. Null means no owned rod selected. */
export function getRodAssembly(profile,rodId=profile?.loadout?.rod){
 const map=ensureRodLoadouts(profile);return Object.hasOwn(map,rodId)?{...map[rodId]}:null;
}

/** Explicit activation. The simulation validates packing/fishing state first. */
export function syncActiveRodLoadout(profile,rodId=profile?.loadout?.rod){
 const assembly=getRodAssembly(profile,rodId);if(!assembly)return null;
 profile.loadout={...profile.loadout,rod:rodId,reel:assembly.reel,line:assembly.line,leader:assembly.leader};
 return assembly;
}

/** Atomic assembly edit; changing a rod never implicitly takes it in hand.
 * Optional packed checks newly mounted items, not existing disabled mounts.
 * The caller validates the whole assembly when activating/casting. Bait may
 * remain selected after its last portion is used; selecting a different bait
 * requires stock. Fish hooks consume stock elsewhere, only on an actual cast.
 */
export function setRodAssembly(profile,rodId,patch={},packed){
 if(!record(profile)||!ownedRods(profile).includes(rodId))return fail('还没有这根船竿。');
 if(!record(patch)||Object.keys(patch).some(key=>!FIELDS.has(key)))return fail('未知的装配位置。');
 if(packed!==undefined&&!Array.isArray(packed))return fail('随身装备列表无效。');
 if(packed&&!packed.includes(rodId))return fail('先启用这根船竿。');
 const draft={...profile,loadout:{...profile.loadout}},map=ensureRodLoadouts(draft),before=map[rodId],next={...before};
 const changed=Object.fromEntries(Object.entries(patch).filter(([,value])=>value!==undefined));
 const carry=id=>packed===undefined||packed.includes(id);
 for(const slot of HARDWARE)if(Object.hasOwn(changed,slot)){
  const id=changed[slot];if(!validHardware(profile,slot,id))return fail(`没有这件${BASIC_NAMES[slot].replace('基础','')}。`);
  if(id&&id!==before[slot]&&!carry(id))return fail(`先启用${ITEMS.get(id).name}。`);
  next[slot]=id;
 }
 if(Object.hasOwn(changed,'rig')){
  const rig=changed.rig;if(!Object.hasOwn(RIG_PROFILES,rig)||!owns(profile,rigItem(rig)))return fail('没有这套钓组。');
  if(rig!==before.rig&&!carry(rigItem(rig)))return fail('先启用这套钓组。');
  if(rig!==before.rig)Object.assign(next,{rig},defaultsForRig(rig));
 }
 if(Object.hasOwn(changed,'bait')){
  const bait=changed.bait;if(!Object.hasOwn(BAITS,bait))return fail('没有这种鱼饵。');
  if(bait!==before.bait&&!(profile.stock?.[bait]>0))return fail('这种鱼饵用完了，回小屋补给。');
  if(bait!==before.bait&&!carry('bait'))return fail('先启用鱼饵盒。');
  next.bait=bait;
 }
 const rig=RIG_PROFILES[next.rig];
 if(Object.hasOwn(changed,'weightGrams')){
  const weight=changed.weightGrams;if(typeof weight!=='number'||!Number.isFinite(weight)||weight<1||weight>500)return fail('配重需要在 1–500 克之间。');
  next.weightGrams=weight;
 }
 if(rig.id==='float'&&next.weightGrams!==rig.defaultWeightGrams)return fail('这枚浮漂使用配套的七克配重。');
 if(next.weightGrams!==rig.defaultWeightGrams&&(!owns(profile,'sinker_heavy')||(!carry('sinker_heavy')&&next.weightGrams!==before.weightGrams)))return fail('先启用可调铅坠包。');
 if(Object.hasOwn(changed,'drag')){
  const drag=changed.drag;if(typeof drag!=='number'||!Number.isFinite(drag)||drag<.2||drag>.85)return fail('泄力设置需要在 20%–85% 之间。');
  next.drag=drag;
 }
 if(Object.hasOwn(changed,'fishingDepthMeters')){
  const depth=changed.fishingDepthMeters,max=rig.id==='float'?40:80;
  if(depth!==null&&(typeof depth!=='number'||!Number.isFinite(depth)||depth<.25||depth>max))return fail(`饵层需要在 0.25–${max} 米之间。`);
  next.fishingDepthMeters=depth;
 }
 const transferred=[];
 for(const slot of [...HARDWARE,'rig']){
  const item=slot==='rig'?rigItem(next[slot]):next[slot];if(!item||!isPaid(item))continue;
  for(const [fromRodId,assembly] of Object.entries(map))if(fromRodId!==rodId&&(slot==='rig'?rigItem(assembly.rig):assembly[slot])===item){
   resetSlot(assembly,slot);transferred.push({item,fromRodId,toRodId:rodId,slot});
  }
 }
 map[rodId]=next;profile.rodLoadouts=map;profile.rodLoadoutsVersion=ROD_LOADOUTS_VERSION;
 if(Object.hasOwn(map,profile.loadout?.rod)){
  const active=map[profile.loadout.rod];profile.loadout={...profile.loadout,reel:active.reel,line:active.line,leader:active.leader};
 }
 const message=transferred.length?`已装配；${transferred.map(t=>`${ITEMS.get(t.item).name}从${rodName(t.fromRodId)}移来`).join('，')}。`:'这根船竿的装配已保存。';
 return{ok:true,message,assembly:{...next},transferred};
}

/** UI options use typed IDs as patch values: null, number, or string.
 * mountedOn is a rod ID, including the currently selected rod, or null.
 * available uses ownership/stock only: the simulation auto-enables selected
 * inventory. packed is descriptive; disabled mounts remain saved and visible.
 */
export function rodAssemblyOptions(profile,rodId,slot,packed){
 const assembly=getRodAssembly(profile,rodId);if(!assembly)return[];
 const map=profile.rodLoadouts,carry=id=>packed===undefined||packed.includes(id);
 const options=[];
 const add=(id,name,iconId,{item=null,owned=true,stock=null,required=item,reason='',available=owned}={})=>{
  const mountedOn=item&&isPaid(item)?Object.keys(map).find(r=>slot==='rig'?rigItem(map[r].rig)===item:map[r][slot]===item)||null:null;
  const carried=!required||carry(required);
  available=Boolean(available);
  if(!reason)reason=!owned?'需要先兑换。':mountedOn&&mountedOn!==rodId?`将从${rodName(mountedOn)}移来。`:!carried?'装配时会自动启用。':'';
  options.push({id,name,iconId,owned:Boolean(owned),packed:carried,selected:assembly[slot]===id,available,mountedOn,stock,reason});
 };
 if(HARDWARE.includes(slot)){
  add(null,BASIC_NAMES[slot],slot==='reel'?'reel_smooth':slot==='line'?'line_braid':'leader_heavy');
  for(const item of GEAR_CATALOG.filter(g=>g.slot===slot))add(item.id,item.name,item.id,{item:item.id,owned:owns(profile,item.id)});
 }else if(slot==='rig'){
  for(const rig of Object.values(RIG_PROFILES))add(rig.id,rig.name,rig.item,{item:rig.item,owned:owns(profile,rig.item)});
 }else if(slot==='bait'){
  for(const [id,bait] of Object.entries(BAITS)){
   const stock=Math.max(0,finite(profile.stock?.[id],0));
   add(id,bait.name,bait.iconId,{stock,required:'bait',available:stock>0,reason:stock>0?'':'鱼饵已用完。'});
  }
 }else if(slot==='weightGrams'){
  const rig=RIG_PROFILES[assembly.rig],weights=rig.id==='float'?[7]:[...new Set([rig.defaultWeightGrams,28,42,57,85,113,170,227,340,454,assembly.weightGrams])].sort((a,b)=>a-b);
  for(const weight of weights){const basic=weight===rig.defaultWeightGrams;add(weight,`${weight} 克${basic?' · 配套':''}`,'sinker_heavy',{owned:basic||owns(profile,'sinker_heavy'),required:basic?null:'sinker_heavy'});}
 }else if(slot==='fishingDepthMeters'){
  const rig=RIG_PROFILES[assembly.rig],depths=[null,...new Set([1,2.5,4,6,10,15,20,30,40,...(rig.id==='float'?[]:[60,80]),assembly.fishingDepthMeters].filter(v=>v!==null))];
  for(const depth of depths)add(depth,depth===null?rig.id==='float'?'默认漂下长度':'不设参考':`${depth} 米`,'rig_float');
 }
 return options;
}
