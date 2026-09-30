import {PacificaSimulation,BAITS} from './pacifica-sim.js';
import {BeniciaSimulation} from './benicia-sim.js';
import {createBeniciaWorld} from './benicia-world.js';
import {isShoreLure,SHORE_ITEMS} from './shore-equipment.js';
import {beniciaRulesMarkup} from './benicia-rules.js';
import {createPacificaWorld} from './pacifica-world.js';
import {createPacificaMenus} from './pacifica-menus.js';
import {createPixelSprites} from './pixel-sprites.js';
import {shoreControlWords,stepShoreReelVisual} from './shore-reel-feedback.js';
import {createShoreReelInput,tapShoreReelInput,stepShoreReelInput} from './shore-reel-input.js';
import {SHORE_MOVEMENT} from './shore-movement.js';
import {shoreWorldMetres,shorePersonFoot} from './shore-scale.js';

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
const benicia=scene.id==='benicia';
const sim=benicia?new BeniciaSimulation({saved}):new PacificaSimulation({saved,sceneId:scene.id}),world=benicia?createBeniciaWorld($('world')):createPacificaWorld($('world'),{sceneId:scene.id});
sim.setFishingControls({rodLift:.35,rodSweep:0});
const interactions=createShoreInteractions(scene);interactions.reset(sim.state);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const keys=new Set(),dialog=$('modal'),modalLayer=$('modal-layer');
const sprites=createPixelSprites();
for(const el of document.querySelectorAll('[data-icon]')){const asset=sprites.icons[el.dataset.icon];if(asset){el.width=asset.width;el.height=asset.height;el.getContext('2d').drawImage(asset,0,0);}}
let lastFocus=null,lastWorldFrame=null;
let started=false,focused=true,last=performance.now(),lastSave=0,lastPhase=sim.state.phase,lastMessage='',chargeStart=0,reeling=false,scenePickerOpen=false,inspectionId=null,toastTimer,modalType='',sound=null,soundEnabled=false;
let aim=0,afterPierWalk=null,twitchQueued=false,castPreview=null,reelInput=createShoreReelInput();
let castCharge=0,reelVisual={},nextDragClick=0;
const controlDefaults={reelSpeed:.6,rodLift:.35,rodSweep:0,drag:.5};
const fishingControls=()=>({...controlDefaults,...sim.state.fishingControls});
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(sim.snapshot()));}catch{}}
function feedback(result){if(result?.message)toast(result.message);persist();updateUI();return result;}
function toast(message){$('toast').textContent=String(message).replaceAll('贝币','潮汐点');$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3300);}
function resetInput(){keys.clear();chargeStart=0;castCharge=0;castPreview=null;reeling=false;reelInput=createShoreReelInput();twitchQueued=false;$('beach-reel').classList.remove('active');show('cast-charge',false);}
function paused(){return !started||Boolean(modalType)||scenePickerOpen||document.hidden||!focused;}
function syncFishingScene(){
  if(!sim.canReel){reeling=false;reelInput=createShoreReelInput();$('beach-reel').classList.remove('active');}
  $('app').classList.toggle('shore-fighting',sim.state.phase==='fighting');
  $('app').classList.toggle('shore-line-out',Boolean(sim.state.cast));
}
function backgroundInert(value){for(const node of $('app').children)if(node!==modalLayer)node.inert=value;}
function openDialog(type,html){interactions.reset(sim.state);if(!modalType)lastFocus=document.activeElement;resetInput();modalType=type;dialog.classList.toggle('inventory-modal',type==='gear');$('modal-content').innerHTML=html;show('modal-layer',true);backgroundInert(true);dialog.scrollTop=0;persist();$('close-modal').focus();updateUI();}
function closeDialog(){if(!modalType)return;if(modalType==='inspection'){sim.acknowledgeInspection();persist();}modalType='';interactions.reset(sim.state);show('modal-layer',false);backgroundInert(false);resetInput();last=performance.now();updateUI();(lastFocus?.isConnected&&lastFocus.getClientRects().length?lastFocus:$('world')).focus({preventScroll:true});}
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
  if(paused()||e.button>0)return;const p=world.screenToWorld(e.clientX,e.clientY);if(!p)return;
  if(sim.state.phase==='fighting')return;
  // Touch targets have screen-space padding; conversation reach stays physical.
  const personHit=n=>{const foot=shorePersonFoot({player:n,onPier:onPier(scene,n.x,n.y)}),q=world.worldToScreen({x:foot.x,y:foot.y-shoreWorldMetres(.9)});return Math.hypot(e.clientX-q.clientX,e.clientY-q.clientY);};
  const local=sim.state.crowd?.filter(n=>personHit(n)<18).sort((a,b)=>personHit(a)-personHit(b))[0];
  if(local){if(Math.hypot(local.x-sim.state.player.x,local.y-sim.state.player.y)<=SHORE_MOVEMENT.talkReach){const r=sim.talkLocal(local.id);if(r.ok){openDialog('conversation',`<div class="eyebrow">FIRST STREET REGULAR</div><h2 id="modal-title">${esc(r.name)}</h2><div class="staff-banner"><p>「${esc(r.text)}」</p></div>${r.fresh?'<p class="credits-note">记进沿岸手记了。</p>':''}`);}else feedback(r);}else walkTo(local.x,local.y+shoreWorldMetres(1.5));return;}
  const regular=sim.state.regular;if(regular&&regular.mode!=='away'&&personHit(regular)<18){if(nearbyShoreInteraction(scene,sim.state)?.id==='regular')interactNearby();else walkTo(regular.x+shoreWorldMetres(1),regular.y+shoreWorldMetres(1));return;}
  const angler=sim.state.shoreLore.encounter;if(angler&&personHit(angler)<18){if(nearbyShoreInteraction(scene,sim.state)?.id===`angler:${angler.id}`)interactNearby();else walkTo(angler.x,angler.y+shoreWorldMetres(1.5));return;}
  // Benicia's deck is elevated above the water plane used by screenToWorld.
  // Pick its visible projected surface, then walk to the actual deck point.
  const deckPoint=benicia?{x:p.x,y:p.y+shoreWorldMetres(3.5)}:p;
  if(scene.pier&&onPier(scene,deckPoint.x,deckPoint.y)){if(sim.onPier)walkTo(deckPoint.x,deckPoint.y);else if(sim.nearPier)feedback(sim.enterPier());else walkTo(scene.pier.gate.x,scene.pier.gate.y);return;}
  if(p.x>=SHOP.x-20&&p.x<=SHOP.x+SHOP.width+20&&p.y>=SHOP.y-65&&p.y<=SHOP.door.y+30){if(nearbyShoreInteraction(scene,sim.state)?.kind==='shop')interactNearby();else walkTo(SHOP.door.x,SHOP.door.y);return;}
  if(p.y<WORLD.shoreY(p.x)){if(sim.state.phase==='bite'){feedback(sim.strike());return;}if(sim.state.phase==='walk')aim=Math.max(-1,Math.min(1,Math.atan2(p.x-sim.state.player.x,sim.state.player.y-p.y)/(Math.PI/3)));updateUI();return;}
  walkTo(p.x,p.y);
});
function primaryAction(){if(sim.state.phase==='bite')feedback(sim.strike());else if(sim.state.phase==='landed')openCatch();}
function beginCharge(){if(paused())return;if(sim.state.phase!=='walk'){primaryAction();return;}if(!sim.tackleReady){toast('先打开鱼竿配置，装好钓组和鱼饵。');return;}if(!sim.canCast){toast('走到岸边，面朝水面再抛竿。');return;}chargeStart=performance.now();show('cast-charge',true);}
function finishCharge(cancel=false){if(!chargeStart)return;const power=shoreCastPower(performance.now()-chargeStart);chargeStart=0;castCharge=0;castPreview=null;show('cast-charge',false);if(!cancel)feedback(sim.cast({power,aim}));}
$('beach-cast').addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();$('beach-cast').setPointerCapture(e.pointerId);beginCharge();});
$('beach-cast').addEventListener('pointerup',()=>finishCharge());
$('beach-cast').addEventListener('pointercancel',()=>finishCharge(true));
$('beach-cast').addEventListener('lostpointercapture',()=>finishCharge(true));
$('beach-cast').addEventListener('keydown',e=>{if(![' ','Enter'].includes(e.key))return;e.preventDefault();if(!e.repeat)beginCharge();});
$('beach-cast').addEventListener('keyup',e=>{if(![' ','Enter'].includes(e.key))return;e.preventDefault();finishCharge();});
$('beach-cast').addEventListener('blur',()=>finishCharge(true));
$('beach-cast').addEventListener('click',e=>{if(e.detail!==0||paused())return;if(sim.state.phase==='walk'){if(sim.canCast)feedback(sim.cast({power:0,aim}));else toast(!sim.tackleReady?'先打开鱼竿配置，装好钓组和鱼饵。':'走到岸边，再准备抛竿。');}else primaryAction();});
function pulseReel(){if(!paused()&&sim.canReel)reelInput=tapShoreReelInput(reelInput);}
$('beach-reel').addEventListener('click',pulseReel);
$('beach-reel').addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)pulseReel();}});
function setControls(partial){if(paused())return;sim.setFishingControls(partial);syncControlUI();}
function syncControlUI(){
  const c=fishingControls(),words=shoreControlWords(c);
  $('shore-drag').value=Math.round(c.drag*100);$('shore-drag-value').textContent=words.drag;$('shore-drag').setAttribute('aria-valuetext',words.drag);
}
function updateReelFeedback(dt,now){
  reelVisual=stepShoreReelVisual(reelVisual,sim.state.reelFeedback,paused()?0:dt);
  for(const [id,angle]of[['shore-crank',reelVisual.handleAngle],['shore-bail',reelVisual.bailAngle],['shore-spool',reelVisual.spoolAngle]])$(id).setAttribute('transform',`rotate(${angle} 22 14)`);
  $('shore-reel-mechanism').classList.toggle('paying-out',reelVisual.slipping);
  if(!paused()&&soundEnabled&&sound&&reelVisual.clickRate>0&&now>=nextDragClick){
    const t=sound.ctx.currentTime,click=sound.ctx.createOscillator(),gain=sound.ctx.createGain();
    click.type='triangle';click.frequency.setValueAtTime(950,t);click.frequency.exponentialRampToValueAtTime(320,t+.025);
    gain.gain.setValueAtTime(.025,t);gain.gain.exponentialRampToValueAtTime(.001,t+.035);
    click.connect(gain);gain.connect(sound.ctx.destination);click.start(t);click.stop(t+.04);nextDragClick=now+1000/reelVisual.clickRate;
  }
}
$('shore-drag').addEventListener('input',()=>setControls({drag:Number($('shore-drag').value)/100}));
$('shore-drag').addEventListener('change',persist);
function twitch(){if(paused()||!sim.canReel)return;twitchQueued=true;}
$('beach-twitch').onclick=twitch;

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
function openRules(){if(!ownsRules())return;openDialog('rules','');if(benicia){$('modal-content').innerHTML=beniciaRulesMarkup();return;}mountRegulationsBook($('modal-content'),{areaId:scene.id==='half-moon-bay'?'half_moon_bay':'pacifica'});$('close-modal').focus();}
function openShop(){menus.openShop();}
const openBag=()=>menus.openBag(),openJournal=()=>menus.openJournal(),openCatch=()=>menus.openCatch();
function openHelp(){menus.openHelp();const toggle=$('settings-audio');if(toggle){toggle.textContent='总声音：'+(soundEnabled?'开':'关');toggle.onclick=()=>{$('audio-btn').click();openHelp();};}}
$('gear-btn').onclick=openBag;$('journal-btn').onclick=openJournal;$('credits-btn').onclick=openJournal;$('settings-btn').onclick=openHelp;$('rod-config-btn').onclick=()=>menus.openBag(sim.state.activeRod,'rig');$('map-btn').onclick=openMap;initRegulationsButton($('rules-btn'),openRules);

