import {PacificaSimulation,WORLD,SHOP,BAITS,SHOP_ITEMS,SAVE_KEY} from './pacifica-sim.js?v=pacifica-1';
import {createPacificaWorld} from './pacifica-world.js?v=pacifica-1';

const $=id=>document.getElementById(id), show=(id,value)=>{$(id).hidden=!value;};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved;try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{}
const sim=new PacificaSimulation({saved}),world=createPacificaWorld($('beach-world'));
const keys=new Set(),dialog=$('beach-dialog');
let started=false,focused=true,last=performance.now(),lastSave=0,lastPhase=sim.state.phase,lastMessage='',chargeStart=0,reeling=false,shopOnArrival=false,scenePickerOpen=false,toastTimer,modalType='',sound=null,soundEnabled=false;
let aim=0;
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(sim.snapshot()));}catch{}}
function feedback(result){if(result?.message)toast(result.message);persist();updateUI();return result;}
function toast(message){$('beach-toast').textContent=message;$('beach-toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('beach-toast').classList.remove('show'),3300);}
function resetInput(){keys.clear();chargeStart=0;reeling=false;$('beach-reel').classList.remove('active');show('cast-charge',false);}
function paused(){return !started||dialog.open||scenePickerOpen||document.hidden||!focused;}
function openDialog(type,html){resetInput();modalType=type;$('dialog-content').innerHTML=html;if(!dialog.open)dialog.showModal();$('dialog-close').focus();}
function closeDialog(){dialog.close();modalType='';last=performance.now();}
$('dialog-close').onclick=closeDialog;
dialog.addEventListener('close',()=>{resetInput();modalType='';last=performance.now();$('beach-world').focus({preventScroll:true});});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});

function createSound(){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;
  const ctx=new Audio(),buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buffer.getChannelData(0);let n=0;
  for(let i=0;i<data.length;i++){n=(n+(Math.random()*2-1)*.028)/1.028;data[i]=n*3;}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=550;gain.gain.value=0;source.connect(filter).connect(gain).connect(ctx.destination);source.start();return{ctx,gain,filter};
}
$('beach-sound').onclick=()=>{sound??=createSound();if(!sound){toast('当前浏览器不支持海浪声音');return;}soundEnabled=!soundEnabled;sound.ctx.resume();$('beach-sound').textContent=soundEnabled?'♪':'♩';$('beach-sound').setAttribute('aria-label',soundEnabled?'关闭海浪声音':'开启海浪声音');};

