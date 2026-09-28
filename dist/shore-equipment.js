import {USABLE_CONDITION,wearFishingSupply} from './fishing-supply-wear.js?v=species-1';
import {personalInventorySlots,swapInventorySlots} from './personal-inventory.js?v=coast-6';
export const BAITS=Object.freeze([
 {id:'sandcrab',name:'沙蟹',kind:'bait',price:12,quantity:8,description:'近岸浪区使用的天然饵。装饵时消耗一份，空收钓组不会自动换饵。'},
 {id:'squid',name:'鱿鱼条',kind:'bait',price:20,quantity:8,description:'天然条饵。留意钩上余饵，受损后需要手动更换。'},
 {id:'anchovy',name:'鳀鱼块',kind:'bait',price:24,quantity:6,description:'切块天然饵。鱼讯、跑鱼和上鱼会损耗钩上的鱼饵。'},
]);
export const STARTER_ITEMS=Object.freeze([
 {id:'starter_rod',name:'入门岸钓竿',kind:'rod',description:'随身岸钓竿。每根竿独立保存装配好的钓组和钩上鱼饵。'},
 {id:'starter_reel',name:'纺车轮',kind:'reel',description:'入门纺车轮。收线受力过高时松手，让鱼出线。'},
]);
export const SHOP_ITEMS=Object.freeze([
 ...BAITS,
 {id:'surf_rod',name:'长节沙滩竿',kind:'rod',price:85,description:'最大抛投距离增加 72 ft。购入后在鱼竿页配置并拿起。'},
 {id:'sealed_reel',name:'密封纺车轮',kind:'reel',price:110,description:'收线更快，张力积累稍慢。购入后手动启用。'},
 {id:'carolina_rig',name:'Carolina 岸钓组',kind:'rig',price:18,hook:'1',description:'单钩滑坠预组装钓组。断线会损失整套钓组；完整换下的钓组和余饵放回背包。'},
 {id:'fishfinder_rig',name:'滑铅钓组',kind:'rig',price:65,hook:'2/0',description:'单钩 Fish-finder 预组装钓组。需要装饵，换下后仍保留原有损耗。'},
]);
export const SHORE_ITEMS=[...STARTER_ITEMS,...SHOP_ITEMS];
const rigIds=['carolina_rig','fishfinder_rig'];
const bounded=v=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
const cleanRig=r=>r&&rigIds.includes(r.id)&&bounded(r.condition)>USABLE_CONDITION?{id:r.id,condition:bounded(r.condition),bait:r.bait&&BAITS.some(b=>b.id===r.bait.kind)?{kind:r.bait.kind,condition:bounded(r.bait.condition)}:null}:null;
const fresh=id=>({id,condition:1,bait:null});
export function ownedRods(s){return ['starter_rod',...(s.upgrades.includes('surf_rod')?['surf_rod']:[])];}
export function restoreShoreEquipment(s,saved){
 const modern=saved?.version>=3;
 s.activeRod=ownedRods(s).includes(saved?.activeRod)?saved.activeRod:!modern&&s.upgrades.includes('surf_rod')?'surf_rod':'starter_rod';
 s.activeReel=s.upgrades.includes('sealed_reel')&&(!modern||saved.activeReel==='sealed_reel')?'sealed_reel':'starter_reel';
 s.rodSupplies=Object.fromEntries(ownedRods(s).map(id=>[id,modern?cleanRig(saved.rodSupplies?.[id]):null]));
 s.rigStock=Object.fromEntries(rigIds.map(id=>[id,modern&&Array.isArray(saved.rigStock?.[id])?saved.rigStock[id].slice(0,999).map(cleanRig).filter(r=>r?.id===id):[]]));
 if(!modern){
  const rig=s.upgrades.includes('fishfinder_rig')?'fishfinder_rig':'carolina_rig';
  s.rodSupplies[s.activeRod]=fresh(rig);
  // Old saves had no bait on hooks. Never mint bait during migration.
  if(!saved)s.rodSupplies[s.activeRod].bait={kind:'sandcrab',condition:1};
  if(!saved)s.rigStock.carolina_rig=[fresh('carolina_rig'),fresh('carolina_rig')];
  else if(rig!=='carolina_rig')s.rigStock.carolina_rig=[fresh('carolina_rig')];
 }
 s.inventorySlots=modern?saved.inventorySlots:undefined;
 syncShoreEquipment(s);shoreSlots(s);
}
export function syncShoreEquipment(s){const r=s.rodSupplies[s.activeRod];s.rig=r?.id==='fishfinder_rig'?'fishfinder':'carolina';s.bait=r?.bait?.kind||s.bait||'sandcrab';}
export function shoreSupply(s){return s.rodSupplies[s.activeRod];}
export function shoreReady(s){const r=shoreSupply(s);return Boolean(r&&r.condition>USABLE_CONDITION&&r.bait?.condition>USABLE_CONDITION);}
export function shoreOwnedItems(s){return SHORE_ITEMS.filter(i=>i.kind==='rod'?ownedRods(s).includes(i.id):i.kind==='reel'?i.id==='starter_reel'||s.upgrades.includes(i.id):i.kind==='bait'?s.inventory[i.id]>0:s.rigStock[i.id]?.length||Object.values(s.rodSupplies).some(r=>r?.id===i.id));}
export function shoreSlots(s){return personalInventorySlots(s,shoreOwnedItems(s).map(i=>i.id)).pack;}
export function moveShoreSlot(s,from,to){return swapInventorySlots(shoreSlots(s),from,to);}
export function shoreItemActive(s,item){return item.kind==='rod'?s.activeRod===item.id:item.kind==='reel'?s.activeReel===item.id:item.kind==='rig'?shoreSupply(s)?.id===item.id:shoreSupply(s)?.bait?.kind===item.id&&shoreSupply(s).bait.condition>USABLE_CONDITION;}
export function wearShoreSupplies(s,event){
 const r=shoreSupply(s);if(!r)return;
 if(event==='break'){s.rodSupplies[s.activeRod]=null;return;}
 wearFishingSupply(r,event);
}
export function configureShoreEquipment(sim,id,rodId=sim.state.activeRod){
 const s=sim.state,item=SHORE_ITEMS.find(i=>i.id===id),rod=s.rodSupplies[rodId];
 if(s.phase!=='walk'||s.inspection)return sim.result(false,'先收回水中的钓组并处理当前事件，再调整装备。');
 if(!item||!ownedRods(s).includes(rodId))return sim.result(false,'背包里没有这件装备。');
 if(item.kind==='rod'){
  if(!ownedRods(s).includes(id))return sim.result(false,'还没有这根鱼竿。');
  s.activeRod=id;
 }else if(item.kind==='reel'){
  if(id!=='starter_reel'&&!s.upgrades.includes(id))return sim.result(false,'还没有这个鱼轮。');
  s.activeReel=id;
 }else if(item.kind==='bait'){
  if(!rod||rod.condition<=USABLE_CONDITION)return sim.result(false,'先给这根鱼竿装上一套可用钓组。');
  if(!(s.inventory[id]>0))return sim.result(false,'这种鱼饵没有库存。');
  s.inventory[id]--;rod.bait={kind:id,condition:1};
 }else{
  if(!s.rigStock[id]?.length)return sim.result(false,'没有备用钓组。');
  const next=s.rigStock[id].shift();
  if(rod?.condition>USABLE_CONDITION)s.rigStock[rod.id].push(rod);
  s.rodSupplies[rodId]=next;
 }
 syncShoreEquipment(s);shoreSlots(s);
 return sim.result(true,item.kind==='bait'?`已换上${item.name}，消耗 1 份。`:item.kind==='rod'?`已拿起${item.name}。`:`已装配${item.name}。`);
}