function presentationHint(s){
  if(isShoreLure(s.rodSupplies[s.activeRod]?.id))return s.presentation?.status||'拟饵下沉中';
  if(!isShoreLure(s.rodSupplies[s.activeRod]?.id)&&(s.rodSupplies[s.activeRod]?.bait?.condition??0)<=.08)return '余饵不足 · 收回检查';
  if(Number.isFinite(s.nibbleAt)&&s.elapsed-s.nibbleAt<2.5)return '竿尖轻点 · 有鱼在试探鱼饵';
  const p=s.presentation;if(!p)return '钓组下沉中';
  if(s.rodSupplies[s.activeRod]?.id==='float_rig')return p.mode==='float'?p.status||'浮漂随流移动':'浮漂随流移动';
  if(['钓组下沉中','浪流推着钓组滚动','钓组随浪缓移','钓组贴底较稳'].includes(p.status))return p.status;
  if(p.bottomContact<.3)return '钓组正在沉降';
  if(p.stability<.38)return '钓组被浪推动';
  if(p.stability<.7)return '钓组随浪轻移';
  return '钓组已稳底';
}

function updateUI(){
  syncFishingScene();syncControlUI();
  const s=sim.state,bait=BAITS.find(b=>b.id===s.bait),atShore=sim.onPier||s.player.y-WORLD.shoreY(s.player.x)<=SHORE_MOVEMENT.castReach,fishing=atShore||s.phase!=='walk';
  $('credits').textContent=Math.floor(s.credits);show('map-btn',s.shoreLore.notes.length>0);
  $('clock').textContent=formatGameClock(s.elapsed);
  $('active-rod-name').textContent=s.activeRod==='surf_rod'?'长节沙滩竿':'岸钓竿';
  $('rod-config-btn').disabled=s.phase!=='walk';const supply=s.rodSupplies[s.activeRod];$('tackle-name').textContent=`${supply?supply.id==='float_rig'?'浮钓 · #6':supply.id==='fishfinder_rig'?'滑铅 3 oz · 2/0':'Carolina 1 oz · #1':'未装钓组'} · ${supply?.bait?.condition>.08?bait?.name:'需装饵'}`;
  if(isShoreLure(supply?.id)){const item=SHORE_ITEMS.find(i=>i.id===supply.id),weight={salmon_spoon:'1 oz',salmon_spinner:'3/4 oz',grub_jig:'1/2 oz'}[supply.id];$('tackle-name').textContent=`${item.name} · ${item.hook.includes('/')?item.hook:'#'+item.hook} · ${weight}`;}
  const shore=s.shoreSample||sampleShore(scene,s.player.x,WORLD.shoreY(s.player.x)-90,s.elapsed);$('place').textContent=scene.shortName+(sim.onPier?(benicia?' · 公共钓鱼码头':' · 旧栈桥'):s.shoreLore.notes.some(n=>n.zoneId===shore.zoneId)?' · '+shore.zoneName:'');show('speed',false);
  $('weather').textContent=shore.tideLabel||'海边';$('weather').title='观察浪线与漂流判断水势';
  $('shore-rig-summary').textContent='';show('shore-rig-summary',false);
  const states={walk:'',casting:'钓组飞出',waiting:presentationHint(s),bite:'鱼咬钩了 · 扬竿',fighting:s.reelFeedback?.dragSlip?'泄力出线':s.tension<.06?'鱼线松弛':'中鱼',landed:'鱼已上岸'};
  $('fish-title').textContent=states[s.phase];
  const hints={walk:!sim.tackleReady?'打开鱼竿配置，检查钓组和余饵。':'轻点水面瞄准 · 拉竿后松手抛出',casting:'',waiting:isShoreLure(supply?.id)?'连点摇轮收饵 · 停点沉饵':'观察竿尖 · 连点摇轮收回',bite:'现在扬竿 / 空格',fighting:s.fishMotion?.jumpActive?'鱼跃出水面 · 保持连线':s.reelFeedback?.dragSlip?'让鱼出线，保持竿弯':s.tension>.8?'竿身压弯 · 放松泄力':s.tension<.06?'轻点摇轮收紧鱼线':'点按摇轮 · 鱼冲时让线',landed:'留下或放流'};
  $('navigation').textContent=hints[s.phase];$('fish-detail').textContent=hints[s.phase];
  show('boat-fishing',fishing);show('fish-status',s.phase!=='walk');
  $('boat-console').classList.toggle('actions-only',!fishing);$('boat-console').classList.toggle('fishing-open',fishing);$('boat-fishing').classList.toggle('has-status',s.phase!=='walk');
  show('beach-cast',['walk','casting','bite','landed'].includes(s.phase));$('beach-cast').disabled=s.phase==='casting';$('beach-cast').textContent=s.phase==='bite'?'扬竿':s.phase==='landed'?'查看鱼获':s.phase==='casting'?'抛投中':'按住抛竿';
  show('beach-reel',Boolean(sim.canReel));$('beach-reel-label').textContent='点击摇轮';
  show('beach-twitch',['waiting','bite','fighting'].includes(s.phase));$('beach-twitch').textContent=s.phase==='fighting'?'轻提':'轻抽';
  show('shore-drag-control',s.phase!=='landed');$('boat-console').classList.toggle('is-bite',s.phase==='bite');
  $('beach-state').textContent=JSON.stringify({scene:scene.id,started,paused:paused(),...s,canCast:sim.canCast,canReel:sim.canReel,nearShop:sim.nearShop,view:'shore',focusView:{active:false},actionCamera:lastWorldFrame?.actionCamera,fishVisual:lastWorldFrame?.fishVisual,reelVisual});
  show('rules-btn',started&&ownsRules());placeRegulationsButton($('rules-btn'),[$('boat-console')]);
  syncInsets();
}

