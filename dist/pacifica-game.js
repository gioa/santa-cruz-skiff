import {PacificaSimulation,BAITS} from './pacifica-sim.js?v=coast-3';
import {createPacificaWorld} from './pacifica-world.js?v=coast-3';
import {createPacificaMenus} from './pacifica-menus.js?v=coast-3';
import {createPixelSprites} from './pixel-sprites.js?v=20260928-pixel-v79';

import {getShoreScene,sampleShore,onPier} from './shore-data.js?v=coast-3';

import {createShoreNavigation,habitatName} from './shore-navigation.js?v=coast-3';

const $=id=>document.getElementById(id), show=(id,value)=>{$(id).hidden=!value;};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scene=getShoreScene($('app').dataset.location),WORLD=scene.world,SHOP=scene.shop,SAVE_KEY=scene.saveKey;
let saved;try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{}
const sim=new PacificaSimulation({saved,sceneId:scene.id}),world=createPacificaWorld($('world'),{sceneId:scene.id});
const keys=new Set(),dialog=$('modal'),modalLayer=$('modal-layer');
const sprites=createPixelSprites();
for(const el of document.querySelectorAll('[data-icon]')){const asset=sprites.icons[el.dataset.icon];if(asset){el.width=asset.width;el.height=asset.height;el.getContext('2d').drawImage(asset,0,0);}}
let lastFocus=null,lastConsoleHeight=-1;
let started=false,focused=true,last=performance.now(),lastSave=0,lastPhase=sim.state.phase,lastMessage='',chargeStart=0,reeling=false,shopOnArrival=false,scenePickerOpen=false,inspectionId=null,toastTimer,modalType='',sound=null,soundEnabled=false;
let aim=0,afterPierWalk=null;
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(sim.snapshot()));}catch{}}
function feedback(result){if(result?.message)toast(result.message);persist();updateUI();return result;}
function toast(message){$('toast').textContent=String(message).replaceAll('贝币','潮汐点');$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3300);}
function resetInput(){keys.clear();chargeStart=0;reeling=false;$('beach-reel').classList.remove('active');show('cast-charge',false);}
function paused(){return !started||Boolean(modalType)||scenePickerOpen||document.hidden||!focused;}
function backgroundInert(value){for(const node of $('app').children)if(node!==modalLayer)node.inert=value;}
function openDialog(type,html){if(!modalType)lastFocus=document.activeElement;resetInput();modalType=type;dialog.classList.toggle('inventory-modal',type==='gear');$('modal-content').innerHTML=html;show('modal-layer',true);backgroundInert(true);dialog.scrollTop=0;persist();$('close-modal').focus();updateUI();}
function closeDialog(){if(!modalType)return;if(modalType==='inspection'){sim.acknowledgeInspection();persist();}modalType='';show('modal-layer',false);backgroundInert(false);resetInput();last=performance.now();(lastFocus?.isConnected?lastFocus:$('world')).focus({preventScroll:true});}
$('close-modal').onclick=closeDialog;
modalLayer.addEventListener('click',e=>{if(e.target===modalLayer)closeDialog();});

function createSound(){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;
  const ctx=new Audio(),buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buffer.getChannelData(0);let n=0;
  for(let i=0;i<data.length;i++){n=(n+(Math.random()*2-1)*.028)/1.028;data[i]=n*3;}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=550;gain.gain.value=0;source.connect(filter).connect(gain).connect(ctx.destination);source.start();return{ctx,gain,filter};
}
$('audio-btn').onclick=()=>{sound??=createSound();if(!sound){toast('当前浏览器不支持海浪声音');return;}soundEnabled=!soundEnabled;sound.ctx.resume();$('audio-btn').textContent=soundEnabled?'♪':'♩';$('audio-btn').setAttribute('aria-label',soundEnabled?'关闭海浪声音':'开启海浪声音');};

function start(){closeDialog();started=true;$('app').classList.remove('is-intro');for(const id of ['intro','intro-location'])show(id,false);for(const id of ['controls','trip-tools','trip-info'])show(id,true);last=performance.now();toast(saved?`欢迎回到 ${scene.name}，继续今天的岸钓。`:'轻点沙地行走，从沿岸地图选择钓位。');if(sim.state.inspection)openInspection();else if(sim.state.phase==='landed')openCatch();updateUI();resize();}
$('start-btn').onclick=start;
$('resume-btn').onclick=start;
show('resume-btn',false);
if(saved)$('start-btn').innerHTML='继续今日航程 <span>→</span>';