function start(){started=true;$('beach-app').classList.remove('welcome-open');show('beach-welcome',false);show('beach-console',true);show('beach-nav',true);resize();last=performance.now();toast(saved?'欢迎回到 Pacifica，岸钓行程已恢复。':'先去小店逛逛，或点「去浪线」开始岸钓。');if(sim.state.phase==='landed')openCatch();updateUI();}
$('beach-start').onclick=start;
if(saved)$('beach-start').innerHTML='继续沙滩时光 <span>↗</span>';
function walkSurf(){if(sim.state.phase!=='walk'){toast('先收回钓组，再换钓位。');return;}shopOnArrival=false;const x=Math.min(1000,Math.max(180,sim.state.player.x-210));feedback(sim.walkTo(x,WORLD.shoreY(x)+57));}
function walkShop(){if(sim.state.phase!=='walk'){toast('先收回钓组，再回小店。');return;}if(sim.nearShop){openShop();return;}shopOnArrival=true;feedback(sim.walkTo(SHOP.door.x,SHOP.door.y));}
$('walk-surf').onclick=walkSurf;$('walk-shop').onclick=walkShop;
$('beach-world').addEventListener('pointerdown',e=>{
  if(paused()||e.button>0)return;const p=world.screenToWorld(e.clientX,e.clientY);if(!p)return;
  if(p.x>=SHOP.x-20&&p.x<=SHOP.x+SHOP.width+20&&p.y>=SHOP.y-65&&p.y<=SHOP.door.y+30){walkShop();return;}
  if(p.y<WORLD.shoreY(p.x)){if(sim.state.phase==='bite'){feedback(sim.strike());return;}aim=Math.max(-1,Math.min(1,(p.x-sim.state.player.x)/Math.max(100,sim.state.player.y-p.y)));$('beach-aim').value=aim;updateUI();return;}
  shopOnArrival=false;feedback(sim.walkTo(p.x,p.y));
});
$('beach-aim').oninput=e=>{aim=Number(e.target.value);updateUI();};
function primaryAction(){if(sim.state.phase==='bite')feedback(sim.strike());else if(sim.state.phase==='landed')openCatch();}
function beginCharge(){if(paused())return;if(sim.state.phase!=='walk'){primaryAction();return;}if(!sim.state.inventory[sim.state.bait]){toast('这种鱼饵用完了，打开背包换饵，或去小店补给。');return;}if(!sim.canCast){toast('走到湿沙边缘，面朝海面再抛竿。');return;}chargeStart=performance.now();show('cast-charge',true);}
function finishCharge(cancel=false){if(!chargeStart)return;const power=Math.min(1,Math.max(.25,(performance.now()-chargeStart)/1400));chargeStart=0;show('cast-charge',false);if(!cancel)feedback(sim.cast({power,aim}));}
$('beach-cast').addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();$('beach-cast').setPointerCapture(e.pointerId);beginCharge();});
$('beach-cast').addEventListener('pointerup',()=>finishCharge());
$('beach-cast').addEventListener('pointercancel',()=>finishCharge(true));
$('beach-cast').addEventListener('lostpointercapture',()=>finishCharge(true));
$('beach-cast').addEventListener('click',e=>{if(e.detail!==0)return;if(sim.state.phase==='walk'){if(sim.canCast)feedback(sim.cast({power:.65,aim}));else toast(!sim.state.inventory[sim.state.bait]?'这种鱼饵用完了，打开背包换饵，或去小店补给。':'先点「去浪线」，到湿沙边缘抛竿。');}else primaryAction();});
function setReel(active){reeling=active&&!paused()&&sim.state.phase==='fighting';$('beach-reel').classList.toggle('active',reeling);}
$('beach-reel').addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();$('beach-reel').setPointerCapture(e.pointerId);setReel(true);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('beach-reel').addEventListener(name,()=>setReel(false));
$('beach-reel').addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();setReel(true);}});
$('beach-reel').addEventListener('keyup',()=>setReel(false));
$('beach-reel').addEventListener('blur',()=>setReel(false));
$('beach-retrieve').onclick=()=>feedback(sim.retrieve());

