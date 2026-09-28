import {BAITS, SHOP_ITEMS} from './pacifica-sim.js?v=coast-3';
import {drawItemIcon} from './pixel-item-icons.js?v=20260928-pixel-v79';
import {createPixelSprites} from './pixel-sprites.js?v=20260928-pixel-v79';

// Pacifica uses the game's shared modal, inventory and pixel-art components.
// These views only call the existing simulation actions; the save format stays
// scene-specific; inventory reflects the equipment the simulation owns.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const heading = (eyebrow, title, description = '') => `<div class="eyebrow">${esc(eyebrow)}</div><h2 id="modal-title">${esc(title)}</h2>${description ? `<p class="modal-desc">${description}</p>` : ''}`;
const balance = credits => `<span class="balance" aria-label="${Math.floor(credits)} 潮汐点">✦ ${Math.floor(credits)}</span>`;
const iconIds = {starter_rod:'rod_light', surf_rod:'rod', starter_reel:'reel_smooth', sealed_reel:'reel_smooth', carolina_rig:'rig_slider', fishfinder_rig:'rig_slider', sandcrab:'bait', squid:'bait', anchovy:'bait_anchovy', beach_bait:'bait'};
const itemArt = id => `<canvas data-item-art="${iconIds[id] || 'tackle'}" width="32" height="32" aria-hidden="true"></canvas>`;
const fishWeight = fish => (fish.weightKg * 2.20462).toFixed(2);

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

  function paintPortrait() {
    const canvas = $('staff-portrait'), sprite = getSprites().dockWorker;
    canvas.width = sprite.width; canvas.height = sprite.height;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.imageSmoothingEnabled = false; ctx.drawImage(sprite, 0, 0); }
  }

  function paintFish(canvas, fish, compact = false) {
    if (!canvas) return;
    const sprite = getSprites().fish[fish.id === 'halibut' ? 'halibut' : 'unknown'];
    const width = compact ? 96 : Math.max(160, Math.floor(canvas.parentElement.clientWidth));
    const height = compact ? 48 : 160;
    canvas.width = width; canvas.height = height;
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${fish.name}，${fishWeight(fish)} 磅`);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#c2d4b7'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#b5c9ad';
    for (let y = compact ? 12 : 32; y < height; y += compact ? 12 : 32) ctx.fillRect(0, y, width, 1);
    const scale = compact ? 1.8 : Math.min(5, (width - 32) / sprite.width);
    ctx.drawImage(sprite, Math.round((width - sprite.width * scale) / 2), Math.round((height - sprite.height * scale) / 2), sprite.width * scale, sprite.height * scale);
  }

  function openShop() {
    if (!sim.nearShop) { closeDialog(); walkShop(); return; }
    const s = sim.state, empty = BAITS.every(item => !s.inventory[item.id]);
    const total = s.catches.reduce((sum, fish) => sum + fish.value, 0);
    openDialog('shop', balance(s.credits) + heading(scene.name.toUpperCase()+' BAIT & TACKLE', '沙滩钓具店') +
      `<div class="staff-banner"><canvas id="staff-portrait" aria-hidden="true"></canvas><p><b>店主 · Bait & Tackle</b>白浪后的水沟，值得多等一会儿。补齐鱼饵，带上合适的岸钓装备再出发。</p></div>` +
      `<div class="tabs gear-tabs"><button class="active" aria-current="page">兑换装备</button><button id="shop-bag">人物背包</button></div>` +
      `<div class="gear-grid">${SHOP_ITEMS.map(item => {
        const owned = s.upgrades.includes(item.id), free = item.kind === 'free';
        const full = item.kind === 'bait' && s.inventory[item.id] + item.quantity > 999;
        const disabled = owned || s.credits < item.price || (free && !empty) || full;
        const label = owned ? '已装备' : free ? empty ? '领取应急鱼饵' : '鱼饵用完时可领取' : full ? '鱼饵盒已满' : `兑换 · ${item.price} 潮汐点`;
        return `<article class="gear-card">${itemArt(item.id)}<strong>${esc(item.name)}${item.quantity ? ` × ${item.quantity}` : ''}</strong><p>${esc(item.description)}</p><small>${item.kind === 'bait' ? `库存 × ${s.inventory[item.id] || 0}` : owned ? '已拥有 · 自动装配' : free ? '店主的应急补给' : '兑换后自动装配'}</small><button data-buy="${esc(item.id)}" class="${owned ? 'equipped' : ''}" ${disabled ? 'disabled' : ''}>${label}</button></article>`;
      }).join('')}</div>` +
      `<div class="button-row"><button id="shop-sell" class="primary" ${s.catches.length ? '' : 'disabled'}>兑换鱼获 · ${s.catches.length} 尾${total ? ` · ✦ ${total}` : ''}</button><button id="shop-leave" class="secondary">前往浪线</button></div><p class="credits-note">潮汐点为游戏积分。虚构钓具店 · 鱼获可在这里兑换潮汐点。${s.fineDebt ? `待缴罚款 ${s.fineDebt} 点，鱼获收入会优先补缴。` : ''}</p>`);
    paintPortrait(); paintItems();
    content().querySelectorAll('[data-buy]').forEach(button => {
      button.onclick = () => { report(sim.buy(button.dataset.buy)); openShop(); };
    });
    $('shop-bag').onclick = () => openBag();
    $('shop-sell').onclick = () => { report(sim.sellCatch()); openShop(); };
    $('shop-leave').onclick = () => { closeDialog(); walkSurf(); };
  }

  function ownedItems() {
    const s = sim.state;
    const rod = s.upgrades.includes('surf_rod') ? {...SHOP_ITEMS.find(item => item.id === 'surf_rod'), slot:'岸钓竿'} :
      {id:'starter_rod', name:'入门岸钓竿', slot:'岸钓竿', description:'随身的岸钓竿。靠近浪线后，按住抛竿蓄力，松手投向海面。'};
    const reel = s.upgrades.includes('sealed_reel') ? {...SHOP_ITEMS.find(item => item.id === 'sealed_reel'), slot:'鱼轮'} :
      {id:'starter_reel', name:'纺车轮', slot:'鱼轮', description:'入门纺车轮。搏鱼时按住收线，张力过高就松手让线。'};
    const rig = s.rig === 'fishfinder' ? {...SHOP_ITEMS.find(item => item.id === 'fishfinder_rig'), slot:'钓组'} :
      {id:'carolina_rig', name:'Carolina 岸钓组', slot:'钓组', description:'已装配的滑坠岸钓组。每次抛投消耗一份所选鱼饵。'};
    return [rod, reel, rig, ...BAITS.filter(item => s.inventory[item.id] > 0).map(item => ({...item, slot:'鱼饵'}))];
  }

  function openBag(preferredId = selectedId) {
    const s = sim.state, items = ownedItems();
    const slots = [...items, ...Array(30 - items.length).fill(null)];
    let selected = Math.max(0, slots.findIndex(item => item?.id === preferredId));
    selectedId = slots[selected]?.id || null;
    openDialog('gear', balance(s.credits) + heading('YOUR TACKLE BOX', '人物背包', `${items.length} 件物品 · ${scene.shortName} 岸钓装备`) +
      `<div class="tabs gear-tabs"><button class="active" aria-current="page">背包</button><button id="bag-shop">${sim.nearShop ? '商店' : '去小店补给'}</button></div>` +
      `<div class="inventory-layout"><div class="inventory-tray"><div class="inventory-toolbar"><span>个人物品</span><small>点击物品查看</small></div><div class="inventory-grid" role="group" aria-label="人物背包格子">${slots.map((item, index) =>
        `<button class="inventory-slot ${item ? 'filled' : ''} ${index === selected ? 'selected' : ''}" data-slot="${index}" aria-label="格子 ${index + 1}：${item ? esc(item.name) : '空'}" aria-pressed="${index === selected}">${item ? `${itemArt(item.id)}<span class="slot-name">${esc(item.name)}</span><span class="slot-count">${item.kind === 'bait' ? `× ${s.inventory[item.id]}` : '✓'}</span>` : '<span class="slot-empty">·</span>'}</button>`
      ).join('')}</div><div class="inventory-bottom"><span>${items.length} / 30 格</span><span>岸钓随身装备</span></div></div><aside id="item-detail" class="item-detail" aria-live="polite"></aside></div>`);
    paintItems();

    function renderDetail() {
      const item = slots[selected]; selectedId = item?.id || null;
      content().querySelectorAll('[data-slot]').forEach(button => {
        const active = Number(button.dataset.slot) === selected;
        button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
      });
      if (!item) { $('item-detail').innerHTML = '<div class="empty-slot-detail">空格子<span>给下一次岸钓留一点位置。</span></div>'; return; }
      const bait = item.kind === 'bait', active = !bait || s.bait === item.id;
      $('item-detail').innerHTML = `<div class="item-detail-head">${itemArt(item.id)}<div><small>${item.slot}</small><h3>${esc(item.name)}</h3></div></div><p>${esc(item.description)}</p><div class="item-facts">${bait ? `<span>库存 × ${s.inventory[item.id]}</span><span>每竿消耗 1 份</span>` : '<span>已拥有</span>'}${active ? '<b>正在使用</b>' : ''}</div><div class="item-actions">${bait ? `<button data-equip="${esc(item.id)}" class="primary" ${active || s.phase !== 'walk' ? 'disabled' : ''}>${active ? '正在使用' : '装上鱼钩'}</button>` : '<button class="primary" disabled>已装备</button>'}</div>${s.phase !== 'walk' && bait ? '<small class="item-location-note">先收回水中的钓组，再调整鱼饵。</small>' : ''}`;
      paintItems();
      const equip = $('item-detail').querySelector('[data-equip]');
      if (equip) equip.onclick = () => { report(sim.equipBait(equip.dataset.equip)); openBag(item.id); };
    }

    content().querySelectorAll('[data-slot]').forEach(button => {
      const index = Number(button.dataset.slot);
      button.onclick = () => { selected = index; renderDetail(); };
      button.onkeydown = event => {
        const columns = getComputedStyle(button.parentElement).gridTemplateColumns.split(' ').length;
        const delta = {ArrowLeft:-1, ArrowRight:1, ArrowUp:-columns, ArrowDown:columns}[event.key];
        if (delta == null) return;
        event.preventDefault();
        selected = Math.max(0, Math.min(slots.length - 1, index + delta)); renderDetail();
        content().querySelector(`[data-slot="${selected}"]`).focus();
      };
    });
    $('bag-shop').onclick = () => { if (sim.nearShop) openShop(); else { closeDialog(); walkShop(); } };
    renderDetail();
  }

  function openJournal() {
    const s = sim.state, catches = s.catches.slice().reverse();
    openDialog('journal', balance(s.credits) + heading('THE DAYS WE KEEP', '鱼获与行程', `下竿 ${s.stats.casts} 次 · 累计上岸 ${s.stats.caught} 尾 · 放流 ${s.stats.released} 尾`) +
      (catches.length ? catches.map((fish, index) => `<div class="catch-row"><div class="catch-thumbnail"><canvas id="journal-fish-${index}"></canvas></div><div><b>${esc(fish.name)}</b><small>${esc(fish.nameEn)}</small><small>${fishWeight(fish)} lb · ${fish.value} 潮汐点</small></div><span>鱼篓中</span></div>`).join('') : '<p class="journal-empty">鱼篓里还很安静。<br>好故事，总会从第一竿开始。</p>') +
      `<div class="button-row"><button id="journal-shop" class="primary">去小店兑换鱼获</button></div><p class="credits-note">鱼篓 ${s.catches.length} / 20 尾 · 已交付 ${s.stats.sold} 尾<br>带回小店的鱼获可兑换潮汐点。${s.fineDebt ? `待缴罚款 ${s.fineDebt} 点。` : ''}</p>`);
    catches.forEach((fish, index) => paintFish($(`journal-fish-${index}`), fish, true));
    $('journal-shop').onclick = () => { closeDialog(); walkShop(); };
  }

  function openCatch() {
    const s = sim.state, fish = s.fish;
    if (!fish || s.phase !== 'landed') return;
    openDialog('catch', heading('A MOMENT TO REMEMBER', fish.name, esc(fish.nameEn)) +
      `<div class="catch-hero"><canvas id="catch-art"></canvas></div><div class="catch-stats"><div><strong>${fishWeight(fish)}</strong><small>磅 lb</small></div><div><strong>${fish.value}</strong><small>潮汐点</small></div><div><strong>${Math.round(s.fightElapsed)}</strong><small>收鱼用时</small></div></div><div class="button-row"><button id="catch-keep" class="primary">放入鱼篓</button><button id="catch-release" class="secondary">记录并放流</button></div><p class="credits-note" id="catch-message" role="status">鱼篓 ${s.catches.length} / 20 尾。带回小店可兑换潮汐点。</p>`);
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
      `<div class="settings-grid"><button id="settings-audio" class="secondary">海浪声音：关</button><button id="help-bag" class="secondary">人物背包 · 查看装备和更换鱼饵</button><button id="help-journal" class="secondary">鱼获与行程 · 查看岸钓收获</button></div><h3>操作</h3><p class="key-list">行走：轻点沙地 / WASD 或方向键<br>前往浪线：点「前往浪线」，自动走到岸钓位置<br>瞄准：轻点海面选择抛投方向<br>抛竿：靠近浪线，按住抛竿 / 空格蓄力，松手投出<br>咬口：出现鱼讯时点扬竿 / 空格挂钩<br>搏鱼：按住收线 / F；张力过高就松手，让鱼跑一小段<br>收回钓组：收回按钮 / R<br>I 背包 · M 沿岸地图 · J 鱼获 · E 小店 · Esc 关闭菜单<br>每次抛投消耗一份鱼饵。鱼上岸后可留鱼或放流；在钓具店补饵、兑换装备和鱼获。</p><h3>今天的海</h3><p class="credits-note">菜单与切到后台时暂停。行程自动保存；离开后回来，抛出的钓组会安全收回。</p><p class="credits-note">原创 Canvas 像素美术与合成海浪声。场景参考 Sharp Park 与 Half Moon Bay State Beach。沙槽按海岸规律生成；浅坝碎浪、深槽暗带与缺口漂流会影响钓组与鱼讯。菜单暂停，自动保存。封闭栈桥的越栏、巡查和罚款均为游戏设定。<a href="./coastal-notes.html" target="_blank" rel="noopener">海岸资料与建模说明 ↗</a></p>`);
    $('help-bag').onclick = () => openBag();
    $('help-journal').onclick = openJournal;
  }

  return {openShop, openBag, openJournal, openCatch, openHelp};
}
