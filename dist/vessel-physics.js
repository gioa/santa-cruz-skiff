/**
 * Compact rigid-body approximation for the 4.8 m, 8 hp displacement skiff.
 * SI units: metres, seconds, kilograms, newtons and radians throughout.
 * This is a tuned game model, not CFD, a stability assessment or a sea trial.
 * No DOM/Three dependency: water sampling is the same callback used to draw waves.
 */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const G=9.81,RHO=1025,STEP=1/120,MAX_DT=.25;
import {SKIFF_LENGTH_METERS} from './skiff-dimensions.js?v=20260927-pixel-v53';
export const VESSEL_SPEC=Object.freeze({length:SKIFF_LENGTH_METERS,beam:1.72,dryMassKg:263,defaultCrewKg:82,waterplaneM2:2.8,engineWatts:5966,maxStepSeconds:STEP});

export function createVesselState({x=0,z=0,heading=0,speed=0,y=0}={}){
 return {x,z,heading,vx:-Math.sin(heading)*speed,vz:-Math.cos(heading)*speed,speed,
  y,vy:0,pitch:0,roll:0,pitchRate:0,rollRate:0,yawRate:0,rpm:0,tiller:0,
  anchorX:null,anchorZ:null,anchorScope:4,anchorTension:0,massKg:345,thrustN:0,
  lastWater:null,waterVelocity:0,waterHeight:0,waterPitch:0,waterRoll:0};
}

/** Sync external collision/hoist/rescue changes without reviving old momentum. */
export function syncVessel(v,{x=v.x,z=v.z,heading=v.heading,speed=0,clearMotion=false}={}){
 v.x=finite(x);v.z=finite(z);v.heading=finite(heading);
 v.speed=finite(speed);v.vx=(-Math.sin(v.heading)*v.speed)||0;v.vz=(-Math.cos(v.heading)*v.speed)||0;
 v.yawRate=0;v.rpm=0;v.tiller=0;v.thrustN=0;v.anchorX=null;v.anchorZ=null;v.anchorTension=0;
 if(clearMotion){v.y=0;v.vy=0;v.pitch=0;v.roll=0;v.pitchRate=0;v.rollRate=0;v.lastWater=null;v.waterVelocity=0;}
 return v;
}

/** NOAA meteorological wind is FROM bearing; map forward -Z is bearing 134°. */
export function vesselWind(knots,fromBearing,mapBearing=134){
 const a=(finite(mapBearing,134)-finite(fromBearing))*Math.PI/180,mps=Math.max(0,finite(knots))*.514444;
 return {windX:Math.sin(a)*mps,windZ:Math.cos(a)*mps};
}

/** Samples four hull support points plus the centre, not an unrelated rocking sine. */
export function sampleHullWater(v,sampleWater,time=0){
 const c=Math.cos(v.heading),s=Math.sin(v.heading),b=.64,l=1.58;
 const water=(x,z)=>finite(sampleWater?.(v.x+x*c+z*s,v.z-x*s+z*c,time));
 const portBow=water(-b,-l),starBow=water(b,-l),portStern=water(-b,l),starStern=water(b,l),centre=water(0,0);
 return {height:(portBow+starBow+portStern+starStern+centre*2)/6,
  pitch:Math.atan2((portBow+starBow-portStern-starStern)/2,l*2),
  roll:Math.atan2((starBow+starStern-portBow-portStern)/2,b*2)};
}

function parameters(o){
 const crewKg=clamp(finite(o.crewKg,VESSEL_SPEC.defaultCrewKg),0,240),payloadKg=clamp(finite(o.payloadKg),0,350);
 return {crewKg,payloadKg,mass:VESSEL_SPEC.dryMassKg+crewKg+payloadKg};
}

