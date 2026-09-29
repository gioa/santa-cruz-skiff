import {SHORE_ITEMS,shoreOwnedItems,shoreItemActive,ownedRods} from './shore-equipment.js';
import {BAITS, SHOP_ITEMS} from './pacifica-sim.js';
import {drawItemIcon} from './pixel-item-icons.js';
import {formatNumber,formatLength,formatWeight,cmToInches,kgToPounds} from './units.js';
import {createPixelSprites} from './pixel-sprites.js';

// Pacifica uses the game's shared modal, inventory and pixel-art components.
// These views only call the existing simulation actions; the save format stays
// scene-specific; inventory reflects the equipment the simulation owns.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const heading = (eyebrow, title, description = '') => `<div class="eyebrow">${esc(eyebrow)}</div><h2 id="modal-title">${esc(title)}</h2>${description ? `<p class="modal-desc">${description}</p>` : ''}`;
const balance = credits => `<span class="balance" aria-label="${Math.floor(credits)} 潮汐点">✦ ${Math.floor(credits)}</span>`;
const iconIds = {starter_rod:'rod_light', surf_rod:'rod', starter_reel:'reel_smooth', sealed_reel:'reel_smooth', carolina_rig:'rig_slider', fishfinder_rig:'rig_slider', float_rig:'rig_float', sandcrab:'bait', squid:'bait', anchovy:'bait_anchovy', ca_fishing_regulations:'ca_fishing_regulations',};
const itemArt = id => `<canvas data-item-art="${iconIds[id] || 'tackle'}" width="32" height="32" aria-hidden="true"></canvas>`;
const fishWeight = fish => formatNumber(kgToPounds(fish.weightKg), 2);
const fishLength = fish => formatNumber(cmToInches(fish.lengthCm), 1);

