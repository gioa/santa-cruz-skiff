import {PacificaSimulation,BAITS} from './pacifica-sim.js';
import {createPacificaWorld} from './pacifica-world.js';
import {createPacificaMenus} from './pacifica-menus.js';
import {createPixelSprites} from './pixel-sprites.js';
import {createShoreFightView,shoreFightActive} from './shore-fight-view.js';
import {metersToFeet} from './units.js';

import {getShoreScene,sampleShore,onPier} from './shore-data.js';
import {shoreCastPower} from './shore-casting.js';
import {formatGameClock} from './game-clock.js';

import {createShoreNavigation,habitatName} from './shore-navigation.js';
import {createShoreInteractions,nearbyShoreInteraction} from './shore-interactions.js';
import {REGULATIONS_BOOK_ID,mountRegulationsBook,placeRegulationsButton,initRegulationsButton} from './regulations-book.js';

const $=id=>document.getElementById(id), show=(id,value)=>{$(id).hidden=!value;};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scene=getShoreScene($('app').dataset.location),WORLD=scene.world,SHOP=scene.shop,SAVE_KEY=scene.saveKey;
let saved;try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{}
const sim=new PacificaSimulation({saved,sceneId:scene.id}),world=createPacificaWorld($('world'),{sceneId:scene.id});
const interactions=createShoreInteractions(scene);interactions.reset(sim.state);
const fightView=createShoreFightView($('fight-view'),{sceneId:scene.id}),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const keys=new Set(),dialog=$('modal'),modalLayer=$('modal-layer');
const sprites=createPixelSprites();
for(const el of document.querySelectorAll('[data-icon]')){const asset=sprites.icons[el.dataset.icon];if(asset){el.width=asset.width;el.height=asset.height;el.getContext('2d').drawImage(asset,0,0);}}
let lastFocus=null,lastConsoleHeight=-1,focusActive=false;
let started=false,focused=true,last=performance.now(),lastSave=0,lastPhase=sim.state.phase,lastMessage='',chargeStart=0,reeling=false,scenePickerOpen=false,inspectionId=null,toastTimer,modalType='',sound=null,soundEnabled=false;
let aim=0,afterPierWalk=null;
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(sim.snapshot()));}catch{}}
function feedback(result){if(result?.message)toast(result.message);persist();updateUI();return result;}
function toast(message){$('toast').textContent=String(message).replaceAll('贝币','潮汐点');$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3300);}
function resetInput(){keys.clear();chargeStart=0;reeling=false;$('beach-reel').classList.remove('active');show('cast-charge',false);}
function paused(){return !started||Boolean(modalType)||scenePickerOpen||document.hidden||!focused;}
function syncFightFocus(){
  const active=started&&shoreFightActive(sim.state);
  if(sim.state.phase!=='fighting'&&reeling)setReel(false);
  if(active!==focusActive){
    focusActive=active;resetInput();$('app').classList.toggle('is-fishing-focus',active);show('fight-view',active);
    $('world').tabIndex=active?-1:0;$('world').setAttribute('aria-hidden',String(active));lastConsoleHeight=-1;
  }
  $('app').classList.toggle('focus-muted',active&&paused());return active;
}
function backgroundInert(value){for(const node of $('app').children)if(node!==modalLayer)node.inert=value;}
function openDialog(type,html){interactions.reset(sim.state);if(!modalType)lastFocus=document.activeElement;resetInput();modalType=type;dialog.classList.toggle('inventory-modal',type==='gear');$('modal-content').innerHTML=html;show('modal-layer',true);backgroundInert(true);dialog.scrollTop=0;persist();$('close-modal').focus();updateUI();}
function closeDialog(){if(!modalType)return;if(modalType==='inspection'){sim.acknowledgeInspection();persist();}modalType='';interactions.reset(sim.state);show('modal-layer',false);backgroundInert(false);resetInput();last=performance.now();updateUI();(lastFocus?.isConnected&&lastFocus.getClientRects().length?lastFocus:focusActive?$('settings-btn'):$('world')).focus({preventScroll:true});}
$('close-modal').onclick=closeDialog;
modalLayer.addEventListener('click',e=>{if(e.target===modalLayer)closeDialog();});

