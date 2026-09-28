import {rodSelectionStatus} from './pixel-rod-selection.js?v=20260928-pixel-v71';
import {drawAnglerArm} from './pixel-angler-arms.js?v=20260928-pixel-v71';
import {rodFlexPoint} from './pixel-rod-response.js?v=20260928-pixel-v71';
import {rigHookSize} from './pixel-hook-label.js?v=20260928-pixel-v71';
import {formatDepth,metersToFeet} from './units.js?v=20260928-pixel-v71';
import {getRigProfile} from './fishing-rigs.js?v=20260928-pixel-v71';
import {bindPointer} from './input.js?v=20260928-pixel-v71';
import {clockwiseTurns,createCrankInput} from './pixel-fishing-input.js?v=20260928-pixel-v71';
import {fishingFeedback,reelMotion} from './pixel-fishing-feedback.js?v=20260928-pixel-v71';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rigNames={bottom:'沉底组',dropper:'双支线',slider:'滑铅组',jig:'软饵组',float:'浮漂组',sabiki:'羽毛组',feather40:'双支羽毛'};
const mountNames={hand:'手持',port:'左舷竿架',starboard:'右舷竿架'};
const TAU=Math.PI*2;

export function mountFishingConsole(root,{sim,getActions,getFocusView=()=>null,isRetrieving=()=>false,onFeedback,onMount,onRetrieve,onStopReel=()=>{},onSelectRod=()=>{},onConfigure=()=>{}}){
 const get=id=>root.querySelector('#'+id),wheel=get('reel-wheel'),drag=get('drag-knob'),mount=get('rod-mount'),spool=get('spool-toggle'),lower=get('lower-rig'),hold=get('reel-btn'),retrieve=get('retrieve-rig'),reelActions=get('reel-actions');
 const mountButtons=Object.fromEntries(['port','hand','starboard'].map(value=>[value,get('rod-'+value)]));
 const canStow=a=>a.mount||(a.take&&['idle','sinking','waiting'].includes(sim.state.fishState));
 const rodSelect=get('active-rod-select'),rodName=get('active-rod-name'),rodLocation=get('active-rod-location');let rodSignature='';
 if(rodSelect)rodSelect.onchange=()=>{if(rodSelectionStatus(sim.state).switchable){onStopReel();onSelectRod(rodSelect.value);}};
 const configure=get('rod-config-btn');
 if(configure)configure.onclick=()=>{if(getActions().assemble){onStopReel();onConfigure();}};
 const crank=createCrankInput();let crankAngle=null,dragGesture=null,rotation=0,spoolRotation=0,lastFrame=0,keyboardReel=false,focusHold=false,crankOrigin=null,crankMoved=false;
 drag.innerHTML='<span class="drag-star" aria-hidden="true">✳</span><span class="drag-caption">泄力</span><span class="drag-marks" aria-hidden="true">＋<br>−</span><span class="drag-focus-up" aria-hidden="true">收紧 ↑</span><span class="drag-focus-track" aria-hidden="true"><i></i></span><span class="drag-focus-down" aria-hidden="true">放松 ↓</span><span class="drag-focus-value"></span>';
 const actions=()=>getActions();
 const pointerAngle=e=>{const r=wheel.getBoundingClientRect(),focus=getFocusView()?.active,x=e.clientX-r.left-r.width*(focus?.5:.46),y=e.clientY-r.top-r.height*(focus?.5:.49);return Math.hypot(x,y)<15?null:Math.atan2(y,x);};
 function setDragFromPointer(e){
  if(!dragGesture)return;
  const track=dragGesture.track;
  const desired=track?clamp(.85-(e.clientY-track.top)/track.height*.65,.2,.85):clamp(dragGesture.value+(dragGesture.y-e.clientY)/180,.2,.85);
  sim.changeDrag(desired-sim.state.drag);
 }
 const pointers=[bindPointer(wheel,{
  start:e=>{if(!actions().reel)return false;crank.start();focusHold=Boolean(getFocusView()?.active);crankMoved=false;crankOrigin={x:e.clientX,y:e.clientY};crankAngle=pointerAngle(e);},
  move:e=>{if(!cancelUnavailable(actions()).reel)return;if(crankOrigin&&Math.hypot(e.clientX-crankOrigin.x,e.clientY-crankOrigin.y)>6)crankMoved=true;const angle=pointerAngle(e);if(angle!=null&&crankAngle!=null){const turns=clockwiseTurns(crankAngle,angle);crank.turn(turns);}crankAngle=angle;},
  end:()=>{crank.stop();crankAngle=null;focusHold=false;crankOrigin=null;crankMoved=false;},cancel:()=>{crank.stop();crankAngle=null;focusHold=false;crankOrigin=null;crankMoved=false;}
 }),bindPointer(drag,{
  start:e=>{if(!actions().drag)return false;const rect=getFocusView()?.active?drag.querySelector?.('.drag-focus-track')?.getBoundingClientRect():null;dragGesture={y:e.clientY,value:sim.state.drag,track:rect?.height>0?rect:null};if(dragGesture.track)setDragFromPointer(e);},
  move:e=>{if(!cancelUnavailable(actions()).drag)return;setDragFromPointer(e);},
  end:()=>{dragGesture=null;},cancel:()=>{dragGesture=null;}
 })];
 // A changing fishing phase can remove a control before the finger is lifted.
 // End its gesture and queued travel so it cannot resume on a later phase.
 function cancelUnavailable(a){
  if(!a.reel){pointers[0].reset();crank.stop();crankAngle=null;focusHold=false;crankOrigin=null;crankMoved=false;keyboardReel=false;}
  if(!a.drag){pointers[1].reset();dragGesture=null;}
  return a;
 }
 drag.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||!actions().drag)return;e.preventDefault();e.stopPropagation();sim.changeDrag(['ArrowUp','ArrowRight'].includes(e.key)?.05:-.05);});
 wheel.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowRight',' ','Enter'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(actions().reel)keyboardReel=true;});
 wheel.addEventListener('keyup',e=>{if(['ArrowUp','ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();e.stopPropagation();keyboardReel=false;}});
 wheel.addEventListener('blur',()=>{keyboardReel=false;});
 spool.onclick=()=>{onStopReel();if(actions().spool)onFeedback(sim.setReelMode(sim.state.reelMode==='free'?'brake':'free'));};
 lower.onclick=()=>{const a=actions();if(a.hook)onFeedback(sim.hook());else if(a.catch)onFeedback({ok:true,action:'catch'});else if(a.lower)onFeedback(sim.lowerRig());};
 for(const [value,button] of Object.entries(mountButtons))button.onclick=()=>{const a=actions();if(value===sim.state.rodMount)return;if(value==='hand'?a.take:canStow(a)){onStopReel();onMount(value);}};retrieve.onclick=()=>{if(actions().retrieve)onRetrieve();};

 function paintRod(canvas,s,compact=false){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,elevation=(s.rodElevation??45)*Math.PI/180,bend=clamp(s.rodBend||0,0,1),azimuth=(s.rodAzimuth??70)/110;
  c.clearRect(0,0,w,h);c.fillStyle='#c8c39f';c.fillRect(0,0,w,h);
  c.strokeStyle='#a6ae8b';c.lineWidth=1;for(let x=0;x<w;x+=24){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
  const by=compact?h*.74:h*.67,length=Math.min(w*.43,h*(compact?.62:.55)),side=azimuth<0?-1:1,dx=Math.cos(elevation)*length*azimuth,dy=-Math.sin(elevation)*length;
  const baseX=w*.5,points=[];
  for(let i=0;i<=18;i++){const t=i/18,motion=rodFlexPoint(s,t,length);points.push({x:baseX+dx*t+motion.x,y:by+dy*t+bend*length*.48*motion.shape+motion.y});}
  if(s.rodMount==='hand')drawAnglerArm(c,{root:{x:w*.20,y:h+15},elbow:{x:w*.34,y:h+2},hand:{x:baseX-3,y:by+5},scale:compact?.44:.58});
  c.lineCap='round';for(let i=1;i<points.length;i++){c.strokeStyle=i<5?'#354c42':i<11?'#415b4b':'#9a8050';c.lineWidth=i<4?6:i<9?3:1.7;c.beginPath();c.moveTo(points[i-1].x,points[i-1].y);c.lineTo(points[i].x,points[i].y);c.stroke();}
  c.strokeStyle='#e5eed2';c.lineWidth=1;c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](p.x+side*2,p.y+2));const tip=points.at(-1),entry={x:tip.x+azimuth*8,y:h+4},slack=clamp(s.lineSlackMeters||0,0,6)*4;
  c.quadraticCurveTo((tip.x+entry.x)*.5+slack,(tip.y+entry.y)*.5+slack,entry.x,entry.y);c.stroke();
  for(const i of[4,8,11,14,17]){const p=points[i];c.strokeStyle='#5e7669';c.strokeRect(p.x-2,p.y+1,4,3);}
  c.fillStyle='#6d4e37';c.fillRect(baseX-4,by-3,8,13);c.fillStyle='#bda16c';c.fillRect(baseX-4,by,8,2);
  if(s.rodMount!=='hand'){c.fillStyle='#52746a';c.fillRect(baseX-9,by+6,18,7);c.fillStyle='#dbe2b7';c.fillRect(baseX-11,by+5,22,2);}else{c.fillStyle='#dcac7c';for(let i=0;i<3;i++){c.fillStyle=i===0?'#f1c594':'#dcac7c';c.fillRect(baseX-5,by+1+i*3,8,2);}}
 }
 function paintReel(s){
  const focus=document.getElementById('app')?.classList.contains('is-fishing-focus'),c=wheel.getContext('2d'),w=wheel.width,h=wheel.height,cx=w*.46,cy=h*.49,r=Math.min(w,h)*.32;
  c.clearRect(0,0,w,h);if(focus)return;c.fillStyle=focus?'#284b4c':'#d8ccaa';c.fillRect(0,0,w,h);c.fillStyle='#81907b';c.fillRect(cx-13,cy+r-1,26,h-cy-r);c.fillStyle='#304c45';c.beginPath();c.arc(cx,cy,r+6,0,TAU);c.fill();c.fillStyle='#a5ae8b';c.beginPath();c.arc(cx,cy,r+2,0,TAU);c.fill();c.fillStyle='#36594f';c.beginPath();c.arc(cx,cy,r-4,0,TAU);c.fill();
  c.save();c.translate(cx,cy);c.rotate(spoolRotation);c.strokeStyle='#b6c6a3';c.lineWidth=2;for(let i=0;i<8;i++){const a=i/8*TAU;c.beginPath();c.moveTo(Math.cos(a)*8,Math.sin(a)*8);c.lineTo(Math.cos(a)*(r-8),Math.sin(a)*(r-8));c.stroke();}c.restore();
  for(let i=0;i<4;i++){c.strokeStyle='#d8d4a3';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,10+i*3,0,TAU);c.stroke();}
  const x=cx+Math.cos(rotation)*r*.84,y=cy+Math.sin(rotation)*r*.84;c.strokeStyle='#d5d3ab';c.lineWidth=6;c.beginPath();c.moveTo(cx,cy);c.lineTo(x,y);c.stroke();c.fillStyle='#254a43';c.fillRect(x-7,y-5,14,10);c.fillStyle='#728b71';c.fillRect(x-6,y-5,12,3);c.fillStyle='#deb46d';c.beginPath();c.arc(cx,cy,5,0,TAU);c.fill();
  c.fillStyle=focus?'#fff0c6':'#355e50';c.font='11px monospace';c.textAlign='left';c.fillText(formatDepth(s.paidLineMeters||0),8,15);c.fillStyle=s.reelMode==='free'?'#aa654c':'#4c7261';c.fillRect(w-13,7,6,6);if(sim.hasElectricReel){c.fillStyle='#253e42';c.fillRect(w-34,h-22,26,15);c.fillStyle='#acdcd0';c.font='10px monospace';c.fillText(isRetrieving()?'ON':'E',w-30,h-11);}
 }
 function update(){
  if(configure){configure.disabled=!getActions().assemble;configure.title=configure.disabled?'收起钓组后可配置':'配置当前鱼竿';}
  const s=sim.state,a=cancelUnavailable(actions()),focus=Boolean(getFocusView()?.active),feedback=fishingFeedback(s),show=(el,visible)=>{el.hidden=!visible;if(el.tagName==='BUTTON'||el.tagName==='SELECT')el.disabled=!visible;};
  if(rodSelect&&rodName&&rodLocation){
   const selection=rodSelectionStatus(s),signature=selection.rods.map(r=>r.id).join('|');
   if(signature!==rodSignature){rodSelect.replaceChildren(...selection.rods.map(r=>{const option=document.createElement('option');option.value=r.id;option.textContent=r.name;return option;}));rodSignature=signature;}
   rodSelect.value=selection.active?.id||'';show(rodSelect,selection.switchable);rodName.hidden=selection.switchable;rodName.textContent=selection.active?.name||'未携带鱼竿';rodLocation.textContent=selection.location;rodLocation.hidden=!s.pendingRodPickup;
  }
  const supplies=s.fishState==='idle'?sim.rodConsumableStatus?.():null,needsRig=supplies&&(!supplies.rig.present||supplies.rig.condition<=.08),needsBait=supplies&&!needsRig&&supplies.requiresBait!==false&&!(supplies.bait?.condition>.08);
  get('tackle-name').textContent=needsRig?'未装钓组 · 打开鱼竿更换':needsBait?'未挂饵':`${rigNames[s.rig]||'钓组'} · ${rigHookSize(s.rig)}`;get('rod-load').textContent=feedback.cue;
  wheel.setAttribute('role',a.reel?'slider':'img');wheel.tabIndex=a.reel?0:-1;wheel.style.cursor=a.reel?'grab':'default';wheel.setAttribute('aria-valuenow',String(Math.round(metersToFeet(s.paidLineMeters||0)*10)/10));wheel.setAttribute('aria-valuetext',`${feedback.cue}，已放线 ${formatDepth(s.paidLineMeters||0)}`);wheel.removeAttribute('aria-disabled');
  show(get('reel-instrument'),a.reelInstrument);show(hold,a.reel&&!focus);show(spool,a.spool&&!focus);show(reelActions,(a.reel||a.spool)&&!focus);spool.textContent=s.reelMode==='free'?'停止放线':'放线';spool.setAttribute('aria-pressed',String(s.reelMode==='free'));
  show(lower,a.lower||a.hook||a.catch);lower.textContent=a.hook?(getRigProfile(s.rig).hookStyle==='circle'?'收紧鱼线':'轻提鱼竿'):a.catch?'鱼获':'船边下放';
  show(mount,a.mount||a.take);for(const [value,button] of Object.entries(mountButtons)){const selected=s.rodMount===value,available=value==='hand'?a.take:canStow(a);show(button,selected||available);button.disabled=selected||!available;button.setAttribute('aria-pressed',String(selected));}show(retrieve,a.retrieve);retrieve.textContent=isRetrieving()?'停止电收':'电动收线';retrieve.setAttribute('aria-pressed',String(isRetrieving()));
  const dragValue=drag.querySelector?.('.drag-focus-value');if(dragValue)dragValue.textContent=feedback.dragLabel;show(drag,a.drag);drag.setAttribute('aria-orientation','vertical');drag.style.setProperty?.('--drag-position',`${(1-clamp((s.drag-.2)/.65,0,1))*100}%`);drag.style.setProperty?.('--drag-angle',`${-100+clamp((s.drag-.2)/.65,0,1)*200}deg`);drag.setAttribute('aria-valuenow',String(Math.round(s.drag*100)));drag.setAttribute('aria-valuetext',`泄力${feedback.dragLabel}，向上拧紧，向下放松`);drag.removeAttribute('aria-disabled');
  const tools=a.reel||a.spool||a.lower||a.hook||a.catch||a.mount||a.take||a.retrieve||a.drag;root.querySelector('.fishing-toolbar').hidden=!tools;root.querySelector('.fishing-instruments').hidden=!a.reelInstrument;
  root.classList.toggle('can-wind',a.reel);root.classList.toggle('no-instruments',!a.reelInstrument);root.classList.toggle('no-tools',!tools);root.classList.toggle('has-status',['bite','fight'].includes(s.fishState));
  const mini=document.getElementById('rod-monitor');if(mini){mini.querySelector('span').textContent=`${mountNames[s.rodMount]||'手持'} · ${formatDepth(s.paidLineMeters||0)}`;mini.querySelector('b').textContent=feedback.cue;}
 }
 function positionFocus(){const g=getFocusView();if(!g?.active||!g.reelCenter)return;const r=Math.max(44,g.reelTouchRadius||44);root.style.setProperty?.('--focus-reel-left',`${g.reelCenter.x-r}px`);root.style.setProperty?.('--focus-reel-top',`${g.reelCenter.y-r}px`);root.style.setProperty?.('--focus-reel-size',`${r*2}px`);}
 return{input:dt=>{const a=cancelUnavailable(actions());return{reel:a.reel?Math.max(crank.sample(dt),(keyboardReel||focusHold&&!crankMoved)?1.2:0):0};},reset(){for(const p of pointers)p.reset();crank.stop();keyboardReel=false;crankAngle=null;dragGesture=null;focusHold=false;crankOrigin=null;crankMoved=false;},update,draw(dt){positionFocus();const s=sim.state,advance=s.paused?0:clamp(Number.isFinite(dt)?dt:0,0,.1);rotation=(rotation+(s.crankRate||0)*TAU*advance)%TAU;spoolRotation=(spoolRotation+reelMotion(s).spoolRadiansPerSecond*advance)%TAU;lastFrame+=dt;if(lastFrame<1/30)return;lastFrame=0;if(!root.hidden){if(actions().reelInstrument)paintReel(s);}const mini=document.getElementById('rod-monitor');if(mini&&!mini.hidden)paintRod(mini.querySelector('canvas'),s,true);}};
}