const itemIcons={sandcrab:'♋',squid:'♧',anchovy:'≋',surf_rod:'╱',sealed_reel:'◎',fishfinder_rig:'♧',beach_bait:'♋'};
function heading(kicker,title){return `<span class="dialog-kicker">${kicker}</span><h2 id="dialog-title">${title}</h2>`;}
function openShop(){
  if(!sim.nearShop){walkShop();return;}shopOnArrival=false;
  const s=sim.state;
  openDialog('shop',heading('OPEN EARLY. FISH SLOW.','浪边小店')+`<div class="shop-banner"><div><strong>BAIT & TACKLE</strong><small>PACIFICA BEACH SUPPLY CO.</small></div><b>✦ ${Math.floor(s.credits)}</b></div><p class="lede">「白浪后的水沟，值得多等一会儿。」<br>补一盒饵，换支长竿。今天不赶时间。</p><div class="item-grid">${SHOP_ITEMS.map(item=>{const owned=s.upgrades.includes(item.id),free=item.kind==='free',empty=Object.values(s.inventory).every(n=>n===0),disabled=owned||s.credits<item.price||(free&&!empty);return `<article class="shop-item"><span class="item-icon" aria-hidden="true">${itemIcons[item.id]||'⌁'}</span><h3>${esc(item.name)}${item.quantity?' × '+item.quantity:''}</h3><p>${esc(item.description)}</p><button data-buy="${esc(item.id)}" ${disabled?'disabled':''}>${owned?'已装备':free?(empty?'领取应急鱼饵':'鱼饵用完时可领取'):'✦ '+item.price+' · 购买'}</button></article>`;}).join('')}</div><div class="dialog-actions"><button id="shop-sell" class="primary" ${s.catches.length?'':'disabled'}>交付鱼获 · ${s.catches.length} 尾</button><button id="shop-leave" class="secondary">去沙滩 ↗</button></div><p class="source-note">虚构钓具店 · 所有价格与鱼获兑换均为游戏积分。</p>`);
  dialog.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{feedback(sim.buy(b.dataset.buy));openShop();});
  $('shop-sell').onclick=()=>{feedback(sim.sellCatch());openShop();};$('shop-leave').onclick=()=>{closeDialog();walkSurf();};
}
function openBag(){const s=sim.state;openDialog('bag',heading('PACK LIGHT. CAST FAR.','岸钓背包')+`<p class="lede">${s.upgrades.includes('surf_rod')?'长投岸钓竿':'入门岸钓竿'} · ${s.upgrades.includes('sealed_reel')?'密封纺车轮':'纺车轮'}<br>${s.rig==='fishfinder'?'滑坠探鱼钓组':'Carolina 岸钓组'} · 切换鱼饵会影响游戏中的鱼种分布。</p><div class="item-grid">${BAITS.map(item=>`<article class="bag-item"><span class="item-icon" aria-hidden="true">${itemIcons[item.id]}</span><h3>${esc(item.name)} × ${s.inventory[item.id]||0}</h3><p>${esc(item.description)}</p><button data-equip="${item.id}" ${s.bait===item.id||s.phase!=='walk'||!s.inventory[item.id]?'disabled':''}>${s.bait===item.id?'正在使用':'装上鱼钩'}</button></article>`).join('')}</div><div class="dialog-actions"><button id="bag-shop" class="secondary">去小店补给 ↗</button></div>`);dialog.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{feedback(sim.equipBait(b.dataset.equip));openBag();});$('bag-shop').onclick=()=>{closeDialog();walkShop();};}
$('beach-bag').onclick=openBag;
function fishLabel(f){return `${(f.weightKg*2.20462).toFixed(2)} lb${Number.isFinite(f.lengthCm)?' · '+(f.lengthCm/2.54).toFixed(1)+' in':''}`;}
function openJournal(){const s=sim.state;openDialog('journal',heading('A MORNING WELL SPENT','沙滩鱼获')+`<div class="mini-stats"><span><b>${s.stats.caught}</b>总计上岸</span><span><b>${s.stats.released}</b>放流</span><span><b>${s.stats.casts}</b>抛竿</span></div>${s.catches.length?`<ul class="catch-list">${s.catches.map(f=>`<li><div><strong>${esc(f.name)}</strong><small>${esc(f.nameEn)} · ${fishLabel(f)}</small></div><b>✦ ${f.value}</b></li>`).join('')}</ul>`:'<p class="empty-note">鱼篓里还空着。<br>去白浪边，试试今天的第一竿。</p>'}<div class="dialog-actions"><button id="journal-shop" class="primary">去小店交付鱼获 ↗</button></div><p class="source-note">鱼篓里的鱼可在钓具店兑换游戏积分。Santa Cruz 与 Pacifica 的行程分别保存。</p>`);$('journal-shop').onclick=()=>{closeDialog();walkShop();};}
$('beach-journal').onclick=openJournal;
function openCatch(){const f=sim.state.fish;if(!f||sim.state.phase!=='landed')return;openDialog('catch',heading('FROM THE SURF, WITH LOVE.','一尾浪里的礼物')+`<div class="fish-portrait" aria-hidden="true"><svg viewBox="0 0 180 100"><path fill="#344f48" d="M32 45 10 30V70L32 58 50 68H112L132 61 149 51 139 40 110 30H72L58 35 51 25 45 26 46 38Z"/><path fill="#a2b9a1" d="M36 47 51 40H111L132 47 138 52 116 60H62L43 54Z"/><path fill="#e6d9a5" d="M45 55H112L126 52 117 60H63Z"/><path fill="#f4efd4" d="M122 42h7v7h-7Z"/><path fill="#1c3937" d="M125 44h3v4h-3Z"/><path stroke="#577867" stroke-width="3" d="M57 43v11m11-14v16m11-16v16m11-16v16m11-15v14"/></svg></div><h3>${esc(f.name)} <small>${esc(f.nameEn)}</small></h3><div class="fish-measure"><span>${fishLabel(f)}</span><b>✦ ${f.value}</b></div><p class="lede">收进鱼篓，稍后去小店交付；也可以让它回到浪里。</p><div class="dialog-actions"><button id="catch-keep" class="primary">放入鱼篓</button><button id="catch-release" class="secondary">放归大海 ↗</button></div>`);$('catch-keep').onclick=()=>{const result=feedback(sim.resolveCatch(true));if(result.ok)closeDialog();};$('catch-release').onclick=()=>{feedback(sim.resolveCatch(false));closeDialog();};}
$('beach-help').onclick=()=>openDialog('help',heading('HOW TO SPEND A SLOW MORNING','在沙滩钓一会儿')+`<ol class="help-list"><li>点沙地行走，或用 WASD / 方向键。点「去浪线」自动走到岸钓位置。</li><li>滑动方向或轻点海面瞄准。按住抛竿蓄力，松手投向海面；键盘按住空格也可以。</li><li>等竿尖传来鱼讯，点「扬竿」或空格挂钩。</li><li>按住「收线」或 F 收线，张力接近红区时松手，让鱼跑一小段。</li><li>鱼上岸后选择留鱼或放流。走到钓具店补饵、升级装备、交付鱼获。</li></ol><p class="lede">背包 I · 鱼获 J · 商店 E · 收回钓组 R<br>菜单、切换窗口时暂停。行程自动保存；离开后回来，抛出的钓组会安全收回。</p><p class="source-note">场景参考 <a href="https://parks.ca.gov/?page_id=524" target="_blank" rel="noopener">California State Parks 的 Pacifica State Beach</a>（Linda Mar）弧形海滩。地形、美术、商店、潮汐、鱼情和天气均为游戏创作；此场景没有接入实时海况或现实捕捞规则。<br>原创 Canvas 像素美术与合成海浪声。</p>`);