function createSound(){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;
  const ctx=new Audio(),buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buffer.getChannelData(0);let n=0;
  for(let i=0;i<data.length;i++){n=(n+(Math.random()*2-1)*.028)/1.028;data[i]=n*3;}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=550;gain.gain.value=0;source.connect(filter).connect(gain).connect(ctx.destination);source.start();return{ctx,gain,filter};
}
$('audio-btn').onclick=()=>{sound??=createSound();if(!sound){toast('当前浏览器不支持海浪声音');return;}soundEnabled=!soundEnabled;sound.ctx.resume();$('audio-btn').textContent=soundEnabled?'♪':'♩';$('audio-btn').setAttribute('aria-label',soundEnabled?'关闭海浪声音':'开启海浪声音');};

function start(){closeDialog();interactions.reset(sim.state);started=true;$('app').classList.remove('is-intro');for(const id of ['intro','intro-location'])show(id,false);for(const id of ['controls','trip-tools','trip-info'])show(id,true);last=performance.now();persist();if(sim.state.inspection)openInspection();else if(sim.state.phase==='landed')openCatch();updateUI();resize();}
$('start-btn').onclick=start;
$('resume-btn').onclick=start;
show('resume-btn',false);
if(saved)$('start-btn').innerHTML='继续今日航程 <span>→</span>';

$('world').addEventListener('pointerdown',e=>{
  if(paused()||shoreFightActive(sim.state)||e.button>0)return;const p=world.screenToWorld(e.clientX,e.clientY);if(!p)return;
  const regular=sim.state.regular;if(regular&&regular.mode!=='away'&&Math.hypot(p.x-regular.x,p.y-(regular.y-18))<40){if(nearbyShoreInteraction(scene,sim.state)?.id==='regular')interactNearby();else walkTo(regular.x+30,regular.y+20);return;}
  const angler=sim.state.shoreLore.encounter;if(angler&&Math.hypot(p.x-angler.x,p.y-(angler.y-18))<40){if(nearbyShoreInteraction(scene,sim.state)?.id===`angler:${angler.id}`)interactNearby();else walkTo(angler.x,angler.y+30);return;}
  if(scene.pier&&onPier(scene,p.x,p.y)){if(sim.onPier)walkTo(p.x,p.y);else if(sim.nearPier)feedback(sim.enterPier());else walkTo(scene.pier.gate.x,scene.pier.gate.y);return;}
  if(p.x>=SHOP.x-20&&p.x<=SHOP.x+SHOP.width+20&&p.y>=SHOP.y-65&&p.y<=SHOP.door.y+30){if(nearbyShoreInteraction(scene,sim.state)?.kind==='shop')interactNearby();else walkTo(SHOP.door.x,SHOP.door.y);return;}
  if(p.y<WORLD.shoreY(p.x)){if(sim.state.phase==='bite'){feedback(sim.strike());return;}aim=Math.max(-1,Math.min(1,(p.x-sim.state.player.x)/Math.max(100,sim.state.player.y-p.y)));updateUI();return;}
  walkTo(p.x,p.y);
});
function primaryAction(){if(sim.state.phase==='bite')feedback(sim.strike());else if(sim.state.phase==='landed')openCatch();}
function beginCharge(){if(paused())return;if(sim.state.phase!=='walk'){primaryAction();return;}if(!sim.tackleReady){toast('先打开鱼竿配置，装好钓组和鱼饵。');return;}if(!sim.canCast){toast('走到湿沙边缘，面朝海面再抛竿。');return;}chargeStart=performance.now();show('cast-charge',true);}
function finishCharge(cancel=false){if(!chargeStart)return;const power=shoreCastPower(performance.now()-chargeStart);chargeStart=0;show('cast-charge',false);if(!cancel)feedback(sim.cast({power,aim}));}
$('beach-cast').addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();$('beach-cast').setPointerCapture(e.pointerId);beginCharge();});
$('beach-cast').addEventListener('pointerup',()=>finishCharge());
$('beach-cast').addEventListener('pointercancel',()=>finishCharge(true));
$('beach-cast').addEventListener('lostpointercapture',()=>finishCharge(true));
$('beach-cast').addEventListener('keydown',e=>{if(![' ','Enter'].includes(e.key))return;e.preventDefault();if(!e.repeat)beginCharge();});
$('beach-cast').addEventListener('keyup',e=>{if(![' ','Enter'].includes(e.key))return;e.preventDefault();finishCharge();});
$('beach-cast').addEventListener('blur',()=>finishCharge(true));
$('beach-cast').addEventListener('click',e=>{if(e.detail!==0||paused())return;if(sim.state.phase==='walk'){if(sim.canCast)feedback(sim.cast({power:0,aim}));else toast(!sim.tackleReady?'先打开鱼竿配置，装好钓组和鱼饵。':'走到湿沙边缘，再准备抛竿。');}else primaryAction();});
function setReel(active){reeling=active&&!paused()&&sim.state.phase==='fighting';$('beach-reel').classList.toggle('active',reeling);}
$('beach-reel').addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();$('beach-reel').setPointerCapture(e.pointerId);setReel(true);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('beach-reel').addEventListener(name,()=>setReel(false));
$('beach-reel').addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();setReel(true);}});
$('beach-reel').addEventListener('keyup',()=>setReel(false));
$('beach-reel').addEventListener('blur',()=>setReel(false));
$('beach-retrieve').onclick=()=>feedback(sim.retrieve());