export function createPacificaMenus({sim, scene, openDialog, closeDialog, feedback, openRules = () => {}}) {
  const $ = id => document.getElementById(id);
  const content = () => $('modal-content');
  let selectedId = null;
  let sprites;
  const getSprites = () => sprites ||= createPixelSprites();
  const report = result => { feedback(result); return result; };

  function paintItems() {
    content().querySelectorAll('[data-item-art]').forEach(canvas => drawItemIcon(canvas, canvas.dataset.itemArt));
  }

  function paintFish(canvas, fish, compact = false) {
    if (!canvas) return;
    const width = compact ? 96 : Math.max(160, Math.floor(canvas.parentElement.clientWidth));
    const height = compact ? 48 : 160;
    canvas.width = width; canvas.height = height;
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${fish.name}，${fishLength(fish)} 英寸，${fishWeight(fish)} 磅`);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#c2d4b7'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#b5c9ad';
    for (let y = compact ? 12 : 32; y < height; y += compact ? 12 : 32) ctx.fillRect(0, y, width, 1);
    if(['white_croaker','jacksmelt'].includes(fish.id)){
      // Shore-only portraits keep the two small silver fish distinguishable
      // without changing the boat game's shared sprite sheet.
      const scale=Math.min(compact?1.6:5,(width-20)/48),x=(width-48*scale)/2,y=(height-24*scale)/2;
      const rect=(left,top,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x+left*scale),Math.round(y+top*scale),Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));};
      if(fish.id==='jacksmelt'){
        rect(5,10,33,7,'#778d87');rect(2,12,4,3,'#aabeb2');rect(8,9,25,2,'#688479');
        rect(5,12,34,3,'#e4e7d6');rect(8,15,27,2,'#bdcfc0');rect(13,11,23,1,'#d7c993');
        rect(20,6,5,3,'#849c88');rect(30,7,4,3,'#849c88');rect(25,17,6,2,'#95a58b');
        rect(38,11,3,5,'#819b87');rect(41,8,3,4,'#819b87');rect(44,6,3,4,'#819b87');
        rect(41,15,3,4,'#819b87');rect(44,17,3,4,'#819b87');rect(6,11,2,2,'#334f50');rect(10,12,1,4,'#80958a');
      }else{
        rect(9,7,22,12,'#b8bb9d');rect(5,10,7,8,'#c5c9ae');rect(3,13,4,4,'#d9ddc4');
        rect(12,5,16,3,'#8a977f');rect(29,9,6,8,'#aeb798');rect(34,11,5,5,'#b3b88e');
        rect(9,14,23,5,'#e0e2ca');rect(12,19,13,2,'#d5d9ba');rect(13,3,4,3,'#a1a383');
        rect(18,4,14,3,'#929b7d');rect(18,19,6,3,'#baa976');rect(38,8,6,11,'#b4a477');
        rect(43,7,2,5,'#b4a477');rect(43,15,2,5,'#b4a477');rect(9,10,2,2,'#344e49');
        rect(13,11,1,7,'#909a84');rect(15,13,3,2,'#68786a');rect(17,15,6,2,'#aca87f');
      }
      return;
    }
    const sprite = getSprites().fish[fish.id === 'halibut' ? 'halibut' : 'unknown'];
    const scale = compact ? 1.8 : Math.min(5, (width - 32) / sprite.width);
    ctx.drawImage(sprite, Math.round((width - sprite.width * scale) / 2), Math.round((height - sprite.height * scale) / 2), sprite.width * scale, sprite.height * scale);
  }

  function openShop(){if(sim.nearShop)openBag(null,'shop');}
  const kindName=item=>({rod:'岸钓竿',reel:'鱼轮',rig:'预组装钓组',bait:'鱼饵',book:'参考资料'})[item.kind];
  const condition=value=>value>.7?'完好':value>.3?'已磨损':value>.08?'需要更换':'已耗尽';
  const stock=item=>item.kind==='bait'?sim.state.inventory[item.id]:item.kind==='rig'?sim.state.rigStock[item.id].length:null;

  function openBag(preferredId=selectedId,tab='pack'){
    const s=sim.state,items=shoreOwnedItems(s),atShop=sim.nearShop;
    if(tab==='shop'&&!atShop)tab='pack';
    const shop=tab==='shop',tabs=[['pack','背包'],['rig','鱼竿'],...(atShop?[['shop','商店']]:[])];
    const slots=shop?SHOP_ITEMS.map(i=>i.id):sim.inventorySlots();
    let selected=Math.max(0,slots.indexOf(preferredId||slots.find(Boolean))),moving=null;
    openDialog('gear',balance(s.credits)+heading('YOUR TACKLE BOX',shop?'装备兑换':tab==='rig'?'鱼竿与消耗品':'人物背包',`${items.length} 件物品 · ${scene.shortName} 岸钓装备`)+
      `<div class="tabs gear-tabs">${tabs.map(([id,label])=>`<button data-tab="${id}" class="${id===tab?'active':''}">${label}</button>`).join('')}</div>`+
      (tab==='rig'?'<div id="rod-workbench"></div>':`<div class="inventory-layout"><div class="inventory-tray"><div class="inventory-toolbar"><span>${shop?'货架':'个人物品'}</span><small id="slot-instruction">点击物品查看</small></div><div class="inventory-grid" role="group" aria-label="${shop?'装备货架':'人物背包格子'}">${slots.map((id,index)=>{
        const item=SHORE_ITEMS.find(i=>i.id===id);return `<button class="inventory-slot ${item?'filled':''}" data-slot="${index}" ${item&&!shop?'draggable="true"':''} aria-label="格子 ${index+1}：${item?esc(item.name):'空'}">${item?`${itemArt(id)}<span class="slot-name">${esc(item.name)}</span>${item.hook?`<span class="slot-hook">${item.hook}</span>`:''}<span class="slot-count">${shop?`✦${item.price}`:stock(item)!=null?`×${stock(item)}`:shoreItemActive(s,item)?'✓':''}</span>`:'<span class="slot-empty">·</span>'}</button>`;
      }).join('')}</div><div class="inventory-bottom"><span>${slots.filter(Boolean).length} / ${slots.length} 格</span><span>${shop?'到店兑换':'随时整理'}</span></div></div><aside id="item-detail" class="item-detail" aria-live="polite"></aside></div>`)+
      (shop?`<div class="button-row"><button id="shop-sell" class="primary" ${s.catches.length?'':'disabled'}>兑换鱼获 · ${s.catches.length} 尾</button></div>${s.fineDebt?`<p class="credits-note">待缴罚款 ${s.fineDebt} 点，收入先补缴。</p>`:''}`:''));
    content().querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>openBag(null,b.dataset.tab));
    if(tab==='rig'){renderRodEditor(preferredId);return;}
    const moveTo=index=>{const id=slots[moving];if(sim.moveInventory(moving,index)){report({ok:true});openBag(id);}moving=null;};
    function detail(){
      const item=SHORE_ITEMS.find(i=>i.id===slots[selected]);selectedId=item?.id||null;
      content().querySelectorAll('[data-slot]').forEach(b=>{const active=Number(b.dataset.slot)===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
      if(!item){$('item-detail').innerHTML='<div class="empty-slot-detail">空格子<span>给下一次岸钓留一点位置。</span></div>';return;}
      const repeatable=['rig','bait'].includes(item.kind),owned=items.some(i=>i.id===item.id),active=shoreItemActive(s,item),busy=s.phase!=='walk'||Boolean(s.inspection);
      $('item-detail').innerHTML=`<div class="item-detail-head">${itemArt(item.id)}<div><small>${kindName(item)}</small><h3>${esc(item.name)}</h3></div></div><p>${esc(item.description)}</p><div class="item-facts">${item.hook?`<span>单钩 · ${item.hook}</span>`:''}${stock(item)!=null?`<span>${item.kind==='rig'?'备用':'库存'} × ${stock(item)}</span>`:'<span>已拥有</span>'}${active?'<b>正在使用</b>':''}</div><div class="item-actions">${shop?`<button id="item-buy" class="primary" ${!repeatable&&owned||s.credits<item.price?'disabled':''}>${!repeatable&&owned?'已拥有':`兑换 · ${item.price}`}</button>`:`${item.kind==='book'?'<button id="item-read" class="primary">打开手册</button>':item.kind==='reel'?`<button id="item-equip" class="primary" ${active||busy?'disabled':''}>${active?'正在使用':'启用装备'}</button>`:'<button id="item-assemble" class="primary">鱼竿配置</button>'}<button id="item-move" class="secondary">移动格子</button>`}</div>${busy&&item.kind!=='book'?'<small class="item-location-note">先收回水中的钓组，再调整装备。</small>':''}`;
      paintItems();
      if($('item-buy'))$('item-buy').onclick=()=>{report(sim.buy(item.id));openBag(item.id,'shop');};
      if($('item-read'))$('item-read').onclick=()=>openRules();
      if($('item-equip'))$('item-equip').onclick=()=>{report(sim.configureEquipment(item.id));openBag(item.id);};
      if($('item-assemble'))$('item-assemble').onclick=()=>openBag(item.kind==='rod'?item.id:s.activeRod,'rig');
      if($('item-move'))$('item-move').onclick=()=>{moving=moving===selected?null:selected;$('slot-instruction').textContent=moving==null?'点击物品查看':'再点一个格子，即可移动或交换';$('item-move').textContent=moving==null?'移动格子':'取消移动';};
    }
    content().querySelectorAll('[data-slot]').forEach(b=>{
      const index=Number(b.dataset.slot);
      b.onclick=()=>{if(moving!=null){moveTo(index);return;}selected=index;detail();};
      b.ondragstart=e=>{if(shop||!slots[index]){e.preventDefault();return;}moving=index;e.dataTransfer.setData('text/plain',String(index));e.dataTransfer.effectAllowed='move';};
      b.ondragover=e=>{if(moving!=null)e.preventDefault();};b.ondrop=e=>{e.preventDefault();if(moving!=null)moveTo(index);};b.ondragend=()=>{moving=null;};
      b.onkeydown=e=>{const cols=getComputedStyle(b.parentElement).gridTemplateColumns.split(' ').length,delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-cols,ArrowDown:cols}[e.key];if(delta==null)return;e.preventDefault();selected=Math.max(0,Math.min(slots.length-1,index+delta));detail();content().querySelector(`[data-slot="${selected}"]`).focus();};
    });
    if($('shop-sell'))$('shop-sell').onclick=()=>{report(sim.sellCatch());openShop();};
    detail();paintItems();
  }

  function renderRodEditor(preferredId){
    const s=sim.state,rods=ownedRods(s),rodId=rods.includes(preferredId)?preferredId:s.activeRod,rodItem=SHORE_ITEMS.find(i=>i.id===rodId),supply=s.rodSupplies[rodId],rig=SHORE_ITEMS.find(i=>i.id===supply?.id),bait=BAITS.find(i=>i.id===supply?.bait?.kind),busy=s.phase!=='walk'||Boolean(s.inspection);
    let selectedSlot='rig';
    $('rod-workbench').innerHTML=`<div class="rod-rack" role="group" aria-label="持有的鱼竿">${rods.map(id=>`<button data-rod="${id}" class="rod-card ${id===rodId?'selected':''}" aria-pressed="${id===rodId}">${itemArt(id)}<span>${SHORE_ITEMS.find(i=>i.id===id).name}<small>${s.activeRod===id?'手持中':'背包中'}</small></span></button>`).join('')}</div><div class="rod-editor-heading"><strong>${rodItem.name}</strong><button id="hold-rod" class="primary" ${busy||s.activeRod===rodId?'disabled':''}>${s.activeRod===rodId?'正在使用':'换用这根竿'}</button></div><div class="rod-workbench premade-workbench"><div class="rod-assembly-grid" role="group" aria-label="这根鱼竿的消耗品"><button data-supply-slot="rig" class="assembly-slot"><span>预组装钓组</span>${itemArt(rig?.id||'tackle')}<strong>${rig?.name||'未装钓组'}</strong><small>${rig?`单钩 · ${rig.hook} · ${condition(supply.condition)}`:'需要备用钓组'}</small></button><button data-supply-slot="bait" class="assembly-slot"><span>钩上的鱼饵</span>${itemArt(bait?.id||'bait')}<strong>${bait?.name||'未装鱼饵'}</strong><small>${bait?condition(supply.bait.condition):'需要装饵'}</small></button></div><aside class="rod-parts-picker"><div class="parts-heading"><strong id="parts-title"></strong><small id="parts-subtitle"></small></div><div id="rod-part-options" class="rod-part-options"></div></aside></div><p class="rod-technique">整套换下的钓组与余饵保留；换新饵消耗 1 份，收回再抛不会重复扣库存。</p>${busy?'<p class="rod-busy">先收回水中的钓组，再更换消耗品。</p>':''}`;
    const options=()=>{
      const rigSlot=selectedSlot==='rig',items=rigSlot?SHOP_ITEMS.filter(i=>i.kind==='rig'&&s.rigStock[i.id].length):BAITS.filter(i=>s.inventory[i.id]>0);
      $('parts-title').textContent=rigSlot?'备用钓组':'鱼饵盒';$('parts-subtitle').textContent=rigSlot?'整套更换':'每次更换使用 1 份';
      content().querySelectorAll('[data-supply-slot]').forEach(b=>{b.classList.toggle('selected',b.dataset.supplySlot===selectedSlot);b.setAttribute('aria-pressed',String(b.dataset.supplySlot===selectedSlot));});
      $('rod-part-options').innerHTML=items.length?items.map(i=>`<button data-part="${i.id}" class="rod-part" ${busy||!rigSlot&&(!supply||supply.condition<=.08)?'disabled':''}>${itemArt(i.id)}<strong>${i.name}</strong>${i.hook?`<span class="hook-spec">单钩 · ${i.hook}</span>`:''}<small>× ${stock(i)}</small><span class="supply-action">${rigSlot?'更换钓组':'换新饵'}</span></button>`).join(''):'<p class="credits-note">没有可用库存，到小店补给。</p>';
      content().querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{report(sim.configureEquipment(b.dataset.part,rodId));renderRodEditor(rodId);if(!rigSlot)$('rod-workbench').querySelector('[data-supply-slot="bait"]').click();});paintItems();
    };
    content().querySelectorAll('[data-rod]').forEach(b=>b.onclick=()=>renderRodEditor(b.dataset.rod));
    $('hold-rod').onclick=()=>{report(sim.configureEquipment(rodId));renderRodEditor(rodId);};
    content().querySelectorAll('[data-supply-slot]').forEach(b=>b.onclick=()=>{selectedSlot=b.dataset.supplySlot;options();});options();
  }

  function openJournal() {
    const s = sim.state, catches = s.catches.slice().reverse();
    openDialog('journal', balance(s.credits) + heading('THE DAYS WE KEEP', '鱼获与行程', `下竿 ${s.stats.casts} 次 · 累计上岸 ${s.stats.caught} 尾 · 放流 ${s.stats.released} 尾`) +
      (catches.length ? catches.map((fish, index) => `<div class="catch-row"><div class="catch-thumbnail"><canvas id="journal-fish-${index}"></canvas></div><div><b>${esc(fish.name)}</b><small>${esc(fish.nameEn)}</small><small>${formatLength(fish.lengthCm)} · ${formatWeight(fish.weightKg)} · ${fish.value} 潮汐点</small></div><span>鱼篓中</span></div>`).join('') : '<p class="journal-empty">鱼篓里还很安静。<br>好故事，总会从第一竿开始。</p>') +
      `${sim.nearShop?'<div class="button-row"><button id="journal-shop" class="primary">兑换鱼获</button></div>':''}<p class="credits-note">鱼篓 ${s.catches.length} / 20 尾 · 已交付 ${s.stats.sold} 尾<br>带回小店的鱼获可兑换潮汐点。${s.fineDebt ? `待缴罚款 ${s.fineDebt} 点。` : ''}</p>`);
    catches.forEach((fish, index) => paintFish($(`journal-fish-${index}`), fish, true));
    if($('journal-shop'))$('journal-shop').onclick = openShop;
  }

  function openCatch() {
    const s = sim.state, fish = s.fish;
    if (!fish || s.phase !== 'landed') return;
    openDialog('catch', heading('A MOMENT TO REMEMBER', fish.name, esc(fish.nameEn)) +
      `<div class="catch-hero"><canvas id="catch-art"></canvas></div><div class="catch-stats"><div><strong>${fishLength(fish)}</strong><small>英寸 in</small></div><div><strong>${fishWeight(fish)}</strong><small>磅 lb</small></div><div><strong>${fish.value}</strong><small>潮汐点</small></div><div><strong>${Math.round(s.fightElapsed)}</strong><small>收鱼用时</small></div></div><div class="button-row"><button id="catch-keep" class="primary">放入鱼篓</button><button id="catch-release" class="secondary">记录并放流</button></div><p class="credits-note" id="catch-message" role="status">鱼篓 ${s.catches.length} / 20 尾。带回小店可兑换潮汐点。</p>`);
    paintFish($('catch-art'), fish);
    $('catch-keep').onclick = () => {
      const result = report(sim.resolveCatch(true));
      if (result.ok) closeDialog();
      else $('catch-message').textContent = result.message;
    };
    $('catch-release').onclick = () => {
      const result = report(sim.resolveCatch(false));
      if (result.ok) closeDialog();
      else $('catch-message').textContent = result.message;
    };
  }

  function openHelp() {
    openDialog('help', heading('SLOW DOWN, DROP A LINE', '海风与操作') +
      `<div class="settings-grid"><button id="settings-audio" class="secondary">海浪声音：关</button><button id="help-bag" class="secondary">人物背包 · 查看装备和更换鱼饵</button><button id="help-journal" class="secondary">鱼获与行程 · 查看岸钓收获</button></div><h3>操作</h3><p class="key-list">行走：轻点沙地 / WASD 或方向键<br>偶遇钓友：走到身边聊几句，可能得到一条局部线索<br>沿岸手记：得到线索后出现，只记录已听说的地点与经验<br>岸边抛竿：自己走近浪线，鱼竿操作会在合适的位置出现<br>小店：走近柜台补给、兑换鱼获<br>瞄准：轻点海面选择抛投方向<br>抛竿：轻点近抛；按住抛竿 / 空格蓄力，松手投出<br>蓄力条显示预计抛距；站得靠后或斜抛会减少离岸距离，力气不足会落在沙上<br>咬口：出现鱼讯时点扬竿 / 空格挂钩<br>搏鱼：中鱼后自动进入第一视角；按住收线 / F，张力过高就松手<br>留鱼、放流或脱钩后回到沙滩行走视角<br>收回钓组：收回按钮 / R<br>I 背包 · M 沿岸手记 · J 鱼获 · E 附近互动 · Esc 关闭菜单<br>每根竿保存自己的钓组和余饵；更换新饵消耗一份，断线会丢失整套钓组。鱼上岸后可留鱼或放流；在钓具店补饵、兑换装备和鱼获。</p><h3>怎样等到真实鱼讯</h3><p class="credits-note">鱼成群活动：海鲫沿沙槽巡游，白石首鱼在沙底觅食，银汉鱼在上层游走。饵泡在水里越久，气味被水流带得越远，更容易把附近的鱼群引来；频繁收竿重抛会让气味从头开始，落水的铅坠也会暂时惊走近处的鱼。鱼来了会先试探，竿尖轻点就是有鱼在看饵；钓层、钩号、钓组稳定程度和鱼饵决定它咬不咬。抛得远或装备贵都不保证中鱼。先观察几组浪，再根据钓组沉降、缓移或滚动的反馈调整落点。沙蟹与较小钩可尝试近岸海鲫；白石首鱼（White croaker）偏好沙底附近的鱿鱼条或鱼肉，银汉鱼（Jacksmelt）则适合小钩浮钓上层水域。鳀鱼块并非活饵，比目鱼也需要合适的水域和呈现。</p><p class="credits-note">Carolina 套装为 1 oz（28 g）、#1 钩；滑铅套装为 3 oz（85 g）、2/0 钩；浮钓套装为 #6 单钩、钩深约 1 m。重铅更能抗流稳底，大钩却未必适合小鱼。浮钓看浮漂，强破浪会影响漂稳和鱼饵呈现。浸泡与浪冲会损耗余饵，收回再抛不会自动补新饵。</p><h3>今天的海</h3><p class="credits-note">Hs 是有效波高，秒数是波周期，均为游戏模拟海况。浪高相同，长周期涌浪也可能带来更强的近底扰动；浪组、水深与破浪会影响钓组稳定、漂移和搏鱼张力。</p><p class="credits-note">菜单与切到后台时暂停。行程自动保存；离开后回来，抛出的钓组会安全收回。</p><p class="credits-note">原创 Canvas 像素美术与合成海浪声。场景参考 Sharp Park 与 Half Moon Bay State Beach。沙槽按海岸规律生成；浅坝碎浪、深槽暗带与缺口漂流会影响钓组与鱼讯。菜单暂停，自动保存。封闭栈桥的越栏、巡查和罚款均为游戏设定。<a href="./coastal-notes.html" target="_blank" rel="noopener">海岸资料与建模说明 ↗</a></p>`);
    $('help-bag').onclick = () => openBag();
    $('help-journal').onclick = openJournal;
  }

  return {openShop, openBag, openJournal, openCatch, openHelp};
}
