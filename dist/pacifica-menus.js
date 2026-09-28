import {SHORE_ITEMS,shoreOwnedItems,shoreItemActive,ownedRods} from './shore-equipment.js?v=species-1';
import {BAITS, SHOP_ITEMS} from './pacifica-sim.js?v=species-1';
import {drawItemIcon} from './pixel-item-icons.js?v=20260928-pixel-v80';
import {createPixelSprites} from './pixel-sprites.js?v=species-1';
import {normalizeFishIdentity} from './fish-species.js?v=species-1';
import {drawFishArt,fishSpriteKind} from './pixel-fish-art.js?v=species-1';
import {formatLength,formatWeight} from './units.js?v=species-1';

// Pacifica uses the game's shared modal, inventory and pixel-art components.
// These views only call the existing simulation actions; the save format stays
// scene-specific; inventory reflects the equipment the simulation owns.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const heading = (eyebrow, title, description = '') => `<div class="eyebrow">${esc(eyebrow)}</div><h2 id="modal-title">${esc(title)}</h2>${description ? `<p class="modal-desc">${description}</p>` : ''}`;
const balance = credits => `<span class="balance" aria-label="${Math.floor(credits)} 潮汐点">✦ ${Math.floor(credits)}</span>`;
const iconIds = {starter_rod:'rod_light', surf_rod:'rod', starter_reel:'reel_smooth', sealed_reel:'reel_smooth', carolina_rig:'rig_slider', fishfinder_rig:'rig_slider', sandcrab:'bait', squid:'bait', anchovy:'bait_anchovy',};
const itemArt = id => `<canvas data-item-art="${iconIds[id] || 'tackle'}" width="32" height="32" aria-hidden="true"></canvas>`;
const hasFishLength = fish => Number.isFinite(fish.length) && fish.length > 0;
const fishLength = fish => hasFishLength(fish) ? formatLength(fish.length) : '未记录';
const fishWeight = fish => formatWeight(Number.isFinite(fish.kg) ? fish.kg : fish.weightKg);
const fishNames = fish => `<strong class="fish-common-name">${esc(fish.commonName || fish.nameEn)}</strong><br><span>${esc(fish.latin)}</span>`;
const catchStatus = {kept:'鱼篓中',released:'已放流',sold:'已交付',confiscated:'已没收'};

