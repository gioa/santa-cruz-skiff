import {rodTipPosition,MAX_PAID_LINE_METERS} from './pixel-fishing-physics.js?v=20260927-pixel-v38';
import {getRigProfile} from './fishing-rigs.js?v=20260927-pixel-v38';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,(a.height||0)-(b.height||0));
// Short, controlled boat casts. These ranges are gameplay calibration, not
// casting ratings for real tackle. Heavy two-dropper rigs travel less far.
export function castRange(s){
 const rig=getRigProfile(s.rig),grams=s.rigWeightGrams??rig.defaultWeightGrams;
 const range=({bottom:22,slider:25,jig:30,float:15,dropper:18,sabiki:14,feather40:18})[rig.id]||16;
 const rod=({rod_light:.9,rod_boat:1.06,rod_electric:.8})[s.profile?.loadout?.rod]||1;
 return clamp(range*rod*Math.sqrt(rig.defaultWeightGrams/Math.max(7,grams)),8,32);
}
export function planCast(s,target,{isWater=()=>true}={}){
 if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return{ok:false,message:''};
 const dx=target.x-s.boatX,dz=target.z-s.boatZ,requested=Math.hypot(dx,dz);
 if(requested<3)return{ok:false,message:'船边可直接下放钓组。'};
 if(!isWater(target.x,target.z))return{ok:false,message:'请选择水面。'};
 const range=castRange(s),travel=Math.min(requested,range),end={x:s.boatX+dx/requested*travel,z:s.boatZ+dz/requested*travel,height:0};
 // Check the full flight corridor, not just the endpoint: no casts across
 // the pier/buildings or another stretch of shoreline.
 for(let d=.5;d<=travel+.5;d+=.5){const u=Math.min(1,d/travel);if(!isWater(s.boatX+(end.x-s.boatX)*u,s.boatZ+(end.z-s.boatZ)*u))return{ok:false,message:'这条抛投路线被岸边挡住了。'};}
 const direction=Math.atan2(-dx,-dz),angle=Math.atan2(Math.sin(s.heading-direction),Math.cos(s.heading-direction)),azimuth=angle*180/Math.PI;
 const tip=rodTipPosition({...s,rodAzimuth:azimuth,rodElevation:50}),start={...tip,height:tip.height-.25};
 const arc=1+travel*.085,duration=Math.sqrt(8*arc/9.81);
 return{ok:true,limited:requested>range,azimuth,range,flight:{version:1,t:0,duration,start,end,arc},tip,paid:distance(tip,start)+.08};
}
export function stepCast(s,dt){
 const f=s.castFlight;if(f?.version!==1||!f.start||!f.end||!Number.isFinite(f.duration)||f.duration<=0)return null;
 const t=Math.min(f.duration,f.t+Math.max(0,dt)),u=t/f.duration,tip=rodTipPosition(s);
 const lure={x:f.start.x+(f.end.x-f.start.x)*u,z:f.start.z+(f.end.z-f.start.z)*u,height:f.start.height*(1-u)+4*f.arc*u*(1-u)};
 const required=distance(tip,lure),paid=Math.min(MAX_PAID_LINE_METERS,Math.max(s.paidLineMeters,required+.08)),landed=t>=f.duration;
 return{castFlight:landed?null:{...f,t},fishState:landed?'sinking':'flight',casting:false,castPower:0,bobber:lure,rodTip:tip,paidLineMeters:paid,lineDistance:Math.hypot(lure.x-s.boatX,lure.z-s.boatZ),lureDepth:0,lineSlackMeters:Math.max(0,paid-required),lineEntry:landed?{...lure}:null,floatPosition:landed&&s.rig==='float'?{...lure}:null,payoutRate:dt>0?(paid-s.paidLineMeters)/dt:0,retrieveRate:0,crankRate:0,reelMode:'free',rodBend:Math.max(0,.22*(1-u)),rodLoadN:Math.max(0,1-u)};
}
