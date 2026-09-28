import {bindPointer} from './input.js?v=20260927-pixel-v57';
import {focusRodPoseFromDrag} from './pixel-fight-focus.js?v=20260927-pixel-v57';

// The view itself is the rod control. Relative movement avoids a jump when
// touching the water; switching view, pausing or losing capture releases it.
export function bindFocusRod(canvas,{enabled,getPose,onPose}){
 let gesture=null;
 const pointer=bindPointer(canvas,{
  start:e=>{if(!enabled())return false;const r=canvas.getBoundingClientRect();gesture={...getPose(),x:e.clientX,y:e.clientY,width:r.width,height:r.height};},
  move:e=>{if(!enabled()){reset();return;}if(gesture)onPose(focusRodPoseFromDrag(gesture,e.clientX-gesture.x,e.clientY-gesture.y,gesture));},
  end:()=>{gesture=null;},cancel:()=>{gesture=null;}
 });
 function reset(){gesture=null;pointer.reset();}
 canvas.addEventListener('keydown',e=>{
  if(!enabled()||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();const p=getPose();
  onPose({elevation:e.key==='Home'?45:p.elevation+(e.key==='ArrowUp'?5:e.key==='ArrowDown'?-5:0),azimuth:e.key==='Home'?70:p.azimuth+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0)});
 });
 return{reset,update(){if(!enabled())reset();}};
}