function walkTo(x,y){if(sim.onPier&&!onPier(scene,x,y)){afterPierWalk={x,y};feedback(sim.leavePier());return;}afterPierWalk=null;feedback(sim.walkTo(x,y));}
const coastMenus=createShoreNavigation({scene,sim,openDialog,closeDialog,feedback});
function activatePlace(target){
  const current=nearbyShoreInteraction(scene,sim.state);
  if(!current||current.id!==target?.id)return;
  resetInput();
  sim.state.walkTarget=null;sim.state.walkRoute=[];sim.state.player.walking=false;afterPierWalk=null;
  interactions.reset(sim.state);
  if(current.kind==='shop')openShop();
  else if(current.kind==='angler')coastMenus.openConversation(current.anglerId);
  else if(current.kind==='regular')coastMenus.openRegular();
  else if(current.kind==='pier')feedback(sim.enterPier());
  else if(current.kind==='pier-exit')feedback(sim.leavePier());
}
function interactNearby(){const target=nearbyShoreInteraction(scene,sim.state);if(target)activatePlace(target);else toast('附近没有可以互动的东西。');}
const openMap=()=>coastMenus.openMap();
function openInspection(){afterPierWalk=null;interactions.reset(sim.state);inspectionId=sim.state.inspection?.id;coastMenus.openInspection();}
const menus=createPacificaMenus({sim,scene,openDialog,closeDialog,feedback,openRules});
const ownsRules=()=>sim.state.upgrades.includes(REGULATIONS_BOOK_ID);
function openRules(){if(!ownsRules())return;openDialog('rules','');mountRegulationsBook($('modal-content'),{areaId:scene.id==='half-moon-bay'?'half_moon_bay':'pacifica'});$('close-modal').focus();}
function openShop(){menus.openShop();}
const openBag=()=>menus.openBag(),openJournal=()=>menus.openJournal(),openCatch=()=>menus.openCatch();
function openHelp(){menus.openHelp();const toggle=$('settings-audio');if(toggle){toggle.textContent='总声音：'+(soundEnabled?'开':'关');toggle.onclick=()=>{$('audio-btn').click();openHelp();};}}
$('gear-btn').onclick=openBag;$('journal-btn').onclick=openJournal;$('credits-btn').onclick=openJournal;$('settings-btn').onclick=openHelp;$('rod-config-btn').onclick=()=>menus.openBag(sim.state.activeRod,'rig');$('map-btn').onclick=openMap;initRegulationsButton($('rules-btn'),openRules);

function presentationHint(s){
  if((s.rodSupplies[s.activeRod]?.bait?.condition??0)<=.08)return '余饵不足 · 收回检查';
  if(Number.isFinite(s.nibbleAt)&&s.elapsed-s.nibbleAt<2.5)return '竿尖轻点 · 有鱼在试探鱼饵';
  const p=s.presentation;if(!p)return '钓组下沉中';
  if(p.mode==='float'||s.rig==='float')return p.status||'浮漂随流移动';
  if(['钓组下沉中','浪流推着钓组滚动','钓组随浪缓移','钓组贴底较稳'].includes(p.status))return p.status;
  if(p.bottomContact<.3)return '钓组正在沉降';
  if(p.stability<.38)return '钓组被浪推动';
  if(p.stability<.7)return '钓组随浪轻移';
  return '钓组已稳底';
}

