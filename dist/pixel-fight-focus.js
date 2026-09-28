import {rodPoseFromDrag} from './pixel-fishing-input.js?v=20260927-pixel-v48';

// The catch decision remains in this view. A modal may pause the simulation,
// but pausing must not change the camera behind it.
export function isFishingFocus(s={}){
 return Boolean(s.mode==='boat'&&s.rentalPaid&&s.launchStage==='afloat'&&!s.moored&&!s.docking&&s.inspection?.phase!=='checking'&&['bite','fight','landed'].includes(s.fishState));
}

// Use relative touch travel just like the small rod instrument. A first-person
// canvas can span a tablet, so cap the stroke needed to lift or sweep the rod.
export function focusRodPoseFromDrag(pose,dx,dy,{width=390,height=640}={}){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,f)=>Number.isFinite(v)&&v>0?v:f;
 return rodPoseFromDrag(pose,dx,dy,{width:clamp(finite(width,390)*.8,180,420),height:clamp(finite(height,640)*.52,150,300)});
}