export function createPacificaMenus({sim, scene, openDialog, closeDialog, feedback, walkShop, walkSurf}) {
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
    const kind = fishSpriteKind(fish), sprite = getSprites().fish[kind] || getSprites().fish.unknown;
    const width = compact ? 96 : Math.max(160, Math.floor(canvas.parentElement.clientWidth));
    const layout = drawFishArt(canvas, sprite, fish, {width, height: compact ? 48 : 180, compact});
    canvas.style.width = `${layout.width}px`; canvas.style.height = `${layout.height}px`;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${fish.name}，长度${fishLength(fish)}，${fishWeight(fish)}`);
    canvas.dataset.fishKind = kind;
    canvas.dataset.speciesId = fish.speciesId || '';
    canvas.dataset.fishLengthCm = hasFishLength(fish) ? String(fish.length) : '';
    return layout;
  }

  function openShop(){if(sim.nearShop)openBag(null,'shop');}
  const kindName=item=>({rod:'岸钓竿',reel:'鱼轮',rig:'预组装钓组',bait:'鱼饵'})[item.kind];
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
      $('item-detail').innerHTML=`<div class="item-detail-head">${itemArt(item.id)}<div><small>${kindName(item)}</small><h3>${esc(item.name)}</h3></div></div><p>${esc(item.description)}</p><div class="item-facts">${item.hook?`<span>单钩 · ${item.hook}</span>`:''}${stock(item)!=null?`<span>${item.kind==='rig'?'备用':'库存'} × ${stock(item)}</span>`:'<span>已拥有</span>'}${active?'<b>正在使用</b>':''}</div><div class="item-actions">${shop?`<button id="item-buy" class="primary" ${!repeatable&&owned||s.credits<item.price?'disabled':''}>${!repeatable&&owned?'已拥有':`兑换 · ${item.price}`}</button>`:`${item.kind==='reel'?`<button id="item-equip" class="primary" ${active||busy?'disabled':''}>${active?'正在使用':'启用装备'}</button>`:'<button id="item-assemble" class="primary">鱼竿配置</button>'}<button id="item-move" class="secondary">移动格子</button>`}</div>${busy?'<small class="item-location-note">先收回水中的钓组，再调整装备。</small>':''}`;
      paintItems();
      if($('item-buy'))$('item-buy').onclick=()=>{report(sim.buy(item.id));openBag(item.id,'shop');};
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
    const s = sim.state, catches = s.catchHistory.slice().reverse().map(normalizeFishIdentity);
    openDialog('journal', balance(s.credits) + heading('THE DAYS WE KEEP', '鱼获与行程', `下竿 ${s.stats.casts} 次 · 累计上岸 ${s.stats.caught} 尾 · 放流 ${s.stats.released} 尾`) +
      (catches.length ? catches.map((fish, index) => `<div class="catch-row"><div class="catch-thumbnail"><canvas id="journal-fish-${index}"></canvas></div><div><b>${esc(fish.name)}</b><small>${esc(fish.commonName || fish.nameEn)}</small><small>${esc(fish.latin)}</small><small>长度${fishLength(fish)} · ${fishWeight(fish)}</small><small>${fish.status === 'released' ? '放流不兑换积分' : fish.status === 'confiscated' ? '鱼获已没收，未兑换' : `${fish.status === 'sold' ? '鱼获价值' : '可兑换'} ${fish.value} 潮汐点`}</small></div><span>${catchStatus[fish.status] || '已记录'}</span></div>`).join('') : '<p class="journal-empty">还没有记录的鱼获。<br>好故事，总会从第一竿开始。</p>') +
      `${sim.nearShop?'<div class="button-row"><button id="journal-shop" class="primary">兑换鱼获</button></div>':''}<p class="credits-note">鱼篓 ${s.catches.length} / 20 尾 · 已交付 ${s.stats.sold} 尾<br>留鱼与放流都保留记录。鱼篓中的鱼带回小店可兑换潮汐点。${s.fineDebt ? `待缴罚款 ${s.fineDebt} 点。` : ''}</p>`);
    catches.forEach((fish, index) => paintFish($(`journal-fish-${index}`), fish, true));
    if($('journal-shop'))$('journal-shop').onclick = openShop;
  }

  function openCatch() {
    const s = sim.state;
    if (!s.fish || s.phase !== 'landed') return;
    const fish = normalizeFishIdentity(s.fish);
    openDialog('catch', heading('A MOMENT TO REMEMBER', fish.name, fishNames(fish)) +
      `<div class="catch-hero" tabindex="0"><canvas id="catch-art"></canvas></div><div class="catch-stats"><div><strong>${fishLength(fish)}</strong><small>${hasFishLength(fish) ? fish.lengthType === 'fork' ? '叉长' : '全长' : '长度'}</small></div><div><strong>${fishWeight(fish)}</strong><small>重量</small></div><div><strong>${Math.round(s.fightElapsed)} s</strong><small>收鱼用时</small></div></div><div class="button-row"><button id="catch-keep" class="primary">放入鱼篓</button><button id="catch-release" class="secondary">记录并放流</button></div><p class="credits-note" id="catch-message" role="status">鱼篓 ${s.catches.length} / 20 尾。带回小店可兑换 ${fish.value} 潮汐点；放流保留记录，不兑换积分。</p>`);
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
      `<div class="settings-grid"><button id="settings-audio" class="secondary">海浪声音：关</button><button id="help-bag" class="secondary">人物背包 · 查看装备和更换鱼饵</button><button id="help-journal" class="secondary">鱼获与行程 · 查看岸钓收获</button></div><h3>操作</h3><p class="key-list">行走：轻点沙地 / WASD 或方向键<br>偶遇钓友：走近后点「打个招呼」，聊天可能得到一条局部线索<br>沿岸手记：得到线索后出现，只记录已听说的地点与经验<br>前往浪线：点「前往浪线」，自动走到岸钓位置<br>瞄准：轻点海面选择抛投方向<br>抛竿：靠近浪线，按住抛竿 / 空格蓄力，松手投出<br>咬口：出现鱼讯时点扬竿 / 空格挂钩<br>搏鱼：中鱼后自动进入第一视角；按住收线 / F，张力过高就松手<br>留鱼、放流或脱钩后回到沙滩行走视角<br>收回钓组：收回按钮 / R<br>I 背包 · M 沿岸手记 · J 鱼获 · E 小店 · Esc 关闭菜单<br>每根竿保存自己的钓组和余饵；更换新饵消耗一份，断线会丢失整套钓组。鱼上岸后可留鱼或放流；在钓具店补饵、兑换装备和鱼获。</p><h3>今天的海</h3><p class="credits-note">菜单与切到后台时暂停。行程自动保存；离开后回来，抛出的钓组会安全收回。</p><p class="credits-note">原创 Canvas 像素美术与合成海浪声。场景参考 Sharp Park 与 Half Moon Bay State Beach。沙槽按海岸规律生成；浅坝碎浪、深槽暗带与缺口漂流会影响钓组与鱼讯。菜单暂停，自动保存。封闭栈桥的越栏、巡查和罚款均为游戏设定。<a href="./coastal-notes.html" target="_blank" rel="noopener">海岸资料与建模说明 ↗</a></p>`);
    $('help-bag').onclick = () => openBag();
    $('help-journal').onclick = openJournal;
  }

  return {openShop, openBag, openJournal, openCatch, openHelp};
}