function hullMotion(v,o,h,time,p){
 const w=sampleHullWater(v,o.sampleWater,time),mass=p.mass;
 // Displacement change from the authored reference waterline: an 82 kg occupant.
 const targetY=w.height-(p.crewKg+p.payloadKg-VESSEL_SPEC.defaultCrewKg)/(RHO*VESSEL_SPEC.waterplaneM2);
 const derivative=v.lastWater===null?0:(w.height-v.lastWater)/h;
 v.waterVelocity+=(clamp(derivative,-3,3)-v.waterVelocity)*(1-Math.exp(-h*10));
 v.lastWater=w.height;v.waterHeight=w.height;v.waterPitch=w.pitch;v.waterRoll=w.roll;
 const heaveMass=mass+1100,heaveK=RHO*G*VESSEL_SPEC.waterplaneM2;
 const heaveD=2*.95*Math.sqrt(heaveK*heaveMass);
 v.vy+=(heaveK*(targetY-v.y)-heaveD*(v.vy-v.waterVelocity))/heaveMass*h;
 v.vy=clamp(v.vy,-4,4);v.y+=v.vy*h;
 // Hydrostatic righting plus the occupant's actual lever arm and gentle turn heel.
 const rollK=mass*G*.78,pitchK=mass*G*3.5;
 const targetRoll=clamp(w.roll-p.crewKg*G*clamp(finite(o.crewX),-.8,.8)/rollK-v.speed*v.yawRate*.024,-.5,.5);
 const targetPitch=clamp(w.pitch+p.crewKg*G*clamp(finite(o.crewZ),-1.8,1.8)/pitchK+Math.max(0,v.speed)**2*.0028,-.4,.4);
 const rollI=mass*.43+145,pitchI=mass*1.9+480;
 v.rollRate+=(rollK*(targetRoll-v.roll)-2*.86*Math.sqrt(rollK*rollI)*v.rollRate)/rollI*h;
 v.pitchRate+=(pitchK*(targetPitch-v.pitch)-2*.88*Math.sqrt(pitchK*pitchI)*v.pitchRate)/pitchI*h;
 v.rollRate=clamp(v.rollRate,-1.5,1.5);v.pitchRate=clamp(v.pitchRate,-1.2,1.2);
 v.roll=clamp(v.roll+v.rollRate*h,-.55,.55);v.pitch=clamp(v.pitch+v.pitchRate*h,-.45,.45);
}

/**
 * Update wave-driven pose only, useful for an afloat boat held to the dock.
 * `time` is END-of-frame water animation time. Leave dt zero when paused.
 */
export function stepVesselMotion(v,o={}){
 const dt=clamp(finite(o.dt),0,MAX_DT);if(!dt)return v;
 const n=Math.ceil(dt/STEP),h=dt/n,p=parameters(o),end=finite(o.time);
 v.massKg=p.mass;
 for(let i=0;i<n;i++)hullMotion(v,o,h,end-dt+(i+1)*h,p);
 return v;
}

/**
 * Mutates v. `steer` +1 turns to port, throttle -0.3..1, sampleWater(x,z,t).
 * Wind/current inputs are world-space velocities in m/s, never arbitrary drift.
 * Currents default to zero: tide-height predictions alone cannot supply a current.
 * A deployed anchor latches its seabed position until released; it is not a brake.
 * External collision handling should reject/clip a step then call syncVessel().
 */
