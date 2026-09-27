import {bindPointer} from './input.js?v=20260927-pixel-v18';
import {tillerFromPointer} from './pixel-tiller-input.js?v=20260927-pixel-v18';
import {createSingleLeverControl,leverFromDrag,leverForThrottle,LEVER_NEUTRAL_DEADBAND} from './pixel-single-lever.js?v=20260927-pixel-v18';

// Steering stays on the tiller; a single retained push/pull lever selects both
// direction and power. Touching it alone never changes the propulsion source.
export function mountHelm(root,{getState,onIdle,onFeedback}){
 const control=createSingleLeverControl(),handle=root.querySelector('#tiller-touch'),arm=root.querySelector('.tiller-arm'),lever=root.querySelector('#throttle-touch'),meter=root.querySelector('#throttle-value'),gearLabel=root.querySelector('#throttle-gear');
 let gesture=null,lastDenial='',blocked=false;
 const deployed=s=>['flight','sinking','waiting','bite','fight'].includes(s.fishState);
 const limits=s=>({reverseAllowed:!deployed(s),maxForward:deployed(s)?.28:1});
 const active=s=>s.mode==='boat'&&s.engine&&!s.standing&&!s.moored&&!s.docking&&!s.paused&&!s.anchor&&s.inspection?.phase!=='checking'&&(s.canOperateHelm??s.fishState==='idle');
 const releaseControl=()=>{gesture=null;blocked=false;lastDenial='';control.reset();onIdle();};
 // These interlocks also run at the frame input boundary, before the slower UI
 // refresh, so a deployed line never inherits a retained reverse/full throttle.
 const safeState=()=>{const s=getState(),c=control.state,l=limits(s);if(!active(s)){if(c.manual||c.gear!=='N')releaseControl();}else if(c.gear==='R'&&!l.reverseAllowed){gesture=null;control.setLever(0,s.speed,l);onIdle();}else if(c.gear==='F'&&c.throttle>l.maxForward){gesture=null;control.setLever(leverForThrottle(l.maxForward,'F'),s.speed,l);}return s;};
 const usable=()=>active(safeState())&&!root.hidden;
 const travel=()=>Math.max(24,(lever.getBoundingClientRect().height-62)/2);
 const render=()=>{
  const s=safeState(),c=control.state,l=limits(s),enabled=active(s)&&!root.hidden;
  arm.style.setProperty('--handle-angle',`${c.steer*35}deg`);lever.style.setProperty('--lever-position',String(c.lever));lever.style.setProperty('--lever-travel',`${travel()}px`);
  meter.textContent=`${Math.round(c.throttle*100)}%`;if(gearLabel)gearLabel.textContent=c.gear;
  for(const[g,name]of[['N','in-neutral'],['F','in-forward'],['R','in-reverse']])lever.classList.toggle(name,c.gear===g);
  lever.classList.toggle('trolling',!l.reverseAllowed);lever.classList.toggle('shift-blocked',blocked);
  handle.setAttribute('aria-valuenow',String(Math.round(c.steer*35)));handle.setAttribute('aria-disabled',String(!enabled));handle.tabIndex=enabled?0:-1;
  lever.setAttribute('aria-valuemin',l.reverseAllowed?'-100':'0');lever.setAttribute('aria-valuemax',String(Math.round(l.maxForward*100)));
  lever.setAttribute('aria-valuenow',String(c.gear==='N'?0:Math.round(c.throttle*100)*(c.gear==='R'?-1:1)));
  lever.setAttribute('aria-valuetext',`${c.gear==='N'?'空挡':c.gear==='F'?'前进':'倒车'} · ${Math.round(c.throttle*100)}%${!l.reverseAllowed?' · 拖钓限速':''}`);
  lever.setAttribute('aria-disabled',String(!enabled));lever.tabIndex=enabled?0:-1;
 };
 const apply=value=>{const s=safeState();if(!active(s)||root.hidden)return;const r=control.setLever(value,s.speed,limits(s));blocked=!r.ok;if(!r.ok&&r.message!==lastDenial){lastDenial=r.message;onFeedback(r);}if(r.ok)lastDenial='';render();};
 const steer=e=>{if(!usable()){reset();return;}const r=handle.getBoundingClientRect(),p=tillerFromPointer(e.clientX-r.left-r.width/2,e.clientY-r.bottom+21);control.setSteer(p.steer);render();};
 const pointers=[bindPointer(handle,{start:e=>{if(!usable())return false;steer(e);},move:steer,end:render,cancel:releaseControl}),bindPointer(lever,{
  start:e=>{if(!usable())return false;gesture={y:e.clientY,value:control.state.lever,travel:travel(),started:false};lastDenial='';},
  move:e=>{if(!usable()){reset();return;}if(gesture){const delta=gesture.y-e.clientY;if(!gesture.started&&Math.abs(delta)<2)return;gesture.started=true;const value=leverFromDrag(gesture.value,delta,{travel:gesture.travel});apply(value);if(blocked&&gesture){gesture={y:e.clientY,value:control.state.lever,travel:gesture.travel,started:false};}}},
  end:()=>{gesture=null;render();},cancel:releaseControl
 })];
 function reset(){for(const p of pointers)p.reset();releaseControl();render();}
 function cancelUnavailable(){const s=safeState();if((!active(s)||root.hidden)&&pointers.some(p=>p.owner!==null)){reset();return s;}return s;}
 for(const el of[handle,lever])el.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();if(!usable())return;
  if(el===handle){const value=e.key==='Home'?0:e.key==='End'?1:control.state.steer+(['ArrowLeft','ArrowDown'].includes(e.key)?-.1:.1);control.setSteer(value);render();}
  else{const direction=['ArrowLeft','ArrowDown'].includes(e.key)?-1:1,c=control.state;apply(e.key==='Home'?0:e.key==='End'?1:c.gear==='N'?direction*(LEVER_NEUTRAL_DEADBAND+.08):c.lever+direction*.08);}
 });
 return{reset,input(){cancelUnavailable();return control.input();},snapshot:()=>control.snapshot(),update(){cancelUnavailable();render();}};
}