function updateUI(){
  syncFightFocus();
  const s=sim.state,bait=BAITS.find(b=>b.id===s.bait),atShore=sim.onPier||s.player.y-WORLD.shoreY(s.player.x)<=130,fishing=atShore||s.phase!=='walk';
  $('credits').textContent=Math.floor(s.credits);show('map-btn',s.shoreLore.notes.length>0);
  $('clock').textContent=formatGameClock(s.elapsed);
  $('active-rod-name').textContent=s.activeRod==='surf_rod'?'长节沙滩竿':'岸钓竿';
  $('rod-config-btn').disabled=s.phase!=='walk';const supply=s.rodSupplies[s.activeRod];$('tackle-name').textContent=`${s.activeRod==='surf_rod'?'长节沙滩竿':'入门岸钓竿'} · ${supply?s.rig==='float'?'浮钓 · #6 · 钩深约 3.3 ft':s.rig==='fishfinder'?'滑铅 3 oz · 2/0':'Carolina 1 oz · #1':'未装钓组'} · ${supply?.bait?.condition>.08?bait?.name:'需装饵'}`;
  const shore=s.shoreSample||sampleShore(scene,s.player.x,WORLD.shoreY(s.player.x)-90,s.elapsed);$('place').textContent=scene.shortName+(sim.onPier?' · 旧栈桥':s.shoreLore.notes.some(n=>n.zoneId===shore.zoneId)?' · '+shore.zoneName:'');show('speed',false);
  const sea=Number.isFinite(shore.wavePeriod)?`${shore.tideLabel} · Hs ${(shore.waveHeight*3.28084).toFixed(1)} ft / ${shore.wavePeriod.toFixed(0)} s`:shore.tideLabel+' · 模拟海况';
  $('weather').textContent=sea;$('weather').title='游戏模拟海况：Hs 为有效波高，秒数为波周期；浪组会影响钓组稳定、浮漂漂移与鱼讯。';
  $('shore-rig-summary').textContent=Number.isFinite(shore.wavePeriod)?`模拟浪 Hs ${(shore.waveHeight*3.28084).toFixed(1)} ft / ${shore.wavePeriod.toFixed(0)} s`:'模拟海况';show('shore-rig-summary',innerWidth<=800);
  const offshore=Math.round(shore.offshore*3.28084),deployed=['casting','waiting','bite'].includes(s.phase),thrown=Math.round(s.cast?.distance*3.28084||0);
  const floatDepth=s.rig==='float'&&s.presentation?` · 钩深 ${((Number.isFinite(s.presentation.depth)?s.presentation.depth:1)*3.28084).toFixed(1)} ft`:'';
  const states={walk:'',casting:`抛出 ${thrown} ft`,waiting:presentationHint(s),bite:'鱼咬钩了 · 现在扬竿',fighting:'中鱼',landed:'鱼已上岸'};
  $('fish-title').textContent=states[s.phase];$('fish-distance').textContent=deployed?`离岸 ${offshore} ft`:Math.round(s.lineDistance*3.28084)+' ft';
  const hints={walk:!sim.tackleReady?'打开鱼竿配置，检查钓组和余饵。':'',casting:s.cast?.landing==='water'?'':'落点未到水面',waiting:`离岸 ${offshore} ft${floatDepth}`,bite:'现在扬竿 / 空格',fighting:'按住收线 · 高张力时松手',landed:'留下或放流'};
  $('navigation').textContent=hints[s.phase];$('fish-detail').textContent=hints[s.phase];
  show('boat-fishing',fishing);show('fish-status',s.phase!=='walk');
  $('boat-console').classList.toggle('actions-only',!fishing);$('boat-console').classList.toggle('fishing-open',fishing);$('boat-fishing').classList.toggle('has-status',s.phase!=='walk');
  show('beach-cast',['walk','bite','landed'].includes(s.phase));$('beach-cast').textContent=s.phase==='bite'?'扬竿':s.phase==='landed'?'查看鱼获':'按住抛竿';
  show('beach-reel',s.phase==='fighting');show('beach-retrieve',['casting','waiting','bite'].includes(s.phase));show('beach-tension',s.phase==='fighting');
  $('boat-console').classList.toggle('is-bite',s.phase==='bite');const tension=Math.min(100,Math.max(0,s.tension*100));$('tension-value').textContent=Math.round(tension)+'%';$('tension-fill').style.width=tension+'%';$('fight-advice').textContent=tension>80?'松手让线':tension<15?'轻轻收紧鱼线':'保持节奏';
  $('beach-state').textContent=JSON.stringify({scene:scene.id,started,paused:paused(),...s,canCast:sim.canCast,nearShop:sim.nearShop,view:focusActive?'first-person':'overhead',focusView:{...fightView.snapshot(),active:focusActive}});
  show('rules-btn',started&&!focusActive&&ownsRules());placeRegulationsButton($('rules-btn'),[$('boat-console')]);
  const height=started&&!focusActive?$('boat-console').offsetHeight:0;if(height!==lastConsoleHeight){lastConsoleHeight=height;syncInsets();}
}

