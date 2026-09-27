import {bindPointer} from './input.js?v=20260927-pixel-v13';
import {rodPoseFromDrag,clockwiseTurns,createCrankInput} from './pixel-fishing-input.js?v=20260927-pixel-v13';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rigNames={bottom:'沉底组',dropper:'双支线',slider:'滑铅组',jig:'软饵组',float:'浮漂组',sabiki:'羽毛组'};
const mountNames={hand:'手持',port:'左舷竿架',starboard:'右舷竿架'};
const TAU=Math.PI*2;

export function mountFishingConsole(root,{sim,getActions,isRetrieving=()=>false,onFeedback,onMount,onRetrieve,onStopReel=()=>{}}){
 const get=id=>root.querySelector('#'+id),pose=get('rod-pose'),wheel=get('reel-wheel'),drag=get('drag-knob'),mount=get('rod-mount'),spool=get('spool-toggle'),lower=get('lower-rig'),cast=get('cast-btn'),hold=get('reel-btn'),retrieve=get('retrieve-rig'),take=get('take-rod');
 const crank=createCrankInput();let rodGesture=null,crankAngle=null,dragGesture=null,rotation=0,lastFrame=0,keyboardReel=false;
 const actions=()=>getActions();
 const pointerAngle=e=>{const r=wheel.getBoundingClientRect(),x=e.clientX-r.left-r.width*.46,y=e.clientY-r.top-r.height*.49;return Math.hypot(x,y)<15?null:Math.atan2(y,x);};
 const pointers=[bindPointer(pose,{
  start:e=>{if(!actions().adjustPose)return false;const s=sim.state,r=pose.getBoundingClientRect();rodGesture={x:e.clientX,y:e.clientY,elevation:s.rodElevation??45,azimuth:s.rodAzimuth??70,width:r.width,height:r.height};},
  move:e=>{if(!cancelUnavailable(actions()).adjustPose)return;if(rodGesture){const p=rodPoseFromDrag(rodGesture,e.clientX-rodGesture.x,e.clientY-rodGesture.y,rodGesture);sim.setRodPose(p);}},
  end:()=>{rodGesture=null;},cancel:()=>{rodGesture=null;}
 }),bindPointer(wheel,{
  start:e=>{if(!actions().reel)return false;crank.start();crankAngle=pointerAngle(e);},
  move:e=>{if(!cancelUnavailable(actions()).reel)return;const angle=pointerAngle(e);if(angle!=null&&crankAngle!=null){const turns=clockwiseTurns(crankAngle,angle);crank.turn(turns);}crankAngle=angle;},
  end:()=>{crank.stop();crankAngle=null;},cancel:()=>{crank.stop();crankAngle=null;}
 }),bindPointer(drag,{
  start:e=>{if(!actions().drag)return false;dragGesture={y:e.clientY,value:sim.state.drag};},
  move:e=>{if(!cancelUnavailable(actions()).drag)return;if(dragGesture){const desired=clamp(dragGesture.value+(dragGesture.y-e.clientY)/180,.2,.85);sim.changeDrag(desired-sim.state.drag);}},
  end:()=>{dragGesture=null;},cancel:()=>{dragGesture=null;}
 })];
 // A changing fishing phase can remove a control before the finger is lifted.
 // End its gesture and queued travel so it cannot resume on a later phase.
 function cancelUnavailable(a){
  if(!a.adjustPose){pointers[0].reset();rodGesture=null;}
  if(!a.reel){pointers[1].reset();crank.stop();crankAngle=null;keyboardReel=false;}
  if(!a.drag){pointers[2].reset();dragGesture=null;}
  return a;
 }
 pose.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home'].includes(e.key)||!actions().adjustPose)return;e.preventDefault();e.stopPropagation();const s=sim.state;sim.setRodPose({elevation:e.key==='Home'?45:(s.rodElevation??45)+(e.key==='ArrowUp'?5:e.key==='ArrowDown'?-5:0),azimuth:e.key==='Home'?70:(s.rodAzimuth??70)+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0)});});
 drag.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||!actions().drag)return;e.preventDefault();e.stopPropagation();sim.changeDrag(['ArrowUp','ArrowRight'].includes(e.key)?.05:-.05);});
 wheel.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowRight',' ','Enter'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(actions().reel)keyboardReel=true;});
 wheel.addEventListener('keyup',e=>{if(['ArrowUp','ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();e.stopPropagation();keyboardReel=false;}});
 wheel.addEventListener('blur',()=>{keyboardReel=false;});
 spool.onclick=()=>{onStopReel();if(actions().spool)onFeedback(sim.setReelMode(sim.state.reelMode==='free'?'brake':'free'));};
 lower.onclick=()=>{const a=actions();if(a.hook)onFeedback(sim.hook());else if(a.catch)onFeedback({ok:true,action:'catch'});else if(a.lower)onFeedback(sim.lowerRig());};
 mount.onchange=()=>{if(actions().mount)onMount(mount.value);mount.value='hand';};take.onclick=()=>{if(actions().take)onMount('hand');};retrieve.onclick=()=>{if(actions().retrieve)onRetrieve();};

 function paintRod(canvas,s,compact=false){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,elevation=(s.rodElevation??45)*Math.PI/180,bend=clamp(s.rodBend||0,0,1),azimuth=(s.rodAzimuth??70)/110;
  c.clearRect(0,0,w,h);c.fillStyle='#c8c39f';c.fillRect(0,0,w,h);
  c.strokeStyle='#a6ae8b';c.lineWidth=1;for(let x=0;x<w;x+=24){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
  const by=compact?h*.82:h*.83,length=compact?w*.43:Math.min(w*.43,h*.85),side=azimuth<0?-1:1,dx=Math.cos(elevation)*length*azimuth,dy=-Math.sin(elevation)*length;
  const baseX=w*.5,points=[];
  for(let i=0;i<=18;i++){const t=i/18;points.push({x:baseX+dx*t,y:by+dy*t+bend*length*.48*t*t*t});}
  c.lineCap='round';for(let i=1;i<points.length;i++){c.strokeStyle=i<5?'#354c42':i<11?'#415b4b':'#9a8050';c.lineWidth=i<4?6:i<9?3:1.7;c.beginPath();c.moveTo(points[i-1].x,points[i-1].y);c.lineTo(points[i].x,points[i].y);c.stroke();}
  c.strokeStyle='#e5eed2';c.lineWidth=1;c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](p.x+side*2,p.y+2));const tip=points.at(-1);c.lineTo(tip.x+azimuth*8,h+4);c.stroke();
  for(const i of[4,8,11,14,17]){const p=points[i];c.strokeStyle='#5e7669';c.strokeRect(p.x-2,p.y+1,4,3);}
  c.fillStyle='#6d4e37';c.fillRect(baseX-4,by-3,8,13);c.fillStyle='#bda16c';c.fillRect(baseX-4,by,8,2);
  if(s.rodMount!=='hand'){c.fillStyle='#52746a';c.fillRect(baseX-9,by+6,18,7);c.fillStyle='#dbe2b7';c.fillRect(baseX-11,by+5,22,2);}else{c.fillStyle='#dcac7c';c.fillRect(baseX-7,by+3,8,5);c.fillRect(baseX+2,by-2,6,5);}
  c.fillStyle='#4d6c5e';c.font=`${compact?10:11}px monospace`;c.textAlign='left';c.fillText(`${Math.round(s.rodElevation??45)}°`,8,compact?13:16);
  if(!compact){c.textAlign='right';c.fillText(`${Math.round(s.rodAzimuth??70)}°`,w-8,16);c.fillStyle='#75866a';c.fillRect(8,h-9,w-16,3);c.fillStyle=bend>.85?'#b76e4f':'#427568';c.fillRect(8,h-9,(w-16)*bend,3);}
 }
 function paintReel(s){
  const focus=document.getElementById('app')?.classList.contains('is-fishing-focus'),c=wheel.getContext('2d'),w=wheel.width,h=wheel.height,cx=w*.46,cy=h*.49,r=Math.min(w,h)*.32;
  c.clearRect(0,0,w,h);c.fillStyle=focus?'#284b4c':'#d8ccaa';c.fillRect(0,0,w,h);c.fillStyle='#81907b';c.fillRect(cx-13,cy+r-1,26,h-cy-r);c.fillStyle='#304c45';c.beginPath();c.arc(cx,cy,r+6,0,TAU);c.fill();c.fillStyle='#a5ae8b';c.beginPath();c.arc(cx,cy,r+2,0,TAU);c.fill();c.fillStyle='#36594f';c.beginPath();c.arc(cx,cy,r-4,0,TAU);c.fill();
  c.save();c.translate(cx,cy);c.rotate(rotation*.32);c.strokeStyle='#b6c6a3';c.lineWidth=2;for(let i=0;i<8;i++){const a=i/8*TAU;c.beginPath();c.moveTo(Math.cos(a)*8,Math.sin(a)*8);c.lineTo(Math.cos(a)*(r-8),Math.sin(a)*(r-8));c.stroke();}c.restore();
  for(let i=0;i<4;i++){c.strokeStyle='#d8d4a3';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,10+i*3,0,TAU);c.stroke();}
  const x=cx+Math.cos(rotation)*r*.84,y=cy+Math.sin(rotation)*r*.84;c.strokeStyle='#d5d3ab';c.lineWidth=6;c.beginPath();c.moveTo(cx,cy);c.lineTo(x,y);c.stroke();c.fillStyle='#254a43';c.fillRect(x-7,y-5,14,10);c.fillStyle='#728b71';c.fillRect(x-6,y-5,12,3);c.fillStyle='#deb46d';c.beginPath();c.arc(cx,cy,5,0,TAU);c.fill();
  c.fillStyle=focus?'#fff0c6':'#355e50';c.font='11px monospace';c.textAlign='left';c.fillText(`${(s.paidLineMeters||0).toFixed(1)} m`,8,15);c.fillStyle=s.reelMode==='free'?'#aa654c':'#4c7261';c.fillRect(w-13,7,6,6);
 }
 function update(){
  const s=sim.state,a=cancelUnavailable(actions()),show=(el,visible)=>{el.hidden=!visible;if(el.tagName==='BUTTON'||el.tagName==='SELECT')el.disabled=!visible;};
  get('tackle-name').textContent=`${mountNames[s.rodMount]||'手持'} · ${rigNames[s.rig]||'钓组'}`;get('rod-load').textContent=`${(s.rodLoadN||0).toFixed(1)} N`;
  show(pose,a.pose);pose.setAttribute('role',a.adjustPose?'slider':'img');pose.tabIndex=a.adjustPose?0:-1;pose.style.cursor=a.adjustPose?'move':'default';pose.setAttribute('aria-valuenow',String(Math.round(s.rodElevation??45)));pose.setAttribute('aria-valuetext',`抬竿 ${Math.round(s.rodElevation??45)} 度，朝向 ${Math.round(s.rodAzimuth??70)} 度，弯曲 ${Math.round((s.rodBend||0)*100)}%`);pose.removeAttribute('aria-disabled');
  wheel.setAttribute('role',a.reel?'slider':'img');wheel.tabIndex=a.reel?0:-1;wheel.style.cursor=a.reel?'grab':'default';wheel.setAttribute('aria-valuenow',String(Math.round((s.paidLineMeters||0)*10)/10));wheel.removeAttribute('aria-disabled');
  show(get('reel-instrument'),a.reelInstrument);show(hold,a.reel);show(spool,a.spool);spool.textContent=s.reelMode==='free'?'锁住线杯':'打开线杯';spool.setAttribute('aria-pressed',String(s.reelMode==='free'));
  show(lower,a.lower||a.hook||a.catch);lower.textContent=a.hook?'提竿！':a.catch?'鱼获':'船边下放';show(cast,a.cast);
  show(mount,a.mount);mount.value='hand';show(take,a.take);show(retrieve,a.retrieve);retrieve.textContent=isRetrieving()?'停止收竿':'收回钓组';retrieve.setAttribute('aria-pressed',String(isRetrieving()));
  show(drag,a.drag);drag.textContent=`✳ ${Math.round(s.drag*100)}%`;drag.setAttribute('aria-valuenow',String(Math.round(s.drag*100)));drag.removeAttribute('aria-disabled');
  const tools=a.lower||a.hook||a.catch||a.cast||a.mount||a.take||a.retrieve||a.drag;root.querySelector('.fishing-toolbar').hidden=!tools;root.querySelector('.fishing-instruments').hidden=!a.pose&&!a.reelInstrument;
  root.classList.toggle('rod-only',!a.reelInstrument);root.classList.toggle('no-tools',!tools);root.classList.toggle('has-status',['casting','bite','fight'].includes(s.fishState));
  const mini=document.getElementById('rod-monitor');if(mini){mini.querySelector('span').textContent=`${mountNames[s.rodMount]||'手持'} · ${(s.paidLineMeters||0).toFixed(1)} m`;mini.querySelector('b').textContent=s.fishState==='bite'?'咬钩！':`${(s.rodLoadN||0).toFixed(1)} N`;}
 }
 return{input:dt=>{const a=cancelUnavailable(actions());return{reel:a.reel?Math.max(crank.sample(dt),keyboardReel?1.2:0):0};},reset(){for(const p of pointers)p.reset();crank.stop();keyboardReel=false;rodGesture=null;crankAngle=null;dragGesture=null;},update,draw(dt){const s=sim.state;rotation+=(s.crankRate||0)*TAU*dt;lastFrame+=dt;if(lastFrame<1/30)return;lastFrame=0;if(!root.hidden){paintRod(pose,s);paintReel(s);}const mini=document.getElementById('rod-monitor');if(mini&&!mini.hidden)paintRod(mini.querySelector('canvas'),s,true);}};
}