function updateUI(){
  const s=sim.state,bait=BAITS.find(b=>b.id===s.bait);$('beach-credits').textContent=Math.floor(s.credits);$('catch-count').textContent=s.catches.length;
  const minutes=360+Math.floor(s.elapsed/30);$('beach-clock').textContent=String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
  $('beach-bait').textContent=`${bait?.name||'鱼饵'} × ${s.inventory[s.bait]||0}`;$('aim-label').textContent=Math.abs(aim)<.1?'正前方':`${aim<0?'向左':'向右'} ${Math.round(Math.abs(aim)*45)}°`;
  const statuses={walk:sim.nearShop?'Bait & Tackle 开门了':sim.canCast?'在白浪后，落下第一竿':'先去浪线边看看',casting:'钓组划过海风…',waiting:'听浪，也等一口鱼讯',bite:'鱼咬钩了 · 现在扬竿！',fighting:'稳住，把它带过浪线',landed:'鱼上岸了，看看你的收获'};
  $('beach-status').textContent=s.phase==='walk'&&!s.inventory[s.bait]?'鱼饵用完了，先换一盒':statuses[s.phase]||'Pacifica Beach';$('beach-location').textContent=sim.nearShop?'PACIFICA BEACH SUPPLY CO.':sim.canCast||s.phase!=='walk'?'LINDA MAR · SURF LINE':'BEACHSIDE PATH';
  const text={walk:sim.nearShop?'点「进入小店」补给鱼饵，或沿沙滩走向海浪。':sim.canCast?'轻点海面瞄准 · 按住蓄力，松手抛竿。':'轻点沙地行走 / WASD · 去小店补给，或直接去浪线。',casting:'一盒鱼饵，一次完整的抛投。',waiting:`已放线 ${Math.round(s.lineDistance*3.28084)} ft · 留意竿尖，也可以收回后换个落点。`,bite:`鱼讯窗口 ${Math.max(0,s.biteRemaining).toFixed(1)} s · 点击扬竿 / 空格`,fighting:`剩余 ${Math.round(s.lineDistance*3.28084)} ft · 按住收线，接近红区时松手。`,landed:'放进鱼篓，或让它回到大海。'};
  $('beach-instruction').textContent=text[s.phase]||'';
  $('walk-shop').textContent=sim.nearShop?'进入小店 ↗':'去小店 ↗';for(const id of ['walk-surf','walk-shop'])$(id).disabled=s.phase!=='walk';
  show('beach-cast',['walk','bite','landed'].includes(s.phase));$('beach-cast').textContent=s.phase==='bite'?'扬竿 · 现在！':s.phase==='landed'?'查看这尾鱼 ↗':'按住蓄力 · 松手抛竿';
  show('beach-reel',s.phase==='fighting');show('beach-retrieve',['casting','waiting','bite'].includes(s.phase));show('beach-tension',s.phase==='fighting');show('aim-control',s.phase==='walk');show('rig-label',s.phase!=='fighting');
  $('beach-console').classList.toggle('is-bite',s.phase==='bite');const tension=Math.min(100,Math.max(0,s.tension*100));$('tension-value').textContent=Math.round(tension)+'%';$('tension-fill').style.marginLeft=`calc(${tension}% - 2px)`;$('fight-advice').textContent=tension>80?'松手让线 · 张力太高会断线':tension<15?'线有些松，轻轻收紧。':'保持节奏 · 鱼冲刺时松手让线';
  $('beach-state').textContent=JSON.stringify({scene:'pacifica',started,paused:paused(),...s,canCast:sim.canCast,nearShop:sim.nearShop});
}
window.addEventListener('keydown',e=>{
  if(paused()||e.target.closest('input,select,textarea,button,a'))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','f'].includes(k))e.preventDefault();if(e.repeat)return;keys.add(k);if(k===' ')beginCharge();if(k==='f')setReel(true);if(k==='i')openBag();if(k==='j')openJournal();if(k==='e')walkShop();if(k==='r')feedback(sim.retrieve());
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(e.key===' ')finishCharge();if(e.key.toLowerCase()==='f')setReel(false);});
window.addEventListener('blur',()=>{focused=false;resetInput();persist();});
window.addEventListener('focus',()=>{focused=true;last=performance.now();});
document.addEventListener('visibilitychange',()=>{resetInput();persist();last=performance.now();});
window.addEventListener('pagehide',persist);
window.addEventListener('location-picker',e=>{scenePickerOpen=Boolean(e.detail?.open);resetInput();persist();last=performance.now();});
function resize(){world.resize(innerWidth,innerHeight);world.setInsets?.({top:95,bottom:started?Math.min(innerHeight*.45,$('beach-console').offsetHeight+38):80});resetInput();}
window.addEventListener('resize',resize);resize();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused()){
  const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  sim.update(dt,{x,y,reel:reeling});if(shopOnArrival&&sim.nearShop)openShop();
  if(sim.state.phase!==lastPhase){if(sim.state.phase==='landed'){persist();openCatch();}if(sim.state.phase==='bite'){toast('竿尖一沉——现在扬竿！');if(navigator.vibrate)navigator.vibrate([70,70,100]);}lastPhase=sim.state.phase;world.setInsets?.({top:95,bottom:Math.min(innerHeight*.45,$('beach-console').offsetHeight+38)});}
  if(sim.state.message!==lastMessage){lastMessage=sim.state.message;if(lastMessage)toast(lastMessage);}
  if(now-lastSave>5000){persist();lastSave=now;}
}
  if(chargeStart){const p=Math.min(1,(now-chargeStart)/1400);$('charge-fill').style.width=p*100+'%';$('charge-label').textContent='蓄力 '+Math.round(p*100)+'%';}
  if(sound){sound.gain.gain.setTargetAtTime(soundEnabled&&!document.hidden&&focused?(.12+.06*Math.sin(now/1400)):0,sound.ctx.currentTime,.2);}
  world.draw(sim.state,sim.state.elapsed);updateUI();requestAnimationFrame(frame);
}
updateUI();requestAnimationFrame(frame);
