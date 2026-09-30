import {personalInventorySlots,swapInventorySlots} from './personal-inventory.js';
import {USABLE_CONDITION,wearFishingSupply} from './fishing-supply-wear.js';
export const BAITS=Object.freeze([
 {id:'sandcrab',name:'沙蟹',kind:'bait',price:12,quantity:8,description:'适合在近岸浪脚、沙槽寻找海鲫的天然饵。要配合落点与钓组，空竿也很常见。装饵消耗一份。'},
 {id:'squid',name:'鱿鱼条',kind:'bait',price:20,quantity:8,description:'可用于底钓的天然条饵；不同鱼种的偏好不同，不能替代所有鱼饵。留意浸泡、浪冲和鱼讯造成的损耗。'},
 {id:'anchovy',name:'鳀鱼块',kind:'bait',price:24,quantity:6,description:'切块鱼饵，可尝试寻找条纹鲈。与活饵的游动呈现不同；不能仅凭换饵就在任意距离钓到比目鱼。'},
 {id:'sandworm',name:'沙虫',kind:'bait',price:16,quantity:8,description:'活沙虫/血虫段，几乎所有海鲫都爱吃，小钩上也挂得住；对条纹鲈、比目鱼吸引力很低。容易被小鱼啄光。'},
 {id:'mussel',name:'贻贝肉',kind:'bait',price:14,quantity:10,description:'撬开的贻贝肉，桩海鲫和条纹海鲫的最爱，适合在栈桥桩柱或礁石边下饵；在开阔沙滩效果一般，肉软易掉。'},
]);
export const STARTER_ITEMS=Object.freeze([
 {id:'starter_rod',name:'入门岸钓竿',kind:'rod',description:'7 ft（2.13 m）岸钓竿，适配 14–42 g 抛投总重，包含钓组和鱼饵。适合轻组近投；重组超载会降低抛投表现。每根竿独立保存装配。'},
 {id:'starter_reel',name:'纺车轮',kind:'reel',description:'入门纺车轮。收线受力过高时松手，让鱼出线。'},
]);
export const SHOP_ITEMS=Object.freeze([
 ...BAITS,
 {id:'salmon_spoon',name:'银色鲑鱼亮片',kind:'rig',price:22,hook:'1/0',artificial:true,description:'1 oz 亮片，1/0 单枚无倒刺钩。落水后停顿下沉，连续点按摇轮让亮片摆动；停点会继续沉降。挂底或断线会丢失。'},
 {id:'salmon_spinner',name:'铜色鲑鱼旋转亮片',kind:'rig',price:28,hook:'1/0',artificial:true,description:'3/4 oz 旋转亮片，1/0 单枚无倒刺钩。需要相对水流速度带动叶片；逆流收线阻力更大。停收太久会沉底。'},
 {id:'grub_jig',name:'卷尾软饵铅头钩',kind:'rig',price:16,hook:'2',artificial:true,description:'1/2 oz 铅头钩配卷尾软饵，#2 单钩。慢收贴近沙底，抬竿或轻抽会跳起，停顿后下落；可寻找海鲫、条纹鲈与比目鱼。'},
 {id:'ca_fishing_regulations',name:'加州休闲捕鱼规定',kind:'book',price:12,kg:.15,description:'按鱼种和海域自行查阅捕捞规则的纸质手册；购买后可从左下角打开，不提供自动识鱼功能。'},
 {id:'surf_rod',name:'长节沙滩竿',kind:'rod',price:85,description:'10 ft（3.05 m）沙滩竿，适配 28–113 g 抛投总重，包含钓组和鱼饵。搭配合适的重量并充分挥竿，才能发挥远投能力。购入后配置并拿起。'},
 {id:'sealed_reel',name:'密封纺车轮',kind:'reel',price:110,description:'收线更快，张力积累稍慢。购入后手动启用。'},
 {id:'carolina_rig',name:'Carolina 岸钓组',kind:'rig',price:18,hook:'1',description:'本套装为 1 oz（28 g）滑坠、#1 单钩。适合较轻的近岸呈现；强浪中可能滚动。断线会损失整套钓组。'},
 {id:'fishfinder_rig',name:'滑铅钓组',kind:'rig',price:65,hook:'2/0',description:'本套装为 3 oz（85 g）滑铅、2/0 单钩。有助抗流稳底；装在入门竿上会超载、削弱抛投，适合搭配沙滩竿。大钩和重组未必适合小海鲫。'},
 {id:'float_rig',name:'小钩浮钓组',kind:'rig',price:24,hook:'6',description:'#6 单钩，12 g 配铅＋2 g 浮漂，连接件另计。挂小鱿鱼条或小鳀鱼块，在水面下约 1 m 随流漂钓 jacksmelt；浅水时钩深缩至水深的四分之三。强浪会扰乱呈现。断线会损失整套钓组。'},
]);
export const SHORE_ITEMS=[...STARTER_ITEMS,...SHOP_ITEMS];
const rigIds=['carolina_rig','fishfinder_rig','float_rig','salmon_spoon','salmon_spinner','grub_jig'];
export const isShoreLure=id=>id==='salmon_spoon'||id==='salmon_spinner'||id==='grub_jig';
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
export function syncShoreEquipment(s){const r=s.rodSupplies[s.activeRod];s.rig=isShoreLure(r?.id)?'lure':r?.id==='fishfinder_rig'?'fishfinder':r?.id==='float_rig'?'float':'carolina';s.bait=r?.bait?.kind||s.bait||'sandcrab';}
export function shoreSupply(s){return s.rodSupplies[s.activeRod];}
export function shoreReady(s){const r=shoreSupply(s);return Boolean(r&&r.condition>USABLE_CONDITION&&(isShoreLure(r.id)||r.bait?.condition>USABLE_CONDITION));}
export function shoreOwnedItems(s){return SHORE_ITEMS.filter(i=>i.kind==='rod'?ownedRods(s).includes(i.id):i.kind==='reel'?i.id==='starter_reel'||s.upgrades.includes(i.id):i.kind==='book'?s.upgrades.includes(i.id):i.kind==='bait'?s.inventory[i.id]>0:i.kind==='rig'&&(s.rigStock[i.id]?.length||Object.values(s.rodSupplies).some(r=>r?.id===i.id)));}
export function shoreSlots(s){return personalInventorySlots(s,shoreOwnedItems(s).map(i=>i.id)).pack;}
export function moveShoreSlot(s,from,to){return swapInventorySlots(shoreSlots(s),from,to);}
export function shoreItemActive(s,item){return item.kind==='rod'?s.activeRod===item.id:item.kind==='reel'?s.activeReel===item.id:item.kind==='rig'?shoreSupply(s)?.id===item.id:item.kind==='bait'&&shoreSupply(s)?.bait?.kind===item.id&&shoreSupply(s).bait.condition>USABLE_CONDITION;}
export function wearShoreSupplies(s,event){
 const r=shoreSupply(s);if(!r)return;
 if(event==='break'){s.rodSupplies[s.activeRod]=null;return;}
 wearFishingSupply(r,event);
}
export function configureShoreEquipment(sim,id,rodId=sim.state.activeRod){
 const s=sim.state,item=SHORE_ITEMS.find(i=>i.id===id),rod=s.rodSupplies[rodId];
 if(s.phase!=='walk'||s.inspection)return sim.result(false,'先收回水中的钓组并处理当前事件，再调整装备。');
 if(!item||!ownedRods(s).includes(rodId))return sim.result(false,'背包里没有这件装备。');
 if(item.kind==='book')return sim.result(false,s.upgrades.includes(id)?'从左下角打开手册，自行查阅鱼种和规定。':'还没有这本手册。');
 if(item.kind==='rod'){
  if(!ownedRods(s).includes(id))return sim.result(false,'还没有这根鱼竿。');
  s.activeRod=id;
 }else if(item.kind==='reel'){
  if(id!=='starter_reel'&&!s.upgrades.includes(id))return sim.result(false,'还没有这个鱼轮。');
  s.activeReel=id;
 }else if(item.kind==='bait'){
  if(isShoreLure(rod?.id))return sim.result(false,'这套亮片保持原本泳姿，不另挂天然饵。');
  if(!rod||rod.condition<=USABLE_CONDITION)return sim.result(false,'先给这根鱼竿装上一套可用钓组。');
  if(!(s.inventory[id]>0))return sim.result(false,'这种鱼饵没有库存。');
  s.inventory[id]--;rod.bait={kind:id,condition:1};
 }else if(item.kind==='rig'){
  if(!s.rigStock[id]?.length)return sim.result(false,'没有备用钓组。');
  const next=s.rigStock[id].shift();
  if(rod?.condition>USABLE_CONDITION)s.rigStock[rod.id].push(rod);
  s.rodSupplies[rodId]=next;
 }
 syncShoreEquipment(s);shoreSlots(s);
 return sim.result(true,item.kind==='bait'?`已换上${item.name}，消耗 1 份。`:item.kind==='rod'?`已拿起${item.name}。`:`已装配${item.name}。`);
}