window.addEventListener('keydown',e=>{
  if(modalType){if(e.key==='Escape'){e.preventDefault();closeDialog();}else if(e.key==='Tab'){const items=[...dialog.querySelectorAll('button:not(:disabled),input,select,a[href],[tabindex=\"0\"]')].filter(el=>el.getClientRects().length);const first=items[0],lastItem=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastItem?.focus();}else if(!e.shiftKey&&document.activeElement===lastItem){e.preventDefault();first?.focus();}}return;}
  if(paused()||e.target.closest('input,select,textarea'))return;const k=e.key.toLowerCase();if(e.target.closest('button,a')&&[' ','enter'].includes(k))return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','f'].includes(k))e.preventDefault();if(e.repeat)return;keys.add(k);if(k===' ')beginCharge();if(k==='f')setReel(true);if(k==='i')openBag();if(k==='j')openJournal();if(k==='m')openMap();if(k==='e')interactNearby();if(k==='r')feedback(sim.retrieve());
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(e.key===' ')finishCharge();if(e.key.toLowerCase()==='f')setReel(false);});
window.addEventListener('blur',()=>{focused=false;resetInput();persist();});
window.addEventListener('focus',()=>{focused=true;last=performance.now();});
document.addEventListener('visibilitychange',()=>{resetInput();persist();last=performance.now();});
window.addEventListener('pagehide',persist);
window.addEventListener('location-picker',e=>{scenePickerOpen=Boolean(e.detail?.open);resetInput();persist();last=performance.now();});
function syncInsets(){const height=started&&!focusActive?$('boat-console').offsetHeight:0,bottom=started?Math.min(innerHeight*.5,height+38):80;world.setInsets?.({top:innerHeight<500?90:125,bottom});$('app').style.setProperty('--shore-console-height',(height+34)+'px');}
function resize(){world.resize(innerWidth,innerHeight);fightView.resize(innerWidth,innerHeight);syncInsets();resetInput();}
window.addEventListener('resize',resize);resize();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused()){
  const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(x||y)afterPierWalk=null;
  sim.update(dt,{x,y,reel:reeling});
  if(afterPierWalk&&!sim.onPier&&!sim.state.walkTarget&&!sim.state.inspection){const p=afterPierWalk;afterPierWalk=null;feedback(sim.walkTo(p.x,p.y));}
  if(sim.state.inspection&&sim.state.inspection.id!==inspectionId)openInspection();
  const place=interactions.step(sim.state,{paused:paused()});if(place)activatePlace(place);
  if(sim.state.phase!==lastPhase){if(sim.state.phase==='landed'){persist();openCatch();}if(sim.state.phase==='bite'){toast('竿尖一沉——现在扬竿！');if(navigator.vibrate)navigator.vibrate([70,70,100]);}lastPhase=sim.state.phase;syncInsets();}
  if(sim.state.message!==lastMessage){lastMessage=sim.state.message;if(lastMessage)toast(lastMessage);}
  if(now-lastSave>5000){persist();lastSave=now;}
}
  if(chargeStart){const p=shoreCastPower(now-chargeStart),preview=sim.previewCast({power:p,aim});$('charge-fill').style.width=p*100+'%';$('charge-label').textContent=`${Math.round(p*100)}% · 约 ${Math.round(preview.distance*3.28084)} ft${preview.loadRatio>1?' · 超载':preview.landing!=='water'?' · 未到水面':''}`;$('charge-label').title='从出竿位置计算的抛距，离岸距离还要扣除站位与斜抛角度。';}
  if(sound){sound.gain.gain.setTargetAtTime(soundEnabled&&!document.hidden&&focused?(.12+.06*Math.sin(now/1400)):0,sound.ctx.currentTime,.2);}
  const active=syncFightFocus();if(!active)world.draw(sim.state,sim.state.elapsed);
  fightView.draw(sim.state,dt,{active,paused:paused(),reeling,reducedMotion:reducedMotion.matches});updateUI();requestAnimationFrame(frame);
}
updateUI();requestAnimationFrame(frame);
