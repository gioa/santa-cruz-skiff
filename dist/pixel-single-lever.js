import {formatSpeed} from './units.js?v=20260927-pixel-v22';
/** One retained push/pull lever: ahead above the detent, neutral in the centre,
 * astern below it. Pointer release intentionally does not change its position.
 * Reversals must pass through neutral and require a fresh command at low speed;
 * input() only samples the control and never queues a later gear engagement.
 */
export const LEVER_NEUTRAL_DEADBAND=.12;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const isFiniteNumber=value=>typeof value==='number'&&Number.isFinite(value);
const finite=(value,fallback=0)=>isFiniteNumber(value)?value:fallback;
const result=(ok=true,message='')=>({ok,message});

/** Convert actual 0..1 engine power to the corresponding signed lever travel. */
export function leverForThrottle(throttle,gear='F'){
 const power=clamp(finite(throttle),0,1);
 return power>0&&['F','R'].includes(gear)?(gear==='R'?-1:1)*(LEVER_NEUTRAL_DEADBAND+power*(1-LEVER_NEUTRAL_DEADBAND)):0;
}

/** Relative dragging does not jump to the pointer's initial screen location.
 * Positive delta pushes ahead; the UI supplies startY-currentY for vertical use.
 * travel is the number of CSS pixels from neutral to either end stop.
 */
export function leverFromDrag(start,delta,{travel=120}={}){
 const origin=clamp(finite(start),-1,1),distance=isFiniteNumber(travel)&&travel>0?travel:120;
 return clamp(origin+finite(delta)/distance,-1,1);
}

export function createSingleLeverControl(){
 const state={gear:'N',throttle:0,steer:0,manual:false,lever:0};
 const snapshot=()=>({...state});
 const neutral=()=>{state.gear='N';state.throttle=0;state.lever=0;};
 return{
  get state(){return snapshot();},
  snapshot,
  setSteer(value){state.steer=clamp(finite(value),-1,1);state.manual=true;return result();},
  setLever(value,speed=0,{reverseAllowed=true,maxForward=1}={}){
   state.manual=true;
   if(!isFiniteNumber(value)){neutral();return result(false,'推杆位置不可用，已回到空挡。');}
   const target=clamp(value,-1,1);
   if(Math.abs(target)<=LEVER_NEUTRAL_DEADBAND){neutral();return result();}
   const gear=target>0?'F':'R';
   if(gear==='R'&&!reverseAllowed){neutral();return result(false,'拖钓时保持前进或空挡。');}
   if(state.gear!=='N'&&state.gear!==gear){neutral();return result(false,'已回到空挡，减速后再推动换向。');}
   if(state.gear!==gear&&(!isFiniteNumber(speed)||Math.abs(speed)>=.8)){
    neutral();return result(false,isFiniteNumber(speed)?`等船速低于 ${formatSpeed(.8)}，再推动挂挡。`:'航速暂不可用，保持空挡。');
   }
   const demand=(Math.abs(target)-LEVER_NEUTRAL_DEADBAND)/(1-LEVER_NEUTRAL_DEADBAND);
   const power=Math.min(demand,gear==='F'?clamp(finite(maxForward),0,1):1);
   if(power<=0){neutral();return result(false,'当前无法向前加速。');}
   state.gear=gear;state.throttle=power;state.lever=leverForThrottle(power,gear);
   return result();
  },
  reset(){Object.assign(state,{gear:'N',throttle:0,steer:0,manual:false,lever:0});return result();},
  input(){return state.manual?{steer:state.steer,throttle:state.gear==='F'?state.throttle:state.gear==='R'?-.3*state.throttle:0}:{};},
 };
}
