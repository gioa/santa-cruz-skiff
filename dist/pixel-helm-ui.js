import {bindPointer} from './input.js?v=20260927-pixel-v7';
import {tillerFromPointer,throttleFromDrag} from './pixel-tiller-input.js?v=20260927-pixel-v7';
import {createTillerControl} from './pixel-helm-state.js?v=20260927-pixel-v7';

// A retained tiller and a separate twist grip, as on a portable outboard.
// Normal release keeps friction settings; interruptions deliberately idle it.
export function mountHelm(root,{getState,onIdle,onFeedback}){
 const control=createTillerControl(),handle=root.querySelector('#tiller-touch'),arm=root.querySelector('.tiller-arm'),grip=root.querySelector('#throttle-touch'),meter=root.querySelector('#throttle-value'),gears=[...root.querySelectorAll('[data-gear]')];
 let gesture=null;
 const usable=()=>{const s=getState();return s.mode==='boat'&&s.engine&&!s.standing&&!s.moored&&!s.docking&&s.fishState==='idle'&&!s.paused;};
 const render=()=>{const c=control.state;arm.style.setProperty('--handle-angle',`${c.steer*35}deg`);grip.style.setProperty('--grip-turn',`${c.throttle*32}px`);meter.textContent=`${Math.round(c.throttle*100)}%`;handle.setAttribute('aria-valuenow',String(Math.round(c.steer*35)));grip.setAttribute('aria-valuenow',String(Math.round(c.throttle*100)));for(const el of gears)el.setAttribute('aria-pressed',String(el.dataset.gear===c.gear));};
 const reset=()=>{control.reset();gesture=null;onIdle();render();};
 const apply=result=>{if(result?.ok===false)onFeedback(result);render();};
 const steer=e=>{const r=handle.getBoundingClientRect(),p=tillerFromPointer(e.clientX-r.left-r.width/2,e.clientY-r.bottom+21);control.setSteer(p.steer);render();};
 const pointers=[bindPointer(handle,{start:e=>{if(!usable())return false;steer(e);},move:steer,end:render,cancel:reset}),bindPointer(grip,{start:e=>{if(!usable())return false;if(control.state.gear==='N'){onFeedback({ok:false,message:'先挂前进挡或倒挡'});return false;}gesture={y:e.clientY,value:control.state.throttle};},move:e=>{if(gesture)apply(control.setThrottle(throttleFromDrag(gesture.value,gesture.y-e.clientY,{travel:100})));},end:()=>{gesture=null;render();},cancel:reset})];
 for(const el of gears)el.onclick=()=>{if(usable())apply(control.shift(el.dataset.gear,getState().speed));};
 for(const el of[handle,grip])el.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(!usable())return;if(el===handle){const value=e.key==='Home'?0:e.key==='End'?1:control.state.steer+(['ArrowLeft','ArrowDown'].includes(e.key)?-.1:.1);apply(control.setSteer(value));}else{const value=e.key==='Home'?0:e.key==='End'?1:control.state.throttle+(['ArrowLeft','ArrowDown'].includes(e.key)?-.05:.05);apply(control.setThrottle(value));}});
 return{reset(){for(const p of pointers)p.reset();reset();},input:()=>control.input(),snapshot:()=>control.snapshot(),update(){const s=getState();if(!s.engine&&(control.state.manual||control.state.throttle))reset();const active=usable();for(const el of[handle,grip,...gears]){el.setAttribute('aria-disabled',String(!active));if(el.tagName==='BUTTON')el.disabled=!active;}render();}};
}