function walkSurf(){if(sim.state.phase!=='walk'){toast('先收回钓组，再换钓位。');return;}shopOnArrival=false;if(sim.onPier){feedback(sim.walkTo(scene.pier.tip.x,scene.pier.tip.y));return;}const x=Math.min(WORLD.width-80,Math.max(80,sim.state.player.x));feedback(sim.walkTo(x,WORLD.shoreY(x)+57));}
function walkShop(){if(sim.state.phase!=='walk'){toast('先收回钓组，再回小店。');return;}if(sim.nearShop){openShop();return;}walkTo(SHOP.door.x,SHOP.door.y);shopOnArrival=true;}
$('walk-surf').onclick=walkSurf;$('walk-shop').onclick=walkShop;
$('world').addEventListener('pointerdown',e=>{
  if(paused()||e.button>0)return;const p=world.screenToWorld(e.clientX,e.clientY);if(!p)return;
  if(scene.pier&&onPier(scene,p.x,p.y)){if(sim.onPier)feedback(sim.walkTo(p.x,p.y));else if(sim.nearPier)openPier();else feedback(sim.walkTo(scene.pier.gate.x,scene.pier.gate.y));return;}
  if(p.x>=SHOP.x-20&&p.x<=SHOP.x+SHOP.width+20&&p.y>=SHOP.y-65&&p.y<=SHOP.door.y+30){walkShop();return;}
  if(p.y<WORLD.shoreY(p.x)){if(sim.state.phase==='bite'){feedback(sim.strike());return;}aim=Math.max(-1,Math.min(1,(p.x-sim.state.player.x)/Math.max(100,sim.state.player.y-p.y)));toast('方向已调整，按住抛竿蓄力，松手抛出。');updateUI();return;}
  shopOnArrival=false;feedback(sim.walkTo(p.x,p.y));
});
function primaryAction(){if(sim.state.phase==='bite')feedback(sim.strike());else if(sim.state.phase==='landed')openCatch();}
function beginCharge(){if(paused())return;if(sim.state.phase!=='walk'){primaryAction();return;}if(!sim.state.inventory[sim.state.bait]){toast('这种鱼饵用完了，打开背包换饵，或去小店补给。');return;}if(!sim.canCast){toast('走到湿沙边缘，面朝海面再抛竿。');return;}chargeStart=performance.now();show('cast-charge',true);}
function finishCharge(cancel=false){if(!chargeStart)return;const power=Math.min(1,Math.max(.25,(performance.now()-chargeStart)/1400));chargeStart=0;show('cast-charge',false);if(!cancel)feedback(sim.cast({power,aim}));}
$('beach-cast').addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();$('beach-cast').setPointerCapture(e.pointerId);beginCharge();});
$('beach-cast').addEventListener('pointerup',()=>finishCharge());
$('beach-cast').addEventListener('pointercancel',()=>finishCharge(true));
$('beach-cast').addEventListener('lostpointercapture',()=>finishCharge(true));
$('beach-cast').addEventListener('click',e=>{if(e.detail!==0)return;if(sim.state.phase==='walk'){if(sim.canCast)feedback(sim.cast({power:.65,aim}));else toast(!sim.state.inventory[sim.state.bait]?'这种鱼饵用完了，打开背包换饵，或去小店补给。':'先点「前往浪线」，到湿沙边缘抛竿。');}else primaryAction();});
function setReel(active){reeling=active&&!paused()&&sim.state.phase==='fighting';$('beach-reel').classList.toggle('active',reeling);}
$('beach-reel').addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();$('beach-reel').setPointerCapture(e.pointerId);setReel(true);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('beach-reel').addEventListener(name,()=>setReel(false));
$('beach-reel').addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();setReel(true);}});
$('beach-reel').addEventListener('keyup',()=>setReel(false));
$('beach-reel').addEventListener('blur',()=>setReel(false));
$('beach-retrieve').onclick=()=>feedback(sim.retrieve());

