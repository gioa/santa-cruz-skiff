import {bindPointer} from './input.js';

// One held contact lifts; a deliberate release recovers. Drag distance never
// steers the rod. Cancellation/blur must not count as a release-to-wind.
export function bindFocusRod(canvas,{enabled}){
 let phase='idle',keyboard=false;
 const release=()=>{if(phase==='lift')phase='recover';};
 const pointer=bindPointer(canvas,{
  start:()=>{if(!enabled())return false;phase='lift';},
  move:()=>{if(!enabled())reset();},
  end:()=>{if(enabled())release();else reset();},cancel:()=>{phase='idle';}
 });
 function reset(){phase='idle';keyboard=false;pointer.reset();}
 function setHeld(held){if(!enabled()){reset();return;}if(held)phase='lift';else release();}
 canvas.addEventListener('keydown',e=>{if(!enabled()||![' ','Enter'].includes(e.key))return;e.preventDefault();e.stopPropagation();keyboard=true;setHeld(true);});
 canvas.addEventListener('keyup',e=>{if(!keyboard||![' ','Enter'].includes(e.key))return;e.preventDefault();e.stopPropagation();keyboard=false;setHeld(false);});
 canvas.addEventListener('blur',reset);
 return{reset,setHeld,input(){if(!enabled())reset();return phase;},update(){if(!enabled())reset();}};
}