window.addEventListener('keydown',e=>{
  if(modalType){if(e.key==='Escape'){e.preventDefault();closeDialog();}else if(e.key==='Tab'){const items=[...dialog.querySelectorAll('button:not(:disabled),input,select,a[href],[tabindex=\"0\"]')].filter(el=>el.getClientRects().length);const first=items[0],lastItem=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastItem?.focus();}else if(!e.shiftKey&&document.activeElement===lastItem){e.preventDefault();first?.focus();}}return;}
  if(paused())return;
  const input=e.target.closest('input,select,textarea'),k=e.key.toLowerCase();
  if(input&&(!input.matches('input[type="range"]')||['arrowup','arrowdown','arrowleft','arrowright','home','end','pageup','pagedown'].includes(k)))return;
  if(e.target.closest('button,a')&&[' ','enter'].includes(k))return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','f','t'].includes(k))e.preventDefault();if(e.repeat)return;keys.add(k);if(k===' ')beginCharge();if(k==='f')pulseReel();if(k==='t')twitch();if(k==='i')openBag();if(k==='j')openJournal();if(k==='m')openMap();if(k==='e')interactNearby();
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(e.key===' ')finishCharge();});
window.addEventListener('blur',()=>{focused=false;resetInput();persist();});
window.addEventListener('focus',()=>{focused=true;last=performance.now();});
document.addEventListener('visibilitychange',()=>{resetInput();persist();last=performance.now();});
window.addEventListener('pagehide',persist);
window.addEventListener('location-picker',e=>{scenePickerOpen=Boolean(e.detail?.open);resetInput();persist();last=performance.now();});
let lastInsetLayout='';
function syncInsets(){
  const visibleRect=element=>element&&element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden'?element.getBoundingClientRect():null;
  const hud=[...document.querySelectorAll('.hud,#trip-info,#trip-tools')].map(visibleRect).filter(Boolean);
  const top=Math.max(0,...hud.map(r=>r.bottom)),consoleRect=started?visibleRect($('boat-console')):null;
  const height=consoleRect?.height||0,bottom=consoleRect?Math.max(0,innerHeight-consoleRect.top):80;
  let left=0,right=0;
  // On phones/landscape the location button sits below the other HUD rows.
  // Exclude its narrow side strip instead of wasting the whole row's height.
  for(const element of document.querySelectorAll('.location-hud-link')){
    const r=visibleRect(element);if(!r||r.bottom<=top||r.top>=innerHeight-bottom)continue;
    if(r.left+r.width/2>innerWidth/2)right=Math.max(right,innerWidth-r.left);else left=Math.max(left,r.right);
  }
  const layout=[top,bottom,left,right,height].map(v=>Math.round(v*10)/10).join(':');
  if(layout!==lastInsetLayout){lastInsetLayout=layout;world.setInsets?.({top,bottom,left,right});$('app').style.setProperty('--shore-console-height',(height+24)+'px');}
}
function resize(){world.resize(innerWidth,innerHeight);syncInsets();resetInput();}
window.addEventListener('resize',resize);resize();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused()){
  const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(x||y)afterPierWalk=null;
  const stroke=stepShoreReelInput(reelInput,dt,{enabled:sim.canReel});reelInput=stroke.state;reeling=stroke.input.reel;$('beach-reel').classList.toggle('active',reeling);
  sim.update(dt,{x,y,drag:fishingControls().drag,rodLift:.35,rodSweep:0,...stroke.input,twitch:twitchQueued});twitchQueued=false;
  if(afterPierWalk&&!sim.onPier&&!sim.state.walkTarget&&!sim.state.inspection){const p=afterPierWalk;afterPierWalk=null;feedback(sim.walkTo(p.x,p.y));}
  if(sim.state.inspection&&sim.state.inspection.id!==inspectionId)openInspection();
  const place=interactions.step(sim.state,{paused:paused()});if(place)activatePlace(place);
  if(sim.state.phase!==lastPhase){if(sim.state.phase==='landed'){persist();openCatch();}if(sim.state.phase==='bite'){toast('竿尖一沉——现在扬竿！');if(navigator.vibrate)navigator.vibrate([70,70,100]);}lastPhase=sim.state.phase;syncInsets();}
  if(sim.state.message!==lastMessage){lastMessage=sim.state.message;if(lastMessage)toast(lastMessage);}
  if(now-lastSave>5000){persist();lastSave=now;}
}
  if(chargeStart){castCharge=shoreCastPower(now-chargeStart);castPreview=sim.previewCast({power:castCharge,aim});}
  if(sound){sound.gain.gain.setTargetAtTime(soundEnabled&&!document.hidden&&focused?(.12+.06*Math.sin(now/1400)):0,sound.ctx.currentTime,.2);}
  updateReelFeedback(dt,now);syncFishingScene();lastWorldFrame=world.draw(castPreview?{...sim.state,castPreview,castCharge,castAim:aim}:sim.state,sim.state.elapsed,{reducedMotion:reducedMotion.matches,actionFocus:reeling});
  updateUI();requestAnimationFrame(frame);
}
updateUI();requestAnimationFrame(frame);