function walkTo(x,y){shopOnArrival=false;if(sim.onPier&&!onPier(scene,x,y)){afterPierWalk={x,y};feedback(sim.leavePier());return;}afterPierWalk=null;feedback(sim.walkTo(x,y));}
const coastMenus=createShoreNavigation({scene,sim,openDialog,closeDialog,feedback,walkTo});
const openMap=()=>coastMenus.openMap(),openPier=()=>coastMenus.openPier();
function openInspection(){afterPierWalk=null;shopOnArrival=false;inspectionId=sim.state.inspection?.id;coastMenus.openInspection();}
const menus=createPacificaMenus({sim,scene,openDialog,closeDialog,feedback,walkShop,walkSurf});
function openShop(){shopOnArrival=false;menus.openShop();}
const openBag=()=>menus.openBag(),openJournal=()=>menus.openJournal(),openCatch=()=>menus.openCatch();
function openHelp(){menus.openHelp();const toggle=$('settings-audio');if(toggle){toggle.textContent='总声音：'+(soundEnabled?'开':'关');toggle.onclick=()=>{$('audio-btn').click();openHelp();};}}
$('gear-btn').onclick=openBag;$('journal-btn').onclick=openJournal;$('credits-btn').onclick=openJournal;$('settings-btn').onclick=openHelp;$('rod-config-btn').onclick=openBag;$('map-btn').onclick=openMap;$('pier-btn').onclick=()=>sim.onPier?feedback(sim.leavePier()):openPier();

function updateUI(){
  const s=sim.state,bait=BAITS.find(b=>b.id===s.bait),atShore=sim.onPier||s.player.y-WORLD.shoreY(s.player.x)<=130,fishing=atShore||s.phase!=='walk';
  $('credits').textContent=Math.floor(s.credits);
  const minutes=360+Math.floor(s.elapsed/30);$('clock').textContent=String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
  $('active-rod-name').textContent=s.upgrades.includes('surf_rod')?'长节沙滩竿':'岸钓竿';
  $('tackle-name').textContent=`${s.rig==='fishfinder'?'滑铅组':'Carolina'} · ${bait?.name||'鱼饵'} × ${s.inventory[s.bait]||0}`;
  const shore=s.shoreSample||sampleShore(scene,s.player.x,WORLD.shoreY(s.player.x)-90,s.elapsed);$('place').textContent=scene.shortName+' · '+(sim.onPier?'封闭栈桥':shore.zoneName);$('speed').textContent=sim.nearShop?'钓具小店':sim.onPier?'越栏进入 · 巡查风险':atShore?'沙滩岸钓':'沙滩步道';$('weather').textContent=shore.tideLabel+' · 晨雾';$('shore-rig-summary').textContent=sim.onPier?'':habitatName(shore.habitat);show('pier-btn',Boolean(scene.pier)&&(sim.nearPier||sim.onPier));$('pier-btn').textContent=sim.onPier?'离开栈桥':'封闭栈桥';$('pier-btn').disabled=s.phase!=='walk';$('walk-surf').textContent=sim.onPier?'走向桥端':'前往浪线';
  const states={walk:'准备抛竿',casting:'钓组落水',waiting:'等待鱼讯',bite:'鱼咬钩了 · 现在扬竿',fighting:'中鱼 · 控制张力收线',landed:'鱼已上岸'};
  $('fish-title').textContent=states[s.phase];$('fish-distance').textContent=Math.round(s.lineDistance*3.28084)+' ft';
  const hints={walk:!s.inventory[s.bait]?'鱼饵用完，打开背包换饵。':atShore?'轻点海面瞄准 · 按住抛竿蓄力':sim.nearShop?'轻点小店补给，或前往浪线。':'轻点沙地行走 · WASD',casting:'钓组飞向浪外…',waiting:`已放线 ${Math.round(s.lineDistance*3.28084)} ft · 留意竿尖`,bite:'现在扬竿 / 空格',fighting:'按住收线 · 高张力时松手',landed:'留下或放流'};
  $('navigation').textContent=hints[s.phase];$('fish-detail').textContent=hints[s.phase];
  $('walk-shop').textContent=sim.nearShop?'进入小店':'钓具小店';for(const id of ['walk-surf','walk-shop'])$(id).disabled=s.phase!=='walk';
  show('boat-action-bar',s.phase==='walk');show('boat-fishing',fishing);show('fish-status',s.phase!=='walk');
  $('boat-console').classList.toggle('actions-only',!fishing);$('boat-console').classList.toggle('fishing-open',fishing);$('boat-fishing').classList.toggle('has-status',s.phase!=='walk');
  show('beach-cast',['walk','bite','landed'].includes(s.phase));$('beach-cast').textContent=s.phase==='bite'?'扬竿':s.phase==='landed'?'查看鱼获':'按住抛竿';
  show('beach-reel',s.phase==='fighting');show('beach-retrieve',['casting','waiting','bite'].includes(s.phase));show('beach-tension',s.phase==='fighting');
  $('boat-console').classList.toggle('is-bite',s.phase==='bite');const tension=Math.min(100,Math.max(0,s.tension*100));$('tension-value').textContent=Math.round(tension)+'%';$('tension-fill').style.width=tension+'%';$('fight-advice').textContent=tension>80?'松手让线':tension<15?'轻轻收紧鱼线':'保持节奏';
  $('beach-state').textContent=JSON.stringify({scene:scene.id,started,paused:paused(),...s,canCast:sim.canCast,nearShop:sim.nearShop});
  const height=started?$('boat-console').offsetHeight:0;if(height!==lastConsoleHeight){lastConsoleHeight=height;syncInsets();}
}

