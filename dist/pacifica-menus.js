import {isShoreLure,SHORE_ITEMS,shoreOwnedItems,shoreItemActive,ownedRods} from './shore-equipment.js';
import {BAITS,SHOP_ITEMS} from './pacifica-sim.js';
import {drawItemIcon} from './pixel-item-icons.js';
import {formatNumber,formatLength,formatWeight,cmToInches,kgToPounds} from './units.js';
import {createPixelSprites} from './pixel-sprites.js';
import {normalizeFishIdentity} from './fish-species.js';
import {drawFishArt,fishSpriteKind} from './pixel-fish-art.js';

// Pacifica uses the game's shared modal, inventory and pixel-art components.
// These views only call the existing simulation actions; the save format stays
// scene-specific; inventory reflects the equipment the simulation owns.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const heading = (eyebrow, title, description = '') => `<div class="eyebrow">${esc(eyebrow)}</div><h2 id="modal-title">${esc(title)}</h2>${description ? `<p class="modal-desc">${description}</p>` : ''}`;
const balance = credits => `<span class="balance" aria-label="${Math.floor(credits)} 潮汐点">✦ ${Math.floor(credits)}</span>`;
const iconIds = {grub_jig:'bait_soft',salmon_spoon:'salmon_spoon',salmon_spinner:'salmon_spinner',starter_rod:'rod_light', surf_rod:'rod', starter_reel:'reel_smooth', sealed_reel:'reel_smooth', carolina_rig:'rig_slider', fishfinder_rig:'rig_slider', float_rig:'rig_float', sandcrab:'bait', squid:'bait', anchovy:'bait_anchovy', sandworm:'bait_soft', mussel:'bait_shrimp', ca_fishing_regulations:'ca_fishing_regulations',};
const itemArt = id => `<canvas data-item-art="${iconIds[id] || 'tackle'}" width="32" height="32" aria-hidden="true"></canvas>`;
const hasFishLength = fish => Number.isFinite(fish.length) && fish.length > 0;
const fishLength = fish => hasFishLength(fish) ? formatLength(fish.length) : '未记录';
const fishWeight = fish => formatWeight(Number.isFinite(fish.kg) ? fish.kg : fish.weightKg);
const fishNames = fish => `<strong class="fish-common-name">${esc(fish.commonName || fish.nameEn)}</strong><br><span>${esc(fish.latin)}</span>`;
const catchStatus = {kept:'鱼篓中',released:'已放流',sold:'已交付',confiscated:'已没收'};

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
      $('item-detail').innerHTML=`<div class="item-detail-head">${itemArt(item.id)}<div><small>${kindName(item)}</small><h3>${esc(item.name)}</h3></div></div><p>${esc(item.description)}</p><div class="item-facts">${item.hook?`<span>单钩 · ${item.hook}</span>`:''}${stock(item)!=null?`<span>${item.kind==='rig'?'备用':'库存'} × ${stock(item)}</span>`:owned?'<span>已拥有</span>':'<span>尚未拥有</span>'}${active?'<b>正在使用</b>':''}</div><div class="item-actions">${shop?`<button id="item-buy" class="primary" ${!repeatable&&owned||s.credits<item.price?'disabled':''}>${!repeatable&&owned?'已拥有':`兑换 · ${item.price}`}</button>`:`${item.kind==='book'?'<button id="item-read" class="primary">打开手册</button>':item.kind==='reel'?`<button id="item-equip" class="primary" ${active||busy?'disabled':''}>${active?'正在使用':'启用装备'}</button>`:'<button id="item-assemble" class="primary">鱼竿配置</button>'}<button id="item-move" class="secondary">移动格子</button>`}</div>${busy&&item.kind!=='book'?'<small class="item-location-note">先收回水中的钓组，再调整装备。</small>':''}`;
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
    $('rod-workbench').innerHTML=`<div class="rod-rack" role="group" aria-label="持有的鱼竿">${rods.map(id=>`<button data-rod="${id}" class="rod-card ${id===rodId?'selected':''}" aria-pressed="${id===rodId}">${itemArt(id)}<span>${SHORE_ITEMS.find(i=>i.id===id).name}<small>${s.activeRod===id?'手持中':'背包中'}</small></span></button>`).join('')}</div><div class="rod-editor-heading"><strong>${rodItem.name}</strong><button id="hold-rod" class="primary" ${busy||s.activeRod===rodId?'disabled':''}>${s.activeRod===rodId?'正在使用':'换用这根竿'}</button></div><div class="rod-workbench premade-workbench"><div class="rod-assembly-grid" role="group" aria-label="这根鱼竿的消耗品"><button data-supply-slot="rig" class="assembly-slot"><span>预组装钓组</span>${itemArt(rig?.id||'tackle')}<strong>${rig?.name||'未装钓组'}</strong><small>${rig?`单钩 · ${rig.hook} · ${condition(supply.condition)}`:'需要备用钓组'}</small></button><button data-supply-slot="bait" class="assembly-slot" ${isShoreLure(supply?.id)?'hidden':''}><span>钩上的鱼饵</span>${itemArt(bait?.id||'bait')}<strong>${bait?.name||'未装鱼饵'}</strong><small>${bait?condition(supply.bait.condition):'需要装饵'}</small></button></div><aside class="rod-parts-picker"><div class="parts-heading"><strong id="parts-title"></strong><small id="parts-subtitle"></small></div><div id="rod-part-options" class="rod-part-options"></div></aside></div><p class="rod-technique">整套换下的钓组与余饵保留；换新饵消耗 1 份，收回再抛不会重复扣库存。</p>${busy?'<p class="rod-busy">先收回水中的钓组，再更换消耗品。</p>':''}`;
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
    if(scene.id==='benicia'){
      openDialog('help',heading('FIRST STREET · CARQUINEZ STRAIT','水流与操作')+
        `<div class="settings-grid"><button id="settings-audio" class="secondary">水声：关</button><button id="help-bag" class="secondary">人物背包 · 装备与消耗品</button><button id="help-journal" class="secondary">鱼获与行程</button></div>
        <h3>沿岸走走</h3><p class="key-list">轻点陆地行走，走近摊位补给、兑换鱼获。这里的公共码头可以正常进入。点附近钓友聊天，听来的线索会留在沿岸手记。岸边抛收人多，找一个空位，给邻居留出走线空间。</p>
        <h3>抛、收、停</h3><p class="key-list">轻点水面瞄准；按住抛竿 / 空格蓄力，松开投出。<br>点击摇轮 / 轻按 F 卷线，停点后拟饵下沉。连续点击决定收线节奏；轻抽 / T 做短促动作。点得越密收得越快，停点就停收，收至手边后才能走动或重抛。<br>咬口时点扬竿 / 空格。鱼会游动、冲刺和下潜；根据竿弯、动作和线的拉力控制收线与泄力。镜头跟随同一场景里的鱼，不切换画面。</p>
        <h3>这里的水</h3><p class="credits-note">亮片、旋转亮片和软饵铅头钩需要合适的收停节奏。石岸边停太久可能挂底。天然饵组可以等候或慢拖；只有浮钓组显示浮漂。潮流会改变水中钓组的方向与泳姿，涨潮向东，退潮向西。帝王鲑是季节性过路鱼，不是每次抛投都有鱼讯。</p>
        <p class="credits-note">每根竿保留自己的钓组；换新饵、断线与补给沿用其他钓场的背包机制。菜单与切到后台时暂停，回来保持原来的时间和行程。I 背包 · M 手记 · J 鱼获 · Esc 关闭。</p>
        <p class="credits-note">First Street 的缩尺像素演绎；水深、潮速与鱼群数量为游戏近似，非实时预报或测绘海图。钓友和补给车为虚构。<a href="./coastal-notes.html" target="_blank" rel="noopener">场景资料与范围 ↗</a></p>`);
      $('help-bag').onclick=()=>openBag();$('help-journal').onclick=openJournal;return;
    }
    if(scene.id==='benicia'){
      openDialog('help',heading('CAST, WORK, REPEAT','河湾与操作')+
        '<div class="settings-grid"><button id="settings-audio" class="secondary">环境声音：关</button><button id="help-bag" class="secondary">人物背包 · 配置钓组</button><button id="help-journal" class="secondary">鱼获与行程</button></div><h3>岸边和公共钓鱼码头</h3><p class="key-list">轻点地面 / WASD 或方向键行走；走近钓友可听取线索。公共钓鱼码头开放，可从入口走进去。留出抛投空隙，避开他人的钓线。<br>轻点水面瞄准；按住抛竿 / 空格蓄力，松手抛出。亮片落水后停顿下沉，再点击摇轮 / 轻按 F。<br>用点击摇轮的频率控制收线，长按不会持续收线；轻抽让拟饵跳起。停点会让拟饵继续沉降，泄力可单独调松紧。钓组回到手边后才能重抛。<br>鱼讯出现时扬竿 / 空格；中鱼后看竿弯和鱼线，听泄力出线。竿身压弯时缓收，放松泄力允许鱼出线。控制住近岸鱼，才能上岸。<br>I 背包 · M 手记 · J 鱼获 · E 附近互动 · Esc 关闭菜单。</p><h3>选钓组、换节奏</h3><p class="credits-note">勺形亮片适合连续摆动，旋转亮片需要相对水流速度带动叶片，卷尾软饵可慢收或跳底。收线快或抬竿高会提高钓层；河湾潮流改变拟饵的速度和方向。岩石边让拟饵长时间触底可能挂底、丢失钓组。底钓组与浮钓组也能逐步收近；只有浮钓组带浮漂。每根竿保存自己的装配，收回重抛不重复扣库存，天然饵的损耗也不会被重置。</p><p class="credits-note">钓具店可以补给并兑换鱼获。查阅手册了解当前地点和鱼种的规则。菜单和切到后台时暂停，行程自动保存。</p>');
      $('help-bag').onclick=()=>openBag();$('help-journal').onclick=openJournal();return;
    }
    openDialog('help', heading('SLOW DOWN, DROP A LINE', '海风与操作') +
      `<div class="settings-grid"><button id="settings-audio" class="secondary">海浪声音：关</button><button id="help-bag" class="secondary">人物背包 · 查看装备和更换鱼饵</button><button id="help-journal" class="secondary">鱼获与行程 · 查看岸钓收获</button></div><h3>操作</h3><p class="key-list">行走：轻点沙地 / WASD 或方向键<br>偶遇钓友：走到身边聊几句，可能得到一条局部线索<br>沿岸手记：得到线索后出现，只记录已听说的地点与经验<br>岸边抛竿：自己走近浪线，鱼竿操作会在合适的位置出现<br>小店：走近柜台补给、兑换鱼获<br>瞄准：轻点海面选择抛投方向<br>抛竿：轻点近抛；按住抛竿 / 空格蓄力，松手投出<br>看人物拉竿和竿身受力掌握出手；站得靠后或斜抛会减少离岸距离，力气不足会落在沙上<br>咬口：出现鱼讯时点扬竿 / 空格挂钩<br>搏鱼：镜头跟随钓组与鱼；点击摇轮 / 轻按 F，竿身压弯时缓收，调松泄力让鱼出线<br>鱼上岸后选择留鱼或放流，再继续走动与抛投<br>收回钓组：连续点按摇轮，收至手边后可再次抛投<br>操控钓组：点击摇轮 / 轻按 F，点得越密收得越快；停点后拟饵重新下沉。单独调整泄力松紧，轻抽 / T 让拟饵或轻组跳起<br>I 背包 · M 沿岸手记 · J 鱼获 · E 附近互动 · Esc 关闭菜单<br>每根竿保存自己的钓组和余饵；更换新饵消耗一份，断线会丢失整套钓组。鱼上岸后可留鱼或放流；在钓具店补饵、兑换装备和鱼获。</p><h3>反复抛收与拟饵</h3><p class="credits-note">亮片适合连续收线，旋转亮片需要水流带动叶片；卷尾软饵可慢收、停顿或轻抽跳底。收得快、竿尖高会抬高钓层，暂停让拟饵下沉。Carolina 可慢拖，重滑铅更能稳底；只有浮钓组带浮漂。任何钓组都要逐步收近岸边，才能走动或再次抛投。</p><h3>怎样等到真实鱼讯</h3><p class="credits-note">鱼成群活动：海鲫沿沙槽巡游，白石首鱼在沙底觅食，银汉鱼在上层游走。饵泡在水里越久，气味被水流带得越远，更容易把附近的鱼群引来；频繁收竿重抛会让气味从头开始，落水的铅坠也会暂时惊走近处的鱼。鱼来了会先试探，竿尖轻点就是有鱼在看饵；钓层、钩号、钓组稳定程度和鱼饵决定它咬不咬。抛得远或装备贵都不保证中鱼。先观察几组浪，再根据钓组沉降、缓移或滚动的反馈调整落点。沙蟹与较小钩可尝试近岸海鲫；白石首鱼（White croaker）偏好沙底附近的鱿鱼条或鱼肉，银汉鱼（Jacksmelt）则适合小钩浮钓上层水域。鳀鱼块并非活饵，比目鱼也需要合适的水域和呈现。</p><p class="credits-note">Carolina 套装为 1 oz（28 g）、#1 钩；滑铅套装为 3 oz（85 g）、2/0 钩；浮钓套装为 #6 单钩、钩深约 1 m。重铅更能抗流稳底，大钩却未必适合小鱼。浮钓看浮漂，强破浪会影响漂稳和鱼饵呈现。浸泡与浪冲会损耗余饵，收回再抛不会自动补新饵。</p><h3>今天的海</h3><p class="credits-note">观察浪头、破浪和漂流判断水势。这里是游戏模拟海况。浪高相同，长周期涌浪也可能带来更强的近底扰动；浪组、水深与破浪会影响钓组稳定、漂移和搏鱼张力。</p><p class="credits-note">菜单与切到后台时暂停。行程自动保存；离开后回来，抛出的钓组会安全收回。</p><p class="credits-note">原创 Canvas 像素美术与海浪、泄力出线合成声音。场景参考 Sharp Park 与 Half Moon Bay State Beach。沙槽按海岸规律生成；浅坝碎浪、深槽暗带与缺口漂流会影响钓组与鱼讯。菜单暂停，自动保存。封闭栈桥的越栏、巡查和罚款均为游戏设定。<a href="./coastal-notes.html" target="_blank" rel="noopener">海岸资料与建模说明 ↗</a></p>`);
    $('help-bag').onclick = () => openBag();
    $('help-journal').onclick = openJournal;
  }

  return {openShop, openBag, openJournal, openCatch, openHelp};
}