export function stepVessel(v,o={}){
 const dt=clamp(finite(o.dt),0,MAX_DT);if(!dt)return v;
 const p=parameters(o),mass=p.mass,n=Math.ceil(dt/STEP),h=dt/n,end=finite(o.time);
 const anchored=Boolean(o.anchor),throttle=o.engine&&!anchored?clamp(finite(o.throttle),-.3,1):0;
 const steer=clamp(finite(o.steer),-1,1),currentX=finite(o.currentX),currentZ=finite(o.currentZ);
 v.massKg=mass;
 if(anchored&&v.anchorX===null){
  // Four horizontal metres of rode beyond the bow; vertical scope is rendered separately.
  v.anchorScope=4;v.anchorX=v.x-Math.sin(v.heading)*(2+v.anchorScope);v.anchorZ=v.z-Math.cos(v.heading)*(2+v.anchorScope);
 }else if(!anchored){v.anchorX=null;v.anchorZ=null;v.anchorTension=0;}
 for(let i=0;i<n;i++){
  const c=Math.cos(v.heading),s=Math.sin(v.heading),fx=-s,fz=-c,rx=c,rz=-s;
  const ux=v.vx-currentX,uz=v.vz-currentZ,u=ux*fx+uz*fz,lateral=ux*rx+uz*rz;
  v.rpm+=(throttle-v.rpm)*(1-Math.exp(-h/(throttle===0?.7:1.15)));
  v.tiller+=(steer-v.tiller)*(1-Math.exp(-h*5));
  const power=v.rpm>=0?3100:1800,bollard=v.rpm>=0?950:650;
  // Effective propulsive power is below the 5.97 kW shaft rating; bollard cap at low speed.
  const thrust=Math.sign(v.rpm)*Math.min(bollard*Math.abs(v.rpm),power*Math.abs(v.rpm)/(Math.abs(u)+.6));
  v.thrustN=thrust;
  const dragScale=(mass/345)**.35,seaAnchor=Boolean(o.seaAnchor)&&!o.engine;
  const surgeDrag=-(28*u+75*u*Math.abs(u))*dragScale*(seaAnchor?3.2:1);
  const swayDrag=-(150*lateral+700*lateral*Math.abs(lateral))*dragScale*(seaAnchor?2.1:1);
  const wx=finite(o.windX)-v.vx,wz=finite(o.windZ)-v.vz,windLong=wx*fx+wz*fz,windSide=wx*rx+wz*rz;
  const windF=.5*1.225*1.1*windLong*Math.abs(windLong),windS=.5*1.225*2.2*windSide*Math.abs(windSide);
  const tillerAngle=v.tiller*.5;
  let forceX=fx*(thrust*Math.cos(tillerAngle)+surgeDrag+windF)+rx*(swayDrag+windS);
  let forceZ=fz*(thrust*Math.cos(tillerAngle)+surgeDrag+windF)+rz*(swayDrag+windS);
  // Propeller deflection pushes the stern sideways; passive underwater area steers while coasting.
  const propSide=thrust*Math.sin(tillerAngle);
  forceX+=rx*propSide;forceZ+=rz*propSide;
  let torque=propSide*1.8+v.tiller*110*u*Math.abs(u)-windS*.2;
  if(anchored){
   const bowX=v.x+fx*2,bowZ=v.z+fz*2,dx=bowX-v.anchorX,dz=bowZ-v.anchorZ,d=Math.hypot(dx,dz);
   const extension=d-v.anchorScope;
   if(extension>0&&d>1e-5){
    const nx=dx/d,nz=dz/d,bowVX=v.vx-rx*2*v.yawRate,bowVZ=v.vz-rz*2*v.yawRate;
    const radial=bowVX*nx+bowVZ*nz,tension=clamp(extension*850+radial*650,0,6000);
    const ax=-nx*tension,az=-nz*tension;
    forceX+=ax;forceZ+=az;torque-=2*(ax*rx+az*rz);v.anchorTension=tension;
   }else v.anchorTension=0;
  }
  const forwardForce=forceX*fx+forceZ*fz,sideForce=forceX*rx+forceZ*rz;
  // Added water mass is greater for sideways motion than for motion along the keel.
  const accF=forwardForce/(mass*1.18),accS=sideForce/(mass*1.9);
  v.vx+=(fx*accF+rx*accS)*h;v.vz+=(fz*accF+rz*accS)*h;
  const yawDrag=(430+600*Math.abs(u))*v.yawRate+1800*v.yawRate*Math.abs(v.yawRate);
  const yawInertia=mass*(VESSEL_SPEC.length**2+VESSEL_SPEC.beam**2)/12+580;
  v.yawRate=clamp(v.yawRate+(torque-yawDrag)/yawInertia*h,-.9,.9);
  v.heading=wrap(v.heading+v.yawRate*h);
  v.x+=v.vx*h;v.z+=v.vz*h;
  v.speed=-(v.vx-currentX)*Math.sin(v.heading)-(v.vz-currentZ)*Math.cos(v.heading);
  hullMotion(v,o,h,end-dt+(i+1)*h,p);
 }
 return v;
}

/** Heading PD controller: does not set heading, teleport or suppress momentum. */
export function vesselAutopilot(v,target,{final=false,cruise=.8,arrivalRadius=4}={}){
 const distance=Math.hypot(target.x-v.x,target.z-v.z),desired=Math.atan2(v.x-target.x,v.z-target.z);
 const error=wrap(desired-v.heading),steer=clamp(error*2.8-v.yawRate*2.4,-1,1);
 let throttle=clamp(cruise,.15,1);
 if(Math.abs(error)>.65)throttle=Math.min(throttle,.42);
 if(Math.abs(error)>1.5)throttle=Math.min(throttle,.32);
 if(final&&distance<25)throttle=Math.min(throttle,.24);
 if(final&&distance<12)throttle=Math.min(throttle,.085);
 if(final&&distance<7)throttle=Math.min(throttle,.03);
 const arrived=distance<(final?arrivalRadius:8);
 if(arrived&&final)throttle=0;
 return {steer,throttle,distance,error,arrived};
}
