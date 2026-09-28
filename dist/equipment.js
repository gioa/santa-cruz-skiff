import {starterConsumables,ensureConsumables,suppliesWeight} from './pixel-consumables.js?v=20260927-pixel-v40';
// Virtual credits and simulation tuning. These are not retail prices or harvest rules.
export const GEAR_CATALOG=[
 {id:'pfd',slot:'safety',name:'救生衣',price:0,kg:.7,desc:'穿在身上 · 落水时提供浮力',icon:'◈'},
 {id:'rod',slot:'rod',name:'通用船竿与绕线轮',price:0,kg:.65,desc:'7 ft 中快调通用竿 · 初始免费，可应对所有鱼种',icon:'╱',strength:1,retrieve:1,sensitivity:1},
 {id:'tackle',slot:'rig',name:'基础钓组盒',price:12,starter:true,kg:.9,desc:'预组装单钩沉底组 · 每次补购 1 套，开局赠送 2 套备用',icon:'▦',rig:'bottom',hooks:1},
 {id:'bait',slot:'bait',name:'基础鱼饵盒',price:12,starter:true,kg:.45,desc:'鱿鱼条 · 每次补购 12 份，开局赠送 12 份备用',icon:'≋',bait:'squid',quantity:12},
 {id:'cooler',slot:'cooler',name:'基础冷藏箱',price:0,kg:3.5,desc:'17.6 lb 虚拟鱼获容量 · 含冰袋',icon:'▱',capacity:8},
 {id:'net',slot:'tool',name:'抄网与摘钩钳',price:0,kg:.8,desc:'20 in 开口抄网 · 摘钩放流',icon:'♧',openingInches:20},
 {id:'descending_device',slot:'tool',name:'降鱼器',price:0,kg:.35,desc:'将需要减压放流的岩鱼送回水下',icon:'↧'},
 {id:'water',slot:'supply',name:'饮水、防晒与头灯',price:0,kg:1.5,desc:'饮水、帽子、防晒和夜间照明',icon:'◒'},
 {id:'safety',slot:'safety',name:'通讯与应急包',price:0,kg:1.1,desc:'VHF、急救包、哨子 · 救援始终免费',icon:'⊞'},
 {id:'rod_light',slot:'rod',name:'轻型敏感船竿',price:85,kg:.46,desc:'快调轻型竿 · 竿尖点动清晰、回弹快；大鱼搏斗更考验泄力',strength:.84,retrieve:1.02,sensitivity:1.3},
 {id:'rod_boat',slot:'rod',name:'强韧船竿',price:160,kg:.81,desc:'中调强力竿 · 弯曲延伸至竿身，回弹较缓、细小鱼讯较弱',strength:1.16,retrieve:1.08,sensitivity:.88},
 {id:'rod_electric',slot:'rod',name:'电轮船竿套装',price:320,kg:1.25,desc:'预组装船竿与电动渔轮，含一体电源 · 可持续电动收线',strength:1,retrieve:1,sensitivity:1,electricRetrieve:true},
 {id:'reel_smooth',slot:'reel',name:'顺滑泄力轮',price:145,kg:.34,desc:'减小泄力启动冲击；不增加鱼种解锁',smooth:.86},
 {id:'line_braid',slot:'line',name:'30 lb 拉力编织主线',price:70,kg:.1,desc:'传递鱼讯更直接；低延展需要温和提竿',strength:1.14},
 {id:'leader_heavy',slot:'leader',name:'30 lb 拉力耐磨前导',price:40,kg:.12,desc:'礁石附近更耐磨；更粗的前导较显眼',strength:1.1},
 {id:'rig_slider',slot:'rig',name:'滑铅钓组',price:25,kg:.12,desc:'长子线自然呈饵，适合沙底缓慢漂流',rig:'slider',hooks:1},
 {id:'rig_jig',slot:'rig',name:'铅头软饵钓组',price:35,kg:.16,desc:'轻提后放落，或缓收搜索礁区底层',rig:'jig',hooks:1},
 {id:'rig_float',slot:'rig',name:'定层浮游钓组',price:25,kg:.09,desc:'浮漂保持预设饵层，搜索中上层鱼群',rig:'float',hooks:1},
 {id:'rig_dropper',slot:'rig',name:'双支线沉底组',price:35,kg:.16,desc:'两枚钩高低分布，鱼饵略离底层',rig:'dropper',hooks:2},
 {id:'rig_sabiki',slot:'rig',name:'双钩羽毛钓组',price:30,kg:.08,desc:'两枚小钩，中层短提寻找鲭鱼群',rig:'sabiki',hooks:2},
 {id:'rig_feather40',slot:'rig',name:'双支线羽毛钓组',price:40,kg:.16,desc:'两枚 4/0 羽毛 J 型钩 · 4 oz 底坠 · 礁区离底轻提，可挂鱿鱼条、鳀鱼或软饵',rig:'feather40',hooks:2},
 {id:'sinker_heavy',slot:'weight',name:'可调铅坠包',price:30,kg:.45,desc:'加速深水下沉；更易接触结构和挂底'},
 {id:'bait_anchovy',slot:'consumable',name:'鳀鱼饵 · 12 份',price:16,kg:.25,desc:'柔软鱼肉饵；多种近岸鱼都会取食',bait:'anchovy',quantity:12},
 {id:'bait_shrimp',slot:'consumable',name:'虾饵 · 12 份',price:18,kg:.22,desc:'适合近底和码头周边搜索',bait:'shrimp',quantity:12},
 {id:'bait_sardine',slot:'consumable',name:'沙丁鱼饵 · 12 份',price:18,kg:.3,desc:'油性鱼饵；并不保证特定鱼种',bait:'sardine',quantity:12},
 {id:'bait_soft',slot:'consumable',name:'软饵 · 8 条',price:18,kg:.1,desc:'提竿与缓收带出动作；每次搏鱼可能损耗',bait:'jig',quantity:8},
 {id:'cooler_large',slot:'cooler',name:'大冷藏箱',price:125,kg:5.5,desc:'39.7 lb 虚拟鱼获容量；增加船上载荷',capacity:18},
 {id:'nautical_chart',slot:'navigation',name:'纸质海图',price:120,kg:.1,desc:'查看静态海岸、地标与钓区；船位需 GPS',instrument:'chart'},
 {id:'compass',slot:'navigation',name:'船用罗盘',price:45,kg:.12,desc:'显示船首方位，便于按地标与航向操船',instrument:'compass'},
 {id:'gps',slot:'navigation',name:'手持 GPS',price:180,kg:.22,desc:'显示实时坐标、航速与定位；海区底图另购',instrument:'gps'},
 {id:'sounder',slot:'electronics',name:'便携测深仪',price:210,kg:.8,desc:'读取船底水深与地形趋势，不保证鱼群',instrument:'sounder'},
 {id:'anchor',slot:'utility',name:'小艇船锚与锚绳',price:65,kg:4.2,desc:'停机减速后下锚 · 锚绳与短链约束船位'},
 {id:'sea_anchor',slot:'utility',name:'漂流伞',price:80,kg:1.8,desc:'关闭发动机漂钓时减慢受风漂移'},
];
export const BASE_GEAR=GEAR_CATALOG.filter(g=>g.starter||g.price===0);
// Electric retrieval belongs to the selected, carried rod, never to ownership alone.
export function hasElectricReel(profile,packed){const id=profile?.loadout?.rod;return Boolean(id&&Array.isArray(profile?.owned)&&profile.owned.includes(id)&&Array.isArray(packed)&&packed.includes(id)&&GEAR_CATALOG.some(g=>g.id===id&&g.slot==='rod'&&g.electricRetrieve===true));}
export function createProfile(previous){
 const base={...starterConsumables(),version:2,credits:100,owned:BASE_GEAR.map(g=>g.id),stock:{squid:12,anchovy:0,shrimp:0,sardine:0,jig:3},loadout:{rod:'rod',reel:null,line:null,leader:null,cooler:'cooler'},condition:100,transactions:[],settled:[],seen:[],nextCatch:1};
 if(previous?.version===2){Object.assign(base,previous);base.owned=[...new Set([...BASE_GEAR.map(g=>g.id),...(previous.owned||[])])];base.stock={squid:12,anchovy:0,shrimp:0,sardine:0,jig:3,...previous.stock};base.loadout={rod:'rod',reel:null,line:null,leader:null,cooler:'cooler',...previous.loadout};base.settled=previous.settled||[];base.transactions=previous.transactions||[];base.seen=previous.seen||[];}
 if(previous?.version===2&&previous.consumablesVersion===undefined&&(previous.owned||previous.stock||previous.loadout)){delete base.consumablesVersion;delete base.rodSupplies;delete base.rigStock;}
 base.credits=Math.max(0,Math.floor(base.credits));return base;
}
export function buyGear(profile,id){
 const item=GEAR_CATALOG.find(g=>g.id===id);if(!item)return{ok:false,message:'装备不存在。'};
 const repeatable=Boolean(item.bait)||item.slot==='consumable'||item.slot==='rig';
 if(!repeatable&&profile.owned.includes(id))return{ok:false,message:'储物柜里已经有这件装备。'};
 if(profile.credits<item.price)return{ok:false,message:'潮汐点不足。'};
 ensureConsumables(profile);profile.credits-=item.price;
 if(item.bait)profile.stock[item.bait]=(profile.stock[item.bait]||0)+item.quantity;
 else if(item.slot==='rig'){profile.rigStock[item.rig].push({condition:1,bait:null});if(!profile.owned.includes(id))profile.owned.push(id);}
 else{profile.owned.push(id);if(item.slot==='rod')profile.rodSupplies[id]={rig:'bottom',condition:1,bait:null};}
 profile.transactions.unshift({kind:'purchase',id,delta:-item.price,time:new Date().toISOString()});profile.transactions=profile.transactions.slice(0,80);
 return{ok:true,message:`已兑换 ${item.name}，可在装备里选择使用。`};
}
export function restock(profile){ensureConsumables(profile);profile.stock.squid=Math.max(12,profile.stock.squid||0);while(profile.rigStock.bottom.length<2)profile.rigStock.bottom.push({condition:1,bait:null});profile.condition=100;return profile;}
export function fishReward(fish){return Math.round(22*Math.max(.7,Math.min(2.2,Math.sqrt((fish.kg||.5)/.75))))+Math.round((fish.length||20)/5);}
export function settleFish(profile,fish){if(!fish.catchId||profile.settled.includes(fish.catchId)||fish.settled)return 0;const first=!profile.seen.includes(fish.name);const reward=fishReward(fish)+(first?15:0);profile.settled.push(fish.catchId);fish.settled=true;fish.reward=reward;profile.credits+=reward;if(first)profile.seen.push(fish.name);profile.transactions.unshift({kind:fish.kept?'fish_trade':'release_record',catchId:fish.catchId,delta:reward,time:new Date().toISOString()});return reward;}
export function cargoWeight(catches){return catches.filter(f=>f.kept&&!f.settled).reduce((n,f)=>n+(f.kg||0),0);}
export function carriedWeight(packed,profile){const baitMass=packed.includes('bait')&&profile?Object.values(profile.stock).reduce((a,b)=>a+b,0)*.018:0;return GEAR_CATALOG.filter(g=>packed.includes(g.id)&&g.slot!=='consumable'&&(g.slot!=='rig'||g.id==='tackle')).reduce((n,g)=>n+g.kg,0)+baitMass+suppliesWeight(profile||{},packed);}
export function equipmentStats(profile,packed){const use=id=>id&&packed.includes(id)?GEAR_CATALOG.find(g=>g.id===id):null;const instrument=id=>Boolean(profile.owned?.includes(id)&&use(id));const rod=use(profile.loadout.rod)||GEAR_CATALOG.find(g=>g.slot==='rod'&&packed.includes(g.id));const cooler=use(profile.loadout.cooler)||GEAR_CATALOG.find(g=>g.slot==='cooler'&&packed.includes(g.id));return{hasRod:Boolean(rod),hasRig:GEAR_CATALOG.some(g=>g.slot==='rig'&&packed.includes(g.id)),hasBaitBox:packed.includes('bait'),hasChart:instrument('nautical_chart'),hasCompass:instrument('compass'),hasGPS:instrument('gps'),hasSounder:instrument('sounder'),hasAnchor:instrument('anchor'),strength:(rod?.strength||1)*(use(profile.loadout.line)?.strength||1)*(use(profile.loadout.leader)?.strength||1),retrieve:rod?.retrieve||1,sensitivity:rod?.sensitivity||1,smooth:use('reel_smooth')?.smooth||1,capacity:cooler?.capacity||0,weight:carriedWeight(packed,profile)};}
// All species retain nonzero overlap; bait and tackle are never exclusive locks.
export function fishWeights(fishes,{habitat='sand',depth=12,bait='squid',rig='bottom',freshness=1}={}){return fishes.map(f=>{const home=f.spot===habitat?2.7:1;const affinity=f.bait===bait?1.4:({squid:1.03,anchovy:1.08,shrimp:.95,sardine:1.04,jig:.9}[bait]||1);const presentation=rig==='float'?(f.name.includes('鲭')?1.5:.58):rig==='jig'?(f.spot==='reef'?1.18:.9):1;const d=f.spot==='reef'?(depth>10?1.15:.65):depth>28?.7:1;return Math.max(.05,home*affinity*presentation*d*(.75+.25*freshness));});}
export function weightedFish(fishes,options,rng=Math.random){const weights=fishWeights(fishes,options);let roll=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<fishes.length;i++){roll-=weights[i];if(roll<=0)return fishes[i];}return fishes.at(-1);}
