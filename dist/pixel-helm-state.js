import {formatSpeed} from './units.js?v=20260927-pixel-v32';
/** Pure, persistent tiller controls. Normal pointer release does nothing:
 * steering and twist throttle hold their positions through friction. The UI
 * owns pointer capture and calls reset on cancellation, blur or menus.
 * reset relinquishes manual control; the caller also neutralises the vessel.
 */
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>typeof value==='number'&&Number.isFinite(value)?value:0;
const result=(ok=true,message='')=>({ok,message});

export function createTillerControl(){
 const state={gear:'N',throttle:0,steer:0,manual:false};
 const snapshot=()=>({...state});
 return{
  get state(){return snapshot();},
  snapshot,
  setSteer(value){state.steer=clamp(finite(value),-1,1);state.manual=true;return result();},
  setThrottle(value){
   state.manual=true;
   if(state.gear==='N')return result(false,'先挂挡，再转动油门握把。');
   state.throttle=clamp(finite(value),0,1);return result();
  },
  shift(gear,speed=0){
   if(!['N','F','R'].includes(gear))return result(false,'挡位只能选择 F、N 或 R。');
   if(gear==='N'){state.gear='N';state.throttle=0;state.manual=true;return result();}
   if(gear===state.gear)return result();
   if(state.throttle>.08)return result(false,'先将油门收回到怠速，再换挡。');
   if(state.gear!=='N')return result(false,'先经过 N 空挡，再切换前进或倒车。');
   if(typeof speed!=='number'||!Number.isFinite(speed))return result(false,'航速暂不可用，保持空挡。');
   if(Math.abs(speed)>=.8)return result(false,`等船速低于 ${formatSpeed(.8)}，再挂挡。`);
   state.gear=gear;state.manual=true;return result();
  },
  reset(){Object.assign(state,{gear:'N',throttle:0,steer:0,manual:false});return result();},
  input(){return state.manual?{steer:state.steer,throttle:state.gear==='F'?state.throttle:state.gear==='R'&&state.throttle>0?-.3*state.throttle:0}:{};},
 };
}