window.addEventListener('keydown',e=>{
  if(modalType){if(e.key==='Escape'){e.preventDefault();closeDialog();}else if(e.key==='Tab'){const items=[...dialog.querySelectorAll('button:not(:disabled),input,select,a[href],[tabindex=\"0\"]')].filter(el=>el.getClientRects().length);const first=items[0],lastItem=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastItem?.focus();}else if(!e.shiftKey&&document.activeElement===lastItem){e.preventDefault();first?.focus();}}return;}
  if(paused()||e.target.closest('input,select,textarea'))return;const k=e.key.toLowerCase();if(e.target.closest('button,a')&&[' ','enter'].includes(k))return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','f'].includes(k))e.preventDefault();if(e.repeat)return;keys.add(k);if(k===' ')beginCharge();if(k==='f')setReel(true);if(k==='i')openBag();if(k==='j')openJournal();if(k==='m')openMap();if(k==='e')walkShop();if(k==='r')feedback(sim.retrieve());
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(e.key===' ')finishCharge();if(e.key.toLowerCase()==='f')setReel(false);});
window.addEventListener('blur',()=>{focused=false;resetInput();persist();});
window.addEventListener('focus',()=>{focused=true;last=performance.now();});
document.addEventListener('visibilitychange',()=>{resetInput();persist();last=performance.now();});
window.addEventListener('pagehide',persist);
window.addEventListener('location-picker',e=>{scenePickerOpen=Boolean(e.detail?.open);resetInput();persist();last=performance.now();});
function syncInsets(){const bottom=started?Math.min(innerHeight*.5,$('boat-console').offsetHeight+38):80;world.setInsets?.({top:innerHeight<500?90:125,bottom});$('app').style.setProperty('--shore-console-height',($('boat-console').offsetHeight+34)+'px');}
function resize(){world.resize(innerWidth,innerHeight);syncInsets();resetInput();}
window.addEventListener('resize',resize);resize();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused()){
  const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(x||y)afterPierWalk=null;sim.update(dt,{x,y,reel:reeling});if(afterPierWalk&&!sim.onPier&&!sim.state.walkTarget&&!sim.state.inspection){const p=afterPierWalk;afterPierWalk=null;feedback(sim.walkTo(p.x,p.y));}if(sim.state.inspection&&sim.state.inspection.id!==inspectionId)openInspection();if(shopOnArrival&&sim.nearShop)openShop();
  if(sim.state.phase!==lastPhase){if(sim.state.phase==='landed'){persist();openCatch();}if(sim.state.phase==='bite'){toast('竿尖一沉——现在扬竿！');if(navigator.vibrate)navigator.vibrate([70,70,100]);}lastPhase=sim.state.phase;syncInsets();}
  if(sim.state.message!==lastMessage){lastMessage=sim.state.message;if(lastMessage)toast(lastMessage);}
  if(now-lastSave>5000){persist();lastSave=now;}
}
  if(chargeStart){const p=Math.min(1,(now-chargeStart)/1400);$('charge-fill').style.width=p*100+'%';$('charge-label').textContent='蓄力 '+Math.round(p*100)+'%';}
  if(sound){sound.gain.gain.setTargetAtTime(soundEnabled&&!document.hidden&&focused?(.12+.06*Math.sin(now/1400)):0,sound.ctx.currentTime,.2);}
  world.draw(sim.state,sim.state.elapsed);updateUI();requestAnimationFrame(frame);
}
updateUI();requestAnimationFrame(frame);
